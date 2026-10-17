/**
 * Lộ trình học do Gia sư AI xây dựng — thẻ hiển thị ở trang Lộ trình học và Hồ sơ.
 *
 * Bổ sung (không thay thế) lộ trình thuật toán của pathGenerator.js:
 *   - pathGenerator: xếp lịch theo công thức ưu tiên, luôn chạy được, không cần mạng.
 *   - Gia sư AI: đọc cùng hồ sơ năng lực + bài tập đã làm + lỗi chưa sửa, rồi viết
 *     kế hoạch theo tuần có lý giải (vì sao học chủ đề này trước, mục tiêu tuần,
 *     điểm mạnh/yếu, lời khuyên phương pháp). Mọi topicId và số phút đã được
 *     sanitizeRoadmap() kiểm lại trước khi tới đây.
 *
 * Kết quả lưu ở LearnerState.aiRoadmap (đồng bộ lên tài khoản), kèm `basedOn`
 * = sessionId của hồ sơ lúc lập, để báo khi hồ sơ đã thay đổi.
 */
(function (AM) {
  'use strict';

  const U = AM.util;
  const el = U.el;
  const ui = AM.ui;

  const TYPE_META = {
    theory: { label: 'Lý thuyết', icon: 'menu_book', tone: 'sky' },
    exercise: { label: 'Bài tập', icon: 'library_books', tone: 'teal' },
    practice: { label: 'Luyện tập', icon: 'quiz', tone: 'green' },
    review: { label: 'Ôn tập', icon: 'history', tone: 'violet' },
    test: { label: 'Kiểm tra chương', icon: 'fact_check', tone: 'amber' },
  };

  function taskHref(t) {
    const topic = AM.topics.getTopicById(t.topicId);
    const q = encodeURIComponent(t.topicId);
    switch (t.type) {
      case 'theory':
        return '#/theory?topic=' + q;
      case 'exercise':
        return '#/exercises?topic=' + q;
      case 'review':
        return '#/practice?topic=' + q + '&levels=H,V&count=5';
      case 'test':
        return topic ? '#/diagnostic?chapter=' + topic.chapter : '#/diagnostic';
      default:
        return '#/practice?topic=' + q + '&levels=N,H,V&count=8';
    }
  }

  // Trạng thái đang tải (giữ qua các lần vẽ lại trang).
  const RT = { busy: false, error: null, errorCode: null, weeks: 2 };

  function card(ctx) {
    const wrap = el('section', { class: 'card stack-sm ai-roadmap', id: 'ai-roadmap' });

    function save(mutator) {
      const learner = AM.store.loadLearnerState();
      mutator(learner);
      AM.store.saveLearnerState(learner);
      ctx.learner = learner;
    }

    async function build() {
      if (RT.busy) return;
      // Tiết kiệm lượt gọi: hồ sơ chưa đổi và lộ trình còn mới thì hỏi lại trước khi lập lại.
      const cur = ctx.learner.aiRoadmap;
      if (
        cur &&
        ctx.knowledge &&
        cur.basedOn === ctx.knowledge.sessionId &&
        cur.weeks === RT.weeks &&
        Date.now() - new Date(cur.builtAt).getTime() < 7 * 86400000 &&
        !window.confirm('Hồ sơ năng lực chưa thay đổi kể từ lần lập trước. Vẫn nhờ Gia sư AI lập lại?')
      ) {
        return;
      }
      RT.busy = true;
      RT.error = null;
      RT.errorCode = null;
      draw();
      try {
        const summary = AM.tutor.buildRoadmapSummary(ctx, RT.weeks);
        const res = await AM.tutor.roadmap(summary);
        save(function (l) {
          l.aiRoadmap = {
            plan: res.plan,
            model: res.model || null,
            builtAt: new Date().toISOString(),
            basedOn: ctx.knowledge ? ctx.knowledge.sessionId : null,
            weeks: RT.weeks,
            done: {},
          };
        });
      } catch (e) {
        RT.error = e.message || String(e);
        RT.errorCode = e.code || null;
      } finally {
        RT.busy = false;
        draw();
      }
    }

    function weeksPicker() {
      return el(
        'div',
        { class: 'row' },
        el('span', { class: 'muted-sm' }, 'Độ dài:'),
        [1, 2, 3, 4].map((n) =>
          el(
            'button',
            {
              type: 'button',
              class: U.cn('ex-chip', RT.weeks === n && 'is-active'),
              onclick: function () {
                RT.weeks = n;
                draw();
              },
            },
            n + ' tuần',
          ),
        ),
      );
    }

    function devKeyBox() {
      const input = el('input', { class: 'field', type: 'password', placeholder: 'Dán khóa Gemini API (chỉ lưu trên máy này)' });
      return el(
        'div',
        { class: 'tutor-dev stack-sm' },
        el('p', { class: 'muted-sm' }, 'Chế độ thử trên máy (chưa có /api/tutor): dán khóa Gemini để thử.'),
        el(
          'div',
          { class: 'row' },
          input,
          el(
            'button',
            {
              type: 'button',
              class: 'btn btn-sm btn-primary',
              onclick: function () {
                if (!input.value.trim()) return;
                AM.tutor.setDevKey(input.value);
                RT.error = null;
                RT.errorCode = null;
                draw();
              },
            },
            'Lưu khóa',
          ),
        ),
      );
    }

    function taskRow(t, key, done) {
      const topic = AM.topics.getTopicById(t.topicId);
      const meta = TYPE_META[t.type] || TYPE_META.practice;
      return el(
        'div',
        { class: U.cn('ai-task', done && 'is-done') },
        el('input', {
          type: 'checkbox',
          checked: done || null,
          title: 'Đánh dấu đã xong',
          onchange: function (e) {
            const v = e.target.checked;
            save(function (l) {
              if (!l.aiRoadmap) return;
              l.aiRoadmap.done = l.aiRoadmap.done || {};
              if (v) l.aiRoadmap.done[key] = true;
              else delete l.aiRoadmap.done[key];
            });
            draw();
          },
        }),
        el(
          'div',
          { class: 'grow stack-sm' },
          el(
            'div',
            { class: 'row' },
            ui.pill(meta.label, meta.tone, meta.icon),
            el('strong', {}, topic ? topic.title : t.topicId),
            el('span', { class: 'muted-sm' }, t.minutes + ' phút'),
          ),
          t.detail ? el('div', { class: 'muted-sm' }, t.detail) : null,
        ),
        el('a', { class: 'btn btn-ghost btn-sm', href: taskHref(t) }, 'Làm', U.icon('chevron_right')),
      );
    }

    function planView(r) {
      const p = r.plan;
      const done = r.done || {};
      let total = 0;
      let finished = 0;
      p.weeks.forEach((w) =>
        w.days.forEach((d) =>
          d.tasks.forEach((_t, ti) => {
            total++;
            if (done['w' + w.week + 'd' + d.day + 't' + ti]) finished++;
          }),
        ),
      );
      const stale = ctx.knowledge && r.basedOn && r.basedOn !== ctx.knowledge.sessionId;
      return [
        el(
          'p',
          { class: 'muted-sm' },
          'Lập lúc ' + new Date(r.builtAt).toLocaleString('vi-VN') + (r.model ? ' · ' + r.model : '') +
            ' · đã xong ' + finished + '/' + total + ' nhiệm vụ',
        ),
        ui.bar(total ? finished / total : 0),
        stale
          ? ui.banner('warn', 'Hồ sơ năng lực đã thay đổi (vừa kiểm tra thêm chương). Bấm "Lập lại" để Gia sư AI cập nhật lộ trình.')
          : null,
        p.summary ? el('div', { class: 'ai-summary' }, AM.tutorUI.renderRich(p.summary)) : null,
        el(
          'div',
          { class: 'grid-2' },
          el(
            'div',
            { class: 'ai-box is-good' },
            el('div', { class: 'section-label' }, 'Điểm mạnh'),
            el('ul', {}, p.strengths.map((x) => el('li', {}, x))),
          ),
          el(
            'div',
            { class: 'ai-box is-weak' },
            el('div', { class: 'section-label' }, 'Cần cải thiện'),
            el('ul', {}, p.weaknesses.map((x) => el('li', {}, x))),
          ),
        ),
        p.weeks.map(function (w, wi) {
          const wTotal = w.days.reduce((a, d) => a + d.tasks.length, 0);
          const wDone = w.days.reduce(
            (a, d) => a + d.tasks.filter((_t, ti) => done['w' + w.week + 'd' + d.day + 't' + ti]).length,
            0,
          );
          return el(
            'details',
            { class: 'ex-chapter', open: wi === 0 || null },
            el(
              'summary',
              {},
              el('span', { class: 'ex-ch-no' }, 'Tuần ' + w.week),
              el('span', { class: 'grow' }, w.focus),
              el('span', { class: 'muted-sm' }, wDone + '/' + wTotal),
            ),
            el(
              'div',
              { class: 'stack-sm ex-ch-body' },
              w.goal ? el('p', { class: 'muted-sm' }, el('strong', {}, 'Mục tiêu tuần: '), w.goal) : null,
              w.days.map((d) =>
                el(
                  'div',
                  { class: 'ai-day stack-sm' },
                  el(
                    'div',
                    { class: 'ai-day-title' },
                    'Ngày ' + d.day + ' · ' + d.tasks.reduce((a, t) => a + t.minutes, 0) + ' phút',
                  ),
                  d.tasks.map((t, ti) => {
                    const key = 'w' + w.week + 'd' + d.day + 't' + ti;
                    return taskRow(t, key, !!done[key]);
                  }),
                ),
              ),
            ),
          );
        }),
        p.tips.length
          ? el(
              'div',
              { class: 'ai-box' },
              el('div', { class: 'section-label' }, 'Lời khuyên của Gia sư'),
              el('ul', {}, p.tips.map((x) => el('li', {}, x))),
            )
          : null,
      ];
    }

    function draw() {
      const r = ctx.learner.aiRoadmap;
      U.mount(
        wrap,
        el(
          'div',
          { class: 'row' },
          el('h2', { class: 'card-title grow' }, U.icon('smart_toy'), 'Lộ trình do Gia sư AI xây dựng'),
          r && !RT.busy
            ? el(
                'button',
                {
                  type: 'button',
                  class: 'link-btn muted-sm',
                  onclick: function () {
                    if (!window.confirm('Xoá lộ trình AI hiện tại?')) return;
                    save((l) => {
                      l.aiRoadmap = null;
                    });
                    draw();
                  },
                },
                'Xoá',
              )
            : null,
        ),
        !r
          ? el(
              'p',
              { class: 'muted-sm' },
              'Gia sư AI đọc hồ sơ năng lực (mức thành thạo từng chủ đề, bài tập đã làm, lỗi chưa sửa, ' +
                'tín hiệu từ bài kiểm tra) rồi lập kế hoạch theo tuần: học gì trước, vì sao, mỗi ngày làm gì — ' +
                'vừa đúng ' + ctx.profile.dailyMinutes + ' phút/ngày của em.',
            )
          : null,
        RT.error ? ui.banner('error', RT.error) : null,
        RT.errorCode === 'no-backend' ? devKeyBox() : null,
        r && !RT.busy ? planView(r) : null,
        RT.busy
          ? el('div', { class: 'row muted' }, el('div', { class: 'tutor-typing' }, el('span'), el('span'), el('span')), 'Gia sư AI đang phân tích hồ sơ và lập lộ trình…')
          : el(
              'div',
              { class: 'row', style: { justifyContent: 'space-between' } },
              weeksPicker(),
              el(
                'button',
                { type: 'button', class: 'btn btn-lime btn-sm', onclick: build },
                U.icon('auto_awesome'),
                r ? 'Lập lại lộ trình' : 'Nhờ Gia sư AI lập lộ trình',
              ),
            ),
      );
    }

    draw();
    return wrap;
  }

  AM.aiRoadmapUI = { card: card, taskHref: taskHref };
})(window.AM);
