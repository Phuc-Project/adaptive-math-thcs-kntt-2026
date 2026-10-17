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
    if (window.katex) {
      try {
        return window.katex.renderToString(tex, {
          displayMode: display,
          throwOnError: false,
          strict: 'ignore',
          trust: false,
          output: 'html',
        });
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

  function renderRichHtml(text) {
    const maths = [];
    let s = String(text || '')
      .replace(/\\\[([\s\S]+?)\\\]/g, (_m, t) => '$$' + t + '$$')
      .replace(/\\\(([\s\S]+?)\\\)/g, (_m, t) => '$' + t + '$');
    s = s.replace(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g, function (_m, disp, inl) {
      maths.push(disp !== undefined ? katexHtml(disp.trim(), true) : katexHtml(inl.trim(), false));
      return '' + (maths.length - 1) + '';
    });
    s = esc(s);

    const out = [];
    let list = null; // 'ul' | 'ol'
    const closeList = () => {
      if (list) out.push('</' + list + '>');
      list = null;
    };
    for (const rawLine of s.split('\n')) {
      const line = rawLine.trimEnd();
      let m;
      if (!line.trim()) {
        closeList();
        continue;
      }
      if ((m = /^\s*#{1,4}\s+(.*)$/.exec(line))) {
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

  /**
   * opts = { key, context, imageRefs, title, allowUpload, compact }
   * context: { grade, topic, lesson, label, kind, level, mastery, answerKey,
   *            questionText, hasSolutionImage, imageNote }
   */
  function panel(opts) {
    const s = session(opts.key, opts);
    const root = el('div', { class: U.cn('tutor', opts.compact && 'is-compact'), 'data-tutor': opts.key });

    function repaint() {
      const node = findPanel(opts.key) || root;
      const msgs = U.qs('.tutor-msgs', node);
      if (msgs) U.mount(msgs, messageNodes());
      const foot = U.qs('.tutor-foot', node);
      if (foot) foot.parentNode.replaceChild(footer(), foot);
      if (msgs) msgs.scrollTop = msgs.scrollHeight;
    }

    let frame = 0;
    function repaintSoon() {
      if (frame) return;
      frame = window.requestAnimationFrame(function () {
        frame = 0;
        repaint();
      });
    }

    async function send(textIn) {
      if (s.busy) return;
      const text = (textIn !== undefined ? textIn : s.draft).trim();
      if (!text && s.mode === 'check' && s.uploads.length === 0) {
        s.error = 'Em gõ bài làm hoặc chụp ảnh bài làm để thầy/cô kiểm tra nhé.';
        s.errorCode = null;
        repaint();
        return;
      }
      // "Một chạm" = không gõ thêm gì → máy chủ/máy này có thể trả lời từ cache.
      const quick = !text || text === QUICK_TEXT[s.mode];
      s.messages.push({ role: 'user', text: text || QUICK_TEXT[s.mode] || 'Em cần giúp bài này.', mode: s.mode });
      s.messages.push({ role: 'model', text: '', pending: true });
      s.draft = '';
      s.busy = true;
      s.error = null;
      s.errorCode = null;
      const controller = new AbortController();
      s.abort = controller;
      repaint();

      const reply = s.messages[s.messages.length - 1];
      try {
        const res = await AM.tutor.ask(
          {
            mode: s.mode,
            context: opts.context || {},
            messages: s.messages
              .filter((m) => !m.pending)
              .map((m) => ({ role: m.role, text: m.text })),
            quick: quick && s.uploads.length === 0,
            imageRefs: opts.imageRefs || [],
            solutionRefs: opts.solutionRefs || [],
            images: s.uploads.map((u) => ({ mime: u.mime, data: u.data })),
          },
          function (delta) {
            reply.text += delta;
            repaintSoon();
          },
          controller.signal,
        );
        reply.pending = false;
        reply.meta = res.cached
          ? 'Trả lời từ bộ nhớ đệm — không tốn lượt gọi AI'
          : res.usage
            ? '≈ ' + (res.usage.in + res.usage.out + res.usage.think) + ' token' +
              (res.usage.cached ? ' (' + res.usage.cached + ' token được giảm giá nhờ cache)' : '')
            : null;
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

    function messageNodes() {
      if (s.messages.length === 0) {
        return el(
          'div',
          { class: 'tutor-empty muted-sm' },
          'Chọn một chế độ bên trên. "Vì sao đúng / sai" phân tích đáp án em đã chọn; "Gợi ý bước đầu" chỉ dẫn từng bước để em tự làm; ',
          '"Kiểm tra bài làm" xem bài em làm sai ở đâu; "Lời giải chi tiết" giải trọn bài kèm một bài tương tự.',
        );
      }
      return s.messages.map(function (m) {
        if (m.role === 'user') {
          return el(
            'div',
            { class: 'tutor-msg is-user' },
            m.mode ? el('span', { class: 'tutor-tag' }, AM.tutor.MODES[m.mode] || m.mode) : null,
            el('div', {}, m.text),
          );
        }
        return el(
          'div',
          { class: 'tutor-msg is-model' },
          m.text ? renderRich(m.text) : el('div', { class: 'tutor-typing' }, el('span'), el('span'), el('span')),
          m.meta ? el('div', { class: 'tutor-meta' }, m.meta) : null,
        );
      });
    }

    function modeBar() {
      return el(
        'div',
        { class: 'tutor-modes' },
        Object.keys(AM.tutor.MODES)
          .filter((mode) => mode !== 'explain' || (opts.context && opts.context.studentAnswer))
          .map(function (mode) {
          return el(
            'button',
            {
              type: 'button',
              class: U.cn('ex-chip', s.mode === mode && 'is-active'),
              onclick: function () {
                s.mode = mode;
                const bar = U.qs('.tutor-modes', findPanel(opts.key) || root);
                if (bar) bar.parentNode.replaceChild(modeBar(), bar);
                // Hai chế độ không cần gõ gì: bấm là hỏi luôn.
                if (QUICK_TEXT[mode] && !s.busy && !s.draft.trim()) send(QUICK_TEXT[mode]);
                else repaint();
              },
            },
            U.icon(MODE_ICONS[mode]),
            AM.tutor.MODES[mode],
          );
        }),
      );
    }

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
          'khi deploy lên Cloudflare Pages, đặt khóa ở biến môi trường GEMINI_API_KEY thay vì ở đây.',
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

    function footer() {
      const ta = el('textarea', {
        class: 'tutor-input',
        rows: 2,
        placeholder: PLACEHOLDER[s.mode] || PLACEHOLDER.ask,
        oninput: (e) => {
          s.draft = e.target.value;
        },
        onkeydown: function (e) {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            send();
          }
        },
      });
      ta.value = s.draft;

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
        },
      });

      return el(
        'div',
        { class: 'tutor-foot stack-sm' },
        s.error ? ui.banner('error', s.error) : null,
        s.errorCode === 'no-backend' ? devKeyBox() : null,
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
          { class: 'row', style: { justifyContent: 'space-between' } },
          el(
            'div',
            { class: 'row' },
            opts.allowUpload !== false
              ? el(
                  'label',
                  { class: 'btn btn-ghost btn-sm', title: 'Chụp/chọn ảnh đề hoặc bài làm' },
                  U.icon('photo_camera'),
                  'Gửi ảnh',
                  fileInput,
                )
              : null,
            s.messages.length && !s.busy
              ? el(
                  'button',
                  {
                    type: 'button',
                    class: 'link-btn muted-sm',
                    onclick: function () {
                      s.messages = [];
                      s.uploads = [];
                      s.error = null;
                      repaint();
                    },
                  },
                  'Hỏi lại từ đầu',
                )
              : null,
          ),
          s.busy
            ? el(
                'button',
                { type: 'button', class: 'btn btn-outline btn-sm', onclick: () => s.abort && s.abort.abort() },
                U.icon('stop'),
                'Dừng',
              )
            : el(
                'button',
                { type: 'button', class: 'btn btn-lime btn-sm', onclick: () => send() },
                'Gửi',
                U.icon('send'),
              ),
        ),
        el('p', { class: 'tutor-note' }, 'Gia sư AI có thể nhầm — hãy đối chiếu với lời giải, sách giáo khoa hoặc giáo viên.'),
      );
    }

    // Mở khung là hỏi luôn (vd. "Vì sao em sai?" từ sổ tay lỗi) — chỉ một lần.
    if (opts.autoAsk && s.messages.length === 0 && !s.autoAsked && !s.busy) {
      s.autoAsked = true;
      s.mode = opts.autoAsk.mode;
      Promise.resolve().then(() => send(opts.autoAsk.text || QUICK_TEXT[opts.autoAsk.mode] || ''));
    }

    U.mount(
      root,
      el(
        'div',
        { class: 'tutor-head' },
        el('span', { class: 'tutor-avatar' }, '🤖'),
        el('strong', {}, opts.title || 'Gia sư AI'),
        el('span', { class: 'muted-sm' }, 'Gemini · theo SGK Kết nối tri thức'),
      ),
      modeBar(),
      el('div', { class: 'tutor-msgs' }, messageNodes()),
      footer(),
    );
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

  function view(params, ctx) {
    const grade = ctx.profile ? ctx.profile.grade : null;
    const topics = grade ? AM.topics.getTopicsByGrade(grade) : [];
    const pageState = view._state || (view._state = { topicId: '' });

    const select = el(
      'select',
      {
        class: 'field',
        onchange: function (e) {
          pageState.topicId = e.target.value;
          AM.router.render();
        },
      },
      el('option', { value: '' }, 'Không chọn — hỏi chung'),
      topics.map((t) =>
        el('option', { value: t.id, selected: t.id === pageState.topicId || null }, 'Chương ' + t.chapter + ' · ' + t.title),
      ),
    );

    const topic = pageState.topicId ? AM.topics.getTopicById(pageState.topicId) : null;
    const mastery = topic && AM.exercises ? AM.exercises.topicMastery(topic.id, ctx) : null;

    return ui.page(
      { title: 'Gia sư AI', activeRoute: '#/tutor', actions: [ui.homeButton()] },
      el(
        'section',
        { class: 'stack-sm' },
        el('div', { class: 'section-label' }, grade ? 'Lớp ' + grade : 'Gia sư AI'),
        el('h1', { class: 'page-title' }, 'Gia sư AI'),
        el(
          'p',
          { class: 'page-sub' },
          'Chụp ảnh đề bài hoặc gõ câu hỏi. Gia sư gợi ý từng bước để em tự giải, kiểm tra bài làm, ' +
            'hoặc giải chi tiết khi em cần — bám theo chương trình lớp của em.',
        ),
      ),
      el(
        'div',
        { class: 'card card-tight stack-sm' },
        el('label', { class: 'field-label' }, 'Bài này thuộc chủ đề nào? (giúp gia sư dạy đúng kiến thức đã học)'),
        select,
      ),
      panel({
        key: 'page:' + (pageState.topicId || 'free'),
        mode: 'hint',
        allowUpload: true,
        context: {
          grade: grade,
          topic: topic ? topic.chapterTitle + ' — ' + topic.title : null,
          mastery: mastery && mastery.source !== 'default' ? mastery.value : null,
        },
      }),
      ui.footerNote(),
    );
  }

  AM.tutorUI = { renderRich: renderRich, renderRichHtml: renderRichHtml, panel: panel, launcher: launcher };
  AM.views = AM.views || {};
  AM.views.tutor = view;
})(window.AM);
