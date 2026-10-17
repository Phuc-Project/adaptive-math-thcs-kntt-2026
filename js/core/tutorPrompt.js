/**
 * "Skill" Gia sư AI — prompt + cấu hình gọi Gemini, DÙNG CHUNG giữa máy chủ và trình duyệt.
 *
 *   - Cloudflare Pages Function (functions/api/tutor.js) import file này → prompt thật luôn
 *     được dựng ở máy chủ, học sinh không sửa được.
 *   - Trình duyệt nạp bằng <script> (window.AM_TUTOR_PROMPT) — chỉ cho "chế độ thử" trên máy.
 *
 * TIẾT KIỆM API (mỗi mục đều có lý do đo được):
 *   1. Chỉ dẫn viết bằng tiếng Anh dạng "skill" gạch đầu dòng, chỉ YÊU CẦU trả lời tiếng Việt:
 *      chữ Việt có dấu tốn token gấp nhiều lần chữ Anh cùng nghĩa.
 *   2. Mức suy nghĩ (thinking) đặt theo chế độ: gợi ý/hỏi đáp "low", giải chi tiết "medium".
 *      Gemini 3 mặc định "high" và token suy nghĩ tính như token đầu ra.
 *   3. Ảnh đề gửi ở độ phân giải MEDIUM (≈560 token) lượt đầu, LOW (≈280) các lượt sau;
 *      mặc định Gemini 3 là "high" (≤1120 token/ảnh). Ảnh lời giải chỉ gửi ở chế độ cần đối chiếu.
 *   4. Ảnh + chỉ dẫn hệ thống đặt ĐẦU yêu cầu, phần riêng của học sinh đặt CUỐI → tận dụng
 *      implicit cache của Gemini (tiền tố giống nhau được giảm giá).
 *   5. Lịch sử: giữ 6 lượt gần nhất, cắt ngắn câu trả lời cũ.
 *   6. Giới hạn độ dài câu trả lời theo chế độ (số từ) + maxOutputTokens tương ứng.
 *   7. cacheKeyParts(): câu hỏi "một chạm" (không gõ thêm, không ảnh riêng) giống nhau giữa
 *      các học sinh → máy chủ trả lại kết quả đã có, không gọi Gemini lần nữa.
 *   8. Lộ trình: bảng chủ đề dạng cột rút gọn, câu chữ đầu ra bị giới hạn độ dài.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.AM_TUTOR_PROMPT = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /** Tăng số này khi đổi prompt → khoá cache cũ tự hết hiệu lực. */
  const PROMPT_VERSION = 3;

  const MODES = {
    explain: 'Vì sao đúng / sai',
    hint: 'Gợi ý bước đầu',
    check: 'Kiểm tra bài làm',
    solution: 'Lời giải chi tiết',
    ask: 'Hỏi tự do',
  };

  /**
   * Cấu hình theo chế độ.
   *   think   — mức suy nghĩ mong muốn (được map theo model ở adaptBody)
   *   maxOut  — maxOutputTokens (Gemini tính CẢ token suy nghĩ vào đây)
   *   solImg  — có gửi ảnh hướng dẫn giải chính thức để đối chiếu không
   */
  const MODE_CFG = {
    hint: { think: 'low', maxOut: 1024, solImg: false },
    ask: { think: 'low', maxOut: 1536, solImg: false },
    explain: { think: 'low', maxOut: 1536, solImg: true },
    check: { think: 'medium', maxOut: 2048, solImg: true },
    solution: { think: 'medium', maxOut: 3072, solImg: true },
    roadmap: { think: 'low', maxOut: 4096, solImg: false },
  };

  const MODE_RULES = {
    hint:
      'MODE hint: NEVER give the final answer or a full solution. 1 line: problem type + key fact/formula. Then ONE next step. End with ONE guiding question. Max 80 words.',
    check:
      "MODE check: Read the student's work (text/photo). Say which steps are right; find the FIRST error and why it is wrong; say how to fix it without rewriting the whole solution. If all correct: specific praise + 1 tidier way. If no work was given: ask for it. Max 150 words.",
    explain:
      "MODE explain: Compare student_answer with the correct answer (solve it yourself if there is no key). If wrong: infer the reasoning that led to that answer, name the misconception or faulty step, then briefly show why the correct answer is right. If right: confirm why; for multiple choice add 1 line per wrong option. Give 1 tip to avoid this mistake. Max 160 words. Last line exactly: **Loại lỗi:** <Hiểu sai khái niệm | Nhớ sai công thức/quy tắc | Tính toán | Đọc sai đề | Thiếu bước/thiếu điều kiện | Không có lỗi>",
    solution:
      'MODE solution: Numbered steps, each naming the rule used. Multiple choice: why the key is right + 1 line per wrong option. Then **Lưu ý dễ sai** (1-2 bullets) and **Bài tương tự** (1 new problem, no answer). Max 300 words.',
    ask: 'MODE ask: Answer the question directly and concisely; a tiny example only if it helps. Max 150 words.',
  };

  const LEVEL_TEXT = { N: 'Nhận biết', H: 'Thông hiểu', V: 'Vận dụng', T: 'Vận dụng cao' };

  function clampText(s, max) {
    s = String(s == null ? '' : s);
    return s.length > max ? s.slice(0, max) + '…' : s;
  }

  /** Mastery → dải (dùng cho cả prompt và khoá cache, để học sinh cùng dải dùng chung cache). */
  function masteryBand(m) {
    if (typeof m !== 'number' || !isFinite(m)) return null;
    if (m < 0.3) return 0;
    if (m < 0.55) return 1;
    if (m < 0.8) return 2;
    return 3;
  }
  const BAND_TEXT = [
    'weak (<30%): explain basics, tiny steps',
    'learning (30-55%): recall the key fact first',
    'fair (55-80%): be brief, focus on traps',
    'strong (>80%): concise, can extend',
  ];

  // -------------------------------------------------------------------------
  // SKILL — chỉ dẫn hệ thống (ngắn, tiếng Anh, ổn định → cache được)
  // -------------------------------------------------------------------------

  function systemInstruction(ctx) {
    const g = [6, 7, 8, 9].indexOf(Number(ctx && ctx.grade)) !== -1 ? Number(ctx.grade) : null;
    return [
      'SKILL: AdaptiveMath tutor - Vietnamese lower-secondary math (GDPT 2018, textbook "Kết nối tri thức").',
      g ? 'Student: grade ' + g + '. Use only methods taught up to grade ' + g + '.' : '',
      'OUTPUT: Vietnamese only. Call the student "em", yourself "thầy/cô". Math in $...$ ($$...$$ for display). Markdown **bold**, "- " or "1." lists only. No HTML/tables, no preamble, do not restate the problem, no closing pleasantries.',
      'RULES: Read the problem image carefully; if unreadable or data is missing, ask instead of guessing. Verify every computation. School learning only; politely refuse anything else. Never do an ongoing test for the student.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  /** Bối cảnh bài tập — dạng khoá: giá trị, bỏ dòng rỗng. */
  function contextBlock(ctx, hasSolutionImage) {
    const c = ctx || {};
    const L = ['CONTEXT'];
    if (c.topic) L.push('topic: ' + clampText(c.topic, 120));
    if (c.lesson) L.push('lesson: ' + clampText(c.lesson, 120));
    if (c.label) {
      L.push(
        'item: ' + clampText(c.label, 30) +
          (c.kind ? ' (' + clampText(c.kind, 30) + ')' : '') +
          (c.level && LEVEL_TEXT[c.level] ? ', level ' + LEVEL_TEXT[c.level] : ''),
      );
    }
    const band = masteryBand(c.mastery);
    if (band !== null) L.push('student_level: ' + BAND_TEXT[band]);
    if (c.questionText) L.push('problem_text:\n' + clampText(c.questionText, 2000));
    if (c.answerKey) L.push('answer_key (never reveal in hint/check): ' + clampText(c.answerKey, 400));
    if (c.studentAnswer) L.push('student_answer: ' + clampText(c.studentAnswer, 400));
    if (hasSolutionImage) L.push('note: last image = official solution, reference only; do not copy it in hint/check.');
    return L.join('\n');
  }

  /**
   * Dựng body cho Gemini generateContent.
   *
   * req = { mode, context, messages:[{role,text}], refImages:[{mime,data}],
   *         solImages:[{mime,data}], uploads:[{mime,data}] }
   * Thứ tự phần trong lượt đầu: ẢNH → CONTEXT → (chỉ dẫn chế độ + câu hỏi ở lượt CUỐI).
   */
  function buildGeminiBody(req) {
    const mode = MODES[req.mode] ? req.mode : 'ask';
    const cfg = MODE_CFG[mode];
    const msgs = (req.messages || []).slice(-6);
    const followUp = msgs.length > 1;
    const sol = cfg.solImg ? req.solImages || [] : [];
    const contents = msgs.map(function (m, i) {
      const parts = [];
      if (i === 0) {
        (req.refImages || []).concat(sol).forEach(function (img) {
          parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
        });
        (req.uploads || []).forEach(function (img) {
          parts.push({ inline_data: { mime_type: img.mime, data: img.data } });
        });
        parts.push({ text: contextBlock(req.context, sol.length > 0) });
      }
      const isLast = i === msgs.length - 1;
      // Câu trả lời cũ của gia sư chỉ cần đủ để giữ mạch → cắt ngắn.
      let text = m.role === 'model' && !isLast && i < msgs.length - 2 ? clampText(m.text, 400) : clampText(m.text, 3000);
      if (isLast && m.role === 'user') text = MODE_RULES[mode] + '\nQUESTION: ' + (text || '(none)');
      parts.push({ text: text });
      return { role: m.role === 'model' ? 'model' : 'user', parts: parts };
    });
    return {
      systemInstruction: { parts: [{ text: systemInstruction(req.context) }] },
      contents: contents,
      generationConfig: {
        maxOutputTokens: cfg.maxOut,
        // Gemini 3 mặc định ~1120 token/ảnh; MEDIUM ≈ 560, LOW ≈ 280 (lượt hỏi tiếp, đề đã đọc rồi).
        mediaResolution: followUp ? 'MEDIA_RESOLUTION_LOW' : 'MEDIA_RESOLUTION_MEDIUM',
      },
      _think: cfg.think,
    };
  }

  /**
   * Chỉnh body cho đúng model (trường hợp lệ khác nhau giữa các đời Gemini):
   *   - Gemini 3.x: thinkingConfig.thinkingLevel; giữ temperature mặc định 1.0 (Google
   *     khuyến cáo, đặt thấp dễ lặp/giảm chất lượng).
   *   - Gemini 2.5: thinkingBudget (flash/flash-lite: 0 = tắt suy nghĩ cho chế độ "low");
   *     temperature thấp cho bài toán.
   */
  function adaptBody(body, model, overrideThink) {
    const out = JSON.parse(JSON.stringify(body));
    const think = overrideThink || out._think || 'low';
    delete out._think;
    const m = String(model || '');
    if (/^gemini-3/.test(m)) {
      // 3.8 flash / 3.1 pro không có "minimal" → dùng "low".
      let level = think;
      if (level === 'minimal' && !/3\.6-flash|3\.5-flash-lite|3-flash-preview/.test(m)) level = 'low';
      out.generationConfig.thinkingConfig = { thinkingLevel: level };
    } else {
      out.generationConfig.temperature = 0.3;
      if (/flash/.test(m)) {
        out.generationConfig.thinkingConfig = { thinkingBudget: think === 'medium' ? 1024 : think === 'high' ? 4096 : 0 };
      }
    }
    return out;
  }

  /** Bản "an toàn" khi model từ chối tham số tuỳ chọn (400): bỏ thinking + mediaResolution. */
  function stripOptional(body) {
    const out = JSON.parse(JSON.stringify(body));
    delete out.generationConfig.thinkingConfig;
    delete out.generationConfig.mediaResolution;
    return out;
  }

  /**
   * Phần định danh dùng làm khoá cache, hoặc null nếu yêu cầu không nên cache.
   * Chỉ cache câu hỏi "một chạm" lượt đầu, không ảnh học sinh tự gửi: khi đó câu
   * trả lời chỉ phụ thuộc bài + chế độ + đáp án đã chọn + dải trình độ.
   */
  function cacheKeyParts(req) {
    const msgs = req.messages || [];
    if (!req.quick || msgs.length !== 1 || (req.uploads && req.uploads.length)) return null;
    const c0 = req.context || {};
    // Chỉ cache bài có sẵn trong kho (ảnh đề hoặc câu hỏi ngân hàng) — giống nhau giữa học sinh.
    if ((!req.imageRefs || !req.imageRefs.length) && !c0.questionText) return null;
    if (req.mode === 'check' || req.mode === 'ask') return null;
    const c = req.context || {};
    return JSON.stringify([
      PROMPT_VERSION,
      req.mode,
      req.imageRefs,
      req.solutionRefs || [],
      c.grade || null,
      c.label || null,
      c.answerKey || null,
      c.studentAnswer || null,
      c.questionText || null,
      masteryBand(c.mastery),
      msgs[0].text || '',
    ]);
  }

  // -------------------------------------------------------------------------
  // Lộ trình học do Gia sư AI xây dựng
  // -------------------------------------------------------------------------

  const TASK_TYPES = ['theory', 'exercise', 'practice', 'review', 'test'];

  const ROADMAP_SCHEMA = {
    type: 'OBJECT',
    properties: {
      summary: { type: 'STRING' },
      strengths: { type: 'ARRAY', items: { type: 'STRING' } },
      weaknesses: { type: 'ARRAY', items: { type: 'STRING' } },
      weeks: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            week: { type: 'INTEGER' },
            focus: { type: 'STRING' },
            goal: { type: 'STRING' },
            days: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  day: { type: 'INTEGER' },
                  tasks: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      properties: {
                        type: { type: 'STRING', enum: TASK_TYPES },
                        topicId: { type: 'STRING' },
                        minutes: { type: 'INTEGER' },
                        detail: { type: 'STRING' },
                      },
                      required: ['type', 'topicId', 'minutes', 'detail'],
                    },
                  },
                },
                required: ['day', 'tasks'],
              },
            },
          },
          required: ['week', 'focus', 'goal', 'days'],
        },
      },
      tips: { type: 'ARRAY', items: { type: 'STRING' } },
    },
    required: ['summary', 'strengths', 'weaknesses', 'weeks', 'tips'],
  };

  /**
   * Bảng chủ đề dạng cột rút gọn — mỗi chủ đề 1 dòng:
   *   id|chapter|title|mastery%|flags|ex done/stuck/total|open errors
   * flags: T = đã kiểm tra, P = đã luyện tập.
   */
  function topicTable(topics) {
    return (topics || [])
      .slice(0, 40)
      .map(function (t) {
        const flags = (t.tested ? 'T' : '') + (t.practiced ? 'P' : '') || '-';
        return [
          t.id,
          t.chapter,
          clampText(t.title, 60),
          Math.round((t.mastery || 0) * 100),
          flags,
          (t.exDone || 0) + '/' + (t.exStuck || 0) + '/' + (t.exTotal || 0),
          t.errors || 0,
        ].join('|');
      })
      .join('\n');
  }

  function buildRoadmapBody(summary) {
    const sm = summary || {};
    const weeks = Math.max(1, Math.min(4, Number(sm.weeks) || 2));
    const mins = sm.dailyMinutes || 45;
    const sig = sm.signals
      ? 'careless=' + sm.signals.careless + ', concept_gaps=' + sm.signals.conceptGap +
        ', weak_application=' + (sm.signals.applicationWeak || []).join(',') + ', speed=' + sm.signals.speed
      : '';
    const prompt = [
      'TASK: personalised ' + weeks + '-week study plan. Grade ' + sm.grade + '. Goal: ' + clampText(sm.goal, 60) +
        ' (target mastery ' + Math.round((sm.target || 0.75) * 100) + '%). ' + mins + ' min/day' +
        (sm.daysLeft != null ? ', exam in ' + sm.daysLeft + ' days' : '') +
        (typeof sm.theta === 'number' ? ', theta ' + sm.theta.toFixed(2) : '') + '.',
      sig ? 'Test signals: ' + sig : '',
      'TOPICS (id|chapter|title|mastery%|T=tested,P=practised|exercises done/stuck/total|open errors):',
      topicTable(sm.topics),
      'RULES:',
      '- topicId must be an id from TOPICS. Lowest mastery + prerequisite topics first; interleave short reviews of fair topics.',
      '- Each day total minutes <= ' + mins + '. 5 study days per week, max 3 tasks per day.',
      '- type: theory | exercise (exercise bank) | practice (adaptive quiz) | review | test (retest the chapter of topicId).',
      '- All strings in Vietnamese, no LaTeX. detail <= 15 words, concrete. focus/goal: 1 short measurable sentence.',
      '- summary <= 45 words, honest + encouraging. strengths, weaknesses: 2-3 items each, based on the numbers. tips: 2-3 study-method tips.',
    ]
      .filter(Boolean)
      .join('\n');
    return {
      systemInstruction: { parts: [{ text: systemInstruction({ grade: sm.grade }) + '\nRole now: study planner; base every claim on the data.' }] },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: MODE_CFG.roadmap.maxOut,
        responseMimeType: 'application/json',
        responseSchema: ROADMAP_SCHEMA,
      },
      _think: MODE_CFG.roadmap.think,
    };
  }

  function strList(a, maxItems, maxLen) {
    return (Array.isArray(a) ? a : [])
      .filter(function (x) {
        return typeof x === 'string' && x.trim();
      })
      .slice(0, maxItems)
      .map(function (x) {
        return clampText(x.trim(), maxLen);
      });
  }

  /**
   * Kiểm lại JSON của AI: bỏ topicId lạ, giới hạn số tuần/ngày/nhiệm vụ, kẹp số
   * phút sao cho mỗi ngày không vượt quỹ thời gian. Trả về null nếu rỗng.
   */
  function sanitizeRoadmap(raw, validTopicIds, dailyMinutes) {
    if (!raw || typeof raw !== 'object') return null;
    const valid = new Set(validTopicIds || []);
    const budget = Math.max(15, Math.min(180, Number(dailyMinutes) || 45));
    const weeks = [];
    (Array.isArray(raw.weeks) ? raw.weeks : []).slice(0, 4).forEach(function (w) {
      const days = [];
      (Array.isArray(w && w.days) ? w.days : []).slice(0, 7).forEach(function (d) {
        let used = 0;
        const tasks = [];
        (Array.isArray(d && d.tasks) ? d.tasks : []).slice(0, 5).forEach(function (t) {
          if (!t || TASK_TYPES.indexOf(t.type) === -1 || !valid.has(t.topicId)) return;
          let minutes = Math.round(Number(t.minutes) || 0);
          minutes = Math.max(5, Math.min(90, minutes || 15));
          if (used + minutes > budget) minutes = budget - used;
          if (minutes < 5) return;
          used += minutes;
          tasks.push({ type: t.type, topicId: t.topicId, minutes: minutes, detail: clampText(String(t.detail || ''), 200) });
        });
        if (tasks.length) days.push({ day: days.length + 1, tasks: tasks });
      });
      if (days.length) {
        weeks.push({
          week: weeks.length + 1,
          focus: clampText(String((w && w.focus) || ''), 160),
          goal: clampText(String((w && w.goal) || ''), 200),
          days: days,
        });
      }
    });
    if (!weeks.length) return null;
    return {
      summary: clampText(String(raw.summary || ''), 800),
      strengths: strList(raw.strengths, 4, 200),
      weaknesses: strList(raw.weaknesses, 4, 200),
      tips: strList(raw.tips, 4, 240),
      weeks: weeks,
    };
  }

  return {
    PROMPT_VERSION: PROMPT_VERSION,
    MODES: MODES,
    MODE_CFG: MODE_CFG,
    MODE_RULES: MODE_RULES,
    systemInstruction: systemInstruction,
    contextBlock: contextBlock,
    masteryBand: masteryBand,
    buildGeminiBody: buildGeminiBody,
    adaptBody: adaptBody,
    cacheKeyParts: cacheKeyParts,
    stripOptional: stripOptional,
    TASK_TYPES: TASK_TYPES,
    ROADMAP_SCHEMA: ROADMAP_SCHEMA,
    topicTable: topicTable,
    buildRoadmapBody: buildRoadmapBody,
    sanitizeRoadmap: sanitizeRoadmap,
  };
});
