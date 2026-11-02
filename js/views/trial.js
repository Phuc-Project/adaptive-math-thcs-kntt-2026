/**
 * Bài học dùng thử — "Hằng đẳng thức đáng nhớ" (Toán 8, Chương II).
 *
 * Một trang dẫn đường bốn bước: đọc lý thuyết → luyện 10 câu từ dễ đến khó →
 * làm bài tập trong sách → hỏi Gia sư AI. Không cần thiết lập hồ sơ hay làm
 * bài kiểm tra đầu vào: khách vào là học được ngay.
 *
 * `AM.trial` là chỗ duy nhất biết chủ đề dùng thử và các đường dẫn của nó;
 * các trang lý thuyết, luyện tập, bài tập đọc `params.from === 'thu'` để đổi
 * nút quay lại về trang này.
 */
(function (AM) {
  'use strict';

  const U = AM.util;
  const el = U.el;
  const ui = AM.ui;

  const TOPIC_ID = (window.AM_FEATURED && window.AM_FEATURED.topicId) || '8-C2-B1';
  const HUB = '#/thu';
  const PRACTICE_COUNT = 10;

  const enc = encodeURIComponent;
  const href = {
    hub: HUB,
    theory: '#/theory?topic=' + enc(TOPIC_ID) + '&from=thu',
    practice: '#/practice?topic=' + enc(TOPIC_ID) + '&levels=N,H,V,T&count=' + PRACTICE_COUNT + '&from=thu',
    exercises: '#/exercises?topic=' + enc(TOPIC_ID) + '&from=thu',
    tutor: '#/tutor?topic=' + enc(TOPIC_ID),
  };

  function topic() {
    return AM.topics.getTopicById(TOPIC_ID);
  }

  /** Trang đang mở có thuộc luồng dùng thử không. */
  function isTrial(params) {
    return !!params && params.from === 'thu' && params.topic === TOPIC_ID;
  }

  /** Tiến độ của từng bước, đọc từ dữ liệu học tập đã lưu. */
  function progress(learner) {
    const bkt = learner.bkt[TOPIC_ID];
    const ex = AM.exercises ? AM.exercises.topicProgress(learner, TOPIC_ID) : { total: 0, done: 0, stuck: 0 };
    return {
      theory: learner.completedActivities.indexOf(TOPIC_ID + '::theory') !== -1,
      practiced: !!(bkt && bkt.totalAttempts > 0),
      mastery: bkt && bkt.totalAttempts > 0 ? bkt.pL : null,
      exercises: ex,
    };
  }

  // -------------------------------------------------------------------------
  // Thẻ "lên đầu" dùng ở Trang chính
  // -------------------------------------------------------------------------

  function homeCard(ctx) {
    const t = topic();
    if (!t) return null;
    const p = progress(ctx.learner);
    const started = p.theory || p.practiced || p.exercises.done > 0;
    return el(
      'a',
      { class: 'trial-banner', href: HUB },
      el('span', { class: 'trial-banner-tag' }, 'Bài học dùng thử'),
      el('span', { class: 'trial-banner-title' }, t.title),
      el(
        'span',
        { class: 'trial-banner-body' },
        'Toán 8 · Chương II. Lý thuyết, 10 câu luyện từ dễ đến khó, bài tập trong sách và Gia sư AI — khoảng 30 phút.',
      ),
      el('span', { class: 'btn btn-lime' }, started ? 'Học tiếp' : 'Vào học thử', U.icon('arrow_forward')),
    );
  }

  // -------------------------------------------------------------------------
  // Trang #/thu
  // -------------------------------------------------------------------------

  const FORMULAS = [
    ['(A+B)^2=A^2+2AB+B^2', 'Bình phương của một tổng'],
    ['(A-B)^2=A^2-2AB+B^2', 'Bình phương của một hiệu'],
    ['A^2-B^2=(A-B)(A+B)', 'Hiệu hai bình phương'],
    ['(A+B)^3=A^3+3A^2B+3AB^2+B^3', 'Lập phương của một tổng'],
    ['(A-B)^3=A^3-3A^2B+3AB^2-B^3', 'Lập phương của một hiệu'],
    ['A^3+B^3=(A+B)(A^2-AB+B^2)', 'Tổng hai lập phương'],
    ['A^3-B^3=(A-B)(A^2+AB+B^2)', 'Hiệu hai lập phương'],
  ];

  function math(tex) {
    return window.katex
      ? el('span', { class: 'trial-math', html: window.katex.renderToString(tex, { throwOnError: false }) })
      : el('code', { class: 'trial-math' }, tex);
  }

  function formulaList() {
    return el(
      'ol',
      { class: 'trial-formulas' },
      FORMULAS.map(([tex, name]) => el('li', {}, math(tex), el('span', { class: 'muted-sm' }, name))),
    );
  }

  function formulaSheet() {
    return el(
      'section',
      { class: 'card trial-sheet sheet-ruled' },
      el('h2', { class: 'card-title' }, 'Bảy hằng đẳng thức đáng nhớ'),
      formulaList(),
    );
  }

  function stepCard(no, s, isNext) {
    return el(
      'li',
      { class: U.cn('trial-step', s.done && 'is-done', isNext && 'is-next') },
      el('span', { class: 'trial-no', 'aria-hidden': 'true' }, s.done ? U.icon('check') : String(no)),
      el(
        'div',
        { class: 'grow stack-xs' },
        el('h3', { class: 'trial-step-title' }, s.title),
        el('p', { class: 'muted-sm' }, s.body),
        s.status ? el('p', { class: 'trial-status' }, s.status) : null,
      ),
      el(
        'a',
        { class: U.cn('btn', isNext ? 'btn-primary' : 'btn-outline'), href: s.href },
        s.cta,
      ),
    );
  }

  function view(params, ctx) {
    const t = topic();
    if (!t) {
      return ui.page(
        { title: 'Dùng thử', activeRoute: HUB },
        ui.empty('📚', 'Chưa có bài dùng thử', 'Không tìm thấy chủ đề ' + TOPIC_ID + '.'),
      );
    }
    const p = progress(ctx.learner);
    const nQ = AM.bank.QUESTION_BANK.questions.filter((q) => q.topicId === TOPIC_ID).length;

    const steps = [
      {
        title: 'Đọc lý thuyết',
        body: '7 hằng đẳng thức, mẹo nhớ, ba lỗi hay gặp, 4 ví dụ có lời giải và 5 dạng bài thường gặp.',
        href: href.theory,
        cta: p.theory ? 'Đọc lại' : 'Đọc lý thuyết',
        done: p.theory,
        status: p.theory ? 'Đã đọc' : null,
      },
      {
        title: 'Luyện ' + PRACTICE_COUNT + ' câu trắc nghiệm',
        body:
          'Câu hỏi đi từ nhận biết đến vận dụng cao (ngân hàng ' + nQ + ' câu). ' +
          'Làm xong mỗi câu có lời giải chi tiết; sai thì bấm hỏi Gia sư AI vì sao.',
        href: href.practice,
        cta: p.practiced ? 'Luyện thêm' : 'Bắt đầu luyện',
        done: p.practiced,
        status: p.practiced ? 'Mức thành thạo hiện tại: ' + U.pct(p.mastery) : null,
      },
      {
        title: 'Làm bài tập trong sách',
        body: p.exercises.total
          ? p.exercises.total + ' bài theo SGK Kết nối tri thức, có hướng dẫn giải. Làm ra vở rồi tự đánh dấu "Làm được".'
          : 'Bài tập theo SGK Kết nối tri thức, có hướng dẫn giải.',
        href: href.exercises,
        cta: p.exercises.done ? 'Làm tiếp' : 'Mở bài tập',
        done: p.exercises.total > 0 && p.exercises.done >= Math.min(5, p.exercises.total),
        status: p.exercises.done || p.exercises.stuck
          ? 'Đã làm được ' + p.exercises.done + '/' + p.exercises.total + (p.exercises.stuck ? ' · cần làm lại ' + p.exercises.stuck : '')
          : null,
      },
      {
        title: 'Hỏi Gia sư AI',
        body: 'Chụp ảnh bài trong vở hoặc gõ câu hỏi. Gia sư gợi ý từng bước để em tự làm, hoặc kiểm tra bài em đã giải.',
        href: href.tutor,
        cta: 'Mở Gia sư AI',
        done: false,
        status: null,
      },
    ];
    const nextIndex = steps.findIndex((s) => !s.done);
    const doneCount = steps.filter((s) => s.done).length;

    return ui.page(
      { title: 'Dùng thử', activeRoute: HUB },
      el(
        'section',
        {},
        el('div', { class: 'section-label' }, 'Bài học dùng thử · Toán 8 · ' + t.chapterTitle),
        el('h1', { class: 'page-title' }, t.title),
        el(
          'p',
          { class: 'page-sub' },
          'Một bài học trọn vẹn, làm theo thứ tự từ trên xuống. Khoảng 30 phút, không cần làm bài kiểm tra đầu vào.',
        ),
      ),
      el(
        'section',
        { class: 'card stack-sm' },
        el(
          'div',
          { class: 'row', style: { justifyContent: 'space-between' } },
          el('h2', { class: 'card-title' }, 'Các bước học'),
          el('span', { class: 'muted-sm' }, doneCount + '/4 bước'),
        ),
        ui.bar(doneCount / 4),
        el('ol', { class: 'trial-steps' }, steps.map((s, i) => stepCard(i + 1, s, i === nextIndex))),
      ),
      formulaSheet(),
    );
  }

  /** Dải nhỏ đầu trang lý thuyết / luyện tập / bài tập khi đang học thử. */
  function crumb(stepNo, stepName) {
    return el(
      'div',
      { class: 'trial-crumb' },
      el('a', { href: HUB }, U.icon('arrow_back'), 'Bài học dùng thử'),
      el('span', { class: 'muted-sm' }, 'Bước ' + stepNo + '/4 · ' + stepName),
    );
  }

  /** Câu hỏi mẫu hiện sẵn trong Gia sư AI khi đang học bài dùng thử. */
  const TUTOR_SUGGESTIONS = [
    'Làm sao phân biệt (a − b)³ với a³ − b³?',
    'Vì sao (a + b)² không bằng a² + b²?',
    'Gợi ý cách tính nhanh 98 · 102',
    'Tìm giá trị nhỏ nhất của x² − 6x + 10',
  ];

  AM.trial = {
    TOPIC_ID: TOPIC_ID,
    TUTOR_SUGGESTIONS: TUTOR_SUGGESTIONS,
    PRACTICE_COUNT: PRACTICE_COUNT,
    href: href,
    isTrial: isTrial,
    homeCard: homeCard,
    crumb: crumb,
    formulaList: formulaList,
  };
  AM.views = AM.views || {};
  AM.views.trial = view;
})(window.AM);
