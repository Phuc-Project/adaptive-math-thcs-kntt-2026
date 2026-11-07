/**
 * Bộ chấm điểm Gia sư AI — đo "độ khôn" bằng số liệu thay vì cảm giác.
 *
 * Lấy câu trắc nghiệm có đáp án trong ngân hàng (data/questions.js), cho gia sư giải
 * MÙ (không gửi đáp án) ở chế độ "Lời giải chi tiết" với đúng prompt của app, rồi chấm:
 *   - đúng/sai: chữ cái ở dòng "Đáp số" so với đáp án
 *   - lỗi kí hiệu: công thức KaTeX không dựng được, lệnh LaTeX nằm ngoài $…$
 *   - thời gian, token
 * So sánh nhiều cấu hình (A/B) trên CÙNG bộ câu hỏi:
 *   base       — prompt hiện tại, không có bộ kiến thức, không chạy code
 *   knowledge  — thêm bộ kiến thức SGK của chủ đề (js/core/tutorKnowledge.js)
 *   full       — bộ kiến thức + công cụ chạy code (cấu hình đang dùng trên máy chủ)
 *
 * Chạy (cần khóa Gemini thật, KHÔNG commit khóa):
 *   cd tools/kiem-thu && npm install
 *   GEMINI_API_KEY=... node eval-tutor.mjs ../.. --n 60 --variants base,full
 * Tuỳ chọn: --n <số câu> (mặc định 40) · --grade 8 · --level V,T · --model gemini-3.8-flash
 *           --variants base,knowledge,full · --seed 7 · --concurrency 3 · --fake (chạy thử không gọi API)
 * Kết quả: tools/kiem-thu/ket-qua-eval/<thời điểm>.md và .json (các câu sai kèm câu trả lời).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const ROOT = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(import.meta.dirname, '..', '..'));
const opt = (name, def) => {
  const i = args.indexOf('--' + name);
  return i === -1 ? def : args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true;
};
const N = Number(opt('n', 40));
const GRADE = opt('grade', null);
const LEVELS = opt('level', null);
const MODEL = opt('model', process.env.GEMINI_MODEL || 'gemini-3.8-flash');
const VARIANTS = String(opt('variants', 'base,full')).split(',');
const SEED = Number(opt('seed', 7));
const CONC = Number(opt('concurrency', 3));
const FAKE = !!opt('fake', false);
const KEY = process.env.GEMINI_API_KEY;
if (!KEY && !FAKE) {
  console.error('Thiếu GEMINI_API_KEY. Ví dụ: GEMINI_API_KEY=... node eval-tutor.mjs ../.. --n 40');
  process.exit(1);
}

const P = require(path.join(ROOT, 'js/core/tutorPrompt.js'));
const KN = require(path.join(ROOT, 'js/core/tutorKnowledge.js'));

// ---- Nạp dữ liệu + bộ hiển thị của app trong một "trình duyệt giả" --------------------
const sandbox = {
  console,
  window: {
    AM: {
      util: { escapeHtml: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]), el: () => null },
      ui: {},
    },
  },
  document: {},
};
sandbox.window.katex = require(path.join(import.meta.dirname, 'node_modules/katex'));
vm.createContext(sandbox);
const load = (f) => vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
sandbox.window.window = sandbox.window;
vm.runInContext('var window = this.window; var AM = window.AM;', sandbox);
['data/questions.js', 'data/featured-hdt.js', 'js/core/topics.js', 'js/core/latex.js', 'js/views/tutor.js'].forEach(load);
const AM = sandbox.window.AM;
const BANK = sandbox.window.AM_QUESTION_BANK.questions;
const quiet = console.warn;
console.warn = () => {}; // KaTeX báo thiếu font chữ Việt — không phải lỗi

// ---- Chọn câu hỏi: chia đều theo khối và mức, cố định theo seed ------------------------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r = rng(SEED);
const pool = BANK.filter(
  (q) =>
    q.type === 'mcq' &&
    q.status === 'ok' &&
    (q.options || []).filter((o) => o.isCorrect).length === 1 &&
    (!GRADE || String(q.grade) === String(GRADE)) &&
    (!LEVELS || String(LEVELS).split(',').includes(q.level)) &&
    !/\[TIKZ:/.test(q.prompt), // câu cần hình vẽ: gia sư không thấy hình → không công bằng
);
const buckets = new Map();
for (const q of pool) {
  const k = q.grade + q.level;
  if (!buckets.has(k)) buckets.set(k, []);
  buckets.get(k).push(q);
}
for (const list of buckets.values()) list.sort(() => r() - 0.5);
const picked = [];
const keys = Array.from(buckets.keys()).sort();
for (let round = 0; picked.length < Math.min(N, pool.length); round++) {
  let added = false;
  for (const k of keys) {
    const q = buckets.get(k)[round];
    if (q && picked.length < N) {
      picked.push(q);
      added = true;
    }
  }
  if (!added) break;
}

// ---- Gọi gia sư -------------------------------------------------------------------------
function questionText(q) {
  return q.prompt + '\n' + q.options.map((o) => o.label + '. ' + o.content).join('\n');
}

function bodyFor(q, variant) {
  const topic = AM.topics.getTopicById(q.topicId);
  const body = P.buildGeminiBody({
    mode: 'solution',
    context: {
      grade: q.grade,
      topic: topic ? topic.chapterTitle + ' — ' + topic.title : null,
      topicId: q.topicId,
      level: q.level,
      kind: 'Trắc nghiệm',
      questionText: questionText(q),
    },
    messages: [{ role: 'user', text: 'Giải bài này. Ở dòng "**Đáp số:**" ghi chữ cái của phương án đúng (A, B, C hoặc D).' }],
    knowledge: variant === 'base' ? '' : KN.forTopic(q.topicId),
    codeExecution: variant === 'full',
  });
  return P.adaptBody(body, MODEL);
}

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function callGemini(body) {
  if (FAKE) {
    await sleep(5);
    const letter = 'ABCD'[Math.floor(r() * 4)];
    return { text: 'Bước 1: Ta có $x = 2,5$ và $20%$.\n**Đáp số:** ' + letter, usage: {} };
  }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent';
  let payload = body;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': KEY },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      const cand = (data.candidates || [])[0];
      const parts = (cand && cand.content && cand.content.parts) || [];
      return {
        text: parts.filter((p) => !p.thought).map((p) => p.text || '').join(''),
        usedCode: parts.some((p) => p.executableCode),
        usage: data.usageMetadata || {},
      };
    }
    const err = await res.text();
    if (res.status === 400 && payload === body) {
      payload = P.stripOptional(body); // model không nhận thinking/tools → bản tối giản, như máy chủ
      continue;
    }
    if (res.status === 429 || res.status >= 500) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    throw new Error(res.status + ' ' + err.slice(0, 200));
  }
  throw new Error('quá nhiều lần thử lại');
}

function answerLetter(text) {
  const line = (text.match(/Đáp số[^\n]*/i) || text.match(/Đáp án[^\n]*/i) || [''])[0];
  const m = line.replace(/\$[^$]*\$/g, ' ').match(/\b([ABCD])\b/);
  return m ? m[1] : null;
}

function notationIssues(text) {
  const html = AM.tutorUI.renderRichHtml(text);
  const texErrors = (html.match(/tex-error|katex-error/g) || []).length;
  // Lệnh LaTeX còn sót ngoài công thức (sau khi đã tự bọc) = model viết sai kí hiệu.
  const visible = html.replace(/<span class="katex[\s\S]*?<\/annotation>|<span class="katex-html[\s\S]*?<\/span><\/span><\/span>/g, '');
  const stray = (visible.replace(/<[^>]+>/g, '').match(/\\[a-zA-Z]{2,}/g) || []).length;
  return { texErrors, stray, rawDollar: /(^|[^\\])\$\$?[^$]{0,40}$/.test(text) ? 1 : 0 };
}

// ---- Chạy ------------------------------------------------------------------------------
const results = [];
async function runOne(q, variant) {
  const t0 = Date.now();
  try {
    const out = await callGemini(bodyFor(q, variant));
    const key = q.options.find((o) => o.isCorrect).label;
    const got = answerLetter(out.text);
    results.push({
      variant, id: q.id, grade: q.grade, level: q.level, topicId: q.topicId,
      key, got, correct: got === key, ms: Date.now() - t0,
      tokens: (out.usage.totalTokenCount || 0), usedCode: !!out.usedCode,
      notation: notationIssues(out.text), text: out.text,
    });
  } catch (e) {
    results.push({ variant, id: q.id, grade: q.grade, level: q.level, error: String(e.message || e), correct: false, ms: Date.now() - t0 });
  }
  process.stdout.write(results.length % 10 === 0 ? String(results.length) : '.');
}

const jobs = [];
for (const q of picked) for (const v of VARIANTS) jobs.push([q, v]);
console.log('Model ' + MODEL + ' · ' + picked.length + ' câu × ' + VARIANTS.length + ' cấu hình = ' + jobs.length + ' lượt gọi' + (FAKE ? ' (giả lập)' : ''));
let next = 0;
await Promise.all(
  Array.from({ length: CONC }, async () => {
    while (next < jobs.length) {
      const [q, v] = jobs[next++];
      await runOne(q, v);
    }
  }),
);
console.log('\n');
console.warn = quiet;

// ---- Báo cáo -----------------------------------------------------------------------------
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 + '%' : '—');
const lines = ['# Kết quả chấm Gia sư AI', '', 'Model `' + MODEL + '` · ' + picked.length + ' câu trắc nghiệm (seed ' + SEED + ') · ' + new Date().toISOString(), ''];
lines.push('| Cấu hình | Đúng | Lỗi gọi | Không đọc được đáp án | Câu có lỗi kí hiệu | TB giây | TB token |', '|---|---|---|---|---|---|---|');
for (const v of VARIANTS) {
  const rs = results.filter((x) => x.variant === v);
  const ok = rs.filter((x) => x.correct).length;
  const errs = rs.filter((x) => x.error).length;
  const unread = rs.filter((x) => !x.error && !x.got).length;
  const nota = rs.filter((x) => x.notation && (x.notation.texErrors || x.notation.stray)).length;
  const ms = rs.reduce((a, x) => a + x.ms, 0) / (rs.length || 1);
  const tok = rs.reduce((a, x) => a + (x.tokens || 0), 0) / (rs.length || 1);
  lines.push('| ' + v + ' | ' + ok + '/' + rs.length + ' (' + pct(ok, rs.length) + ') | ' + errs + ' | ' + unread + ' | ' + nota + ' | ' + (ms / 1000).toFixed(1) + ' | ' + Math.round(tok) + ' |');
}
lines.push('', '## Theo khối và mức', '', '| Cấu hình | ' + ['6', '7', '8', '9'].map((g) => 'Lớp ' + g).join(' | ') + ' | N | H | V | T |', '|---|---|---|---|---|---|---|---|---|');
for (const v of VARIANTS) {
  const rs = results.filter((x) => x.variant === v);
  const cell = (f) => {
    const s = rs.filter(f);
    return pct(s.filter((x) => x.correct).length, s.length);
  };
  lines.push('| ' + v + ' | ' + [6, 7, 8, 9].map((g) => cell((x) => x.grade === g)).join(' | ') + ' | ' + ['N', 'H', 'V', 'T'].map((l) => cell((x) => x.level === l)).join(' | ') + ' |');
}
const wrong = results.filter((x) => !x.correct);
lines.push('', '## Các câu sai (' + wrong.length + ')', '');
for (const w of wrong.slice(0, 60)) {
  lines.push('- `' + w.variant + '` ' + w.id + ' (lớp ' + w.grade + ', ' + w.level + '): đáp án ' + (w.key || '?') + ', gia sư chọn ' + (w.got || (w.error ? 'LỖI: ' + w.error : 'không rõ')));
}
const outDir = path.join(import.meta.dirname, 'ket-qua-eval');
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(path.join(outDir, stamp + '.md'), lines.join('\n'));
fs.writeFileSync(path.join(outDir, stamp + '.json'), JSON.stringify({ model: MODEL, seed: SEED, n: picked.length, results }, null, 1));
console.log(lines.slice(0, 4 + VARIANTS.length + 2).join('\n'));
console.log('\nBáo cáo đầy đủ: tools/kiem-thu/ket-qua-eval/' + stamp + '.md');
