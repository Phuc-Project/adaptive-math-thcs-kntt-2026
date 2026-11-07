/**
 * Gia sư AI — giao diện.
 *
 *   AM.tutorUI.renderRich(text)  Markdown tối giản + LaTeX ($…$, $$…$$) → phần tử
 *                                an toàn (mọi chữ của AI đều được escape HTML).
 *   AM.tutorUI.launcher(opts)    Nút "Gia sư AI" mở khung hội thoại ngay tại chỗ
 *                                (dùng trong thẻ bài tập và trang luyện tập).
 *   AM.tutorUI.panel(opts)       Khung hội thoại: 4 chế độ, gửi ảnh, trả lời dạng luồng.
 *   AM.views.tutor               Trang #/tutor — hỏi bài bất kì, chụp ảnh đề.
 *
 * Hội thoại lưu trong bộ nhớ theo `key` (vd. mã bài tập), nên khi thẻ bài tập
 * được vẽ lại (bấm "Làm được"…) cuộc trò chuyện và luồng đang chạy không mất.
 */
(function (AM) {
  'use strict';

  const U = AM.util;
  const el = U.el;
  const ui = AM.ui;

  const MODE_ICONS = { explain: 'psychology_alt', hint: 'tips_and_updates', check: 'fact_check', solution: 'menu_book', ask: 'forum' };
  const QUICK_TEXT = {
    explain: 'Vì sao đáp án của em đúng/sai? Em đã nghĩ sai ở đâu?',
    hint: 'Em chưa biết bắt đầu từ đâu, thầy/cô gợi ý giúp em bước đầu tiên.',
    solution: 'Em muốn xem lời giải chi tiết của bài này.',
  };
  const PLACEHOLDER = {
    explain: 'Em muốn hỏi thêm gì về chỗ sai? (có thể để trống)',
    hint: 'Em vướng ở đâu? (có thể để trống rồi bấm Gửi)',
    check: 'Gõ bài làm của em, hoặc bấm 📷 để chụp ảnh bài làm…',
    solution: 'Em muốn hỏi thêm gì về lời giải? (có thể để trống)',
    ask: 'Em muốn hỏi gì về bài này?',
  };

  // -------------------------------------------------------------------------
  // Markdown + LaTeX an toàn
  // -------------------------------------------------------------------------

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function katexHtml(tex, display) {
    // Dùng chung bộ chuẩn hoá + macro với câu hỏi ngân hàng (js/core/latex.js):
    // sửa `%`, dấu phẩy thập phân, √ △ ∥ ⊥, \overarc, chữ Việt trong công thức…
    if (AM.latex && AM.latex.renderTex) return AM.latex.renderTex(tex, display, { output: 'html' });
    if (window.katex) {
      try {
        return window.katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: 'ignore', trust: false, output: 'html' });
      } catch (e) {
        /* rơi xuống hiển thị thô */
      }
    }
    return '<code>' + esc(display ? '$$' + tex + '$$' : '$' + tex + '$') + '</code>';
  }

  function inline(s) {
    return s
      .replace(/\*\*([^*]+?)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>')
      .replace(/`([^`]+?)`/g, '<code>$1</code>');
  }

  // ---- Tách công thức ------------------------------------------------------

  const MATH_ENVS = 'cases|aligned|alignedat|gathered|array|matrix|pmatrix|bmatrix|vmatrix|align\\*?|gather\\*?|equation\\*?';
  const ENV_OPEN = new RegExp('\\\\begin\\{(' + MATH_ENVS + ')\\}', 'g');
  const MAX_INLINE = 600;

  function isEscaped(src, i) {
    let n = 0;
    for (let k = i - 1; k >= 0 && src[k] === '\\'; k--) n++;
    return n % 2 === 1;
  }

  /**
   * Chữ của AI → [{ type: 'text' | 'inline' | 'display', value }].
   *   - $$…$$, \[…\], môi trường \begin{cases}… đứng trần → công thức khối.
   *   - $…$, \(…\) → công thức trong dòng; `$` phải đóng trong cùng đoạn văn
   *     (không qua dòng trống) và không quá dài, nếu không coi là kí tự `$`
   *     thường — một dấu `$` lẻ không còn lật ngược toàn bộ phần sau thành
   *     công thức như trước.
   *   - \$ → kí tự `$`. Công thức chưa đóng (đang nhận luồng) giữ nguyên chữ.
   */
  function splitMath(src) {
    const out = [];
    let buf = '';
    const flush = () => {
      if (buf) out.push({ type: 'text', value: buf });
      buf = '';
    };
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '$' && isEscaped(src, i)) {
        buf = buf.slice(0, -1) + '$';
        i++;
        continue;
      }
      if (src.startsWith('$$', i) || src.startsWith('\\[', i)) {
        const close = src[i] === '$' ? '$$' : '\\]';
        const end = src.indexOf(close, i + 2);
        if (end !== -1 && src.slice(i + 2, end).trim()) {
          flush();
          out.push({ type: 'display', value: src.slice(i + 2, end) });
          i = end + 2;
          continue;
        }
        buf += src.slice(i, i + 2);
        i += 2;
        continue;
      }
      if (src.startsWith('\\(', i)) {
        const end = src.indexOf('\\)', i + 2);
        if (end !== -1) {
          flush();
          out.push({ type: 'inline', value: src.slice(i + 2, end) });
          i = end + 2;
          continue;
        }
      }
      if (ch === '$') {
        let end = -1;
        for (let k = i + 1; k < src.length && k - i <= MAX_INLINE; k++) {
          if (src[k] === '\n' && /^\n[ \t]*\n/.test(src.slice(k, k + 40))) break; // hết đoạn văn
          if (src[k] === '$' && !isEscaped(src, k)) {
            end = k;
            break;
          }
        }
        if (end !== -1 && src.slice(i + 1, end).trim()) {
          flush();
          out.push({ type: 'inline', value: src.slice(i + 1, end) });
          i = end + 1;
          continue;
        }
        buf += '$';
        i++;
        continue;
      }
      if (ch === '\\' && src.startsWith('\\begin{', i)) {
        ENV_OPEN.lastIndex = i;
        const m = ENV_OPEN.exec(src);
        if (m && m.index === i) {
          const closeTag = '\\end{' + m[1] + '}';
          const end = src.indexOf(closeTag, i);
          if (end !== -1) {
            flush();
            out.push({ type: 'display', value: src.slice(i, end + closeTag.length) });
            i = end + closeTag.length;
            continue;
          }
        }
      }
      buf += ch;
      i++;
    }
    flush();
    return out;
  }

  /**
   * AI đôi khi quên dấu $: "Ta có x = \frac{3}{4} nên…". Tìm đoạn chứa lệnh
   * LaTeX trong phần chữ thường và bọc thành công thức trong dòng. Đoạn mở rộng
   * qua kí tự công thức (chữ Latin không dấu, số, toán tử, ngoặc, lệnh \…),
   * dừng ở chữ tiếng Việt có dấu hoặc dấu chấm câu; ngoặc nhọn phải cân bằng.
   */
  const BARE_CMD =
    /\\(?:d?t?frac|sqrt|cdot|times|div|pm|mp|leq?|geq?|neq?|approx|equiv|pi|alpha|beta|gamma|Delta|widehat|hat|angle|triangle|parallel|perp|backsim|sim|in|notin|subset|subseteq|cup|cap|infty|Rightarrow|Leftrightarrow|iff|overline|overrightarrow|vec|circ|degree|mathbb|left|right|vdots|cdots|ldots|sin|cos|tan|cot|varnothing|emptyset|mid|text|overset|underbrace)(?![A-Za-z])/;
  const RUN_CH = /[A-Za-z0-9{}^_()[\]+\-*/=<>|.,'\\ !:;]/;

  function wrapBareTex(text) {
    if (!BARE_CMD.test(text)) return [{ type: 'text', value: text }];
    const out = [];
    let rest = text;
    let guard = 0;
    while (rest && guard++ < 20) {
      const m = BARE_CMD.exec(rest);
      if (!m) break;
      let a = m.index;
      let b = m.index + m[0].length;
      while (a > 0 && RUN_CH.test(rest[a - 1]) && rest[a - 1] !== '\n') a--;
      while (b < rest.length && RUN_CH.test(rest[b]) && rest[b] !== '\n') b++;
      // Dừng giữa một chữ tiếng Việt ("90^\circ, nên") → lùi về hết chữ trước đó.
      if (b < rest.length && /[A-Za-zÀ-ỹĐđ]/.test(rest[b])) {
        while (b > m.index + m[0].length && /[A-Za-z]/.test(rest[b - 1])) b--;
      }
      if (a > 0 && /[A-Za-zÀ-ỹĐđ]/.test(rest[a - 1])) {
        while (a < m.index && /[A-Za-z]/.test(rest[a])) a++;
      }
      let piece = rest.slice(a, b);
      // Bỏ khoảng trắng/dấu câu ở hai đầu; chữ "và", "nên"… có dấu đã chặn từ trước.
      const lead = /^[\s.,;:!]*/.exec(piece)[0].length;
      piece = piece.slice(lead);
      a += lead;
      const trail = /[\s.,;:!]*$/.exec(piece)[0].length;
      piece = piece.slice(0, piece.length - trail);
      b = a + piece.length;
      const opens = (piece.match(/(^|[^\\])\{/g) || []).length;
      const closes = (piece.match(/(^|[^\\])\}/g) || []).length;
      if (opens !== closes || !piece) {
        out.push({ type: 'text', value: rest.slice(0, m.index + m[0].length) });
        rest = rest.slice(m.index + m[0].length);
        continue;
      }
      if (a > 0) out.push({ type: 'text', value: rest.slice(0, a) });
      out.push({ type: 'inline', value: piece });
      rest = rest.slice(b);
    }
    if (rest) out.push({ type: 'text', value: rest });
    return out;
  }

  // ---- Bảng Markdown ---------------------------------------------------------

  const TABLE_ROW = /^\s*\|.*\|\s*$/;
  const TABLE_SEP = /^\s*\|?(\s*:?-{2,}:?\s*\|)+\s*:?-*:?\s*\|?\s*$/;

  function tableHtml(rows) {
    const cells = (line) =>
      line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => inline(c.trim()));
    const body = rows.filter((r) => !TABLE_SEP.test(r));
    if (!body.length) return '';
    const hasHead = rows.length > 1 && TABLE_SEP.test(rows[1]);
    let html = '<div class="tutor-table-wrap"><table class="tutor-table">';
    body.forEach(function (r, i) {
      const tag = hasHead && i === 0 ? 'th' : 'td';
      html += '<tr>' + cells(r).map((c) => '<' + tag + '>' + c + '</' + tag + '>').join('') + '</tr>';
    });
    return html + '</table></div>';
  }

  function renderRichHtml(text) {
    const maths = [];
    const keep = (html) => {
      maths.push(html);
      return '' + (maths.length - 1) + '';
    };
    const segs = [];
    for (const seg of splitMath(String(text || ''))) {
      if (seg.type === 'text') segs.push.apply(segs, wrapBareTex(seg.value));
      else segs.push(seg);
    }
    let s = segs
      .map(function (seg) {
        if (seg.type === 'text') return seg.value;
        if (seg.type === 'display') return keep('<span class="tutor-math">' + katexHtml(seg.value.trim(), true) + '</span>');
        return keep(katexHtml(seg.value.trim(), false));
      })
      .join('');
    s = esc(s);

    const out = [];
    let list = null; // 'ul' | 'ol'
    let table = null; // các dòng bảng đang gom
    const closeList = () => {
      if (list) out.push('</' + list + '>');
      list = null;
    };
    const closeTable = () => {
      if (table) out.push(tableHtml(table));
      table = null;
    };
    for (const rawLine of s.split('\n')) {
      const line = rawLine.trimEnd();
      let m;
      if (TABLE_ROW.test(line)) {
        closeList();
        (table = table || []).push(line);
        continue;
      }
      closeTable();
      if (!line.trim()) {
        closeList();
        continue;
      }
      if ((m = /^\s*(?:\*\*)?Bước\s*(\d+)\s*[:.)]\s*(?:\*\*)?\s*(.*)$/i.exec(line))) {
        // "Bước 1: …" → một bước có số tròn, nối với nhau bằng đường kẻ dọc.
        closeList();
        out.push(
          '<div class="tutor-step"><span class="tutor-step-no">' + m[1] + '</span><div class="tutor-step-body">' +
            inline(m[2].replace(/^\*\*\s*/, '')) + '</div></div>',
        );
      } else if ((m = /^\s*(?:\*\*)?((?:Đáp số|Đáp án|Kết luận|Kết quả)\s*:?)(?:\*\*)?\s*(.*)$/.exec(line))) {
        closeList();
        out.push('<p class="tutor-answer"><strong>' + m[1] + '</strong> ' + inline(m[2]) + '</p>');
      } else if ((m = /^\s*#{1,4}\s+(.*)$/.exec(line))) {
        closeList();
        out.push('<p class="tutor-h">' + inline(m[1]) + '</p>');
      } else if ((m = /^\s*[-*•]\s+(.*)$/.exec(line))) {
        if (list !== 'ul') {
          closeList();
          out.push('<ul>');
          list = 'ul';
        }
        out.push('<li>' + inline(m[1]) + '</li>');
      } else if ((m = /^\s*(\d+)[.)]\s+(.*)$/.exec(line))) {
        if (list !== 'ol') {
          closeList();
          out.push('<ol>');
          list = 'ol';
        }
        out.push('<li value="' + m[1] + '">' + inline(m[2]) + '</li>');
      } else {
        closeList();
        out.push('<p>' + inline(line) + '</p>');
      }
    }
    closeTable();
    closeList();
    return out.join('').replace(/(\d+)/g, (_m, i) => maths[Number(i)] || '');
  }

  function renderRich(text) {
    return el('div', { class: 'tutor-rich', html: renderRichHtml(text) });
  }

  // -------------------------------------------------------------------------
  // Trạng thái hội thoại (theo key)
  // -------------------------------------------------------------------------

  const SESSIONS = new Map();

  function session(key, defaults) {
    if (!SESSIONS.has(key)) {
      SESSIONS.set(key, {
        mode: defaults.mode || 'hint',
        messages: [],
        uploads: [],
        busy: false,
        error: null,
        errorCode: null,
        abort: null,
        draft: '',
        open: !!defaults.open,
      });
    }
    return SESSIONS.get(key);
  }

  function findPanel(key) {
    return U.qsa('[data-tutor]').filter((n) => n.getAttribute('data-tutor') === key)[0] || null;
  }

  // -------------------------------------------------------------------------
  // Khung hội thoại
  // -------------------------------------------------------------------------

  /** Một dòng giải thích cho mỗi chế độ — hiện ngay dưới thanh chọn chế độ. */
  const MODE_DESC = {
    explain: 'Phân tích vì sao đáp án em chọn đúng hay sai và chỉ ra chỗ em nghĩ nhầm.',
    hint: 'Gợi ý từng bước để em tự làm tiếp, không đưa ngay đáp án.',
    check: 'Gõ hoặc chụp ảnh bài làm: gia sư chỉ ra bước sai và cách sửa.',
    solution: 'Lời giải đầy đủ từng bước, kèm một bài tương tự để tự luyện.',
    ask: 'Hỏi bất kì điều gì về kiến thức, công thức hay cách làm.',
  };

  /**
   * opts = { key, context, imageRefs, title, allowUpload, compact, suggestions }
   * context: { grade, topic, lesson, label, kind, level, mastery, answerKey,
   *            questionText, hasSolutionImage, imageNote }
   */
  function panel(opts) {
    const s = session(opts.key, opts);
    const ctx = opts.context || {};
    // Có đề bài cụ thể (thẻ bài tập, câu luyện tập) thì các chế độ "một chạm"
    // hỏi được ngay; ở trang Gia sư không có đề, bấm chế độ chỉ đổi chế độ.
    const hasProblem = !!(ctx.questionText || (opts.imageRefs && opts.imageRefs.length));
    const root = el('div', { class: U.cn('tutor', opts.compact && 'is-compact'), 'data-tutor': opts.key });

    function node() {
      return findPanel(opts.key) || root;
    }

    function swap(selector, fresh) {
      const old = U.qs(selector, node());
      if (old) old.parentNode.replaceChild(fresh, old);
    }

    function repaint() {
      const msgs = U.qs('.tutor-msgs', node());
      if (msgs) U.mount(msgs, messageNodes());
      swap('.tutor-head', header());
      swap('.tutor-modebar', modeBar());
      swap('.tutor-foot', footer());
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    /** Trong lúc trả lời dạng luồng chỉ vẽ lại phần tin nhắn (giữ nguyên ô nhập). */
    let frame = 0;
    function repaintSoon() {
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        const msgs = U.qs('.tutor-msgs', node());
        if (!msgs) return;
        const nearBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;
        U.mount(msgs, messageNodes());
        if (nearBottom) msgs.scrollTop = msgs.scrollHeight;
      });
    }

    function focusInput() {
      window.requestAnimationFrame(function () {
        const ta = U.qs('.tutor-input', node());
        if (ta) ta.focus();
      });
    }

    function setMode(mode) {
      s.mode = mode;
      // Chế độ "một chạm" khi đã có đề: bấm là hỏi luôn.
      if (hasProblem && QUICK_TEXT[mode] && !s.busy && !s.draft.trim()) {
        send(QUICK_TEXT[mode]);
        return;
      }
      repaint();
      focusInput();
    }

    async function send(textIn) {
      if (s.busy) return;
      const text = (textIn !== undefined ? textIn : s.draft).trim();
      if (!text && s.uploads.length === 0 && !(hasProblem && QUICK_TEXT[s.mode])) {
        s.error =
          s.mode === 'check'
            ? 'Em gõ bài làm hoặc chụp ảnh bài làm để gia sư kiểm tra nhé.'
            : 'Em gõ câu hỏi hoặc chụp ảnh đề bài trước khi gửi nhé.';
        s.errorCode = null;
        repaint();
        focusInput();
        return;
      }
      // "Một chạm" = không gõ thêm gì → máy chủ/máy này có thể trả lời từ cache.
      const quick = !text || text === QUICK_TEXT[s.mode];
      s.messages.push({
        role: 'user',
        text: text || QUICK_TEXT[s.mode] || 'Em cần giúp bài này.',
        mode: s.mode,
        images: s.uploads.map((u) => u.preview),
      });
      s.messages.push({ role: 'model', text: '', pending: true, mode: s.mode });
      s.draft = '';
      s.busy = true;
      s.error = null;
      s.errorCode = null;
      const controller = new AbortController();
      s.abort = controller;
      const images = s.uploads.map((u) => ({ mime: u.mime, data: u.data }));
      s.uploads = [];
      repaint();

      const reply = s.messages[s.messages.length - 1];
      try {
        const res = await AM.tutor.ask(
          {
            mode: s.mode,
            context: ctx,
            messages: s.messages
              .filter((m) => !m.pending)
              .map((m) => ({ role: m.role, text: m.text })),
            quick: quick && images.length === 0,
            imageRefs: opts.imageRefs || [],
            solutionRefs: opts.solutionRefs || [],
            images: images,
          },
          function (delta) {
            reply.text += delta;
            repaintSoon();
          },
          controller.signal,
        );
        reply.pending = false;
        reply.meta = null;
        if (!reply.text) reply.text = res.text || '_(Gia sư không trả lời được, em thử hỏi lại nhé.)_';
        if (res.warning) s.error = res.warning;
      } catch (e) {
        reply.pending = false;
        if (controller.signal.aborted) {
          reply.text = (reply.text || '') + '\n\n_(Đã dừng.)_';
        } else {
          s.messages.splice(s.messages.indexOf(reply), 1);
          // Trả lại câu hỏi vào ô nhập để học sinh không phải gõ lại.
          const q = s.messages.pop();
          s.draft = q && text ? q.text : '';
          s.error = e.message || String(e);
          s.errorCode = e.code || null;
        }
      } finally {
        s.busy = false;
        s.abort = null;
        repaint();
      }
    }

    // ---- Đầu khung --------------------------------------------------------

    function header() {
      const sub = [ctx.grade ? 'Toán ' + ctx.grade : null, ctx.topic ? String(ctx.topic).split(' — ').pop() : null]
        .filter(Boolean)
        .join(' · ');
      return el(
        'div',
        { class: 'tutor-head' },
        el('span', { class: 'tutor-mark', 'aria-hidden': 'true' }, U.icon('function')),
        el(
          'div',
          { class: 'tutor-title' },
          el('strong', {}, opts.title || 'Gia sư AI'),
          el('span', {}, sub || 'Toán THCS · SGK Kết nối tri thức'),
        ),
        el(
          'span',
          { class: U.cn('tutor-status', s.busy && 'is-busy') },
          el('span', { class: 'tutor-dot' }),
          s.busy ? 'Đang trả lời' : 'Sẵn sàng',
        ),
        s.messages.length && !s.busy
          ? el(
              'button',
              {
                type: 'button',
                class: 'btn btn-ghost btn-sm tutor-new',
                title: 'Xoá cuộc trò chuyện này và hỏi lại từ đầu',
                onclick: function () {
                  s.messages = [];
                  s.uploads = [];
                  s.error = null;
                  repaint();
                  focusInput();
                },
              },
              U.icon('add_comment'),
              'Cuộc mới',
            )
          : null,
      );
    }

    function availableModes() {
      return Object.keys(AM.tutor.MODES).filter((mode) => mode !== 'explain' || ctx.studentAnswer);
    }

    function modeBar() {
      return el(
        'div',
        { class: 'tutor-modebar' },
        el(
          'div',
          { class: 'tutor-modes', role: 'tablist', 'aria-label': 'Chế độ hỏi' },
          availableModes().map(function (mode) {
            const on = s.mode === mode;
            return el(
              'button',
              {
                type: 'button',
                role: 'tab',
                'aria-selected': on ? 'true' : 'false',
                class: U.cn('tutor-mode', on && 'is-active'),
                disabled: s.busy || null,
                onclick: () => setMode(mode),
              },
              U.icon(MODE_ICONS[mode]),
              el('span', {}, AM.tutor.MODES[mode]),
            );
          }),
        ),
        el('p', { class: 'tutor-mode-desc' }, MODE_DESC[s.mode] || ''),
      );
    }

    // ---- Tin nhắn ---------------------------------------------------------

    function emptyState() {
      return el(
        'div',
        { class: 'tutor-empty' },
        el('p', { class: 'tutor-empty-title' }, hasProblem ? 'Em cần gia sư giúp gì với bài này?' : 'Em cần giúp gì?'),
        el(
          'div',
          { class: 'tutor-mode-cards' },
          availableModes().map((mode) =>
            el(
              'button',
              {
                type: 'button',
                class: U.cn('tutor-mode-card', s.mode === mode && 'is-active'),
                onclick: () => setMode(mode),
              },
              U.icon(MODE_ICONS[mode]),
              el('strong', {}, AM.tutor.MODES[mode]),
              el('span', {}, MODE_DESC[mode]),
            ),
          ),
        ),
        opts.suggestions && opts.suggestions.length
          ? el(
              'div',
              { class: 'tutor-suggest' },
              el('span', { class: 'tutor-suggest-label' }, 'Thử hỏi'),
              opts.suggestions.map((q) =>
                el(
                  'button',
                  {
                    type: 'button',
                    class: 'tutor-suggest-chip',
                    onclick: function () {
                      s.mode = 'ask';
                      send(q);
                    },
                  },
                  q,
                ),
              ),
            )
          : null,
      );
    }

    function copyButton(m) {
      if (!navigator.clipboard) return null;
      const btn = el(
        'button',
        {
          type: 'button',
          class: 'tutor-act',
          onclick: function () {
            navigator.clipboard.writeText(m.text).then(
              function () {
                btn.lastChild.textContent = 'Đã chép';
                setTimeout(() => (btn.lastChild.textContent = 'Chép'), 1500);
              },
              function () {},
            );
          },
        },
        U.icon('content_copy'),
        el('span', {}, 'Chép'),
      );
      return btn;
    }

    function messageNodes() {
      if (s.messages.length === 0) return emptyState();
      return s.messages.map(function (m) {
        if (m.role === 'user') {
          return el(
            'div',
            { class: 'tutor-msg is-user' },
            el('div', { class: 'tutor-msg-meta' }, AM.tutor.MODES[m.mode] || 'Câu hỏi'),
            m.images && m.images.length
              ? el('div', { class: 'tutor-msg-imgs' }, m.images.map((src) => el('img', { src: src, alt: 'Ảnh em gửi' })))
              : null,
            el('div', { class: 'tutor-msg-text' }, m.text),
          );
        }
        return el(
          'div',
          { class: 'tutor-msg is-model' },
          el('span', { class: 'tutor-msg-avatar', 'aria-hidden': 'true' }, U.icon('function')),
          el(
            'div',
            { class: 'tutor-msg-body' },
            el(
              'div',
              { class: 'tutor-msg-meta' },
              el('strong', {}, 'Gia sư AI'),
              m.mode ? el('span', {}, AM.tutor.MODES[m.mode] || '') : null,
              !m.pending && m.text ? copyButton(m) : null,
            ),
            m.text
              ? renderRich(m.text)
              : el('div', { class: 'tutor-typing', 'aria-label': 'Gia sư đang soạn câu trả lời' }, el('span'), el('span'), el('span')),
            m.meta ? el('div', { class: 'tutor-meta' }, m.meta) : null,
          ),
        );
      });
    }

    // ---- Ô soạn câu hỏi ---------------------------------------------------

    function devKeyBox() {
      const input = el('input', {
        class: 'field',
        type: 'password',
        placeholder: 'Dán khóa Gemini API (chỉ lưu trên máy này)',
        autocomplete: 'off',
      });
      return el(
        'div',
        { class: 'tutor-dev stack-sm' },
        el(
          'p',
          { class: 'muted-sm' },
          'Chế độ thử trên máy: web đang chạy không có máy chủ /api/tutor. Dán khóa Gemini để thử ngay — ',
          'khi triển khai, đặt khóa ở biến môi trường GEMINI_API_KEY thay vì ở đây.',
        ),
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
                s.error = null;
                s.errorCode = null;
                repaint();
              },
            },
            'Lưu khóa',
          ),
        ),
      );
    }

    function autosize(ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 220) + 'px';
    }

    function footer() {
      const ta = el('textarea', {
        class: 'tutor-input',
        rows: 2,
        placeholder: PLACEHOLDER[s.mode] || PLACEHOLDER.ask,
        'aria-label': 'Câu hỏi cho gia sư',
        oninput: (e) => {
          s.draft = e.target.value;
          autosize(e.target);
        },
        onkeydown: function (e) {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            send();
          }
        },
      });
      ta.value = s.draft;
      if (s.draft) window.requestAnimationFrame(() => autosize(ta));

      const fileInput = el('input', {
        type: 'file',
        accept: 'image/*',
        capture: 'environment',
        class: 'hide',
        onchange: async function (e) {
          const f = e.target.files && e.target.files[0];
          if (!f) return;
          try {
            if (s.uploads.length >= 2) s.uploads.shift();
            s.uploads.push(await AM.tutor.prepareUpload(f));
            s.error = null;
          } catch (err) {
            s.error = err.message;
          }
          repaint();
          focusInput();
        },
      });

      return el(
        'div',
        { class: 'tutor-foot' },
        s.error ? ui.banner('error', s.error) : null,
        s.errorCode === 'no-backend' ? devKeyBox() : null,
        el(
          'div',
          { class: U.cn('tutor-composer', s.busy && 'is-busy') },
          s.uploads.length
            ? el(
                'div',
                { class: 'tutor-uploads' },
                s.uploads.map((u, i) =>
                  el(
                    'div',
                    { class: 'tutor-thumb' },
                    el('img', { src: u.preview, alt: 'Ảnh gửi kèm ' + (i + 1) }),
                    el(
                      'button',
                      {
                        type: 'button',
                        class: 'icon-btn',
                        title: 'Bỏ ảnh',
                        onclick: function () {
                          s.uploads.splice(i, 1);
                          repaint();
                        },
                      },
                      U.icon('close'),
                    ),
                  ),
                ),
              )
            : null,
          ta,
          el(
            'div',
            { class: 'tutor-toolbar' },
            opts.allowUpload !== false
              ? el(
                  'label',
                  { class: 'tutor-tool', title: 'Chụp hoặc chọn ảnh đề / bài làm' },
                  U.icon('photo_camera'),
                  el('span', {}, 'Ảnh'),
                  fileInput,
                )
              : null,
            el('span', { class: 'tutor-hint' }, 'Ctrl + Enter để gửi'),
            s.busy
              ? el(
                  'button',
                  { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => s.abort && s.abort.abort() },
                  U.icon('stop'),
                  'Dừng',
                )
              : el(
                  'button',
                  { type: 'button', class: 'btn btn-primary btn-sm tutor-send', onclick: () => send() },
                  'Gửi',
                  U.icon('arrow_upward'),
                ),
          ),
        ),
        el('p', { class: 'tutor-note' }, 'Gia sư AI có thể nhầm. Hãy đối chiếu với sách giáo khoa, lời giải hoặc thầy cô.'),
      );
    }

    // Mở khung là hỏi luôn (vd. "Vì sao em sai?" từ sổ tay lỗi) — chỉ một lần.
    if (opts.autoAsk && s.messages.length === 0 && !s.autoAsked && !s.busy) {
      s.autoAsked = true;
      s.mode = opts.autoAsk.mode;
      Promise.resolve().then(() => send(opts.autoAsk.text || QUICK_TEXT[opts.autoAsk.mode] || ''));
    }

    U.mount(root, header(), modeBar(), el('div', { class: 'tutor-msgs', 'aria-live': 'polite' }, messageNodes()), footer());
    window.requestAnimationFrame(function () {
      const msgs = U.qs('.tutor-msgs', root);
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    });
    return root;
  }

  /** Nút mở/đóng khung gia sư ngay tại chỗ. */
  function launcher(opts) {
    const s = session(opts.key, opts);
    const wrap = el('div', { class: 'tutor-launch' });
    function draw() {
      U.mount(
        wrap,
        el(
          'button',
          {
            type: 'button',
            class: U.cn('btn btn-sm', s.open ? 'btn-primary' : 'btn-outline'),
            onclick: function () {
              s.open = !s.open;
              draw();
            },
          },
          U.icon('smart_toy'),
          s.open ? 'Đóng gia sư AI' : opts.label || 'Hỏi gia sư AI',
        ),
        s.open ? panel(Object.assign({ compact: true }, opts)) : null,
      );
    }
    draw();
    return wrap;
  }

  // -------------------------------------------------------------------------
  // Trang #/tutor
  // -------------------------------------------------------------------------

  /** Thẻ tra cứu nhanh bên cạnh khung hỏi: định nghĩa / công thức của chủ đề. */
  function referenceCard(topic) {
    if (!topic) return null;
    let body = null;
    if (AM.trial && topic.id === AM.trial.TOPIC_ID && AM.trial.formulaList) {
      body = AM.trial.formulaList();
    } else {
      const theory = AM.bank.getTheory(topic.id);
      const blocks = theory ? theory.knowledgeBlocks.filter((b) => b.type === 'dn').slice(0, 3) : [];
      if (blocks.length) {
        body = el(
          'div',
          { class: 'stack-sm' },
          blocks.map((b) =>
            el(
              'div',
              { class: 'tutor-ref-item' },
              b.title ? el('div', { class: 'tutor-ref-name' }, b.title) : null,
              AM.latex.render(b.content, 'tutor-ref-math'),
            ),
          ),
        );
      }
    }
    if (!body) return null;
    return el(
      'section',
      { class: 'tutor-side-card' },
      el('h2', { class: 'tutor-side-title' }, U.icon('functions'), 'Tra cứu nhanh'),
      body,
      el(
        'a',
        { class: 'tutor-side-link', href: '#/theory?topic=' + encodeURIComponent(topic.id) },
        'Mở lý thuyết đầy đủ',
        U.icon('chevron_right'),
      ),
    );
  }

  function tipsCard() {
    const TIPS = [
      ['photo_camera', 'Chụp thẳng, đủ sáng, cả đề lẫn hình vẽ.'],
      ['edit_note', 'Ghi rõ em đã làm đến bước nào và vướng ở đâu.'],
      ['tips_and_updates', 'Muốn tự làm thì chọn "Gợi ý bước đầu" trước, chưa xem lời giải vội.'],
    ];
    return el(
      'section',
      { class: 'tutor-side-card' },
      el('h2', { class: 'tutor-side-title' }, U.icon('lightbulb'), 'Hỏi sao cho hiệu quả'),
      el(
        'ul',
        { class: 'tutor-tips' },
        TIPS.map(([icon, t]) => el('li', {}, U.icon(icon), el('span', {}, t))),
      ),
    );
  }

  function view(params, ctx) {
    const pageState = view._state || (view._state = { topicId: '', grade: null });
    // Mở từ một bài cụ thể (#/tutor?topic=…, ví dụ bài học dùng thử): chọn sẵn
    // lớp và chủ đề đó, rồi bỏ tham số khỏi địa chỉ để lần chọn sau của học
    // sinh không bị ghi đè.
    const asked = params.topic ? AM.topics.getTopicById(params.topic) : null;
    if (asked) {
      pageState.grade = asked.grade;
      pageState.topicId = asked.id;
      try {
        window.history.replaceState(null, '', window.location.pathname + window.location.search + '#/tutor');
      } catch (err) {
        // file:// — địa chỉ còn tham số chỉ là chuyện thẩm mỹ.
      }
    }
    // Giáo viên (và học sinh chưa làm hồ sơ) không có lớp trong hồ sơ → cho tự chọn lớp.
    const ownGrade = ctx.profile ? ctx.profile.grade : null;
    const grade = pageState.grade || ownGrade || null;
    const showGradeSelect = !ownGrade || grade !== ownGrade;
    const topics = grade ? AM.topics.getTopicsByGrade(grade) : [];
    if (pageState.topicId && !topics.some((t) => t.id === pageState.topicId)) pageState.topicId = '';
    const gradeSelect = !showGradeSelect
      ? null
      : el(
          'select',
          {
            class: 'field',
            onchange: function (e) {
              pageState.grade = Number(e.target.value) || null;
              pageState.topicId = '';
              AM.router.render();
            },
          },
          el('option', { value: '' }, 'Chọn lớp'),
          [6, 7, 8, 9].map((g) => el('option', { value: String(g), selected: g === grade || null }, 'Lớp ' + g)),
        );

    const select = el(
      'select',
      {
        class: 'field',
        onchange: function (e) {
          pageState.topicId = e.target.value;
          AM.router.render();
        },
      },
      el('option', { value: '' }, 'Hỏi chung, không theo chủ đề'),
      topics.map((t) =>
        el('option', { value: t.id, selected: t.id === pageState.topicId || null }, 'Chương ' + t.chapter + ' · ' + t.title),
      ),
    );

    const topic = pageState.topicId ? AM.topics.getTopicById(pageState.topicId) : null;
    const mastery = topic && AM.exercises ? AM.exercises.topicMastery(topic.id, ctx) : null;
    const isTrial = !!(AM.trial && topic && topic.id === AM.trial.TOPIC_ID);

    const contextCard = el(
      'section',
      { class: 'tutor-side-card tutor-topic' },
      el('h2', { class: 'tutor-side-title' }, U.icon('tune'), 'Bài đang hỏi'),
      gradeSelect ? el('label', { class: 'field-label' }, 'Lớp', gradeSelect) : null,
      el('label', { class: 'field-label' }, 'Chủ đề', select),
      mastery && mastery.source !== 'default'
        ? el(
            'div',
            { class: 'tutor-mastery' },
            el(
              'div',
              { class: 'row', style: { justifyContent: 'space-between' } },
              el('span', { class: 'muted-sm' }, 'Mức thành thạo của em'),
              el('strong', {}, U.pct(mastery.value)),
            ),
            ui.bar(mastery.value),
          )
        : el('p', { class: 'muted-sm' }, 'Chọn chủ đề để gia sư trả lời bám đúng bài em đang học.'),
    );

    return ui.page(
      { title: 'Gia sư AI', activeRoute: '#/tutor' },
      isTrial ? AM.trial.crumb(4, 'Hỏi Gia sư AI') : null,
      el(
        'div',
        { class: 'tutor-page' },
        el(
          'div',
          { class: 'tutor-main' },
          panel({
            key: 'page:' + (grade || 0) + ':' + (pageState.topicId || 'free'),
            mode: 'ask',
            allowUpload: true,
            suggestions: isTrial ? AM.trial.TUTOR_SUGGESTIONS : null,
            context: {
              grade: grade,
              topic: topic ? topic.chapterTitle + ' — ' + topic.title : null,
              topicId: topic ? topic.id : null,
              mastery: mastery && mastery.source !== 'default' ? mastery.value : null,
            },
          }),
        ),
        el('aside', { class: 'tutor-side' }, contextCard, referenceCard(topic), tipsCard()),
      ),
    );
  }

  AM.tutorUI = { renderRich: renderRich, renderRichHtml: renderRichHtml, panel: panel, launcher: launcher };
  AM.views = AM.views || {};
  AM.views.tutor = view;
})(window.AM);
