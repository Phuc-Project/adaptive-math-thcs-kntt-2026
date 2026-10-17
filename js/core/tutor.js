/**
 * Gia sư AI — phía trình duyệt.
 *
 * ask(request, onDelta) gửi câu hỏi lên /api/tutor (Cloudflare Pages Function)
 * kèm Firebase ID token, đọc luồng SSE và gọi onDelta(chữ) mỗi khi có thêm
 * chữ — học sinh thấy câu trả lời hiện dần, không phải chờ cả đoạn.
 *
 * Chế độ thử trên máy: khi chạy bằng `python -m http.server` không có
 * /api/tutor. Nếu đã dán khóa Gemini vào ô "Chế độ thử" (lưu localStorage của
 * máy đó), client gọi thẳng Gemini với cùng prompt. Chỉ dùng để thử — khi
 * deploy, khóa phải nằm ở biến môi trường của Pages, không ở trình duyệt.
 */
(function (AM) {
  'use strict';

  const P = window.AM_TUTOR_PROMPT;
  const DEV_KEY = 'am.tutor.devKey';
  const MODEL_FALLBACKS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];

  function getDevKey() {
    try {
      return window.localStorage.getItem(DEV_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setDevKey(k) {
    try {
      if (k) window.localStorage.setItem(DEV_KEY, k.trim());
      else window.localStorage.removeItem(DEV_KEY);
    } catch (e) {
      /* chế độ riêng tư: bỏ qua */
    }
  }

  async function idToken() {
    try {
      const auth = AM.fb && typeof AM.fb.auth === 'function' ? AM.fb.auth() : null;
      const user = auth && auth.currentUser;
      return user ? await user.getIdToken() : null;
    } catch (e) {
      return null;
    }
  }

  /** Đọc một luồng SSE `data: {...}` và gọi onEvent cho từng sự kiện. */
  async function readSse(response, onEvent, signal) {
    const reader = response.body.getReader();
    const dec = new TextDecoder();
    let buf = '';
    for (;;) {
      if (signal && signal.aborted) {
        reader.cancel().catch(() => {});
        break;
      }
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx).replace(/\r$/, '');
        buf = buf.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === '[DONE]') continue;
        try {
          onEvent(JSON.parse(raw));
        } catch (e) {
          /* dòng hỏng — bỏ qua */
        }
      }
    }
  }

  async function blobToB64(blob) {
    const buf = await blob.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return window.btoa(bin);
  }

  /** Gọi thẳng Gemini (chế độ thử): cùng prompt, cùng cách chỉnh theo model như máy chủ. */
  async function geminiDirect(body, key, method, signal) {
    let last = null;
    for (const m of MODEL_FALLBACKS) {
      let payload = P.adaptBody(body, m);
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await fetch(
          'https://generativelanguage.googleapis.com/v1beta/models/' + m +
            (method === 'generate' ? ':generateContent' : ':streamGenerateContent?alt=sse'),
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            body: JSON.stringify(payload),
            signal,
          },
        );
        if (res.ok) return { res: res, model: m };
        last = res.status;
        if (res.status !== 400 || attempt === 1) break;
        payload = P.stripOptional(payload);
      }
      if (last !== 404 && last !== 403) break;
    }
    throw new Error('Gemini trả lỗi ' + last + ' (kiểm tra lại khóa API).');
  }

  async function loadRefsClient(refs, signal) {
    const list = await Promise.all(
      (refs || []).slice(0, 4).map(async function (ref) {
        const res = await fetch(AM.exercises.imgUrl(ref), { signal });
        return res.ok ? { mime: 'image/webp', data: await blobToB64(await res.blob()) } : null;
      }),
    );
    return list.filter(Boolean);
  }

  /** Chế độ thử: tự lấy ảnh đề rồi gọi thẳng Gemini. */
  async function askDirect(req, key, onDelta, signal) {
    const mode = P.MODES[req.mode] ? req.mode : 'ask';
    const refImages = await loadRefsClient(req.imageRefs, signal);
    const solImages = P.MODE_CFG[mode].solImg ? await loadRefsClient(req.solutionRefs, signal) : [];
    const body = P.buildGeminiBody({
      mode: mode,
      context: req.context,
      messages: req.messages,
      refImages: refImages,
      solImages: solImages,
      uploads: req.images || [],
    });
    const { res, model } = await geminiDirect(body, key, 'stream', signal);
    let full = '';
    let usage = null;
    await readSse(
      res,
      function (evt) {
        if (evt.usageMetadata) {
          const u = evt.usageMetadata;
          usage = { in: u.promptTokenCount || 0, out: u.candidatesTokenCount || 0, think: u.thoughtsTokenCount || 0, cached: u.cachedContentTokenCount || 0 };
        }
        const cand = (evt.candidates || [])[0];
        const text = cand && cand.content ? (cand.content.parts || []).filter((p) => !p.thought).map((p) => p.text || '').join('') : '';
        if (text) {
          full += text;
          onDelta(text);
        }
      },
      signal,
    );
    return { text: full, model: model, via: 'direct', usage: usage };
  }

  // -------------------------------------------------------------------------
  // Cache trên máy: câu hỏi một chạm đã hỏi rồi thì không gọi lại (kể cả máy chủ).
  // -------------------------------------------------------------------------

  const LOCAL_CACHE = 'am.tutor.cache.v' + (P ? P.PROMPT_VERSION : 0);
  const LOCAL_MAX = 40;

  function fnv(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
  }

  function localKey(req) {
    const parts = P.cacheKeyParts({
      mode: req.mode,
      quick: req.quick,
      messages: req.messages,
      uploads: req.images,
      imageRefs: req.imageRefs,
      solutionRefs: req.solutionRefs,
      context: req.context,
    });
    return parts ? fnv(parts) : null;
  }

  function localGet(key) {
    try {
      const map = JSON.parse(window.localStorage.getItem(LOCAL_CACHE) || '{}');
      return map[key] ? map[key].t : null;
    } catch (e) {
      return null;
    }
  }

  function localPut(key, text) {
    try {
      const map = JSON.parse(window.localStorage.getItem(LOCAL_CACHE) || '{}');
      map[key] = { t: text, at: Date.now() };
      const keys = Object.keys(map);
      if (keys.length > LOCAL_MAX) {
        keys.sort((a, b) => map[a].at - map[b].at);
        for (const k of keys.slice(0, keys.length - LOCAL_MAX)) delete map[k];
      }
      window.localStorage.setItem(LOCAL_CACHE, JSON.stringify(map));
    } catch (e) {
      /* hết chỗ / chế độ riêng tư: bỏ qua */
    }
  }

  /**
   * Hỏi gia sư. Trả về Promise<{text, model, via}>; lỗi ném Error có message
   * tiếng Việt để hiện thẳng cho học sinh.
   *
   * req = { mode, context, messages:[{role,text}], imageRefs:[...], images:[{mime,data}] }
   */
  async function ask(req, onDelta, signal) {
    const lkey = P ? localKey(req) : null;
    if (lkey) {
      const hit = localGet(lkey);
      if (hit) {
        onDelta(hit);
        return { text: hit, model: null, via: 'local-cache', cached: true };
      }
    }
    const result = await askNetwork(req, onDelta, signal);
    if (lkey && result.text && !result.warning) localPut(lkey, result.text);
    return result;
  }

  async function askNetwork(req, onDelta, signal) {
    let res = null;
    try {
      const token = await idToken();
      res = await fetch('api/tutor', {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { Authorization: 'Bearer ' + token } : {},
        ),
        body: JSON.stringify(req),
        signal,
      });
    } catch (e) {
      if (signal && signal.aborted) throw e;
      res = null; // mạng lỗi → thử chế độ thử nếu có khóa
    }

    const ct = res ? res.headers.get('content-type') || '' : '';
    const noBackend = !res || res.status === 404 || res.status === 405 || res.status === 501 ||
      (res.ok && ct.indexOf('text/event-stream') === -1);
    if (noBackend) {
      const key = getDevKey();
      if (key) return askDirect(req, key, onDelta, signal);
      const err = new Error(
        'Chưa kết nối được máy chủ Gia sư AI. Khi chạy thử trên máy, hãy dán khóa Gemini vào "Chế độ thử".',
      );
      err.code = 'no-backend';
      throw err;
    }
    if (!res.ok) {
      let msg = 'Gia sư AI đang gặp lỗi (' + res.status + ').';
      try {
        msg = (await res.json()).error || msg;
      } catch (e) {
        /* giữ thông báo mặc định */
      }
      throw new Error(msg);
    }

    let full = '';
    let model = null;
    let usage = null;
    let cached = false;
    let streamError = null;
    await readSse(
      res,
      function (evt) {
        if (evt.t) {
          full += evt.t;
          onDelta(evt.t);
        }
        if (evt.error) streamError = evt.error;
        if (evt.model) model = evt.model;
        if (evt.usage) usage = evt.usage;
        if (evt.cached) cached = true;
      },
      signal,
    );
    if (streamError && !full) throw new Error(streamError);
    return { text: full, model: model, via: 'server', warning: streamError, usage: usage, cached: cached };
  }

  // -------------------------------------------------------------------------
  // Lộ trình học do Gia sư AI xây dựng
  // -------------------------------------------------------------------------

  /**
   * Tóm tắt hồ sơ để gửi AI: chỉ số liệu học tập (mastery từng chủ đề, bài tập
   * đã làm, lỗi chưa sửa, tín hiệu từ bài kiểm tra) — không có tên/email.
   */
  function buildRoadmapSummary(ctx, weeks) {
    const k = ctx.knowledge;
    const learner = ctx.learner;
    const goal = (AM.const.GOAL_OPTIONS.find((g) => g.value === ctx.profile.goal) || {}).label;
    const errorsByTopic = {};
    for (const e of learner.errors || []) {
      if (!e.resolved) errorsByTopic[e.topicId] = (errorsByTopic[e.topicId] || 0) + 1;
    }
    const topics = AM.topics.getTopicsByGrade(ctx.profile.grade).map(function (t) {
      const km = k ? k.topics.find((x) => x.topicId === t.id) : null;
      const bkt = learner.bkt[t.id];
      const prog = AM.exercises ? AM.exercises.topicProgress(learner, t.id) : { done: 0, stuck: 0, total: 0 };
      const mastery = bkt && bkt.totalAttempts > 0 ? bkt.pL : km ? km.mastery : 0.4;
      return {
        id: t.id,
        title: t.title,
        chapter: t.chapter,
        mastery: Math.round(mastery * 100) / 100,
        tested: !!(km && km.tested),
        practiced: !!(bkt && bkt.totalAttempts > 0),
        exDone: prog.done,
        exStuck: prog.stuck,
        exTotal: prog.total,
        errors: errorsByTopic[t.id] || 0,
      };
    });
    const sig = k ? k.signals : null;
    return {
      grade: ctx.profile.grade,
      goal: goal || ctx.profile.goal,
      target: k ? k.target : AM.const.TARGET_BY_GOAL[ctx.profile.goal],
      dailyMinutes: ctx.profile.dailyMinutes,
      daysLeft: ctx.profile.deadline ? AM.util.daysFromTodayVN(ctx.profile.deadline) : null,
      theta: k ? Math.round(k.theta * 100) / 100 : null,
      weeks: weeks || 2,
      signals: sig
        ? {
            careless: sig.careless.count,
            conceptGap: sig.conceptGap.count,
            applicationWeak: sig.applicationWeak.topicIds,
            speed: sig.speedProfile.kind,
          }
        : null,
      recent: (learner.sessions || []).slice(-6).map((x) => ({
        topic: x.topicId,
        correct: x.correctCount + '/' + x.questionsAttempted,
        date: x.date,
      })),
      topics: topics,
    };
  }

  /** Gọi AI lập lộ trình. Trả về { plan, model } với plan đã được kiểm lại. */
  async function roadmap(summary, signal) {
    let res = null;
    try {
      const token = await idToken();
      res = await fetch('api/tutor', {
        method: 'POST',
        headers: Object.assign(
          { 'Content-Type': 'application/json' },
          token ? { Authorization: 'Bearer ' + token } : {},
        ),
        body: JSON.stringify({ task: 'roadmap', summary: summary }),
        signal,
      });
    } catch (e) {
      if (signal && signal.aborted) throw e;
      res = null;
    }
    const ct = res ? res.headers.get('content-type') || '' : '';
    const noBackend = !res || res.status === 404 || res.status === 405 || res.status === 501 ||
      ct.indexOf('application/json') === -1;
    if (!noBackend) {
      const data = await res.json();
      if (!res.ok || !data.plan) throw new Error(data.error || 'Gia sư AI đang gặp lỗi (' + res.status + ').');
      return data;
    }
    const key = getDevKey();
    if (!key) {
      const err = new Error('Chưa kết nối được máy chủ Gia sư AI. Khi chạy thử trên máy, hãy dán khóa Gemini vào "Chế độ thử".');
      err.code = 'no-backend';
      throw err;
    }
    const body = P.buildRoadmapBody(summary);
    const { res: r, model } = await geminiDirect(body, key, 'generate', signal);
    const data = await r.json();
    const cand = (data.candidates || [])[0];
    const text = ((cand && cand.content && cand.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    let raw;
    try {
      raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
    } catch (e) {
      throw new Error('Gia sư AI trả về lộ trình không đọc được, em thử lại nhé.');
    }
    const plan = P.sanitizeRoadmap(raw, summary.topics.map((t) => t.id), summary.dailyMinutes);
    if (!plan) throw new Error('Lộ trình AI trả về không hợp lệ, em thử lại nhé.');
    return { plan: plan, model: model };
  }

  /** Thu nhỏ ảnh học sinh chụp (tối đa 1600px, JPEG) trước khi gửi. */
  async function prepareUpload(file) {
    const url = URL.createObjectURL(file);
    try {
      const img = await new Promise(function (resolve, reject) {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = () => reject(new Error('Không đọc được ảnh.'));
        im.src = url;
      });
      const scale = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const g = canvas.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, canvas.width, canvas.height);
      g.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      return { mime: 'image/jpeg', data: dataUrl.slice(dataUrl.indexOf(',') + 1), preview: dataUrl };
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  AM.tutor = {
    MODES: P ? P.MODES : {},
    ask: ask,
    getDevKey: getDevKey,
    setDevKey: setDevKey,
    prepareUpload: prepareUpload,
    buildRoadmapSummary: buildRoadmapSummary,
    roadmap: roadmap,
    _readSse: readSse,
  };
})(window.AM);
