/**
 * Landing page — what a visitor sees before signing in.
 *
 * Deliberately short. The previous version explained all six subsystems in
 * full paragraphs (IRT, BKT, SM-2, the stability model…) and a visitor had to
 * read ~400 words before finding the sign-up button. None of that detail helps
 * someone decide whether to try the site; it only makes the page look busy.
 *
 * What survives: one promise, one picture, three claims of a line each, three
 * steps, one button repeated. Everything the old copy explained is still true
 * and still discoverable — just after signing in, where it is actually useful.
 *
 * The login form lives at `#/login`; every call to action here points at it.
 */
(function (AM) {
  'use strict';

  const U = AM.util;
  const el = U.el;

  /**
   * Trang vở minh hoạ: một bài làm của học sinh, thầy cô chấm bằng bút đỏ.
   * Đây là thứ duy nhất "có hình" trên trang — nó cho thấy sản phẩm làm gì
   * (chỉ ra đúng chỗ sai) thay cho ba đoạn quảng cáo.
   */
  function notebook() {
    function line(math, mark, note) {
      const mathNode = window.katex
        ? el('span', { class: 'nb-math', html: window.katex.renderToString(math, { throwOnError: false }) })
        : el('span', { class: 'nb-math' }, math);
      return el(
        'div',
        { class: U.cn('nb-line', mark && 'is-' + mark) },
        mathNode,
        mark ? el('span', { class: 'nb-mark', 'aria-label': mark === 'ok' ? 'Đúng' : 'Sai' }, mark === 'ok' ? '✓' : '✗') : null,
        note ? el('span', { class: 'nb-note' }, note) : null,
      );
    }
    return el(
      'figure',
      { class: 'notebook sheet-ruled', 'aria-label': 'Ví dụ bài làm được chấm' },
      el('div', { class: 'nb-head' }, 'Bài 3. Giải phương trình'),
      line('2(x - 3) = x + 4', null),
      line('2x - 3 = x + 4', 'bad', 'Nhân phân phối thiếu: 2 · 3 = 6'),
      line('2x - 6 = x + 4', 'ok'),
      line('x = 10', 'ok'),
      el('figcaption', { class: 'nb-foot' }, 'Lỗi sai được ghi vào sổ tay. Tuần sau hệ thống cho em làm lại dạng bài này.'),
    );
  }

  /** Đăng ký xong mở thẳng bài học dùng thử (#/thu). */
  const TRIAL_HREF = '#/login?mode=signup&next=thu';

  function hero() {
    return el(
      'section',
      { class: 'landing-hero' },
      el(
        'div',
        { class: 'landing-copy' },
        el('h1', { class: 'landing-title' }, 'Học Toán THCS đúng chỗ em còn yếu'),
        el(
          'p',
          { class: 'landing-lead' },
          'Làm bài kiểm tra theo từng chương, nhận lộ trình riêng và bài tập theo sách Kết nối tri thức lớp 6–9. Vướng bài nào thì hỏi gia sư hoặc hỏi thầy cô ngay trong lớp.',
        ),
        el(
          'div',
          { class: 'landing-cta' },
          el('a', { class: 'btn btn-primary btn-lg', href: TRIAL_HREF }, 'Học thử: Hằng đẳng thức đáng nhớ'),
          el('a', { class: 'btn btn-outline btn-lg', href: '#/login' }, 'Đăng nhập'),
        ),
        el(
          'p',
          { class: 'landing-note' },
          'Bài mẫu Toán 8, khoảng 30 phút: lý thuyết, 10 câu luyện từ dễ đến khó, bài tập trong sách và Gia sư AI. Tạo tài khoản mất 1 phút.',
        ),
      ),
      notebook(),
    );
  }

  /** Ba bước — đúng là một trình tự nên mới đánh số. */
  function steps() {
    const STEPS = [
      ['Làm bài kiểm tra đầu vào', 'Chọn chương đã học. Câu hỏi tự điều chỉnh độ khó, mỗi chương khoảng 15–25 phút.'],
      ['Nhận lộ trình riêng', 'Chủ đề còn yếu được xếp trước, vừa đúng số phút em học mỗi ngày.'],
      ['Học và ôn đều đặn', 'Bài tập từ sách giáo khoa, lỗi sai được nhắc ôn lại đúng lúc sắp quên.'],
    ];
    return el(
      'section',
      { class: 'landing-section' },
      el('h2', { class: 'landing-h2' }, 'Học sinh học thế nào'),
      el(
        'ol',
        { class: 'landing-steps' },
        STEPS.map(([t, b]) => el('li', {}, el('strong', {}, t), el('span', {}, b))),
      ),
      el('a', { class: 'btn btn-outline', href: TRIAL_HREF, style: { justifySelf: 'start' } }, 'Học thử một bài ngay'),
    );
  }

  function teachers() {
    return el(
      'section',
      { class: 'landing-section landing-teacher' },
      el('h2', { class: 'landing-h2' }, 'Thầy cô dùng thế nào'),
      el(
        'p',
        {},
        'Tạo lớp, đưa mã 6 chữ cho học sinh. Thầy cô thấy ngay em nào đã kiểm tra, em nào đang cần hỗ trợ, và trả lời câu hỏi của học sinh ngay trên trang lớp.',
      ),
      el('a', { class: 'btn btn-outline', href: '#/login?mode=signup' }, 'Đăng ký tài khoản giáo viên'),
    );
  }

  function view() {
    return el(
      'div',
      { class: 'landing' },
      el(
        'header',
        { class: 'landing-nav' },
        el('span', { class: 'landing-brand' }, AM.ui.brandMark(), 'AdaptiveMath'),
        el('span', { class: 'landing-nav-actions' }, el('a', { class: 'btn btn-outline btn-sm', href: '#/login' }, 'Đăng nhập')),
      ),
      el('main', { class: 'landing-main' }, hero(), steps(), teachers()),
      el('footer', { class: 'landing-footer' }, 'AdaptiveMath — Toán THCS lớp 6 đến lớp 9, Chương trình GDPT 2018.'),
    );
  }

  AM.views = AM.views || {};
  AM.views.landing = view;
})(window.AM);
