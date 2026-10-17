/**
 * Diagnostic runner — bài kiểm tra đầu vào thích ứng, làm THEO TỪNG CHƯƠNG.
 *
 * Học sinh chọn một chương; CAT (core/cat.js) chỉ chạy trên các chủ đề của
 * chương đó:
 *   chọn câu → trả lời → chấm → chuyển thang N→H→V→T của chủ đề
 *   → ước lượng lại θ trên TOÀN BỘ câu đã làm (mọi chương) → kiểm tra điều kiện dừng.
 *
 * Kết quả mọi chương cộng dồn vào một phiên duy nhất (kntt.diagnostic.v1), nên
 * hồ sơ năng lực, lộ trình và gợi ý bài tập dùng được ngay sau chương đầu tiên
 * và chính xác dần khi làm thêm chương. Kiểm tra lại một chương thì thay kết
 * quả cũ của chương đó (chỉ khi đã trả lời ít nhất một câu mới).
 *
 * Phiên được lưu sau mỗi câu, đóng tab giữa chừng vẫn quay lại làm tiếp được.
 */
(function (AM) {
  'use strict';

  const U = AM.util;
  const el = U.el;
  const ui = AM.ui;
  const C = AM.const;

  /** Mỗi chương: tối đa 6 câu/chủ đề (đủ leo hết thang + câu xác minh). */
  const PER_TOPIC_ITEMS = 6;
  const CHAPTER_TIME_LIMIT_MS = 25 * 60 * 1000;

  function view(params, ctx) {
    if (!ctx.hasProfile) {
      return ui.page(
        { title: 'Kiểm tra đầu vào', activeRoute: '#/diagnostic', actions: [ui.homeButton()] },
        ui.empty(
          '📝',
          'Cần thiết lập hồ sơ trước',
          'Hệ thống cần biết lớp và mục tiêu của bạn để chọn đúng ngân hàng câu hỏi.',
          el('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Thiết lập ngay'),
        ),
      );
    }

    const profile = ctx.profile;
    const pool = ctx.pool;

    if (pool.length === 0) {
      return ui.page(
        { title: 'Kiểm tra đầu vào', activeRoute: '#/diagnostic', actions: [ui.homeButton()] },
        ui.empty('📭', 'Chưa có câu hỏi', 'Ngân hàng câu hỏi cho lớp này đang trống.'),
      );
    }

    const poolById = new Map(pool.map((q) => [q.id, q]));

    // ---- Chương của khối --------------------------------------------------

    const CHAPTERS = (function () {
      const map = new Map();
      for (const t of AM.topics.getTopicsByGrade(profile.grade)) {
        if (!map.has(t.chapter)) {
          map.set(t.chapter, { no: t.chapter, title: t.chapterTitle, topics: [], ids: new Set() });
        }
        const ch = map.get(t.chapter);
        ch.topics.push(t);
        ch.ids.add(t.id);
      }
      const list = Array.from(map.values()).sort((a, b) => a.no - b.no);
      for (const ch of list) {
        ch.pool = pool.filter((q) => ch.ids.has(q.topicId));
        ch.maxItems = Math.min(C.CAT_CONFIG.maxItems, Math.max(8, PER_TOPIC_ITEMS * ch.topics.length));
      }
      return list.filter((ch) => ch.pool.length > 0);
    })();
    const CHAPTER_BY_NO = new Map(CHAPTERS.map((c) => [c.no, c]));
    const TOPIC_CHAPTER = new Map();
    for (const ch of CHAPTERS) for (const t of ch.topics) TOPIC_CHAPTER.set(t.id, ch.no);

    const container = el('div', {});
    let timerId = null;

    const rt = {
      session: null,
      chapter: null, // chương đang làm (object trong CHAPTERS)
      pendingDrop: null, // kiểm tra lại: xoá kết quả cũ khi có câu trả lời đầu tiên
      current: null,
      answer: null,
      reveal: false,
      lastScore: 0,
      secondsLeft: 0,
      screen: 'intro', // 'intro' | 'question' | 'result'
      resultChapter: null,
      debug: null,
    };

    // ---- Phiên ------------------------------------------------------------

    function freshSession() {
      const startingTheta = AM.irt.startingThetaFromSelfLevel(profile.selfLevel);
      return {
        sessionId: U.uid('cat'),
        grade: profile.grade,
        selfLevel: profile.selfLevel,
        theta: startingTheta,
        standardError: Math.sqrt(AM.irt.PRIOR_VARIANCE),
        responses: [],
        shownIds: [],
        sessionStartedAt: Date.now(),
        finished: false,
        stopReason: null,
        topicStates: {},
        chapters: {},
        activeChapter: null,
        runId: null,
        runStartedAt: 0,
        revision: 0,
      };
    }

    /**
     * Phiên cũ (kiểm tra cả khối một lần) chưa có `chapters`: suy ra chương của
     * từng câu đã làm để học sinh không phải làm lại từ đầu.
     */
    function migrate(saved) {
      const s = Object.assign({}, saved);
      if (!s.chapters) {
        s.chapters = {};
        s.responses = s.responses.map(function (r) {
          const q = poolById.get(r.questionId);
          const no = q ? TOPIC_CHAPTER.get(q.topicId) : undefined;
          return no === undefined ? r : Object.assign({}, r, { chapter: no });
        });
        for (const ch of CHAPTERS) {
          const stats = chapterStats(s, ch.no);
          if (stats.answered > 0 && s.finished) {
            s.chapters[ch.no] = {
              status: 'done',
              finishedAt: stats.lastAt,
              answered: stats.answered,
              correct: stats.correct,
            };
          }
        }
        s.activeChapter = null;
        s.runId = null;
        s.revision = s.revision || 0;
      }
      return s;
    }

    const saved = ctx.diagnostic && ctx.diagnostic.grade === profile.grade ? ctx.diagnostic : null;
    rt.session = saved ? migrate(saved) : null;

    function chapterStats(session, no) {
      let answered = 0;
      let correct = 0;
      let lastAt = 0;
      for (const r of session.responses) {
        if (r.chapter !== no) continue;
        answered++;
        if (r.score >= 0.75) correct++;
        lastAt = Math.max(lastAt, r.endedAt || 0);
      }
      return { answered: answered, correct: correct, lastAt: lastAt };
    }

    function runResponses() {
      const s = rt.session;
      return s.runId ? s.responses.filter((r) => r.runId === s.runId) : [];
    }

    /** Trạng thái CAT chỉ của lượt làm chương hiện tại. */
    function runState(shownIds) {
      const s = rt.session;
      return {
        sessionId: s.sessionId + ':' + s.runId,
        responses: runResponses(),
        shownIds: shownIds || s.shownIds,
        topicStates: s.topicStates,
        sessionStartedAt: s.runStartedAt,
      };
    }

    function stopReasonForRun() {
      const count = runResponses().length;
      if (Date.now() - rt.session.runStartedAt >= CHAPTER_TIME_LIMIT_MS) return 'time-expired';
      if (count >= rt.chapter.maxItems) return 'max-items';
      const states = Object.keys(rt.session.topicStates).map((k) => rt.session.topicStates[k]);
      if (states.length > 0 && states.every((ts) => ts.level === 'done')) return 'coverage-complete';
      return null;
    }

    function stopTimer() {
      if (timerId !== null) {
        window.clearInterval(timerId);
        timerId = null;
      }
    }

    /** Không lưu một lượt chưa có câu trả lời nào — tránh ghi đè kết quả cũ. */
    function persist(force) {
      const s = rt.session;
      if (!force && s.activeChapter !== null && runResponses().length === 0) return;
      if (!force && s.responses.length === 0 && !s.finished) return;
      AM.store.saveDiagnostic(s);
    }

    // ---- Luồng ------------------------------------------------------------

    function startChapter(no, resume) {
      const ch = CHAPTER_BY_NO.get(no);
      if (!ch) return;
      if (!rt.session) rt.session = freshSession();
      const s = rt.session;
      rt.chapter = ch;

      if (resume && s.activeChapter === no && s.runId) {
        // Ngân sách thời gian tính theo thời gian làm bài thực: cộng khoảng
        // nghỉ kể từ câu cuối vào mốc bắt đầu để không hết giờ ngay câu đầu.
        const last = runResponses().slice(-1)[0];
        const lastActive = last ? last.endedAt : s.runStartedAt;
        s.runStartedAt += Math.max(0, Date.now() - lastActive);
        rt.pendingDrop = null;
      } else {
        // Bỏ dở chương khác để sang chương này: chốt các câu đã làm của chương
        // kia thành kết quả (vẫn tính vào hồ sơ) thay vì để lơ lửng.
        if (s.activeChapter !== null && s.activeChapter !== no && runResponses().length > 0) {
          const prev = s.activeChapter;
          const st = chapterStats(s, prev);
          s.chapters[prev] = {
            status: 'done',
            finishedAt: Date.now(),
            answered: st.answered,
            correct: st.correct,
            stopReason: 'user-cancelled',
          };
          s.finished = true;
          s.revision = (s.revision || 0) + 1;
        }
        s.runId = U.uid('run');
        s.runStartedAt = Date.now();
        s.activeChapter = no;
        s.topicStates = AM.cat.initTopicStates(ch.pool, ch.topics, profile.grade);
        rt.pendingDrop = s.chapters[no] ? no : null;
      }
      rt.screen = 'question';
      nextQuestion();
    }

    function nextQuestion() {
      stopTimer();
      rt.answer = null;
      rt.reveal = false;

      const stop = stopReasonForRun();
      if (stop) return finishChapter(stop);

      let picked = AM.cat.selectNextQuestionWithDebug(rt.chapter.pool, runState());
      if (!picked) {
        // Kiểm tra lại nhiều lần có thể đã dùng hết câu chưa gặp: cho phép
        // dùng lại câu của các lượt trước, chỉ tránh câu trong lượt này.
        const runShown = runResponses().map((r) => r.questionId);
        picked = AM.cat.selectNextQuestionWithDebug(rt.chapter.pool, runState(runShown));
      }
      if (!picked) return finishChapter('no-more-items');

      rt.debug = picked.debug;
      const question = picked.chosen;
      const limitSec = AM.cat.timeLimitForItem(question);

      rt.current = { question: question, startedAt: Date.now(), limitSec: limitSec };
      rt.answer = ui.blankAnswer(question);
      rt.secondsLeft = limitSec;

      timerId = window.setInterval(function () {
        rt.secondsLeft -= 1;
        if (rt.secondsLeft <= 0) {
          // Hết giờ: chấm phần đã nhập; chưa nhập gì thì tính là bỏ qua.
          submit(true);
        } else {
          updateTimerDisplay();
        }
      }, 1000);

      rerender();
    }

    function submit(timedOut) {
      stopTimer();
      const s = rt.session;
      const question = rt.current.question;
      const answered = ui.hasAnswer(question, rt.answer);
      const score = answered ? AM.cat.gradeAnswer(question, rt.answer) : 0;

      if (rt.pendingDrop !== null) {
        // Câu đầu tiên của lượt kiểm tra lại → thay kết quả cũ của chương.
        const no = rt.pendingDrop;
        s.responses = s.responses.filter((r) => r.chapter !== no);
        rt.pendingDrop = null;
      }

      s.responses.push({
        questionId: question.id,
        startedAt: rt.current.startedAt,
        endedAt: Date.now(),
        score: score,
        answered: answered,
        timedOut: !!timedOut,
        chapter: rt.chapter.no,
        runId: s.runId,
      });
      s.shownIds.push(question.id);
      s.chapters[rt.chapter.no] = Object.assign({}, s.chapters[rt.chapter.no], {
        status: 'in-progress',
      });

      const shownSet = new Set(runResponses().map((r) => r.questionId));
      s.topicStates[question.topicId] = AM.cat.transitionTopicState(
        s.topicStates[question.topicId] || { level: 'N', wrongsAtLevel: 0, ceilingLevel: 'none' },
        question,
        score >= 0.75,
        rt.chapter.pool,
        shownSet,
      );

      // θ ước lượng lại trên toàn bộ lịch sử (mọi chương).
      const estimate = AM.irt.estimateThetaFromSession(
        s.responses,
        function (id) {
          const q = poolById.get(id);
          return q ? q.irt : null;
        },
        { startingTheta: s.theta },
      );
      s.theta = estimate.theta;
      s.standardError = estimate.standardError;

      rt.lastScore = score;
      rt.reveal = true;
      persist();
      rerender();
    }

    function finishChapter(reason) {
      stopTimer();
      const s = rt.session;
      const no = rt.chapter.no;
      const answeredInRun = runResponses().length;

      if (answeredInRun === 0) {
        // Không trả lời câu nào: coi như chưa bắt đầu, giữ nguyên kết quả cũ.
        s.activeChapter = null;
        s.runId = null;
        s.topicStates = {};
        rt.pendingDrop = null;
        rt.screen = 'intro';
        rerender();
        return;
      }

      const stats = chapterStats(s, no);
      s.chapters[no] = {
        status: 'done',
        finishedAt: Date.now(),
        answered: stats.answered,
        correct: stats.correct,
        stopReason: reason,
      };
      s.activeChapter = null;
      s.runId = null;
      s.topicStates = {};
      s.finished = true;
      s.stopReason = reason;
      s.revision = (s.revision || 0) + 1;
      persist(true);

      rt.resultChapter = no;
      rt.screen = 'result';
      rerender();
    }

    function cancel() {
      const hasAnswers = runResponses().length > 0;
      const msg = hasAnswers
        ? 'Dừng kiểm tra chương này? Các câu đã trả lời vẫn được tính vào hồ sơ.'
        : 'Thoát chương này?';
      if (!window.confirm(msg)) return;
      finishChapter('user-cancelled');
    }

    // ---- Hiển thị: danh sách chương -------------------------------------

    function nextUntested(afterNo) {
      const s = rt.session;
      const done = (no) => s && s.chapters[no] && s.chapters[no].status === 'done';
      return (
        CHAPTERS.find((c) => c.no > afterNo && !done(c.no)) ||
        CHAPTERS.find((c) => !done(c.no)) ||
        null
      );
    }

    function chapterRow(ch) {
      const s = rt.session;
      const info = s && s.chapters ? s.chapters[ch.no] : null;
      const inProgress =
        s && s.activeChapter === ch.no && s.runId && runResponses().length > 0;
      const done = info && info.status === 'done';
      const stats = s ? chapterStats(s, ch.no) : { answered: 0, correct: 0 };

      let statusNode;
      if (inProgress) statusNode = ui.pill('Đang làm dở · ' + runResponses().length + ' câu', 'amber', 'pending');
      else if (done && stats.answered > 0)
        statusNode = ui.pill(
          'Đúng ' + stats.correct + '/' + stats.answered + ' · ' + U.pct(stats.correct / stats.answered),
          stats.correct / stats.answered >= 0.7 ? 'green' : stats.correct / stats.answered >= 0.4 ? 'sky' : 'rose',
          'check_circle',
        );
      else statusNode = ui.pill('Chưa kiểm tra', 'violet');

      return el(
        'div',
        { class: 'diag-ch' },
        el(
          'div',
          { class: 'grow stack-sm' },
          el(
            'div',
            { class: 'row' },
            el('span', { class: 'ex-ch-no' }, 'Chương ' + ch.no),
            el('strong', { class: 'diag-ch-title' }, ch.title),
          ),
          el(
            'div',
            { class: 'muted-sm' },
            ch.topics.length + ' chủ đề: ' + ch.topics.map((t) => t.title).join(' · '),
          ),
          el(
            'div',
            { class: 'row' },
            statusNode,
            el('span', { class: 'muted-sm' }, '≤ ' + ch.maxItems + ' câu'),
            done && info.finishedAt
              ? el('span', { class: 'muted-sm' }, 'làm ngày ' + new Date(info.finishedAt).toLocaleDateString('vi-VN'))
              : null,
          ),
        ),
        el(
          'div',
          { class: 'diag-ch-actions' },
          inProgress
            ? el(
                'button',
                { class: 'btn btn-lime btn-sm', type: 'button', onclick: () => startChapter(ch.no, true) },
                'Tiếp tục',
                U.icon('play_arrow'),
              )
            : null,
          el(
            'button',
            {
              class: U.cn('btn btn-sm', inProgress || done ? 'btn-ghost' : 'btn-primary'),
              type: 'button',
              onclick: () => startChapter(ch.no, false),
            },
            done || inProgress ? 'Kiểm tra lại' : 'Bắt đầu',
          ),
        ),
      );
    }

    function introScreen() {
      const s = rt.session;
      const doneCount = s ? CHAPTERS.filter((c) => s.chapters[c.no] && s.chapters[c.no].status === 'done').length : 0;
      const suggestion = nextUntested(0);
      return el(
        'div',
        { class: 'stack' },
        el(
          'div',
          { class: 'card stack-sm' },
          el('div', { style: { fontSize: '2.5rem' } }, '🧭'),
          el('h1', { class: 'page-title' }, 'Kiểm tra đầu vào theo từng chương'),
          el(
            'p',
            { class: 'page-sub' },
            'Chọn một chương để kiểm tra. Trong chương, bài kiểm tra đi qua từng chủ đề theo thang ' +
              'Nhận biết → Thông hiểu → Vận dụng: đúng thì lên mức khó hơn, sai thì có một câu xác minh ' +
              'trước khi chuyển chủ đề. Kết quả các chương được cộng dồn vào hồ sơ năng lực — làm xong ' +
              'chương nào, hồ sơ và gợi ý bài tập cập nhật ngay chương đó.',
          ),
          el(
            'div',
            { class: 'grid-3' },
            ui.statTile(doneCount + '/' + CHAPTERS.length, 'Chương đã kiểm tra'),
            ui.statTile(s && s.responses.length ? 'θ ≈ ' + s.theta.toFixed(2) : '—', 'Năng lực ước lượng'),
            ui.statTile('90–180s', 'Mỗi câu'),
          ),
          ui.banner(
            'info',
            'Gợi ý: kiểm tra các chương bạn đã học trên lớp trước. Có thể dừng giữa chừng — tiến trình được lưu lại.',
          ),
          el(
            'div',
            { class: 'row' },
            suggestion
              ? el(
                  'button',
                  { class: 'btn btn-lime', type: 'button', onclick: () => startChapter(suggestion.no, false) },
                  doneCount === 0 ? 'Bắt đầu với Chương ' + suggestion.no : 'Làm tiếp Chương ' + suggestion.no,
                  U.icon('trending_flat'),
                )
              : null,
            s && s.finished
              ? el('a', { class: 'btn btn-ghost', href: '#/profile' }, 'Xem hồ sơ năng lực')
              : null,
          ),
        ),
        el(
          'section',
          { class: 'card stack-sm' },
          el('h2', { class: 'card-title' }, U.icon('format_list_numbered'), 'Các chương của ' + C.GRADE_LABELS[profile.grade]),
          CHAPTERS.map(chapterRow),
        ),
      );
    }

    // ---- Hiển thị: kết quả một chương -----------------------------------

    function resultScreen() {
      const s = rt.session;
      const ch = CHAPTER_BY_NO.get(rt.resultChapter);
      const stats = chapterStats(s, ch.no);
      const next = nextUntested(ch.no);

      const perTopic = ch.topics.map(function (t) {
        let n = 0;
        let ok = 0;
        let best = null;
        for (const r of s.responses) {
          if (r.chapter !== ch.no) continue;
          const q = poolById.get(r.questionId);
          if (!q || q.topicId !== t.id) continue;
          n++;
          if (r.score >= 0.75) {
            ok++;
            if (!best || C.LADDER_ORDER.indexOf(q.level) > C.LADDER_ORDER.indexOf(best)) best = q.level;
          }
        }
        return { topic: t, n: n, ok: ok, best: best };
      });

      return el(
        'div',
        { class: 'card stack-sm' },
        el('div', { style: { fontSize: '2.5rem' } }, '✅'),
        el('div', { class: 'section-label' }, 'Đã xong Chương ' + ch.no),
        el('h1', { class: 'page-title' }, ch.title),
        el(
          'div',
          { class: 'grid-3' },
          ui.statTile(stats.correct + '/' + stats.answered, 'Câu đúng'),
          ui.statTile(stats.answered ? U.pct(stats.correct / stats.answered) : '—', 'Tỉ lệ đúng'),
          ui.statTile('θ ≈ ' + s.theta.toFixed(2), 'Năng lực ước lượng'),
        ),
        el(
          'div',
          { class: 'list' },
          perTopic.map((p) =>
            el(
              'div',
              { class: 'list-row' },
              el('span', { class: 'grow' }, p.topic.title),
              ui.pill(p.ok + '/' + p.n + ' đúng', p.n && p.ok / p.n >= 0.7 ? 'green' : p.ok ? 'sky' : 'rose'),
              p.best ? ui.levelChip(p.best) : ui.pill('Chưa vượt mức nào', 'rose'),
            ),
          ),
        ),
        el(
          'div',
          { class: 'row' },
          next
            ? el(
                'button',
                { class: 'btn btn-lime', type: 'button', onclick: () => startChapter(next.no, false) },
                'Kiểm tra Chương ' + next.no,
                U.icon('trending_flat'),
              )
            : null,
          el('a', { class: 'btn btn-primary', href: '#/profile' }, 'Xem hồ sơ năng lực'),
          el('a', { class: 'btn btn-ghost', href: '#/exercises' }, 'Làm bài tập gợi ý'),
          el(
            'button',
            {
              class: 'btn btn-ghost',
              type: 'button',
              onclick: function () {
                rt.screen = 'intro';
                rerender();
              },
            },
            'Danh sách chương',
          ),
        ),
      );
    }

    // ---- Hiển thị: câu hỏi ----------------------------------------------

    function syncSubmitButton(question) {
      const btn = U.qs('#cat-submit', container);
      if (btn) btn.disabled = !ui.hasAnswer(question, rt.answer);
    }

    function updateTimerDisplay() {
      const node = U.qs('#cat-timer', container);
      if (!node) return;
      node.textContent = U.formatClock(rt.secondsLeft);
      node.parentNode.className = U.cn('timer', rt.secondsLeft <= 15 && 'is-low');
    }

    function progressHeader() {
      const answered = runResponses().length;
      const states = rt.session.topicStates;
      const doneTopics = Object.keys(states).filter((k) => states[k].level === 'done').length;
      const totalTopics = Object.keys(states).length;

      return el(
        'div',
        { class: 'card card-tight stack-sm' },
        el(
          'div',
          { class: 'row', style: { justifyContent: 'space-between' } },
          el(
            'div',
            { class: 'row' },
            ui.pill('Chương ' + rt.chapter.no, 'teal', 'bookmark'),
            ui.pill('Câu ' + (answered + (rt.reveal ? 0 : 1)) + ' / ≤ ' + rt.chapter.maxItems, 'green', 'quiz'),
            ui.pill('Chủ đề xong: ' + doneTopics + '/' + totalTopics, 'sky', 'checklist'),
            ui.pill('θ ≈ ' + rt.session.theta.toFixed(2), 'violet', 'analytics'),
          ),
          el(
            'span',
            { class: U.cn('timer', rt.secondsLeft <= 15 && 'is-low') },
            U.icon('timer'),
            el('span', { id: 'cat-timer' }, U.formatClock(rt.secondsLeft)),
          ),
        ),
        ui.bar(totalTopics > 0 ? doneTopics / totalTopics : 0),
      );
    }

    function feedbackBox() {
      const correct = rt.lastScore >= 0.75;
      const partial = rt.lastScore > 0 && rt.lastScore < 0.75;
      return ui.banner(
        correct ? 'info' : partial ? 'warn' : 'error',
        el(
          'div',
          {},
          el('strong', {}, correct ? 'Chính xác!' : partial ? 'Đúng một phần.' : 'Chưa đúng.'),
          ' Điểm câu này: ' + U.pct(rt.lastScore) + '.',
        ),
      );
    }

    function questionScreen() {
      const question = rt.current.question;
      const topic = AM.topics.getTopicById(question.topicId);

      /**
       * Chỉ thay thẻ câu hỏi khi đổi đáp án: dựng lại cả trang sẽ khởi động
       * lại bộ đếm giờ và làm mất vị trí con trỏ ở ô trả lời ngắn.
       */
      function handleAnswerChange(next) {
        const isText = question.type === 'shortans';
        rt.answer = next;
        if (isText) {
          syncSubmitButton(question);
          return;
        }
        const box = U.qs('.qbox', container);
        if (!box) return;
        const fresh = ui.questionCard(question, { answer: rt.answer, reveal: rt.reveal }, handleAnswerChange);
        box.parentNode.replaceChild(fresh, box);
        syncSubmitButton(question);
      }

      return el(
        'div',
        { class: 'stack-sm' },
        progressHeader(),
        el('p', { class: 'muted-sm' }, topic ? topic.chapterTitle + ' · ' + topic.title : question.topicId),
        ui.questionCard(question, { answer: rt.answer, reveal: rt.reveal }, handleAnswerChange),
        rt.reveal ? feedbackBox() : null,
        rt.reveal ? ui.solutionBlock(question) : null,
        el(
          'div',
          { class: 'row', style: { justifyContent: 'space-between' } },
          el('button', { class: 'btn btn-danger btn-sm', onclick: cancel }, 'Dừng chương này'),
          rt.reveal
            ? el(
                'button',
                { class: 'btn btn-primary', onclick: nextQuestion },
                'Câu tiếp theo',
                U.icon('chevron_right'),
              )
            : el(
                'div',
                { class: 'row' },
                el('button', { class: 'btn btn-outline', onclick: () => submit(true) }, 'Bỏ qua'),
                el(
                  'button',
                  {
                    id: 'cat-submit',
                    class: 'btn btn-lime',
                    disabled: !ui.hasAnswer(question, rt.answer),
                    onclick: () => submit(false),
                  },
                  'Trả lời',
                ),
              ),
        ),
        debugPanel(),
      );
    }

    function debugPanel() {
      if (!rt.debug) return null;
      return el(
        'details',
        { class: 'debug' },
        el('summary', {}, 'Vì sao câu này được chọn?'),
        el(
          'div',
          { class: 'stack-sm', style: { marginTop: '0.75rem' } },
          el(
            'p',
            { class: 'muted-sm' },
            'Giai đoạn: ',
            el('strong', {}, rt.debug.phase === 'coverage' ? 'phủ chủ đề' : 'leo thang'),
            ' — ',
            rt.debug.phase === 'coverage'
              ? 'ưu tiên chủ đề trong chương chưa được hỏi lần nào.'
              : 'ưu tiên chủ đề có ít lượt hỏi nhất để leo tiếp thang.',
          ),
          el(
            'div',
            { class: 'list' },
            rt.debug.topicRanking.map(function (t) {
              const tp = AM.topics.getTopicById(t.topicId);
              return el(
                'div',
                { class: 'list-row' },
                el('span', { class: 'grow muted-sm' }, tp ? tp.title : t.topicId),
                ui.pill(t.attempts + ' lượt', 'green'),
                ui.pill('mức ' + t.level, 'sky'),
                t.wrongsAtLevel ? ui.pill('đang xác minh', 'amber') : null,
              );
            }),
          ),
        ),
      );
    }

    function rerender() {
      let body;
      if (rt.screen === 'question') body = questionScreen();
      else if (rt.screen === 'result') body = resultScreen();
      else body = introScreen();
      U.mount(
        container,
        ui.page(
          {
            title: rt.screen === 'question' ? 'Kiểm tra · Chương ' + rt.chapter.no : 'Kiểm tra đầu vào',
            activeRoute: '#/diagnostic',
            actions: [ui.homeButton()],
          },
          body,
        ),
      );
      window.scrollTo(0, 0);
    }

    // `#/diagnostic?chapter=3` mở thẳng chương 3 (dùng từ hồ sơ năng lực).
    const wanted = Number(params.chapter);
    if (wanted && CHAPTER_BY_NO.has(wanted)) {
      const s = rt.session;
      startChapter(wanted, !!(s && s.activeChapter === wanted && s.runId));
    } else {
      rerender();
    }

    // Router gọi cleanup trước khi chuyển trang để bộ đếm giờ không chạy tiếp.
    return { node: container, cleanup: stopTimer };
  }

  AM.views = AM.views || {};
  AM.views.diagnostic = view;
})(window.AM);
