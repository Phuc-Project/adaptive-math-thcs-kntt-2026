/**
 * Kho đề thi — #/exams
 *
 * Trình bày giống Azota:
 *   - Học sinh: "Đề giáo viên giao" (đề GV của lớp tải lên) + kho đề có sẵn
 *     lớp 6–9, mỗi đề là một "tệp đề", lọc theo khối và loại đề.
 *   - Mở một đề: bên trái là nguyên tờ đề như xem file PDF (phóng to / thu nhỏ,
 *     in / lưu PDF); bên phải là phiếu trả lời — đồng hồ đếm ngược, ô tô
 *     A/B/C/D cho trắc nghiệm, tự đánh giá cho tự luận, nút "Nộp bài".
 *       · Đề có sẵn (#/exams?id=…): chấm ngay, đánh dấu đúng/sai trên tờ đề,
 *         mở "Đáp án – hướng dẫn chấm"; ghi kết quả vào hồ sơ năng lực.
 *       · Đề của lớp (#/exams?cls=…&id=…): nộp một lần lên Firestore; đáp án
 *         chỉ đọc được sau khi nộp; giáo viên thấy bảng điểm.
 *   - Giáo viên (#/exams): chọn lớp → tải đề (PDF / ảnh) lên, nhập đáp án,
 *     xem bài nộp, cho làm lại, xóa đề.
 *
 * Kho đề không hiện tên trường: dữ liệu đề có sẵn chỉ giữ năm học; đề giáo
 * viên tải lên được che tự động các dòng tên trường / phòng / sở GD (PDF có
 * lớp chữ) và có thanh "Che phần đầu trang 1" cho đề là ảnh chụp.
 */
(function (AM) {
  'use strict';

  const U = AM.util;
  const el = U.el;
  const ui = AM.ui;
  const C = AM.const;
  const X = AM.exercises;

  const DRAFT_KEY = 'am_exam_drafts_v1';
  const TYPE_ORDER = ['GK1', 'CK1', 'GK2', 'CK2', 'V10', 'KT'];
  const TYPE_SHORT = {
    GK1: 'Giữa HK I',
    CK1: 'Cuối HK I',
    GK2: 'Giữa HK II',
    CK2: 'Cuối HK II',
    V10: 'Thi vào 10',
    KT: 'Kiểm tra',
  };
  const TYPE_LONG = {
    GK1: 'Đề kiểm tra giữa học kì I',
    CK1: 'Đề kiểm tra cuối học kì I',
    GK2: 'Đề kiểm tra giữa học kì II',
    CK2: 'Đề kiểm tra cuối học kì II',
    V10: 'Đề thi thử tuyển sinh vào lớp 10',
    KT: 'Đề kiểm tra',
  };
  const PART_NAMES = { tn: 'Phần I. Trắc nghiệm', tl: 'Phần II. Tự luận' };
  const IMG_K = 0.62; // ảnh 144 dpi / trang đề rộng 1100 px → cỡ chữ ≈ chữ trang web

  // -------------------------------------------------------------------------
  // Bài làm dở (theo máy)
  // -------------------------------------------------------------------------

  function loadDrafts() {
    try {
      return JSON.parse(window.localStorage.getItem(DRAFT_KEY) || '{}') || {};
    } catch (err) {
      return {};
    }
  }

  function saveDraft(id, draft) {
    try {
      const all = loadDrafts();
      if (draft) all[id] = draft;
      else delete all[id];
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
    } catch (err) {
      /* bộ nhớ đầy / bị chặn: bài vẫn làm được, chỉ không lưu dở */
    }
  }

  function newDraft() {
    return { a: {}, s: {}, start: null, done: null };
  }

  function fmtClock(sec) {
    const s = Math.max(0, Math.round(sec));
    const m = Math.floor(s / 60);
    return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  function fmtNum(n) {
    return String(n).replace('.', ',');
  }

  function fmtWhen(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    return (
      String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' +
      d.getDate() + '/' + (d.getMonth() + 1)
    );
  }

  function pageImg(src, w, h, alt) {
    return el('img', {
      src: src,
      width: w,
      height: h,
      alt: alt || 'Trang đề',
      loading: 'lazy',
      decoding: 'async',
      style: { width: 'calc(' + w + 'px * ' + IMG_K + ' * var(--zoom))' },
    });
  }

  function loading(msg) {
    return el(
      'div',
      { class: 'empty' },
      el('span', { class: 'material-symbols-outlined spin', style: { fontSize: '2.5rem' } }, 'autorenew'),
      el('p', { class: 'muted' }, msg),
    );
  }

  function errorBox(err) {
    return ui.banner('error', AM.fb && AM.fb.describeError ? AM.fb.describeError(err) : String((err && err.message) || err));
  }

  // -------------------------------------------------------------------------
  // Đề có sẵn
  // -------------------------------------------------------------------------

  function bankTitle(e) {
    return (X.EXAM_TYPE_LABELS[e.type] || e.title) + ' · Đề ' + e.no;
  }

  /** Chỉ năm học — không hiện tên trường / đơn vị ra đề. */
  function bankSource(e) {
    if (e.from) return e.from;
    return '';
  }

  function partsOf(e, items) {
    return ['tn', 'tl']
      .map((p) => ({
        p: p,
        title: (e.parts && e.parts[p]) || PART_NAMES[p],
        list: items.filter((x) => (p === 'tn' ? x.p === 'tn' : x.p !== 'tn')),
      }))
      .filter((g) => g.list.length > 0);
  }

  function bankScore(items, draft) {
    if (!(items.length > 0 && items.every((x) => typeof x.pt === 'number'))) return null;
    let score = 0;
    for (const x of items) {
      if (x.p === 'tn' && x.ans && draft.a[x.id] === x.ans) score += x.pt;
      else if (x.p !== 'tn' && draft.s[x.id] === true) score += x.pt;
    }
    return { value: Math.round(score * 100) / 100, of: 10 };
  }

  function bankModel(e, items, ctx) {
    const tn = items.filter((x) => x.p === 'tn');
    const tl = items.filter((x) => x.p !== 'tn');
    return {
      draftKey: e.id,
      backHref: '#/exams' + (e.g !== (ctx.profile && ctx.profile.grade) ? '?grade=' + e.g : ''),
      h1: bankTitle(e) + ' — Toán ' + e.g,
      sub: bankSource(e),
      fileName: e.id + '.pdf',
      head: { title: (e.title || X.EXAM_TYPE_LABELS[e.type]).toUpperCase(), src: bankSource(e), no: 'Đề số ' + e.no, grade: e.g },
      time: e.time,
      count: items.length,
      tn: tn.map((x) => ({ id: x.id, n: x.n, ans: x.ans || null, item: x })),
      tl: tl.map((x) => ({ id: x.id, n: x.n, pt: x.pt, key: x.key, item: x })),
      jump: true,
      canRetry: true,
      sol: e.sol ? e.sol.map((im) => ({ src: X.imgUrl(im[0]), w: im[1], h: im[2] })) : [],
      score: (draft) => bankScore(items, draft),
      body: function (st) {
        return partsOf(e, items).map((g) =>
          el(
            'section',
            { class: 'xm-part' },
            el('h3', { class: 'xm-part-title' }, g.title),
            g.list.map((item) =>
              el(
                'div',
                {
                  class: U.cn(
                    'xm-q',
                    st.done && item.p === 'tn' && item.ans && st.draft.a[item.id] === item.ans && 'is-right',
                    st.done && item.p === 'tn' && item.ans && st.draft.a[item.id] !== item.ans && 'is-wrong',
                  ),
                  'data-q': item.id,
                },
                item.img.map((im) => pageImg(X.imgUrl(im[0]), im[1], im[2], item.n + ': ' + (item.q || ''))),
                st.mark(item),
              ),
            ),
          ),
        );
      },
      onSubmit: async function (draft) {
        // Ghi từng câu vào hồ sơ: trắc nghiệm có khóa → đúng/sai; tự luận → tự đánh giá.
        const rec = AM.exerciseResults && AM.exerciseResults.record;
        if (!rec) return;
        for (const x of tn) if (x.ans && draft.a[x.id]) rec(ctx, x, draft.a[x.id] === x.ans, draft.a[x.id]);
        for (const x of tl) if (typeof draft.s[x.id] === 'boolean') rec(ctx, x, draft.s[x.id], null);
      },
    };
  }

  // -------------------------------------------------------------------------
  // Trình làm đề dùng chung (tờ đề + phiếu trả lời)
  // -------------------------------------------------------------------------

  function examRunner(model, ctx) {
    const total = model.time * 60;
    const st = {
      draft: model.initial || loadDrafts()[model.draftKey] || newDraft(),
      zoom: 1,
      timer: null,
      busy: false,
      error: null,
    };
    const root = el('div', {});
    let paperNode = null;
    let sheetNode = null;

    const submitted = () => !!st.draft.done;
    const remaining = () => (st.draft.start ? total - (Date.now() - st.draft.start) / 1000 : total);

    function persist() {
      saveDraft(model.draftKey, st.draft);
    }

    function start() {
      if (st.draft.start || submitted()) return;
      st.draft.start = Date.now();
      persist();
      ensureTimer();
      redrawSheet();
    }

    function ensureTimer() {
      if (st.timer || !st.draft.start || submitted()) return;
      st.timer = window.setInterval(tick, 1000);
    }

    function stopTimer() {
      if (st.timer) window.clearInterval(st.timer);
      st.timer = null;
    }

    function tick() {
      const node = U.qs('#xm-clock', root);
      if (!node || submitted()) return;
      const left = remaining();
      node.textContent = fmtClock(left);
      node.classList.toggle('is-low', left <= 300);
      if (left <= 0) submit(true);
    }

    function choose(q, letter) {
      if (submitted() || st.busy) return;
      start();
      if (st.draft.a[q.id] === letter) delete st.draft.a[q.id];
      else st.draft.a[q.id] = letter;
      persist();
      redrawSheet();
    }

    function selfMark(q, ok) {
      if (submitted() || st.busy) return;
      start();
      if (st.draft.s[q.id] === ok) delete st.draft.s[q.id];
      else st.draft.s[q.id] = ok;
      persist();
      redrawSheet();
    }

    async function submit(auto) {
      if (submitted() || st.busy) return;
      const answered = Object.keys(st.draft.a).length;
      if (!auto && answered < model.tn.length) {
        const ok = window.confirm('Em còn ' + (model.tn.length - answered) + ' câu trắc nghiệm chưa tô. Vẫn nộp bài?');
        if (!ok) return;
      }
      if (!auto && !model.canRetry && !window.confirm('Nộp bài? Sau khi nộp sẽ không sửa được nữa.')) return;
      if (!st.draft.start) st.draft.start = Date.now();
      const doneAt = Math.min(Date.now(), st.draft.start + total * 1000);
      stopTimer();
      st.busy = true;
      st.error = null;
      redrawSheet();
      try {
        await model.onSubmit(Object.assign({}, st.draft, { done: doneAt }));
        st.draft.done = doneAt;
        persist();
      } catch (err) {
        st.error = err;
        ensureTimer();
      }
      st.busy = false;
      redrawAll();
      if (submitted()) window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function retry() {
      if (!window.confirm('Làm lại đề này từ đầu? Phiếu trả lời hiện tại sẽ bị xóa.')) return;
      st.draft = newDraft();
      saveDraft(model.draftKey, null);
      redrawAll();
    }

    function jumpTo(q) {
      const node = U.qs('[data-q="' + q.id + '"]', root);
      if (!node) return;
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node.classList.remove('is-flash');
      void node.offsetWidth;
      node.classList.add('is-flash');
    }

    // ---- Tờ đề -----------------------------------------------------------

    function mark(item) {
      if (!submitted()) return null;
      if (item.p === 'tn') {
        const chosen = st.draft.a[item.id];
        if (!item.ans) {
          return el('div', { class: 'xm-mark is-none' }, chosen ? 'Em chọn ' + chosen + ' · đề không có đáp án' : 'Chưa trả lời');
        }
        if (!chosen) return el('div', { class: 'xm-mark is-wrong' }, U.icon('remove'), 'Bỏ trống · đáp án ' + item.ans);
        return chosen === item.ans
          ? el('div', { class: 'xm-mark is-right' }, U.icon('check'), 'Đúng · ' + chosen)
          : el('div', { class: 'xm-mark is-wrong' }, U.icon('close'), 'Em chọn ' + chosen + ' · đáp án ' + item.ans);
      }
      const s = st.draft.s[item.id];
      return el(
        'div',
        { class: U.cn('xm-mark', s === true ? 'is-right' : s === false ? 'is-wrong' : 'is-none') },
        s === true ? 'Tự đánh giá: làm được' : s === false ? 'Tự đánh giá: chưa làm được' : 'Chưa tự đánh giá',
        item.key ? el('span', { class: 'xm-key' }, ' · Đáp án: ' + item.key) : null,
      );
    }

    function paper() {
      const done = submitted();
      const h = model.head;
      return el(
        'div',
        { class: 'xm-viewer' },
        el(
          'div',
          { class: 'xm-viewer-bar' },
          el('span', { class: 'xm-viewer-name' }, U.icon('picture_as_pdf'), model.fileName),
          el('span', { class: 'grow' }),
          el('button', { class: 'xm-ibtn', type: 'button', title: 'Thu nhỏ', onclick: () => setZoom(st.zoom - 0.1) }, U.icon('zoom_out')),
          el('span', { class: 'xm-zoom', id: 'xm-zoom' }, Math.round(st.zoom * 100) + '%'),
          el('button', { class: 'xm-ibtn', type: 'button', title: 'Phóng to', onclick: () => setZoom(st.zoom + 0.1) }, U.icon('zoom_in')),
          el('button', { class: 'xm-ibtn', type: 'button', title: 'In / lưu PDF', onclick: () => window.print() }, U.icon('print')),
        ),
        el(
          'div',
          { class: 'xm-viewer-scroll' },
          el(
            'article',
            { class: U.cn('xm-paper', model.pagesMode && 'is-pages'), style: { '--zoom': String(st.zoom) } },
            h
              ? el(
                  'header',
                  { class: 'xm-paper-head' },
                  h.src ? el('div', { class: 'xm-paper-src' }, h.src) : null,
                  el('h2', {}, h.title),
                  el('div', {}, 'Môn: Toán ' + h.grade + ' · Thời gian làm bài: ' + model.time + ' phút (không kể thời gian giao đề)'),
                  h.no ? el('div', { class: 'xm-paper-no' }, h.no) : null,
                )
              : null,
            model.body({ done: done, draft: st.draft, mark: mark }),
            model.pagesMode ? null : el('div', { class: 'xm-paper-end' }, '— HẾT —'),
          ),
          done && model.sol.length
            ? el(
                'article',
                { class: 'xm-paper xm-paper-sol', style: { '--zoom': String(st.zoom) } },
                el('header', { class: 'xm-paper-head' }, el('h2', {}, 'ĐÁP ÁN – HƯỚNG DẪN CHẤM')),
                model.sol.map((im) => pageImg(im.src, im.w, im.h, 'Đáp án – hướng dẫn chấm')),
              )
            : null,
        ),
      );
    }

    function setZoom(z) {
      st.zoom = Math.min(1.8, Math.max(0.6, Math.round(z * 10) / 10));
      for (const p of U.qsa('.xm-paper', root)) p.style.setProperty('--zoom', String(st.zoom));
      const label = U.qs('#xm-zoom', root);
      if (label) label.textContent = Math.round(st.zoom * 100) + '%';
    }

    // ---- Phiếu trả lời ---------------------------------------------------

    function sheet() {
      const done = submitted();
      const answered = Object.keys(st.draft.a).length;
      const assessed = Object.keys(st.draft.s).length;
      const keyed = model.tn.filter((q) => q.ans);
      const correct = keyed.filter((q) => st.draft.a[q.id] === q.ans).length;
      const tlDone = model.tl.filter((q) => st.draft.s[q.id] === true).length;
      const score = done && model.score ? model.score(st.draft) : null;

      const clock = el(
        'div',
        { class: 'xm-clock-box' },
        el('div', { class: 'muted-sm' }, done ? 'Thời gian đã làm' : st.draft.start ? 'Thời gian còn lại' : 'Thời gian làm bài'),
        el('div', { class: 'xm-clock', id: 'xm-clock' }, done ? fmtClock((st.draft.done - st.draft.start) / 1000) : fmtClock(remaining())),
        !st.draft.start && !done
          ? el('button', { class: 'btn btn-primary btn-sm', type: 'button', onclick: start }, U.icon('play_arrow'), 'Bắt đầu làm bài')
          : null,
      );

      const result = done
        ? el(
            'div',
            { class: 'xm-result' },
            score ? el('div', { class: 'xm-score' }, fmtNum(score.value), el('small', {}, '/' + fmtNum(score.of) + ' điểm' + (score.label ? ' ' + score.label : ''))) : null,
            model.tn.length
              ? keyed.length
                ? el('div', {}, 'Trắc nghiệm: đúng ', el('strong', {}, correct + '/' + keyed.length), keyed.length < model.tn.length ? ' câu có đáp án' : ' câu')
                : el('div', {}, 'Trắc nghiệm: ', el('strong', {}, answered + '/' + model.tn.length), ' câu đã tô · ', model.noKeyNote || 'đề chưa có đáp án')
              : null,
            model.tl.length ? el('div', {}, 'Tự luận: làm được ', el('strong', {}, tlDone + '/' + model.tl.length), ' câu (tự đánh giá)') : null,
            !score && model.tl.length && !model.noScoreNote ? el('div', { class: 'muted-sm' }, 'Đề không ghi điểm từng câu nên chưa quy ra thang 10.') : null,
            model.noScoreNote ? el('div', { class: 'muted-sm' }, model.noScoreNote) : null,
            model.sol.length ? el('div', { class: 'muted-sm' }, 'Đáp án – hướng dẫn chấm ở cuối tờ đề.') : null,
          )
        : null;

      const tnBlock = model.tn.length
        ? el(
            'div',
            { class: 'stack-sm' },
            el('div', { class: 'xm-sheet-h' }, 'Trắc nghiệm', el('span', { class: 'muted-sm' }, answered + '/' + model.tn.length)),
            el(
              'div',
              { class: 'xm-bubbles' },
              model.tn.map((q, i) => {
                const chosen = st.draft.a[q.id];
                return el(
                  'div',
                  { class: 'xm-row' },
                  model.jump
                    ? el('button', { class: 'xm-qno', type: 'button', title: 'Xem ' + q.n + ' trên đề', onclick: () => jumpTo(q) }, String(i + 1))
                    : el('span', { class: 'xm-qno' }, String(i + 1)),
                  ['A', 'B', 'C', 'D'].map((L) =>
                    el(
                      'button',
                      {
                        class: U.cn(
                          'xm-bubble',
                          chosen === L && 'is-on',
                          done && q.ans === L && 'is-key',
                          done && chosen === L && q.ans && L !== q.ans && 'is-wrong',
                        ),
                        type: 'button',
                        disabled: done || st.busy || null,
                        'aria-label': q.n + ' đáp án ' + L,
                        'aria-pressed': chosen === L ? 'true' : 'false',
                        onclick: () => choose(q, L),
                      },
                      L,
                    ),
                  ),
                );
              }),
            ),
          )
        : null;

      const tlBlock = model.tl.length
        ? el(
            'div',
            { class: 'stack-sm' },
            el('div', { class: 'xm-sheet-h' }, 'Tự luận', el('span', { class: 'muted-sm' }, assessed + '/' + model.tl.length)),
            el('p', { class: 'muted-sm' }, 'Làm ra giấy, rồi tự đánh giá từng câu.'),
            model.tl.map((q) => {
              const s = st.draft.s[q.id];
              return el(
                'div',
                { class: 'xm-tl-row' },
                el(
                  model.jump ? 'button' : 'span',
                  { class: 'xm-tl-name', type: model.jump ? 'button' : null, onclick: model.jump ? () => jumpTo(q) : null },
                  q.n,
                  q.pt ? el('span', { class: 'muted-sm' }, ' (' + fmtNum(q.pt) + 'đ)') : null,
                ),
                el('span', { class: 'grow' }),
                el('button', { class: U.cn('xm-tl-btn', s === true && 'is-ok'), type: 'button', disabled: done || st.busy || null, title: 'Làm được', onclick: () => selfMark(q, true) }, U.icon('check')),
                el('button', { class: U.cn('xm-tl-btn', s === false && 'is-no'), type: 'button', disabled: done || st.busy || null, title: 'Chưa làm được', onclick: () => selfMark(q, false) }, U.icon('close')),
              );
            }),
          )
        : null;

      let action;
      if (done) {
        action = model.canRetry
          ? el('button', { class: 'btn btn-outline', type: 'button', onclick: retry }, U.icon('restart_alt'), 'Làm lại đề này')
          : el('p', { class: 'muted-sm' }, 'Đã nộp bài lúc ' + fmtWhen(st.draft.done) + '. Muốn làm lại, nhờ giáo viên mở lại bài.');
      } else {
        action = el(
          'button',
          { class: 'btn btn-lime', type: 'button', disabled: st.busy || null, onclick: () => submit(false) },
          U.icon(st.busy ? 'hourglass_top' : 'send'),
          st.busy ? 'Đang nộp…' : 'Nộp bài',
        );
      }

      return el(
        'aside',
        { class: 'xm-sheet' },
        el('div', { class: 'xm-sheet-title' }, U.icon('assignment'), 'Phiếu trả lời'),
        clock,
        st.error ? errorBox(st.error) : null,
        result,
        tnBlock,
        tlBlock,
        action,
      );
    }

    function redrawSheet() {
      const fresh = sheet();
      sheetNode.parentNode.replaceChild(fresh, sheetNode);
      sheetNode = fresh;
    }

    function redrawAll() {
      const p = paper();
      paperNode.parentNode.replaceChild(p, paperNode);
      paperNode = p;
      redrawSheet();
    }

    paperNode = paper();
    sheetNode = sheet();

    U.mount(
      root,
      el(
        'section',
        { class: 'xm-head' },
        el('a', { class: 'btn btn-ghost btn-sm', href: model.backHref }, U.icon('arrow_back'), 'Kho đề'),
        el(
          'div',
          { class: 'stack-sm grow' },
          el('h1', { class: 'page-title' }, model.h1),
          el(
            'div',
            { class: 'xm-file-meta' },
            el('span', {}, U.icon('schedule'), model.time + ' phút'),
            el('span', {}, U.icon('format_list_numbered'), model.count + ' câu'),
            model.sub ? el('span', { class: 'muted-sm' }, model.sub) : null,
          ),
        ),
      ),
      el('div', { class: 'xm-split' }, paperNode, sheetNode),
    );

    if (st.draft.start && !submitted()) {
      if (remaining() <= 0) submit(true);
      else ensureTimer();
    }

    return { node: root, cleanup: stopTimer };
  }

  // -------------------------------------------------------------------------
  // Đề của lớp (giáo viên giao) — phía học sinh
  // -------------------------------------------------------------------------

  /** Mô hình đề lớp cho trình làm đề. `sub`: bài đã nộp (hoặc null), `ans`: đáp án (nếu đọc được). */
  function classModel(code, ex, pages, sub, ans) {
    const tn = [];
    for (let i = 0; i < ex.nTn; i++) tn.push({ id: 'q' + (i + 1), n: 'Câu ' + (i + 1), ans: (ans && ans[i]) || null, p: 'tn' });
    const tl = [];
    for (let i = 0; i < ex.nTl; i++) tl.push({ id: 't' + (i + 1), n: 'Tự luận ' + (i + 1), p: 'tl' });

    let initial = null;
    if (sub) {
      initial = { a: {}, s: {}, start: sub.startedAt || sub.submittedAt, done: sub.submittedAt || Date.now() };
      sub.answers.forEach((L, i) => {
        if (L) initial.a['q' + (i + 1)] = L;
      });
      sub.tl.forEach((v, i) => {
        if (typeof v === 'boolean') initial.s['t' + (i + 1)] = v;
      });
    }

    const model = {
      draftKey: 'c:' + code + ':' + ex.id,
      initial: initial,
      backHref: '#/exams',
      h1: ex.title,
      sub: (TYPE_SHORT[ex.type] || 'Đề') + (ex.teacherName ? ' · Giáo viên ' + ex.teacherName + ' giao' : ''),
      fileName: ex.title + '.pdf',
      head: null,
      pagesMode: true,
      time: ex.time,
      count: ex.nTn + ex.nTl,
      tn: tn,
      tl: tl,
      jump: false,
      canRetry: false,
      sol: [],
      noKeyNote: 'giáo viên chưa nhập đáp án',
      score: function (draft) {
        if (ex.tnPoints === null || !ex.nTn) return null;
        const r = AM.classExams.grade(ex, tn.map((q) => draft.a[q.id] || ''), tn.map((q) => q.ans || ''));
        return r.score === null ? null : { value: r.score, of: ex.tnPoints, label: 'phần trắc nghiệm' };
      },
      noScoreNote: ex.nTl ? 'Phần tự luận do giáo viên chấm.' : null,
      body: function () {
        return pages.map((p, i) => el('div', { class: 'xm-page', 'data-page': i + 1 }, pageImg(p.src, p.w, p.h, 'Trang ' + (i + 1))));
      },
      onSubmit: async function (draft) {
        await AM.classExams.submit(code, ex.id, {
          answers: tn.map((q) => draft.a[q.id] || ''),
          tl: tl.map((q) => (typeof draft.s[q.id] === 'boolean' ? draft.s[q.id] : null)),
          startedAt: draft.start,
          submittedAt: draft.done,
        });
        // Đã có bài nộp → được đọc đáp án.
        const key = ex.hasKey ? await AM.classExams.key(code, ex.id) : [];
        tn.forEach((q, i) => (q.ans = key[i] || null));
      },
    };
    return model;
  }

  function classExamView(params, ctx) {
    const code = params.cls;
    const container = el('div', {});
    let cleanup = null;
    U.mount(container, ui.page({ title: 'Kho đề thi', activeRoute: '#/exams' }, loading('Đang mở đề…')));
    (async function () {
      try {
        const ex = await AM.classExams.get(code, params.id);
        if (!ex) throw new Error('Đề này không còn (giáo viên đã xóa) hoặc em không ở trong lớp.');
        const [pages, sub] = await Promise.all([AM.classExams.pages(code, ex.id), AM.classExams.mySubmission(code, ex.id)]);
        const ans = sub && ex.hasKey ? await AM.classExams.key(code, ex.id) : null;
        const run = examRunner(classModel(code, ex, pages, sub, ans), ctx);
        cleanup = run.cleanup;
        U.mount(container, ui.page({ title: 'Kho đề thi', activeRoute: '#/exams' }, run.node));
      } catch (err) {
        U.mount(
          container,
          ui.page(
            { title: 'Kho đề thi', activeRoute: '#/exams' },
            errorBox(err),
            el('a', { class: 'btn btn-outline', href: '#/exams' }, 'Về kho đề'),
          ),
        );
      }
    })();
    return { node: container, cleanup: () => cleanup && cleanup() };
  }

  function classExamCard(code, ex, drafts) {
    const d = drafts['c:' + code + ':' + ex.id];
    let state = null;
    if (d && d.done) state = ui.pill('Đã nộp', 'green', 'task_alt');
    else if (d && d.start) state = ui.pill('Đang làm dở', 'amber', 'edit_note');
    else state = ui.pill('Chưa làm', 'rose', 'schedule');
    return el(
      'a',
      { class: 'xm-file is-class', href: '#/exams?cls=' + encodeURIComponent(code) + '&id=' + encodeURIComponent(ex.id) },
      el('div', { class: 'xm-file-icon xm-type-' + ex.type.toLowerCase() }, U.icon('description'), el('span', {}, TYPE_SHORT[ex.type] || 'Đề')),
      el(
        'div',
        { class: 'xm-file-body' },
        el('div', { class: 'xm-file-title' }, ex.title),
        el('div', { class: 'muted-sm xm-file-src' }, (ex.teacherName ? 'Giáo viên ' + ex.teacherName + ' · ' : '') + (ex.createdAt ? 'giao ' + U.formatDateVN(ex.createdAt.toISOString()) : '')),
        el(
          'div',
          { class: 'xm-file-meta' },
          el('span', {}, U.icon('schedule'), ex.time + ' phút'),
          ex.nTn ? el('span', {}, ex.nTn + ' trắc nghiệm') : null,
          ex.nTl ? el('span', {}, ex.nTl + ' tự luận') : null,
          el('span', {}, U.icon('description'), ex.pages + ' trang'),
        ),
        state,
      ),
      el('span', { class: 'btn btn-sm btn-outline xm-file-open' }, d && d.done ? 'Xem lại' : d && d.start ? 'Làm tiếp' : 'Làm bài'),
    );
  }

  // -------------------------------------------------------------------------
  // Danh sách đề (học sinh)
  // -------------------------------------------------------------------------

  function listView(params, ctx) {
    const profileGrade = ctx.profile ? ctx.profile.grade : 6;
    const gradeNow = Number(params.grade) || profileGrade;
    const typeNow = params.type && TYPE_ORDER.indexOf(params.type) !== -1 ? params.type : 'all';
    const exams = X.examsForGrade(gradeNow);
    const drafts = loadDrafts();

    function href(g, t) {
      const q = [];
      if (g !== profileGrade) q.push('grade=' + g);
      if (t !== 'all') q.push('type=' + t);
      return '#/exams' + (q.length ? '?' + q.join('&') : '');
    }

    const typesHere = TYPE_ORDER.filter((t) => exams.some((g) => g.exam.type === t));
    const shown = exams.filter((g) => typeNow === 'all' || g.exam.type === typeNow);

    const gradeTabs = el(
      'div',
      { class: 'xm-tabs', role: 'tablist', 'aria-label': 'Chọn khối' },
      [6, 7, 8, 9].map((g) =>
        el('a', { class: U.cn('ex-chip', g === gradeNow && 'is-active'), href: href(g, 'all') }, C.GRADE_LABELS[g] + ' (' + X.examsForGrade(g).length + ')'),
      ),
    );

    const typeTabs = typesHere.length
      ? el(
          'div',
          { class: 'xm-tabs' },
          el('a', { class: U.cn('ex-chip', typeNow === 'all' && 'is-active'), href: href(gradeNow, 'all') }, 'Tất cả'),
          typesHere.map((t) =>
            el('a', { class: U.cn('ex-chip', typeNow === t && 'is-active'), href: href(gradeNow, t) }, TYPE_SHORT[t] + ' (' + exams.filter((g) => g.exam.type === t).length + ')'),
          ),
        )
      : null;

    function card(g) {
      const e = g.exam;
      const items = g.items;
      const nTn = items.filter((x) => x.p === 'tn').length;
      const nTl = items.length - nTn;
      const keyed = items.some((x) => x.ans) || (e.sol && e.sol.length);
      const d = drafts[e.id];
      let state = null;
      if (d && d.done) {
        const sc = bankScore(items, d);
        const tn = items.filter((x) => x.p === 'tn' && x.ans);
        state = ui.pill(
          sc ? 'Đã nộp · ' + fmtNum(sc.value) + ' điểm' : 'Đã nộp · TN đúng ' + tn.filter((x) => d.a[x.id] === x.ans).length + '/' + tn.length,
          'green',
          'task_alt',
        );
      } else if (d && d.start) {
        state = ui.pill('Đang làm dở', 'amber', 'edit_note');
      }
      return el(
        'a',
        { class: 'xm-file', href: '#/exams?id=' + encodeURIComponent(e.id) },
        el('div', { class: 'xm-file-icon xm-type-' + e.type.toLowerCase() }, U.icon('description'), el('span', {}, TYPE_SHORT[e.type] || 'Đề')),
        el(
          'div',
          { class: 'xm-file-body' },
          el('div', { class: 'xm-file-title' }, bankTitle(e)),
          bankSource(e) ? el('div', { class: 'muted-sm xm-file-src' }, bankSource(e)) : null,
          el(
            'div',
            { class: 'xm-file-meta' },
            el('span', {}, U.icon('schedule'), e.time + ' phút'),
            el('span', {}, U.icon('format_list_numbered'), items.length + ' câu'),
            nTn ? el('span', {}, nTn + ' trắc nghiệm') : null,
            nTl ? el('span', {}, nTl + ' tự luận') : null,
            keyed ? el('span', { class: 'xm-has-key' }, U.icon('fact_check'), 'Có đáp án') : null,
          ),
          state,
        ),
        el('span', { class: 'btn btn-sm btn-outline xm-file-open' }, d && d.start && !d.done ? 'Làm tiếp' : 'Mở đề'),
      );
    }

    // Đề giáo viên giao (nạp sau, không chặn phần kho đề có sẵn)
    const code = AM.auth && AM.auth.classCode ? AM.auth.classCode() : null;
    const classSlot = el('div', {});
    if (code && AM.classExams && AM.fb && AM.fb.isReady()) {
      U.mount(classSlot, el('section', { class: 'card stack-sm' }, el('h2', { class: 'card-title' }, U.icon('school'), 'Đề giáo viên giao'), el('p', { class: 'muted-sm' }, 'Đang tải…')));
      AM.classExams
        .list(code)
        .then(function (list) {
          U.mount(
            classSlot,
            list.length
              ? el(
                  'section',
                  { class: 'stack-sm' },
                  el('h2', { class: 'card-title' }, U.icon('school'), 'Đề giáo viên giao (' + list.length + ')'),
                  el('div', { class: 'xm-grid' }, list.map((ex) => classExamCard(code, ex, drafts))),
                )
              : null,
          );
        })
        .catch(function () {
          U.mount(classSlot, null);
        });
    }

    const extras = X.extrasForGrade(gradeNow);

    return ui.page(
      { title: 'Kho đề thi', activeRoute: '#/exams' },
      el(
        'section',
        { class: 'stack-sm' },
        el('h1', { class: 'page-title' }, 'Kho đề thi ' + C.GRADE_LABELS[gradeNow].toLowerCase()),
        el(
          'p',
          { class: 'page-sub' },
          'Đề kiểm tra giữa kì, cuối kì' + (gradeNow === 9 ? ', đề thi thử vào 10' : '') +
            ' giữ nguyên đề gốc. Mở đề để xem nguyên tờ đề, tô đáp án vào phiếu trả lời trong thời gian quy định ' +
            'rồi nộp bài — trắc nghiệm được chấm ngay, kết quả tính vào hồ sơ năng lực.',
        ),
      ),
      classSlot,
      el('section', { class: 'stack-sm' }, el('h2', { class: 'card-title' }, U.icon('folder_open'), 'Kho đề có sẵn'), gradeTabs, typeTabs),
      shown.length
        ? el('section', { class: 'xm-grid' }, shown.map(card))
        : ui.empty('📭', 'Chưa có đề thi', 'Kho đề thi cho ' + C.GRADE_LABELS[gradeNow] + ' đang trống.'),
      extras.length
        ? el(
            'section',
            { class: 'card stack-sm' },
            el('h2', { class: 'card-title' }, U.icon('assignment'), 'Ôn tập chương'),
            el('p', { class: 'muted-sm' }, extras.length + ' mục ôn tập nguyên khối — xem trong trang Bài tập.'),
            el('a', { class: 'btn btn-sm btn-outline', href: '#/exercises' }, 'Sang trang Bài tập'),
          )
        : null,
    );
  }

  // -------------------------------------------------------------------------
  // Giáo viên: tải đề lên, xem bài nộp
  // -------------------------------------------------------------------------

  function uploadForm(code, onDone) {
    const f = {
      pages: [],
      title: '',
      type: 'KT',
      grade: 8,
      time: 45,
      nTn: 0,
      nTl: 0,
      key: '',
      tnPoints: '',
      hideSchool: true,
      topCover: 0,
      status: '',
      error: null,
      busy: false,
    };
    const node = el('section', { class: 'card stack-sm xm-upload' });
    const previewSlot = el('div', {});

    function field(label, input, hint) {
      return el('label', { class: 'xm-field' }, el('span', { class: 'xm-field-label' }, label), input, hint ? el('span', { class: 'muted-sm' }, hint) : null);
    }

    function numInput(key, min, max) {
      return el('input', {
        class: 'field',
        type: 'number',
        min: min,
        max: max,
        value: f[key],
        oninput: (e) => {
          f[key] = e.target.value === '' ? '' : Number(e.target.value);
          if (key === 'nTn') renderKeyHint();
        },
      });
    }

    const keyHint = el('span', { class: 'muted-sm' });
    function renderKeyHint() {
      const parsed = AM.classExams.parseKey(f.key);
      if (!f.key) keyHint.textContent = 'Bỏ trống nếu chưa có đáp án — học sinh vẫn làm được, chưa chấm tự động.';
      else keyHint.textContent = 'Đọc được ' + parsed.length + ' đáp án' + (f.nTn && parsed.length !== f.nTn ? ' — chưa khớp ' + f.nTn + ' câu trắc nghiệm.' : '.');
      keyHint.style.color = f.key && f.nTn && parsed.length !== f.nTn ? 'var(--red-pen)' : '';
    }

    function renderPreview() {
      if (!f.pages.length) {
        U.mount(previewSlot, null);
        return;
      }
      U.mount(
        previewSlot,
        el(
          'div',
          { class: 'stack-sm' },
          el(
            'div',
            { class: 'row xm-cover-tools' },
            el(
              'label',
              { class: 'row' },
              el('input', { type: 'checkbox', checked: f.hideSchool || null, onchange: (e) => { f.hideSchool = e.target.checked; renderPreview(); } }),
              'Tự che tên trường / phòng / sở GD (với PDF có chữ)',
            ),
            el(
              'label',
              { class: 'row grow' },
              'Che thêm phần đầu trang 1:',
              el('input', {
                type: 'range',
                min: 0,
                max: 40,
                value: Math.round(f.topCover * 100),
                class: 'grow',
                oninput: (e) => {
                  f.topCover = Number(e.target.value) / 100;
                  renderPreview();
                },
              }),
              el('span', { class: 'muted-sm' }, Math.round(f.topCover * 100) + '%'),
            ),
          ),
          el(
            'div',
            { class: 'xm-thumbs' },
            f.pages.map((p, i) => {
              const c = AM.classExams.covered(p, i, f);
              c.className = 'xm-thumb';
              return el('figure', {}, c, el('figcaption', { class: 'muted-sm' }, 'Trang ' + (i + 1) + (p.boxes.length && f.hideSchool ? ' · đã che ' + p.boxes.length + ' chỗ' : '')));
            }),
          ),
        ),
      );
    }

    async function pickFiles(e) {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;
      f.error = null;
      f.status = 'Đang đọc tệp…';
      render();
      try {
        f.pages = await AM.classExams.readFiles(files, (n) => {
          f.status = 'Đã đọc ' + n + ' trang…';
          const s = U.qs('.xm-up-status', node);
          if (s) s.textContent = f.status;
        });
        if (!f.title) f.title = files[0].name.replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ');
        f.status = f.pages.length + ' trang' + (f.pages.length >= AM.classExams.MAX_PAGES ? ' (tối đa ' + AM.classExams.MAX_PAGES + ')' : '');
      } catch (err) {
        f.pages = [];
        f.error = err;
        f.status = '';
      }
      render();
    }

    async function save() {
      f.error = null;
      const ans = AM.classExams.parseKey(f.key);
      try {
        if (!f.pages.length) throw new Error('Chọn tệp đề (PDF hoặc ảnh) trước.');
        if (!String(f.title).trim()) throw new Error('Đặt tên cho đề.');
        if (!(f.time >= 5 && f.time <= 240)) throw new Error('Thời gian làm bài từ 5 đến 240 phút.');
        if (!(f.nTn >= 0 && f.nTn <= 80) || !(f.nTl >= 0 && f.nTl <= 30) || f.nTn + f.nTl === 0) {
          throw new Error('Nhập số câu trắc nghiệm và/hoặc số câu tự luận.');
        }
        if (f.key && ans.length !== f.nTn) throw new Error('Đáp án có ' + ans.length + ' câu nhưng đề có ' + f.nTn + ' câu trắc nghiệm.');
        f.busy = true;
        f.status = 'Đang nén ảnh…';
        render();
        const imgs = AM.classExams.finalize(f.pages, f);
        f.status = 'Đang tải lên…';
        render();
        await AM.classExams.create(
          code,
          {
            title: String(f.title).trim(),
            type: f.type,
            grade: Number(f.grade),
            time: Number(f.time),
            nTn: Number(f.nTn) || 0,
            nTl: Number(f.nTl) || 0,
            tnPoints: f.tnPoints === '' ? null : Number(f.tnPoints),
          },
          imgs,
          f.key ? ans : [],
          (i, n) => {
            const s = U.qs('.xm-up-status', node);
            if (s) s.textContent = 'Đang tải lên trang ' + i + '/' + n + '…';
          },
        );
        f.busy = false;
        onDone();
        return;
      } catch (err) {
        f.error = err;
        f.busy = false;
        f.status = '';
      }
      render();
    }

    function render() {
      U.mount(
        node,
        el('h2', { class: 'card-title' }, U.icon('upload_file'), 'Tải đề lên cho lớp'),
        el(
          'p',
          { class: 'muted-sm' },
          'Chọn file PDF (hoặc nhiều ảnh chụp các trang đề theo thứ tự). File Word: mở bằng Word → "Lưu dưới dạng PDF" rồi tải lên. ' +
            'Tối đa ' + AM.classExams.MAX_PAGES + ' trang.',
        ),
        el(
          'div',
          { class: 'row' },
          el('input', { class: 'field', type: 'file', accept: 'application/pdf,.pdf,image/*', multiple: true, onchange: pickFiles, disabled: f.busy || null, 'aria-label': 'Chọn tệp đề' }),
          el('span', { class: 'muted-sm xm-up-status' }, f.status),
        ),
        previewSlot,
        el(
          'div',
          { class: 'xm-form-grid' },
          field('Tên đề', el('input', { class: 'field', value: f.title, placeholder: 'Ví dụ: Kiểm tra 45 phút chương 1', oninput: (e) => (f.title = e.target.value) })),
          field(
            'Loại đề',
            el(
              'select',
              { class: 'field', onchange: (e) => (f.type = e.target.value) },
              TYPE_ORDER.map((t) => el('option', { value: t, selected: f.type === t || null }, TYPE_LONG[t])),
            ),
          ),
          field('Khối', el('select', { class: 'field', onchange: (e) => (f.grade = Number(e.target.value)) }, [6, 7, 8, 9].map((g) => el('option', { value: g, selected: f.grade === g || null }, C.GRADE_LABELS[g])))),
          field('Thời gian (phút)', numInput('time', 5, 240)),
          field('Số câu trắc nghiệm', numInput('nTn', 0, 80)),
          field('Số câu tự luận', numInput('nTl', 0, 30), 'Học sinh tự đánh giá; bạn xem trong bảng nộp bài.'),
          field('Điểm phần trắc nghiệm', numInput('tnPoints', 0, 10), 'Ví dụ 3 (nếu TN 3 điểm). Bỏ trống: chỉ đếm câu đúng.'),
        ),
        field(
          'Đáp án trắc nghiệm',
          el('input', {
            class: 'field',
            value: f.key,
            placeholder: 'Ví dụ: ABCDA BBCDA hoặc 1A 2B 3C … (dùng _ cho câu không có đáp án)',
            oninput: (e) => {
              f.key = e.target.value;
              renderKeyHint();
            },
          }),
          keyHint,
        ),
        f.error ? errorBox(f.error) : null,
        el(
          'div',
          { class: 'row' },
          el('button', { class: 'btn btn-primary', type: 'button', disabled: f.busy || null, onclick: save }, U.icon('send'), f.busy ? 'Đang giao đề…' : 'Giao đề cho lớp'),
        ),
      );
      renderKeyHint();
      renderPreview();
    }

    render();
    return node;
  }

  function teacherExamDetail(container, code, id, classes) {
    const cls = classes.find((c) => c.code === code);
    U.mount(container, ui.page({ title: 'Kho đề thi', activeRoute: '#/exams' }, loading('Đang tải đề…')));
    (async function () {
      try {
        const ex = await AM.classExams.get(code, id);
        if (!ex) throw new Error('Không tìm thấy đề.');
        const [pages, ans, subs] = await Promise.all([
          AM.classExams.pages(code, id),
          AM.classExams.key(code, id),
          AM.classExams.submissions(code, id),
        ]);

        async function reset(s) {
          if (!window.confirm('Cho ' + s.name + ' làm lại? Bài nộp hiện tại sẽ bị xóa.')) return;
          await AM.classExams.resetSubmission(code, id, s.uid);
          teacherExamDetail(container, code, id, classes);
        }

        async function del() {
          if (!window.confirm('Xóa đề "' + ex.title + '" và toàn bộ bài nộp?')) return;
          await AM.classExams.remove(code, id);
          window.location.hash = '#/exams?cls=' + code;
        }

        const rows = subs
          .sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0))
          .map(function (s) {
            const r = AM.classExams.grade(ex, s.answers, ans);
            const tlOk = s.tl.filter((v) => v === true).length;
            return el(
              'tr',
              {},
              el('td', {}, s.name),
              el('td', {}, fmtWhen(s.submittedAt)),
              el('td', {}, s.startedAt && s.submittedAt ? fmtClock((s.submittedAt - s.startedAt) / 1000) : ''),
              el('td', {}, ex.nTn ? (r.keyed ? r.correct + '/' + r.keyed : s.answers.filter(Boolean).length + ' câu đã tô') : '—'),
              el('td', {}, r.score !== null ? fmtNum(r.score) : '—'),
              el('td', {}, ex.nTl ? tlOk + '/' + ex.nTl : '—'),
              el('td', {}, el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => reset(s) }, U.icon('restart_alt'), 'Cho làm lại')),
            );
          });

        U.mount(
          container,
          ui.page(
            { title: 'Kho đề thi', activeRoute: '#/exams' },
            el(
              'section',
              { class: 'xm-head' },
              el('a', { class: 'btn btn-ghost btn-sm', href: '#/exams?cls=' + code }, U.icon('arrow_back'), 'Đề của lớp'),
              el(
                'div',
                { class: 'stack-sm grow' },
                el('h1', { class: 'page-title' }, ex.title),
                el(
                  'div',
                  { class: 'xm-file-meta' },
                  el('span', {}, cls ? cls.name : code),
                  el('span', {}, U.icon('schedule'), ex.time + ' phút'),
                  el('span', {}, ex.nTn + ' trắc nghiệm · ' + ex.nTl + ' tự luận'),
                  el('span', {}, U.icon('description'), ex.pages + ' trang'),
                ),
              ),
              el('button', { class: 'btn btn-danger btn-sm', type: 'button', onclick: del }, U.icon('delete'), 'Xóa đề'),
            ),
            el(
              'section',
              { class: 'card stack-sm' },
              el('h2', { class: 'card-title' }, U.icon('fact_check'), 'Bài nộp (' + subs.length + ')'),
              ex.nTn ? el('p', { class: 'muted-sm' }, 'Đáp án: ' + (ans.length ? ans.map((a, i) => i + 1 + a).join(' ') : 'chưa nhập')) : null,
              subs.length
                ? el(
                    'div',
                    { class: 'roster-wrap' },
                    el(
                      'table',
                      { class: 'roster xm-table' },
                      el('thead', {}, el('tr', {}, ['Học sinh', 'Nộp lúc', 'Thời gian', 'Trắc nghiệm đúng', 'Điểm TN', 'Tự luận (tự đánh giá)', ''].map((h) => el('th', {}, h)))),
                      el('tbody', {}, rows),
                    ),
                  )
                : el('p', { class: 'muted' }, 'Chưa có học sinh nào nộp bài.'),
            ),
            el(
              'div',
              { class: 'xm-viewer' },
              el('div', { class: 'xm-viewer-bar' }, el('span', { class: 'xm-viewer-name' }, U.icon('picture_as_pdf'), ex.title + '.pdf')),
              el(
                'div',
                { class: 'xm-viewer-scroll' },
                el('article', { class: 'xm-paper is-pages', style: { '--zoom': '1' } }, pages.map((p, i) => el('div', { class: 'xm-page' }, pageImg(p.src, p.w, p.h, 'Trang ' + (i + 1))))),
              ),
            ),
          ),
        );
      } catch (err) {
        U.mount(container, ui.page({ title: 'Kho đề thi', activeRoute: '#/exams' }, errorBox(err), el('a', { class: 'btn btn-outline', href: '#/exams' }, 'Về kho đề')));
      }
    })();
  }

  function teacherView(params) {
    const container = el('div', {});
    U.mount(container, ui.page({ title: 'Kho đề thi', activeRoute: '#/exams' }, loading('Đang tải lớp…')));
    (async function () {
      let classes;
      try {
        classes = await AM.classroom.listMyClasses();
      } catch (err) {
        U.mount(container, ui.page({ title: 'Kho đề thi', activeRoute: '#/exams' }, errorBox(err)));
        return;
      }
      if (!classes.length) {
        U.mount(
          container,
          ui.page(
            { title: 'Kho đề thi', activeRoute: '#/exams' },
            ui.empty('🏫', 'Bạn chưa có lớp nào', 'Tạo lớp trước, rồi tải đề lên để giao cho học sinh trong lớp.', el('a', { class: 'btn btn-primary', href: '#/teacher' }, 'Tạo lớp')),
          ),
        );
        return;
      }
      const code = classes.some((c) => c.code === params.cls) ? params.cls : classes[0].code;
      if (params.id) {
        teacherExamDetail(container, code, params.id, classes);
        return;
      }
      let list = [];
      let listErr = null;
      try {
        list = await AM.classExams.list(code);
      } catch (err) {
        listErr = err;
      }
      const showForm = params.new === '1' || (!listErr && list.length === 0);
      const counts = {};
      await Promise.all(
        list.map((ex) =>
          AM.classExams
            .submissions(code, ex.id)
            .then((s) => (counts[ex.id] = s.length))
            .catch(() => (counts[ex.id] = 0)),
        ),
      );
      U.mount(
        container,
        ui.page(
          { title: 'Kho đề thi', activeRoute: '#/exams' },
          el(
            'section',
            { class: 'stack-sm' },
            el('h1', { class: 'page-title' }, 'Giao đề thi'),
            el(
              'p',
              { class: 'page-sub' },
              'Tải đề (PDF hoặc ảnh) lên cho từng lớp. Học sinh mở đề ngay trong Kho đề thi, tô phiếu trả lời trong thời gian quy định và nộp bài; ' +
                'trắc nghiệm được chấm theo đáp án bạn nhập. Đáp án chỉ hiện với học sinh sau khi em đã nộp.',
            ),
            el(
              'div',
              { class: 'xm-tabs' },
              classes.map((c) => el('a', { class: U.cn('ex-chip', c.code === code && 'is-active'), href: '#/exams?cls=' + c.code }, c.name + ' · ' + c.code)),
            ),
          ),
          listErr ? errorBox(listErr) : null,
          showForm
            ? uploadForm(code, () => {
                window.location.hash = '#/exams?cls=' + code + '&t=' + Date.now();
              })
            : el('div', {}, el('a', { class: 'btn btn-primary', href: '#/exams?cls=' + code + '&new=1' }, U.icon('upload_file'), 'Tải đề lên')),
          list.length
            ? el(
                'section',
                { class: 'stack-sm' },
                el('h2', { class: 'card-title' }, U.icon('folder_open'), 'Đề đã giao (' + list.length + ')'),
                el(
                  'div',
                  { class: 'xm-grid' },
                  list.map((ex) =>
                    el(
                      'a',
                      { class: 'xm-file', href: '#/exams?cls=' + code + '&id=' + ex.id },
                      el('div', { class: 'xm-file-icon xm-type-' + ex.type.toLowerCase() }, U.icon('description'), el('span', {}, TYPE_SHORT[ex.type] || 'Đề')),
                      el(
                        'div',
                        { class: 'xm-file-body' },
                        el('div', { class: 'xm-file-title' }, ex.title),
                        el(
                          'div',
                          { class: 'xm-file-meta' },
                          el('span', {}, U.icon('schedule'), ex.time + ' phút'),
                          el('span', {}, ex.nTn + ' TN · ' + ex.nTl + ' TL'),
                          el('span', {}, U.icon('description'), ex.pages + ' trang'),
                          ex.hasKey ? el('span', { class: 'xm-has-key' }, U.icon('fact_check'), 'Có đáp án') : el('span', {}, 'Chưa có đáp án'),
                        ),
                        ui.pill(counts[ex.id] + ' bài nộp', counts[ex.id] ? 'green' : 'sky', 'inbox'),
                      ),
                      el('span', { class: 'btn btn-sm btn-outline xm-file-open' }, 'Xem bài nộp'),
                    ),
                  ),
                ),
              )
            : null,
        ),
      );
    })();
    return container;
  }

  // -------------------------------------------------------------------------

  function view(params, ctx) {
    if (AM.auth && AM.auth.isTeacher && AM.auth.isTeacher()) return teacherView(params);
    if (params.cls && params.id) return classExamView(params, ctx);
    if (!ctx.hasProfile && !params.id && !params.grade) {
      return ui.page(
        { title: 'Kho đề thi', activeRoute: '#/exams' },
        ui.empty(
          '📒',
          'Cần thiết lập hồ sơ trước',
          'Hệ thống cần biết bạn học lớp mấy để mở đúng kho đề thi.',
          el('a', { class: 'btn btn-primary', href: '#/onboarding' }, 'Thiết lập ngay'),
        ),
      );
    }
    if (params.id) {
      const e = X.exam(params.id);
      const group = e ? X.examsForGrade(e.g).find((g) => g.exam.id === e.id) : null;
      if (!e || !group) {
        return ui.page(
          { title: 'Kho đề thi', activeRoute: '#/exams' },
          ui.empty('🔎', 'Không tìm thấy đề', 'Mã đề "' + params.id + '" không có trong kho.', el('a', { class: 'btn btn-primary', href: '#/exams' }, 'Về kho đề')),
        );
      }
      const run = examRunner(bankModel(e, group.items, ctx), ctx);
      return { node: ui.page({ title: 'Kho đề thi', activeRoute: '#/exams' }, run.node), cleanup: run.cleanup };
    }
    return listView(params, ctx);
  }

  AM.views = AM.views || {};
  AM.views.exams = view;
})(window.AM);
