/**
 * Mixed Vietnamese text + LaTeX renderer.
 *
 * Ported from src/lib/latex.ts + src/components/diagnostic/LatexRenderer.tsx.
 * The pipeline order matters and is unchanged:
 *
 *   1. \begin{tabular} → HTML <table>, rendering the math inside its cells
 *      first (otherwise the outer tokenizer slices <td> tags in half on `$`).
 *   2. Mask whole tables behind private-use sentinels.
 *   3. Tokenize into text / inline-math / display-math and hand math to KaTeX.
 *   4. Unmask tables, then swap [TIKZ:hash] placeholders for a label.
 *
 * If KaTeX failed to load (offline, CDN blocked), math falls back to the raw
 * LaTeX in a <code> tag rather than breaking the page.
 */
(function (AM) {
  'use strict';

  const escapeHtml = AM.util.escapeHtml;

  const hasKatex = () => typeof window.katex !== 'undefined';

  // -------------------------------------------------------------------------
  // Macros fed to KaTeX (lib/latex.ts KATEX_MACROS)
  // -------------------------------------------------------------------------

  const KATEX_MACROS = {
    '\\vv': '\\overrightarrow',
    '\\heva': '\\left\\{\\begin{aligned}#1\\end{aligned}\\right.',
    '\\hoac': '\\left[\\begin{aligned}#1\\end{aligned}\\right.',
    '\\varparallel': '\\parallel',
    '\\R': '\\mathbb{R}',
    '\\Q': '\\mathbb{Q}',
    '\\Z': '\\mathbb{Z}',
    '\\N': '\\mathbb{N}',
    '\\C': '\\mathbb{C}',
    // Cung tròn (lớp 9): KaTeX không có \overarc/\overparen/\wideparen.
    '\\overarc': '\\overset{\\frown}{#1}',
    '\\overparen': '\\overset{\\frown}{#1}',
    '\\wideparen': '\\overset{\\frown}{#1}',
    '\\widearc': '\\overset{\\frown}{#1}',
    '\\cung': '\\overset{\\frown}{#1}',
    // Chia hết / không chia hết theo cách viết SGK Việt Nam.
    '\\chiahet': '\\mathrel{\\vdots}',
    '\\khongchiahet': '\\mathrel{\\not\\vdots}',
    '\\dongdang': '\\backsim',
  };

  // -------------------------------------------------------------------------
  // Chuẩn hoá công thức trước khi đưa KaTeX (câu hỏi ngân hàng + Gia sư AI)
  // -------------------------------------------------------------------------

  /** Ký hiệu Unicode KaTeX không nhận (hoặc thiếu font) → lệnh LaTeX tương đương. */
  const UNICODE_TEX = {
    '△': '\\triangle ',
    '∆': '\\Delta ',
    '∥': '\\parallel ',
    '⫽': '\\parallel ',
    '⊥': '\\perp ',
    '∅': '\\varnothing ',
    '½': '\\tfrac{1}{2}',
    '¼': '\\tfrac{1}{4}',
    '¾': '\\tfrac{3}{4}',
    '⅓': '\\tfrac{1}{3}',
    '⅔': '\\tfrac{2}{3}',
    '⌒': '\\frown ',
    '∡': '\\measuredangle ',
    '∽': '\\backsim ',
    ' ': ' ',
    ' ': ' ',
  };
  const UNICODE_RE = new RegExp('[' + Object.keys(UNICODE_TEX).join('') + ']', 'g');

  /**
   * Dấu phẩy thập phân kiểu Việt Nam: trong KaTeX "2,5" là dấu câu nên bị chèn
   * khoảng trắng thành "2, 5". Chỉ đổi khi chắc là số thập phân:
   *   12,5 · 19,7-1,6 · S=…=12,5        → 12{,}5
   * Giữ nguyên khi là liệt kê:
   *   3,4,5 (≥ 2 dấu phẩy) · 0,1,\ldots · ƯCLN(24,36) · (2,5) · \{1,2\}
   */
  function fixDecimalComma(tex) {
    return tex.replace(/\d+(?:,\d+)+/g, function (run, at, src) {
      if (run.split(',').length > 2) return run;
      let b = at - 1;
      while (b >= 0 && src[b] === ' ') b--;
      let a = at + run.length;
      while (a < src.length && src[a] === ' ') a++;
      const before = b >= 0 ? src[b] : '';
      const after = src[a] || '';
      if (before === ',' || after === ',') return run; // nằm trong dãy liệt kê
      const opens = before === '(' || before === '[' || before === '{';
      const closes = after === ')' || after === ']' || after === '}' || src.slice(a, a + 2) === '\\}';
      if (opens && closes) return run; // cặp số trong ngoặc: ƯCLN(24,36), (2,5)
      if (src.slice(Math.max(0, b - 1), b + 1) === '\\{') return run;
      return run.replace(',', '{,}');
    });
  }

  /**
   * Sửa những lỗi hay gặp trong công thức (nhất là chữ do AI sinh):
   *   - `%` không thoát → KaTeX coi là chú thích và nuốt hết phần sau.
   *   - √2, √(x+1), △, ∥, ⊥, ∅, ½ … → lệnh LaTeX.
   *   - \label, \tag (chỉ dùng được ở khối riêng), \displaystyle thừa không hại → giữ.
   *   - dấu phẩy thập phân.
   */
  function normalizeTex(tex, displayMode) {
    let t = String(tex == null ? '' : tex);
    t = t.replace(/\\?%/g, function (m) {
      return m === '%' ? '\\%' : m;
    });
    t = t
      .replace(/√\s*\(([^()]*)\)/g, '\\sqrt{$1}')
      .replace(/√\s*\{/g, '\\sqrt{')
      .replace(/√\s*([0-9]+(?:[.,][0-9]+)?|[A-Za-z])/g, '\\sqrt{$1}')
      .replace(/√/g, '\\surd ');
    t = t.replace(UNICODE_RE, function (c) {
      return UNICODE_TEX[c];
    });
    // align/gather/equation (của LaTeX đầy đủ) → aligned/gathered: không đánh số (1), (2).
    t = t
      .replace(/\\(begin|end)\{align\*?\}/g, '\\$1{aligned}')
      .replace(/\\(begin|end)\{gather\*?\}/g, '\\$1{gathered}')
      .replace(/\\(?:begin|end)\{equation\*?\}/g, '');
    t = t.replace(/\\label\s*\{[^{}]*\}/g, '');
    if (!displayMode) t = t.replace(/\\tag\*?\s*\{[^{}]*\}/g, '');
    t = fixDecimalComma(t);
    return t.trim();
  }

  /** Môi trường chỉ dùng được ở chế độ khối (align, gather, equation…). */
  const DISPLAY_ONLY_ENV = /\\begin\{(?:align|alignat|gather|equation|multline|flalign)\*?\}/;

  // -------------------------------------------------------------------------
  // Vietnamese words inside math mode
  // -------------------------------------------------------------------------

  const LETTER = /[a-zA-ZÀ-ỹ]/;

  /**
   * Wrap runs of Vietnamese words in `\text{…}` so KaTeX renders them upright
   * instead of as italic chains of single-letter variables. Short labels like
   * `_{CĐ}` are deliberately left alone so identifiers keep math styling.
   */
  function wrapVietnameseInMath(tex) {
    let out = '';
    let i = 0;
    while (i < tex.length) {
      const ch = tex[i];

      // Preserve a macro name: '\' followed by letters.
      if (ch === '\\' && LETTER.test(tex[i + 1] || '')) {
        let j = i + 1;
        while (j < tex.length && LETTER.test(tex[j])) j++;
        out += tex.slice(i, j);
        i = j;
        continue;
      }

      if (LETTER.test(ch)) {
        let j = i;
        while (j < tex.length) {
          if (LETTER.test(tex[j])) {
            j++;
            continue;
          }
          // Allow one internal space so "đơn vị" stays a single run.
          if (tex[j] === ' ' && j + 1 < tex.length && LETTER.test(tex[j + 1])) {
            j++;
            continue;
          }
          break;
        }
        const run = tex.slice(i, j);
        const diacritics = (run.match(/[À-ỹ]/g) || []).length;
        const letters = run.replace(/\s+/g, '').length;
        const shouldWrap = diacritics >= 2 || (diacritics >= 1 && letters >= 3);
        out += shouldWrap ? '\\text{' + run + '}' : run;
        i = j;
        continue;
      }

      out += ch;
      i++;
    }
    return out;
  }

  // -------------------------------------------------------------------------
  // Math compilation
  // -------------------------------------------------------------------------

  function katexOnce(tex, displayMode, output, throwOnError) {
    return window.katex.renderToString(tex, {
      displayMode: displayMode,
      throwOnError: throwOnError,
      strict: 'ignore',
      macros: Object.assign({}, KATEX_MACROS),
      trust: false,
      output: output,
      errorColor: '#dc2626',
    });
  }

  /**
   * Công thức → HTML. Thử lần lượt: bản đã chuẩn hoá → (nếu là môi trường chỉ
   * dùng ở khối) chế độ khối → hiển thị thô dạng code, không để chữ đỏ của
   * KaTeX hay công thức vỡ giữa câu.
   *
   * opts.output: 'htmlAndMathml' (mặc định, có MathML cho trình đọc màn hình) | 'html'.
   */
  function renderTex(tex, displayMode, opts) {
    const output = (opts && opts.output) || 'htmlAndMathml';
    const raw = String(tex == null ? '' : tex);
    if (!hasKatex()) {
      return '<code class="tex-error">' + escapeHtml(displayMode ? '$$' + raw + '$$' : '$' + raw + '$') + '</code>';
    }
    const safeTex = wrapVietnameseInMath(normalizeTex(raw, displayMode));
    const tries = [[safeTex, displayMode]];
    if (!displayMode && DISPLAY_ONLY_ENV.test(safeTex)) tries.unshift([safeTex, true]);
    for (const t of tries) {
      try {
        return katexOnce(t[0], t[1], output, true);
      } catch (err) {
        /* thử cách kế tiếp */
      }
    }
    return '<code class="tex-error">' + escapeHtml(raw) + '</code>';
  }

  function renderMath(tex, displayMode) {
    return renderTex(tex, displayMode);
  }

  // -------------------------------------------------------------------------
  // Tokenizer
  // -------------------------------------------------------------------------

  /**
   * A char is escaped only when preceded by an ODD number of backslashes:
   *   `\$`   → escaped        `\\$`  → NOT escaped (that `\\` is a line break)
   * The naive `src[i-1] !== '\\'` check swallowed half the corpus's math.
   */
  function isEscaped(src, i) {
    let backslashes = 0;
    let k = i - 1;
    while (k >= 0 && src[k] === '\\') {
      backslashes++;
      k--;
    }
    return backslashes % 2 === 1;
  }

  function tokenize(src) {
    const segments = [];
    let i = 0;
    let textBuf = '';

    const flushText = function () {
      if (textBuf) {
        segments.push({ type: 'text', value: textBuf });
        textBuf = '';
      }
    };

    while (i < src.length) {
      if (src.startsWith('$$', i)) {
        const end = src.indexOf('$$', i + 2);
        if (end === -1) {
          textBuf += src.slice(i);
          break;
        }
        flushText();
        segments.push({ type: 'display', value: src.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
      if (src.startsWith('\\[', i)) {
        const end = src.indexOf('\\]', i + 2);
        if (end === -1) {
          textBuf += src.slice(i);
          break;
        }
        flushText();
        segments.push({ type: 'display', value: src.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
      if (src.startsWith('\\(', i)) {
        const end = src.indexOf('\\)', i + 2);
        if (end === -1) {
          textBuf += src.slice(i);
          break;
        }
        flushText();
        segments.push({ type: 'inline', value: src.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
      if (src[i] === '$' && !isEscaped(src, i)) {
        let end = -1;
        let cursor = i + 1;
        while (cursor < src.length) {
          if (src[cursor] === '$' && !isEscaped(src, cursor)) {
            end = cursor;
            break;
          }
          cursor++;
        }
        if (end === -1) {
          textBuf += src.slice(i);
          break;
        }
        flushText();
        segments.push({ type: 'inline', value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
      textBuf += src[i];
      i++;
    }

    flushText();
    return segments;
  }

  // -------------------------------------------------------------------------
  // Tables
  // -------------------------------------------------------------------------

  /** \begin{tabular}{…} … \end{tabular} → an HTML table. */
  function convertTabularToHtml(raw) {
    const tabularRe =
      /\\begin\{(tabular|longtable)\}\{[^}]*\}([\s\S]*?)\\end\{\1\}/g;
    return raw.replace(tabularRe, function (_full, _env, content) {
      const rows = content
        .replace(/\\hline/g, '')
        .replace(/\\cline\{[^}]*\}/g, '')
        .split(/\\\\/)
        .map((r) => r.trim())
        .filter((r) => r.length > 0);

      const rowsHtml = rows
        .map(function (row) {
          const cellsHtml = row
            .split('&')
            .map((c) => c.trim())
            .map(function (cellRaw) {
              const multi = /^\\multicolumn\{(\d+)\}\{[^}]*\}\{([\s\S]*)\}$/.exec(cellRaw);
              if (multi) {
                return (
                  '<td class="kntt-td" colspan="' + multi[1] + '">' +
                  multi[2].trim() +
                  '</td>'
                );
              }
              const multirow = /^\\multirow\{(\d+)\}\{[^}]*\}\{([\s\S]*)\}$/.exec(cellRaw);
              if (multirow) {
                return (
                  '<td class="kntt-td" rowspan="' + multirow[1] + '">' +
                  multirow[2].trim() +
                  '</td>'
                );
              }
              return '<td class="kntt-td">' + cellRaw + '</td>';
            })
            .join('');
          return '<tr>' + cellsHtml + '</tr>';
        })
        .join('');

      return '<table class="kntt-table">' + rowsHtml + '</table>';
    });
  }

  /** Render `$…$` inside table cells before the outer tokenizer runs. */
  function renderMathInsideTables(src) {
    return src.replace(
      /<(td|th)([^>]*)>([\s\S]*?)<\/\1>/g,
      function (_m, tag, attrs, inner) {
        const rendered = inner.replace(/\$([^$]+)\$/g, function (_mm, tex) {
          return renderMath(tex, false);
        });
        return '<' + tag + attrs + '>' + rendered + '</' + tag + '>';
      },
    );
  }

  function maskTables(src) {
    const tables = [];
    const masked = src.replace(/<table[\s\S]*?<\/table>/g, function (match) {
      const token = '\uE000TABLE' + tables.length + '\uE001';
      tables.push(match);
      return token;
    });
    return { masked: masked, tables: tables };
  }

  // -------------------------------------------------------------------------
  // Text-mode cleanup
  // -------------------------------------------------------------------------

  /**
   * A few macros leak into text mode in the corpus (authors write
   * `$P$, $Q$, \ldots`). Map the common ones to Unicode and drop the
   * layout-only ones, which have no visible HTML form.
   */
  function resolveTextModeMacros(src) {
    let out = src;
    out = out.replace(/\\(?:ldots|dots)\b/g, '…');
    out = out.replace(/\\cdots\b/g, '⋯');
    out = out.replace(/\\to\b/g, '→');
    out = out.replace(
      /\\(?:centerline|centering|hfill|hspace|vspace|noindent|indent|footnotesize|small|large|Large|bfseries|itshape|bf|it|em|break|linebreak|newline|allowdisplaybreaks)\b\s*/g,
      '',
    );
    out = out.replace(/\\quad\b/g, '  ');
    out = out.replace(/\\qquad\b/g, '    ');
    return out;
  }

  /** Escape stray angle brackets while leaving our own injected tags intact. */
  function preserveInjectedHtml(src) {
    const injectedTag =
      /(<\/?(?:table|thead|tbody|tr|td|th|span|img|ul|ol|li|strong|em|u|br)[^>]*\/?>)/g;
    return src
      .split(injectedTag)
      .map(function (chunk, i) {
        return i % 2 === 1 ? chunk : escapeHtml(chunk);
      })
      .join('');
  }

  /**
   * TikZ figures.
   *
   * The React build looked each hash up in a manifest and emitted an <img>
   * pointing at public/tikz/<hash>.svg — files produced by an offline LaTeX
   * render step. This build has no such step, so every figure renders as an
   * honest label instead of a broken image.
   */
  function replaceTikzPlaceholders(raw) {
    return raw.replace(/\[TIKZ:([a-f0-9]{12})\]/g, function () {
      return '<span class="kntt-tikz-pill">📐 Hình vẽ (xem trong SGK)</span>';
    });
  }

  // -------------------------------------------------------------------------
  // Public
  // -------------------------------------------------------------------------

  /** Full pipeline: LaTeX-ish source → HTML string. */
  function toHtml(content) {
    if (!content) return '';

    const withTables = convertTabularToHtml(String(content));
    const withTablesRendered = renderMathInsideTables(withTables);
    const masked = maskTables(withTablesRendered);

    const rendered = tokenize(masked.masked)
      .map(function (seg) {
        if (seg.type === 'text') {
          return preserveInjectedHtml(resolveTextModeMacros(seg.value)).replace(
            /\\\\/g,
            '<br/>',
          );
        }
        return renderMath(seg.value, seg.type === 'display');
      })
      .join('');

    const withTablesBack = rendered.replace(
      /\uE000TABLE(\d+)\uE001/g,
      function (_m, i) {
        return masked.tables[Number(i)] || '';
      },
    );

    return replaceTikzPlaceholders(withTablesBack);
  }

  /**
   * Same pipeline, returned as a DOM node ready to append.
   *
   * `tagName` defaults to <div>, but answer options live inside a <button>,
   * where only phrasing content is valid HTML — those pass 'span'.
   */
  function render(content, className, tagName) {
    const node = document.createElement(tagName || 'div');
    node.className = className || 'qprompt';
    node.innerHTML = toHtml(content);
    return node;
  }

  /** Strip LaTeX down to rough plain text — used for titles and previews. */
  function toPlainText(raw) {
    if (!raw) return '';
    return String(raw)
      .replace(/\$\$?([^$]*)\$\$?/g, '$1')
      .replace(/\\[a-zA-Z]+\s*/g, ' ')
      .replace(/[{}]/g, '')
      .replace(/\[TIKZ:[a-f0-9]{12}\]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function truncate(text, max) {
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut) + '…';
  }

  AM.latex = {
    toHtml: toHtml,
    render: render,
    toPlainText: toPlainText,
    truncate: truncate,
    hasKatex: hasKatex,
    KATEX_MACROS: KATEX_MACROS,
    normalizeTex: normalizeTex,
    fixDecimalComma: fixDecimalComma,
    renderTex: renderTex,
  };
})(window.AM);
