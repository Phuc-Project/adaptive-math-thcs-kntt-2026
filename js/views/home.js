/**
 * Home dashboard — the daily hub.
 *
 * Shows where the student is in the flow (onboarding → diagnostic → study),
 * today's tasks, a compact knowledge tree, a practice calendar and overall
 * progress numbers.
 */
(function (AM) {
  'use strict';

  const U = AM.util;
  const el = U.el;
  const ui = AM.ui;
  const C = AM.const;

  function activityHref(act) {
    return act.type === 'theory'
      ? '#/theory?topic=' + encodeURIComponent(act.topicId)
      : '#/practice?topic=' +
          encodeURIComponent(act.topicId) +
          '&levels=' +
          encodeURIComponent((act.levels || ['N', 'H']).join(',')) +
          '&activityId=' +
          encodeURIComponent(act.activityId) +
          '&count=' +
          (act.questionCount || 5);
  }

  /**
   * Khối "việc tiếp theo": MỘT việc, MỘT nút. Học sinh mở app là biết bấm vào đâu.
   */
  function heroCard(ctx, today) {
    let title;
    let body;
    let cta;
    let href;

    if (!ctx.hasProfile) {
      title = 'Cho thầy cô biết em học lớp mấy';
      body = 'Chọn lớp, mục tiêu và thời gian học mỗi ngày — khoảng 1 phút. Sau đó em làm bài kiểm tra đầu vào để hệ thống biết em đang vững và còn hổng ở đâu.';
      cta = 'Thiết lập hồ sơ';
      href = '#/onboarding';
    } else if (!ctx.hasDiagnostic) {
      title = 'Làm bài kiểm tra đầu vào';
      body = 'Chọn một chương em đã học. Câu hỏi tự khó dần hoặc dễ dần theo câu trả lời của em, khoảng 15–25 phút mỗi chương. Làm xong chương nào, lộ trình của chương đó có ngay.';
      cta = 'Chọn chương để kiểm tra';
      href = '#/diagnostic';
    } else {
      const completed = new Set(ctx.learner.completedActivities);
      const next = today.find((i) => !completed.has(i.activity.activityId));
      if (next) {
        const act = next.activity;
        title = act.topicTitle;
        body =
          C.ACTIVITY_LABELS[act.type] +
          (act.questionCount ? ', ' + act.questionCount + ' câu' : '') +
          ', khoảng ' + act.estimatedMinutes + ' phút.';
        cta = act.type === 'theory' ? 'Bắt đầu đọc' : 'Bắt đầu làm';
        href = activityHref(act);
      } else {
        title = ctx.path ? 'Xong việc hôm nay rồi' : 'Tạo lộ trình học';
        body = ctx.path
          ? 'Muốn học thêm thì làm bài tập theo chủ đề em còn yếu.'
          : 'Hệ thống xếp bài theo kết quả kiểm tra của em và thời gian em có mỗi ngày.';
        cta = ctx.path ? 'Làm thêm bài tập' : 'Mở lộ trình học';
        href = ctx.path ? '#/exercises' : '#/learning-path';
      }
    }

    return el(
      'section',
      { class: 'card card-dark next-step' },
      el('div', { class: 'next-step-label' }, ctx.hasDiagnostic ? 'Việc tiếp theo' : 'Bắt đầu'),
      el('h2', { class: 'next-step-title' }, title),
      el('p', { class: 'next-step-body' }, body),
      el('a', { class: 'btn btn-lime', href: href }, cta),
    );
  }

  /** Lối tắt sang Bài tập cá nhân hóa, kèm chủ đề đang được ưu tiên. */
  function exercisesCard(ctx) {
    if (!ctx.hasProfile || !AM.exercises || !AM.exercises.isLoaded) return null;
    const total = AM.exercises.forGrade(ctx.profile.grade).length;
    if (total === 0) return null;
    const recs = AM.exercises.recommend(ctx, { topics: 2, perTopic: 1 });
    return ui.sectionCard(
      'Bài tập nên làm',
      'Chủ đề em đang yếu nhất trong ' + total + ' bài tập ' + C.GRADE_LABELS[ctx.profile.grade] + '.',
      recs.length
        ? el(
            'div',
            { class: 'list' },
            recs.map((r) =>
              el(
                'a',
                { class: 'list-row', href: '#/exercises?topic=' + encodeURIComponent(r.topic.id) },
                el('span', { class: 'grow' }, r.topic.title),
                r.source !== 'default' ? ui.bandChip(r.mastery) : null,
                U.icon('chevron_right'),
              ),
            ),
          )
        : null,
      el(
        'div',
        { class: 'row' },
        el('a', { class: 'btn btn-outline btn-sm', href: '#/exercises' }, 'Xem tất cả bài tập'),
      ),
    );
  }

  function todayCard(ctx, items) {
    if (!ctx.hasDiagnostic || items.length === 0) return null;
    const completed = new Set(ctx.learner.completedActivities);
    const doneCount = items.filter((i) => completed.has(i.activity.activityId)).length;
    return ui.sectionCard(
      'Hôm nay (' + doneCount + '/' + items.length + ' việc)',
      'Bài ôn đến hạn được xếp trước, sau đó là bài trong lộ trình.',
      el('div', { class: 'list' }, items.map((item) => activityRow(item.activity, completed))),
    );
  }

  function activityRow(act, completedSet) {
    const done = completedSet.has(act.activityId);
    return el(
      'a',
      { class: U.cn('activity', done && 'is-done'), href: activityHref(act) },
      el('span', { class: 'type-dot type-' + act.type }, U.icon(done ? 'check' : C.ACTIVITY_ICONS[act.type])),
      el(
        'span',
        { class: 'grow' },
        el('span', { class: 'title', style: { display: 'block' } }, act.topicTitle),
        el(
          'span',
          { class: 'muted-sm' },
          C.ACTIVITY_LABELS[act.type] +
            (act.levels && act.levels.length ? ', mức ' + act.levels.map((l) => C.LEVEL_LABELS[l] || l).join(', ').toLowerCase() : '') +
            (act.questionCount ? ', ' + act.questionCount + ' câu' : '') +
            ', khoảng ' +
            act.estimatedMinutes +
            ' phút',
        ),
      ),
      done ? el('span', { class: 'muted-sm' }, 'Đã xong') : U.icon('chevron_right'),
    );
  }

  function treeCard(ctx) {
    if (!ctx.tree) return null;
    const stages = C.TREE_STAGES;

    return ui.sectionCard(
      'Cây tri thức',
      'Kiến thức nền của em vững ' + U.pct(ctx.tree.trunkStrength) + '.',
      el(
        'div',
        { class: 'row' },
        stages.map((s) =>
          ui.pill(s.icon + ' ' + s.label + ': ' + ctx.tree.stageCounts[s.id], 'tone-' + s.id),
        ),
      ),
      ui.bar(ctx.tree.trunkStrength, ctx.tree.overallStage),
      el(
        'div',
        { class: 'row' },
        el('a', { class: 'btn btn-ghost btn-sm', href: '#/profile' }, 'Xem chi tiết hồ sơ'),
      ),
    );
  }

  function statsCard(ctx) {
    if (!ctx.hasDiagnostic) return null;
    const totalTopics = AM.topics.getTopicsByGrade(ctx.profile.grade).length;
    const stats = AM.today.computeProgressStats(ctx.path, ctx.learner, totalTopics);
    const g = ctx.learner.gamification;
    return ui.statStrip(
      [
        ui.statTile(g.currentStreak + ' ngày', 'học liên tiếp'),
        ui.statTile(String(g.totalQuestionsAttempted), 'câu đã làm'),
        ui.statTile(stats.masteredTopics + '/' + totalTopics, 'chủ đề đã thành thạo'),
        ui.statTile('Cấp ' + C.xpToLevel(g.xp), g.xp + ' điểm kinh nghiệm'),
      ],
      4,
    );
  }

  function badgesCard(ctx) {
    const earned = ctx.learner.gamification.badges;
    if (!earned.length) return null;
    return ui.sectionCard(
      'Huy hiệu',
      null,
      el(
        'div',
        { class: 'row' },
        earned
          .map((id) => C.BADGE_DEFINITIONS.find((b) => b.id === id))
          .filter(Boolean)
          .map((b) => ui.pill(b.icon + ' ' + b.label, 'amber')),
      ),
    );
  }

  function calendarCard(ctx) {
    const dates = AM.today.getPracticeDatesThisMonth(ctx.learner);
    return ui.sectionCard(
      'Ngày đã học trong tháng',
      dates.size ? dates.size + ' ngày.' : 'Chưa có ngày nào — làm một bài hôm nay nhé.',
      ui.miniCalendar(dates),
    );
  }

  function bankWarning() {
    if (AM.bank.isLoaded) return null;
    return ui.banner(
      'error',
      el('strong', {}, 'Không nạp được ngân hàng câu hỏi. '),
      'Kiểm tra file data/questions.js có nằm cạnh index.html không.',
    );
  }

  function firstName() {
    const n = String(AM.auth.displayName() || '').trim().split(/\s+/);
    return n[n.length - 1] || '';
  }

  function resetLink() {
    return el(
      'button',
      {
        class: 'link-btn muted-sm reset-link',
        onclick: function () {
          const ok = window.confirm(
            'Xoá toàn bộ dữ liệu học tập?\n\n' +
              'Hồ sơ, kết quả kiểm tra, lộ trình và sổ tay lỗi sẽ bị xoá — ' +
              'cả trên máy này lẫn trên tài khoản của em.\n\n' +
              'Không thể khôi phục.',
          );
          if (!ok) return;
          AM.store.clearAll();
          AM.router.render();
        },
      },
      'Xoá dữ liệu học tập và làm lại từ đầu',
    );
  }

  function view(params, ctx) {
    const name = firstName();
    const greeting = name ? 'Chào ' + name : 'Chào em';
    const goalLabel = ctx.profile ? (C.GOAL_OPTIONS.find((g) => g.value === ctx.profile.goal) || {}).label : null;
    const subtitle = ctx.hasProfile
      ? C.GRADE_LABELS[ctx.profile.grade] + '. Mục tiêu: ' + String(goalLabel || '').toLowerCase() + ', ' + ctx.profile.dailyMinutes + ' phút mỗi ngày.'
      : 'Học Toán THCS theo đúng chỗ em còn yếu.';
    const today = ctx.hasDiagnostic ? AM.today.computeTodayActivities(ctx.path, ctx.learner, ctx.profile && ctx.profile.grade) : [];

    return ui.page(
      { title: 'Trang chính', activeRoute: '#/' },
      bankWarning(),
      el('section', {}, el('h1', { class: 'page-title' }, greeting), el('p', { class: 'page-sub' }, subtitle)),
      AM.trial ? AM.trial.homeCard(ctx) : null,
      heroCard(ctx, today),
      todayCard(ctx, today),
      statsCard(ctx),
      exercisesCard(ctx),
      el('div', { class: 'grid-2' }, treeCard(ctx), calendarCard(ctx)),
      badgesCard(ctx),
      ctx.hasProfile ? el('div', {}, resetLink()) : null,
    );
  }

  AM.views = AM.views || {};
  AM.views.home = view;
})(window.AM);
