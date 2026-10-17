/**
 * Bài tập cá nhân hóa — #/exercises
 *
 *   1. "Gợi ý hôm nay": chọn chủ đề có khoảng cách lớn nhất tới mục tiêu (theo
 *      hồ sơ năng lực + BKT), rồi chọn bài đúng mức N/H/V/T phù hợp mastery.
 *   2. "Kho bài tập theo chương": duyệt toàn bộ bài của khối, lọc theo mức,
 *      loại bài và trạng thái.
 *   3. "Ôn tập chương & đề kiểm tra".
 *
 * Mỗi lần học sinh tự đánh giá "Làm được / Chưa làm được" (hoặc chọn đáp án
 * với câu trắc nghiệm có khóa), kết quả được ghi vào LearnerState.exercises,
 * cập nhật BKT của chủ đề và cộng XP — nên gợi ý lần sau thay đổi theo.
 *
 * Cập nhật giao diện tại chỗ (thay đúng thẻ bài tập), không dựng lại cả trang,
 * để không mất vị trí cuộn khi đang làm giữa danh sách dài.
 */
(function (AM) {
  'use strict';

  const U = AM.util;
  const el = U.el;
  const ui = AM.ui;
  const C = AM.const;
  const X = AM.exercises;

  const PAGE_SIZE = 12;

  const LEVEL_FILTERS = [
    { v: 'all', label: 'Mọi mức' },
    { v: 'N', label: 'Nhận biết' },
    { v: 'H', label: 'Thông hiểu' },
    { v: 'V', label: 'Vận dụng' },
    { v: 'T', label: 'Vận dụng cao' },
  ];
  const KIND_FILTERS = [
    { v: 'all', label: 'Mọi loại' },
    { v: 'tn', label: 'Trắc nghiệm' },
    { v: 'tl', label: 'Tự luận' },
    { v: 'mau', label: 'Bài mẫu' },
  ];
  const STATUS_FILTERS = [
    { v: 'all', label: 'Tất cả' },
    { v: 'todo', label: 'Chưa làm' },
    { v: 'stuck', label: 'Chưa làm được' },
    { v: 'done', label: 'Đã làm được' },
  ];

  // -------------------------------------------------------------------------
  // Ghi kết quả — thuần dữ liệu, không đụng DOM
  // -------------------------------------------------------------------------

  /**
   * Ghi một lần tự đánh giá. BKT chỉ cập nhật khi trạng thái thay đổi, để bấm
   * "Làm được" nhiều lần trên cùng một bài không đẩy mastery lên vô hạn.
   */
  function recordResult(ctx, item, ok, answer) {
    const learner = AM.store.loadLearnerState();
    const prev = learner.exercises[item.id] || null;
    const status = ok ? 'done' : 'stuck';
    const rec = { s: status, at: Date.now() };
    if (answer) rec.a = answer;
    learner.exercises[item.id] = rec;

    let xpEarned = 0;
    if (!prev || prev.s !== status) {
      if (item.t) {
        const diag =
          ctx.knowledge && (ctx.knowledge.topics.find((t) => t.topicId === item.t) || {}).mastery;
        const before =
          learner.bkt[item.t] || AM.bkt.initBktState(typeof diag === 'number' ? diag : null);
        learner.bkt[item.t] = AM.bkt.updateBkt(before, ok);
        if (!AM.bkt.isMastered(before) && AM.bkt.isMastered(learner.bkt[item.t])) {
          xpEarned += C.XP.perTopicMastered;
        }
      }
      if (!prev) {
        const g = learner.gamification;
        xpEarned += ok ? C.XP.perCorrect : C.XP.perAttempted;
        g.totalQuestionsAttempted += 1;
        const today = U.todayVNStr();
        if (g.lastPracticeDate !== today) {
          const yesterday = U.addDaysStr(today, -1);
          g.currentStreak = g.lastPracticeDate === yesterday ? g.currentStreak + 1 : 1;
          g.longestStreak = Math.max(g.longestStreak, g.currentStreak);
          g.lastPracticeDate = today;
        }
        if (g.totalQuestionsAttempted >= 100 && g.badges.indexOf('q-100') === -1) g.badges.push('q-100');
        if (g.totalQuestionsAttempted >= 500 && g.badges.indexOf('q-500') === -1) g.badges.push('q-500');
      }
      learner.gamification.xp += xpEarned;
      learner.gamification.level = C.xpToLevel(learner.gamification.xp);
    }

    AM.store.saveLearnerState(learner);
    ctx.learner = learner;
    return xpEarned;
  }

  function clearResult(ctx, item) {
    const learner = AM.store.loadLearnerState();
    delete learner.exercises[item.id];
    AM.store.saveLearnerState(learner);
    ctx.learner = learner;
  }

  // -------------------------------------------------------------------------
  // View
  // -------------------------------------------------------------------------

  function view(params, ctx) {
    if (!ctx.hasProfile) {
      return ui.page(
        { title: 'Bài tập cá nhân hóa', activeRoute: '#/exercises', actions: [ui.homeButton()] },
        ui.empty(
          '📒',
          'Cần thiết lập hồ sơ trước',
          'Hệ thống cần biết bạn học lớp mấy để lấy đúng kho bài tập.',
          el('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Thiết lập ngay'),
        ),
      );
    }

    const grade = ctx.profile.grade;
    const all = X.forGrade(grade);
    const container = el('div', {});

    const initialTopic = params.topic && AM.topics.getTopicById(params.topic);
    const st = {
      openTopic: initialTopic && initialTopic.grade === grade ? initialTopic.id : null,
      level: 'all',
      kind: 'all',
      status: 'all',
      shown: PAGE_SIZE,
      salt: 0,
      revealed: new Set(), // id các bài đang mở hướng dẫn giải
      flash: {}, // id → thông điệp phản hồi vừa chấm
    };

    // ---- Thẻ một bài tập --------------------------------------------------

    function statusPill(item) {
      const s = X.statusOf(ctx.learner, item.id);
      if (s === 'done') return ui.pill(X.STATUS_LABELS.done, 'green', 'check_circle');
      if (s === 'stuck') return ui.pill(X.STATUS_LABELS.stuck, 'rose', 'help');
      return null;
    }

    function images(list, alt) {
      return el(
        'div',
        { class: 'ex-imgs' },
        list.map(function (im) {
          return el('img', {
            class: 'ex-img',
            src: X.imgUrl(im[0]),
            width: im[1],
            height: im[2],
            loading: 'lazy',
            decoding: 'async',
            alt: alt || 'Đề bài',
            // Ảnh cắt ở 144 dpi; hiển thị ~0,62× để chữ trong đề ≈ cỡ chữ của trang.
            style: { width: Math.round(im[1] * 0.62) + 'px' },
            title: 'Bấm để phóng to / thu nhỏ',
            onclick: function (e) {
              e.currentTarget.classList.toggle('is-zoomed');
            },
          });
        }),
      );
    }

    function refreshCard(item) {
      const old = U.qsa('[data-ex="' + item.id + '"]', container);
      for (const node of old) node.parentNode.replaceChild(exerciseCard(item), node);
      const stats = U.qs('#ex-stats', container);
      if (stats) stats.parentNode.replaceChild(statsRow(), stats);
    }

    function answerMcq(item, letter) {
      const ok = letter === item.ans;
      const xp = recordResult(ctx, item, ok, letter);
      st.flash[item.id] = ok
        ? 'Chính xác! ' + (xp ? '+' + xp + ' XP' : '')
        : 'Chưa đúng — đáp án đúng là ' + item.ans + '.';
      if (!ok && item.sol) st.revealed.add(item.id);
      refreshCard(item);
    }

    function selfAssess(item, ok) {
      const xp = recordResult(ctx, item, ok, null);
      st.flash[item.id] = ok
        ? 'Tốt lắm! ' + (xp ? '+' + xp + ' XP' : '')
        : item.sol
          ? 'Đã ghi lại. Xem hướng dẫn giải bên dưới rồi thử làm lại nhé.'
          : 'Đã ghi lại — bài này sẽ được gợi ý làm lại. Xem lại lý thuyết của chủ đề nếu cần.';
      if (!ok && item.sol) st.revealed.add(item.id);
      refreshCard(item);
    }

    /**
     * Gia sư AI cho đúng bài này: gửi tên ảnh đề (+ ảnh hướng dẫn giải nếu có,
     * chỉ để AI đối chiếu), chủ đề, mức độ và mastery hiện tại của học sinh.
     */
    function tutorLauncher(item, lesson) {
      if (!AM.tutorUI) return null;
      const topic = item.t ? AM.topics.getTopicById(item.t) : null;
      const m = item.t ? X.topicMastery(item.t, ctx) : null;
      // Ảnh đề và ảnh lời giải tách riêng: máy chủ chỉ gửi ảnh lời giải ở chế độ cần đối chiếu.
      const refs = item.img.map((im) => im[0]).slice(0, 3);
      const solRefs = (item.sol || []).map((im) => im[0]).slice(0, 2);
      const rec = ctx.learner.exercises[item.id];
      const chosen = rec && rec.a ? rec.a : null;
      const wrongMcq = chosen && item.ans && chosen !== item.ans;
      return AM.tutorUI.launcher({
        key: 'ex:' + item.id,
        mode: 'hint',
        imageRefs: refs,
        solutionRefs: solRefs,
        // Đã chọn đáp án trắc nghiệm → mở gia sư là phân tích luôn "vì sao sai/đúng".
        label: chosen ? (wrongMcq ? 'Vì sao em sai? Hỏi gia sư AI' : 'Vì sao đúng? Hỏi gia sư AI') : null,
        autoAsk: chosen ? { mode: 'explain' } : null,
        context: {
          grade: grade,
          topic: topic ? topic.chapterTitle + ' — ' + topic.title : null,
          lesson: lesson ? lesson.title : null,
          label: item.n,
          kind: X.KIND_LABELS[item.k],
          level: item.lv,
          mastery: m && m.source !== 'default' ? m.value : null,
          answerKey: item.ans || null,
          studentAnswer: chosen
            ? chosen + (item.ans ? (chosen === item.ans ? ' (đúng)' : ' (sai)') : '')
            : null,
        },
      });
    }

    function exerciseCard(item) {
      const status = X.statusOf(ctx.learner, item.id);
      const lesson = item.l ? X.lesson(item.l) : null;
      const rec = ctx.learner.exercises[item.id];
      const flash = st.flash[item.id];
      const hasKey = item.k === 'tn' && item.ans;

      let actions;
      if (hasKey) {
        const chosen = rec && rec.a;
        actions = el(
          'div',
          { class: 'ex-mcq' },
          el('span', { class: 'muted-sm' }, 'Chọn đáp án:'),
          ['A', 'B', 'C', 'D'].map(function (L) {
            return el(
              'button',
              {
                class: U.cn(
                  'ex-key',
                  chosen && L === item.ans && 'is-correct',
                  chosen && L === chosen && L !== item.ans && 'is-wrong',
                ),
                type: 'button',
                onclick: () => answerMcq(item, L),
              },
              L,
            );
          }),
        );
      } else {
        actions = el(
          'div',
          { class: 'row' },
          el(
            'button',
            {
              class: U.cn('btn btn-sm', status === 'done' ? 'btn-primary' : 'btn-outline'),
              type: 'button',
              onclick: () => selfAssess(item, true),
            },
            U.icon('check'),
            'Làm được',
          ),
          el(
            'button',
            {
              class: U.cn('btn btn-sm', status === 'stuck' ? 'btn-danger' : 'btn-ghost'),
              type: 'button',
              onclick: () => selfAssess(item, false),
            },
            U.icon('close'),
            'Chưa làm được',
          ),
        );
      }

      const solOpen = st.revealed.has(item.id);
      return el(
        'article',
        { class: U.cn('ex-card', status && 'is-' + status), 'data-ex': item.id },
        el(
          'div',
          { class: 'ex-head' },
          el('strong', { class: 'ex-label' }, item.n),
          ui.levelChip(item.lv),
          ui.pill(X.KIND_LABELS[item.k] || item.k, 'teal'),
          statusPill(item),
          el('span', { class: 'grow' }),
          status
            ? el(
                'button',
                {
                  class: 'link-btn muted-sm',
                  type: 'button',
                  title: 'Xóa đánh dấu của bài này',
                  onclick: function () {
                    clearResult(ctx, item);
                    delete st.flash[item.id];
                    refreshCard(item);
                  },
                },
                'Đặt lại',
              )
            : null,
        ),
        lesson || item.d
          ? el(
              'div',
              { class: 'muted-sm ex-sub' },
              lesson ? lesson.title : null,
              lesson && item.d ? ' · ' : null,
              item.d || null,
            )
          : null,
        images(item.img, item.q),
        el(
          'div',
          { class: 'ex-actions' },
          actions,
          item.sol
            ? el(
                'button',
                {
                  class: 'btn btn-ghost btn-sm',
                  type: 'button',
                  onclick: function () {
                    if (st.revealed.has(item.id)) st.revealed.delete(item.id);
                    else st.revealed.add(item.id);
                    refreshCard(item);
                  },
                },
                U.icon(solOpen ? 'visibility_off' : 'lightbulb'),
                solOpen ? 'Ẩn hướng dẫn' : 'Xem hướng dẫn giải',
              )
            : null,
        ),
        flash
          ? el('div', { class: U.cn('ex-flash', status === 'done' ? 'is-ok' : 'is-bad') }, flash)
          : null,
        tutorLauncher(item, lesson),
        solOpen && item.sol
          ? el(
              'div',
              { class: 'ex-sol' },
              el('div', { class: 'section-label' }, 'Hướng dẫn giải'),
              images(item.sol, 'Hướng dẫn giải ' + item.n),
            )
          : null,
      );
    }

    // ---- Khối thống kê đầu trang -----------------------------------------

    function statsRow() {
      let done = 0;
      let stuck = 0;
      for (const x of all) {
        const s = X.statusOf(ctx.learner, x.id);
        if (s === 'done') done++;
        else if (s === 'stuck') stuck++;
      }
      return el(
        'div',
        { class: 'grid-3', id: 'ex-stats' },
        ui.statTile(String(all.length), 'Bài tập lớp ' + grade),
        ui.statTile(String(done), 'Đã làm được'),
        ui.statTile(String(stuck), 'Cần làm lại'),
      );
    }

    // ---- 1. Gợi ý hôm nay -------------------------------------------------

    function recommendCard() {
      const recs = X.recommend(ctx, { salt: st.salt ? String(st.salt) : '' });
      if (recs.length === 0) {
        return ui.sectionCard(
          [U.icon('auto_awesome'), 'Gợi ý cho bạn hôm nay'],
          null,
          el('p', { class: 'muted' }, 'Bạn đã làm hết các bài tập của khối này. Tuyệt vời!'),
        );
      }
      return ui.sectionCard(
        [U.icon('auto_awesome'), 'Gợi ý cho bạn hôm nay'],
        ctx.hasDiagnostic
          ? 'Chọn theo hồ sơ năng lực và kết quả luyện tập: chủ đề còn xa mục tiêu nhất được ưu tiên, bài được chọn đúng mức bạn cần.'
          : 'Chưa có kết quả kiểm tra đầu vào — gợi ý đang dùng mức mặc định. Làm bài kiểm tra theo chương để gợi ý sát hơn.',
        recs.map(function (r) {
          return el(
            'div',
            { class: 'ex-rec stack-sm' },
            el(
              'div',
              { class: 'row' },
              el('h3', { class: 'ex-rec-title grow' }, r.topic.title),
              r.source !== 'default' ? ui.bandChip(r.mastery) : null,
              el(
                'button',
                {
                  class: 'btn btn-ghost btn-sm',
                  type: 'button',
                  onclick: () => openTopic(r.topic.id, true),
                },
                'Mở cả chủ đề',
              ),
            ),
            el('p', { class: 'muted-sm' }, r.topic.chapterTitle + ' · ' + r.reason),
            r.items.map(exerciseCard),
          );
        }),
        el(
          'div',
          { class: 'row' },
          el(
            'button',
            {
              class: 'btn btn-outline btn-sm',
              type: 'button',
              onclick: function () {
                st.salt += 1;
                const node = U.qs('#ex-rec', container);
                if (node) node.parentNode.replaceChild(wrapRec(), node);
              },
            },
            U.icon('refresh'),
            'Đổi bộ gợi ý khác',
          ),
          !ctx.hasDiagnostic
            ? el('a', { class: 'btn btn-lime btn-sm', href: '#/diagnostic' }, 'Kiểm tra đầu vào theo chương')
            : null,
        ),
      );
    }

    function wrapRec() {
      return el('div', { id: 'ex-rec' }, recommendCard());
    }

    // ---- 2. Kho bài tập theo chương --------------------------------------

    function chapters() {
      const map = new Map();
      for (const t of AM.topics.getTopicsByGrade(grade)) {
        if (!map.has(t.chapter)) map.set(t.chapter, { no: t.chapter, title: t.chapterTitle, topics: [] });
        map.get(t.chapter).topics.push(t);
      }
      return Array.from(map.values()).sort((a, b) => a.no - b.no);
    }

    function filtered(topicId) {
      return X.forTopic(topicId).filter(function (x) {
        if (st.level !== 'all' && x.lv !== st.level) return false;
        if (st.kind !== 'all' && x.k !== st.kind) return false;
        const s = X.statusOf(ctx.learner, x.id);
        if (st.status === 'todo' && s) return false;
        if (st.status !== 'all' && st.status !== 'todo' && s !== st.status) return false;
        return true;
      });
    }

    function chipGroup(options, current, onPick) {
      return el(
        'div',
        { class: 'ex-chips' },
        options.map((o) =>
          el(
            'button',
            {
              type: 'button',
              class: U.cn('ex-chip', current === o.v && 'is-active'),
              onclick: () => onPick(o.v),
            },
            o.label,
          ),
        ),
      );
    }

    function refreshPanel() {
      const node = U.qs('#ex-panel', container);
      if (node) node.parentNode.replaceChild(topicPanel(st.openTopic), node);
    }

    function topicPanel(topicId) {
      const items = filtered(topicId);
      const visible = items.slice(0, st.shown);
      // Nhóm theo bài học trong tài liệu gốc để học sinh thấy mạch kiến thức.
      const groups = [];
      for (const x of visible) {
        const key = x.l || '—';
        let g = groups[groups.length - 1];
        if (!g || g.key !== key) {
          g = { key: key, items: [] };
          groups.push(g);
        }
        g.items.push(x);
      }
      const pick = (field) => (v) => {
        st[field] = v;
        st.shown = PAGE_SIZE;
        refreshPanel();
      };
      return el(
        'div',
        { class: 'ex-panel stack-sm', id: 'ex-panel' },
        el(
          'div',
          { class: 'row' },
          el(
            'a',
            { class: 'btn btn-ghost btn-sm', href: '#/theory?topic=' + encodeURIComponent(topicId) },
            U.icon('menu_book'),
            'Lý thuyết',
          ),
          el(
            'a',
            {
              class: 'btn btn-ghost btn-sm',
              href: '#/practice?topic=' + encodeURIComponent(topicId) + '&levels=N,H,V&count=8',
            },
            U.icon('quiz'),
            'Luyện trắc nghiệm thích ứng',
          ),
        ),
        chipGroup(LEVEL_FILTERS, st.level, pick('level')),
        chipGroup(KIND_FILTERS, st.kind, pick('kind')),
        chipGroup(STATUS_FILTERS, st.status, pick('status')),
        el('p', { class: 'muted-sm' }, items.length + ' bài phù hợp bộ lọc'),
        items.length === 0
          ? el('p', { class: 'muted' }, 'Không có bài nào khớp bộ lọc.')
          : groups.map((g) =>
              el(
                'div',
                { class: 'stack-sm' },
                g.key !== '—' && X.lesson(g.key)
                  ? el('h4', { class: 'ex-lesson' }, X.lesson(g.key).title)
                  : null,
                g.items.map(exerciseCard),
              ),
            ),
        items.length > visible.length
          ? el(
              'button',
              {
                class: 'btn btn-outline',
                type: 'button',
                onclick: function () {
                  st.shown += PAGE_SIZE;
                  refreshPanel();
                },
              },
              'Xem thêm ' + Math.min(PAGE_SIZE, items.length - visible.length) + ' bài',
            )
          : null,
      );
    }

    function openTopic(topicId, forceOpen) {
      st.openTopic = !forceOpen && st.openTopic === topicId ? null : topicId;
      st.level = 'all';
      st.kind = 'all';
      st.status = 'all';
      st.shown = PAGE_SIZE;
      const node = U.qs('#ex-browse', container);
      if (node) node.parentNode.replaceChild(browseCard(), node);
      if (st.openTopic) scrollToTopic(st.openTopic);
    }

    function scrollToTopic(topicId) {
      window.requestAnimationFrame(function () {
        const row = U.qs('[data-topic="' + topicId + '"]', container);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }

    function topicRow(t) {
      const prog = X.topicProgress(ctx.learner, t.id);
      const m = X.topicMastery(t.id, ctx);
      const isOpen = st.openTopic === t.id;
      return el(
        'div',
        { class: 'stack-sm ex-topic-wrap', 'data-topic': t.id },
        el(
          'button',
          {
            class: U.cn('ex-topic', isOpen && 'is-open'),
            type: 'button',
            disabled: prog.total === 0,
            onclick: () => openTopic(t.id),
          },
          el(
            'div',
            { class: 'grow stack-sm' },
            el('div', { class: 'ex-topic-title' }, t.title),
            el(
              'div',
              { class: 'muted-sm' },
              prog.total === 0
                ? 'Tài liệu chưa có bài tập cho chủ đề này'
                : prog.total +
                    ' bài · đã làm được ' +
                    prog.done +
                    (prog.stuck ? ' · cần làm lại ' + prog.stuck : ''),
            ),
            prog.total ? ui.bar(prog.done / prog.total) : null,
          ),
          m.source !== 'default' ? ui.bandChip(m.value) : null,
          U.icon(isOpen ? 'expand_less' : 'expand_more'),
        ),
        isOpen ? topicPanel(t.id) : null,
      );
    }

    function browseCard() {
      return el(
        'section',
        { class: 'card stack-sm', id: 'ex-browse' },
        el('h2', { class: 'card-title' }, U.icon('library_books'), 'Kho bài tập theo chương'),
        el(
          'p',
          { class: 'muted-sm' },
          'Bài tập được phân loại theo khối → chương → chủ đề, giữ nguyên đề trong tài liệu gốc. ' +
            'Bấm vào ảnh đề để phóng to.',
        ),
        chapters().map(function (ch) {
          const total = ch.topics.reduce((a, t) => a + X.countForTopic(t.id), 0);
          const hasOpen = ch.topics.some((t) => t.id === st.openTopic);
          return el(
            'details',
            { class: 'ex-chapter', open: hasOpen || null },
            el(
              'summary',
              {},
              el('span', { class: 'ex-ch-no' }, 'Chương ' + ch.no),
              el('span', { class: 'grow' }, ch.title),
              el('span', { class: 'muted-sm' }, total + ' bài'),
            ),
            el('div', { class: 'stack-sm ex-ch-body' }, ch.topics.map(topicRow)),
          );
        }),
      );
    }

    // ---- 3. Ôn tập chương & đề kiểm tra ----------------------------------

    function extrasCard() {
      const extras = X.extrasForGrade(grade);
      if (extras.length === 0) return null;
      const groups = new Map();
      for (const x of extras) {
        const key = x.k === 'exam' ? 'Đề kiểm tra tổng hợp' : 'Ôn tập chương ' + (x.ch || '');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(x);
      }
      return el(
        'section',
        { class: 'card stack-sm' },
        el('h2', { class: 'card-title' }, U.icon('assignment'), 'Ôn tập chương & đề kiểm tra'),
        Array.from(groups.entries()).map(([title, list]) =>
          el(
            'details',
            { class: 'ex-chapter' },
            el(
              'summary',
              {},
              el('span', { class: 'grow' }, title),
              el('span', { class: 'muted-sm' }, list.length + ' mục'),
            ),
            el('div', { class: 'stack-sm ex-ch-body' }, list.map(exerciseCard)),
          ),
        ),
      );
    }

    // ---- Lắp trang --------------------------------------------------------

    if (all.length === 0) {
      return ui.page(
        { title: 'Bài tập cá nhân hóa', activeRoute: '#/exercises', actions: [ui.homeButton()] },
        ui.empty('📭', 'Chưa có bài tập', 'Kho bài tập cho ' + C.GRADE_LABELS[grade] + ' đang trống.'),
      );
    }

    U.mount(
      container,
      ui.page(
        { title: 'Bài tập cá nhân hóa', activeRoute: '#/exercises', actions: [ui.homeButton()] },
        el(
          'section',
          { class: 'stack-sm' },
          el('div', { class: 'section-label' }, C.GRADE_LABELS[grade] + ' · Kết nối tri thức'),
          el('h1', { class: 'page-title' }, 'Bài tập cá nhân hóa'),
          el(
            'p',
            { class: 'page-sub' },
            'Làm bài ra giấy, rồi tự đánh giá "Làm được / Chưa làm được". Câu trắc nghiệm có đáp án ' +
              'được chấm ngay. Mỗi kết quả cập nhật mức thành thạo của chủ đề và thay đổi gợi ý lần sau.',
          ),
          statsRow(),
        ),
        wrapRec(),
        browseCard(),
        extrasCard(),
        ui.footerNote(),
      ),
    );

    if (st.openTopic) scrollToTopic(st.openTopic);
    return container;
  }

  AM.views = AM.views || {};
  AM.views.exercises = view;
})(window.AM);
