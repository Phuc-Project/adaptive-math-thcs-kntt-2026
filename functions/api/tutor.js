/**
 * POST /api/tutor — Gia sư AI (Cloudflare Pages Function, chạy cùng tên miền với web).
 *
 * Vì sao cần máy chủ: khóa Gemini mà nằm trong JavaScript của trang thì ai mở
 * F12 cũng lấy được. Function này giữ khóa trong biến môi trường, xác thực học
 * sinh bằng Firebase ID token, tự dựng prompt sư phạm (js/core/tutorPrompt.js)
 * rồi chuyển tiếp câu trả lời của Gemini về trình duyệt theo dạng luồng (SSE).
 *
 * Biến môi trường (Cloudflare → Pages → Settings → Variables and Secrets):
 *   GEMINI_API_KEY      (bắt buộc, kiểu Secret)
 *   GEMINI_MODEL        (tuỳ chọn) — mặc định thử lần lượt MODEL_FALLBACKS
 *   TUTOR_THINKING      (tuỳ chọn) — ép mức suy nghĩ cho mọi yêu cầu: minimal|low|medium|high
 *   TUTOR_CACHE         (tuỳ chọn, binding KV) — cache câu trả lời dùng chung, bền 30 ngày
 *   FIREBASE_PROJECT_ID (tuỳ chọn) — mặc định adaptivemath-tmhp-2026
 *   TUTOR_REQUIRE_AUTH  (tuỳ chọn) — "0" để tắt xác thực khi thử nghiệm
 *
 * Hai tác vụ:
 *   task "chat" (mặc định) — hỏi đáp về một bài:
 *     body { mode, context, messages:[{role,text}], quick, imageRefs:[ảnh đề], solutionRefs:[ảnh lời giải],
 *            images:[{mime,data}] (ảnh học sinh tự chụp) }
 *     → text/event-stream:  data: {"t":"đoạn chữ"}  …  data: {"done":true}
 *   task "roadmap" — xây lộ trình học từ hồ sơ năng lực:
 *     body { task:"roadmap", summary:{ grade, goal, dailyMinutes, topics:[…], … } }
 *     → JSON { plan:{summary,strengths,weaknesses,weeks:[…],tips}, model }
 */
import promptLib from '../../js/core/tutorPrompt.js';

const MODEL_FALLBACKS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash'];
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const JWKS_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const MAX_UPLOADS = 2;
const MAX_UPLOAD_B64 = 2_800_000; // ≈ 2 MB ảnh
const MAX_REFS = 4;
const REF_RE = /^g[6-9][ab]\/\d{4}(s\d?)?(-\d)?\.webp$/;
const MIME_OK = ['image/jpeg', 'image/png', 'image/webp'];

// Giới hạn tần suất theo tài khoản (tốt nhất có thể: mỗi isolate một bộ đếm).
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 20;
const hits = new Map();

function json(status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

// ---------------------------------------------------------------------------
// Xác thực Firebase ID token (RS256) bằng WebCrypto — không cần thư viện ngoài
// ---------------------------------------------------------------------------

let jwksCache = { keys: null, until: 0 };

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getJwks(fetchImpl) {
  if (jwksCache.keys && Date.now() < jwksCache.until) return jwksCache.keys;
  const res = await fetchImpl(JWKS_URL);
  if (!res.ok) throw new Error('jwks ' + res.status);
  const body = await res.json();
  const m = /max-age=(\d+)/.exec(res.headers.get('cache-control') || '');
  jwksCache = { keys: body.keys || [], until: Date.now() + (m ? Number(m[1]) * 1000 : 3600_000) };
  return jwksCache.keys;
}

export async function verifyFirebaseToken(token, projectId, fetchImpl = fetch) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('token-format');
  const dec = new TextDecoder();
  const header = JSON.parse(dec.decode(b64urlToBytes(parts[0])));
  const payload = JSON.parse(dec.decode(b64urlToBytes(parts[1])));
  if (header.alg !== 'RS256') throw new Error('token-alg');

  const now = Math.floor(Date.now() / 1000);
  const allowed = Array.isArray(projectId)
    ? projectId
    : [projectId, 'adaptivemath-tmhp-2026', 'adaptivemath-36726'].filter(Boolean);
  if (!allowed.includes(payload.aud)) throw new Error('token-aud');
  if (!allowed.some((pid) => payload.iss === 'https://securetoken.google.com/' + pid)) throw new Error('token-iss');
  if (!payload.sub || typeof payload.sub !== 'string') throw new Error('token-sub');
  if (!(payload.exp > now)) throw new Error('token-expired');
  if (payload.iat > now + 300) throw new Error('token-iat');

  const jwk = (await getJwks(fetchImpl)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('token-kid');
  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  const ok = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + '.' + parts[1]),
  );
  if (!ok) throw new Error('token-signature');
  return payload;
}

export function _resetJwksCache() {
  jwksCache = { keys: null, until: 0 };
  hits.clear();
}

function rateLimited(uid) {
  const now = Date.now();
  const list = (hits.get(uid) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_MAX) {
    hits.set(uid, list);
    return true;
  }
  list.push(now);
  hits.set(uid, list);
  return false;
}

// ---------------------------------------------------------------------------
// Ảnh
// ---------------------------------------------------------------------------

function bytesToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Ảnh đề/lời giải lấy thẳng từ kho tĩnh của chính site — client chỉ gửi tên file. */
async function loadRefs(refs, request, env, fetchImpl) {
  const list = (refs || []).filter((r) => typeof r === 'string' && REF_RE.test(r)).slice(0, MAX_REFS);
  // Tải song song — không chờ từng ảnh một.
  const loaded = await Promise.all(
    list.map(async (ref) => {
      const url = new URL('/data/exercises/img/' + ref, request.url);
      const res = env.ASSETS ? await env.ASSETS.fetch(url) : await fetchImpl(url);
      return res.ok ? { mime: 'image/webp', data: bytesToB64(await res.arrayBuffer()) } : null;
    }),
  );
  return loaded.filter(Boolean);
}

function cleanUploads(images) {
  const out = [];
  for (const img of (images || []).slice(0, MAX_UPLOADS)) {
    if (!img || MIME_OK.indexOf(img.mime) === -1) continue;
    if (typeof img.data !== 'string' || img.data.length > MAX_UPLOAD_B64) continue;
    if (!/^[A-Za-z0-9+/=]+$/.test(img.data)) continue;
    out.push({ mime: img.mime, data: img.data });
  }
  return out;
}

function cleanMessages(messages) {
  const out = [];
  for (const m of (messages || []).slice(-6)) {
    if (!m || typeof m.text !== 'string') continue;
    out.push({ role: m.role === 'model' ? 'model' : 'user', text: m.text.slice(0, 4000) });
  }
  // Gemini cần lượt đầu và lượt cuối là của người hỏi.
  while (out.length && out[0].role !== 'user') out.shift();
  return out;
}

// ---------------------------------------------------------------------------
// Gemini → SSE gọn cho trình duyệt
// ---------------------------------------------------------------------------

/**
 * Gọi Gemini, thử lần lượt các model. Với mỗi model, body được chỉnh cho hợp
 * (adaptBody: mức suy nghĩ, temperature). Nếu model từ chối tham số tuỳ chọn
 * (400) thì gửi lại một lần bản tối giản (stripOptional) thay vì báo lỗi.
 */
async function callGemini(body, env, fetchImpl, method) {
  const models = env.GEMINI_MODEL ? [env.GEMINI_MODEL] : MODEL_FALLBACKS;
  const path = method === 'generate' ? ':generateContent' : ':streamGenerateContent?alt=sse';
  let last = null;
  for (const model of models) {
    let payload = promptLib.adaptBody(body, model, env.TUTOR_THINKING);
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetchImpl(GEMINI_BASE + model + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
        body: JSON.stringify(payload),
      });
      if (res.ok) return { res, model };
      last = { status: res.status, text: await res.text().catch(() => '') };
      if (res.status !== 400 || attempt === 1) break;
      payload = promptLib.stripOptional(payload);
    }
    // Chỉ thử model khác khi model không tồn tại / không được phép dùng.
    if (last.status !== 404 && last.status !== 403) break;
  }
  const err = new Error('gemini ' + (last ? last.status : '?'));
  err.status = last ? last.status : 502;
  err.detail = last ? last.text.slice(0, 300) : '';
  throw err;
}

function usageOf(meta) {
  if (!meta) return null;
  return {
    in: meta.promptTokenCount || 0,
    out: meta.candidatesTokenCount || 0,
    think: meta.thoughtsTokenCount || 0,
    cached: meta.cachedContentTokenCount || 0,
  };
}

/** Chuyển luồng SSE của Gemini thành luồng gọn {t}/{done}; gọi onComplete(text) khi xong trọn vẹn. */
function relay(upstream, model, onComplete) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  let buf = '';
  let full = '';
  let usage = null;
  let failed = false;
  const send = (controller, obj) => controller.enqueue(enc.encode('data: ' + JSON.stringify(obj) + '\n\n'));

  function handleLine(line, controller) {
    if (!line.startsWith('data:')) return;
    const raw = line.slice(5).trim();
    if (!raw || raw === '[DONE]') return;
    let evt;
    try {
      evt = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (evt.usageMetadata) usage = usageOf(evt.usageMetadata);
    if (evt.promptFeedback && evt.promptFeedback.blockReason) {
      failed = true;
      send(controller, { error: 'Câu hỏi bị bộ lọc an toàn từ chối. Em thử diễn đạt lại nhé.' });
      return;
    }
    const cand = (evt.candidates || [])[0];
    if (!cand) return;
    // Bỏ phần "thought" nếu có (không hiển thị, không lưu).
    const text = ((cand.content && cand.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    if (text) {
      full += text;
      send(controller, { t: text });
    }
    if (cand.finishReason === 'SAFETY') {
      failed = true;
      send(controller, { error: 'Câu trả lời bị bộ lọc an toàn chặn.' });
    }
    if (cand.finishReason === 'MAX_TOKENS') failed = true;
  }

  return new ReadableStream({
    async start(controller) {
      const reader = upstream.body.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let idx;
          while ((idx = buf.indexOf('\n')) !== -1) {
            handleLine(buf.slice(0, idx).replace(/\r$/, ''), controller);
            buf = buf.slice(idx + 1);
          }
        }
        if (buf) handleLine(buf, controller);
        send(controller, { done: true, model, usage });
        if (!failed && full && onComplete) onComplete(full);
      } catch (e) {
        send(controller, { error: 'Mất kết nối với Gemini giữa chừng.' });
      } finally {
        controller.close();
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Cache câu trả lời "một chạm" — dùng chung cho mọi học sinh
// ---------------------------------------------------------------------------
//
// Ưu tiên KV (binding TUTOR_CACHE: toàn cầu, bền 30 ngày). Không có KV thì dùng
// Cache API của Cloudflare (theo từng trung tâm dữ liệu, có thể bị xoá sớm hơn).

const CACHE_TTL = 30 * 24 * 3600;

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

function cacheRequest(request, key) {
  return new Request(new URL('/__tutor_cache/' + key, request.url).toString());
}

async function cacheGet(env, request, key) {
  try {
    if (env.TUTOR_CACHE) return await env.TUTOR_CACHE.get('t:' + key);
    if (typeof caches !== 'undefined' && caches.default) {
      const hit = await caches.default.match(cacheRequest(request, key));
      return hit ? await hit.text() : null;
    }
  } catch (e) {
    /* cache hỏng không được làm hỏng câu trả lời */
  }
  return null;
}

async function cachePut(env, request, key, text) {
  try {
    if (env.TUTOR_CACHE) return await env.TUTOR_CACHE.put('t:' + key, text, { expirationTtl: CACHE_TTL });
    if (typeof caches !== 'undefined' && caches.default) {
      await caches.default.put(
        cacheRequest(request, key),
        new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=' + CACHE_TTL } }),
      );
    }
  } catch (e) {
    /* bỏ qua */
  }
}

function sseOnce(text, extra) {
  const body =
    'data: ' + JSON.stringify({ t: text }) + '\n\n' + 'data: ' + JSON.stringify(Object.assign({ done: true }, extra)) + '\n\n';
  return new Response(body, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function handleTutor(request, env, fetchImpl = fetch, waitUntil = null) {
  if (!env.GEMINI_API_KEY) {
    return json(503, { error: 'Máy chủ chưa cấu hình GEMINI_API_KEY.' });
  }

  let uid = 'anon';
  if (env.TUTOR_REQUIRE_AUTH !== '0') {
    const auth = request.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    try {
      const allowedProjects = [
        env.FIREBASE_PROJECT_ID,
        'adaptivemath-tmhp-2026',
        'adaptivemath-36726',
      ].filter(Boolean);
      const claims = await verifyFirebaseToken(
        token,
        allowedProjects,
        fetchImpl,
      );
      uid = claims.sub;
    } catch (e) {
      return json(401, { error: 'Cần đăng nhập để dùng Gia sư AI.', code: String(e.message) });
    }
  }
  if (rateLimited(uid)) {
    return json(429, { error: 'Em hỏi nhanh quá — nghỉ vài phút rồi hỏi tiếp nhé.' });
  }

  let req;
  try {
    req = await request.json();
  } catch (e) {
    return json(400, { error: 'Dữ liệu gửi lên không hợp lệ.' });
  }
  if (req && req.task === 'roadmap') return handleRoadmap(req, env, fetchImpl);

  const messages = cleanMessages(req.messages);
  if (!messages.length || messages[messages.length - 1].role !== 'user') {
    return json(400, { error: 'Thiếu câu hỏi.' });
  }

  const mode = promptLib.MODES[req.mode] ? req.mode : 'ask';
  const uploads = cleanUploads(req.images);
  const refs = (req.imageRefs || []).filter((r) => typeof r === 'string' && REF_RE.test(r)).slice(0, MAX_REFS);
  const solRefs = (req.solutionRefs || []).filter((r) => typeof r === 'string' && REF_RE.test(r)).slice(0, 2);
  const context = req.context && typeof req.context === 'object' ? req.context : {};

  // 1) Cache: câu hỏi một chạm về cùng một bài → trả lại ngay, không tốn lượt gọi Gemini.
  const keyParts = promptLib.cacheKeyParts({ mode, quick: !!req.quick, messages, uploads, imageRefs: refs, solutionRefs: solRefs, context });
  const cacheKey = keyParts ? await sha256Hex(keyParts) : null;
  if (cacheKey) {
    const hit = await cacheGet(env, request, cacheKey);
    if (hit) return sseOnce(hit, { cached: true });
  }

  // 2) Chỉ tải ảnh lời giải khi chế độ cần đối chiếu.
  const refImages = await loadRefs(refs, request, env, fetchImpl);
  const solImages = promptLib.MODE_CFG[mode].solImg ? await loadRefs(solRefs, request, env, fetchImpl) : [];
  const body = promptLib.buildGeminiBody({ mode, context, messages, refImages, solImages, uploads });

  try {
    const { res, model } = await callGemini(body, env, fetchImpl);
    const onComplete = cacheKey
      ? (text) => {
          const p = cachePut(env, request, cacheKey, text);
          if (waitUntil) waitUntil(p);
        }
      : null;
    return new Response(relay(res, model, onComplete), {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    const status = e.status === 429 ? 429 : 502;
    return json(status, {
      error:
        status === 429
          ? 'Gia sư AI đang quá tải, em thử lại sau ít phút nhé.'
          : 'Không gọi được Gemini (' + (e.status || 'lỗi mạng') + ').',
    });
  }
}

const TOPIC_RE = /^[6-9]-C\d{1,2}-B\d{1,2}$/;

function cleanSummary(sm) {
  sm = sm && typeof sm === 'object' ? sm : {};
  const topics = (Array.isArray(sm.topics) ? sm.topics : [])
    .filter((t) => t && TOPIC_RE.test(String(t.id)))
    .slice(0, 40)
    .map((t) => ({
      id: String(t.id),
      title: String(t.title || '').slice(0, 120),
      chapter: Number(t.chapter) || 0,
      mastery: Math.max(0, Math.min(1, Number(t.mastery) || 0)),
      tested: !!t.tested,
      practiced: !!t.practiced,
      exDone: Number(t.exDone) || 0,
      exStuck: Number(t.exStuck) || 0,
      exTotal: Number(t.exTotal) || 0,
      errors: Number(t.errors) || 0,
    }));
  const grade = [6, 7, 8, 9].indexOf(Number(sm.grade)) !== -1 ? Number(sm.grade) : null;
  return {
    grade,
    goal: String(sm.goal || '').slice(0, 80),
    target: Math.max(0.5, Math.min(1, Number(sm.target) || 0.75)),
    dailyMinutes: Math.max(15, Math.min(180, Number(sm.dailyMinutes) || 45)),
    daysLeft: sm.daysLeft == null ? null : Math.max(0, Math.min(400, Number(sm.daysLeft) || 0)),
    theta: typeof sm.theta === 'number' ? sm.theta : null,
    weeks: Math.max(1, Math.min(4, Number(sm.weeks) || 2)),
    signals: sm.signals && typeof sm.signals === 'object' ? sm.signals : null,
    recent: Array.isArray(sm.recent) ? sm.recent.slice(0, 10) : [],
    topics,
  };
}

/** Lộ trình AI: gọi generateContent (không stream) với responseSchema, rồi kiểm lại JSON. */
export async function handleRoadmap(req, env, fetchImpl = fetch) {
  const sm = cleanSummary(req.summary);
  if (!sm.grade || sm.topics.length === 0) {
    return json(400, { error: 'Thiếu dữ liệu hồ sơ năng lực để lập lộ trình.' });
  }
  const body = promptLib.buildRoadmapBody(sm);
  let res, model;
  try {
    ({ res, model } = await callGemini(body, env, fetchImpl, 'generate'));
  } catch (e) {
    const status = e.status === 429 ? 429 : 502;
    return json(status, {
      error: status === 429 ? 'Gia sư AI đang quá tải, em thử lại sau ít phút nhé.' : 'Không gọi được Gemini (' + (e.status || 'lỗi mạng') + ').',
    });
  }
  let raw = null;
  let usageMeta = null;
  try {
    const data = await res.json();
    usageMeta = data.usageMetadata || null;
    const cand = (data.candidates || [])[0];
    const text = ((cand && cand.content && cand.content.parts) || []).filter((p) => !p.thought).map((p) => p.text || '').join('');
    raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch (e) {
    return json(502, { error: 'Gia sư AI trả về lộ trình không đọc được, em thử lại nhé.' });
  }
  const plan = promptLib.sanitizeRoadmap(raw, sm.topics.map((t) => t.id), sm.dailyMinutes);
  if (!plan) return json(502, { error: 'Lộ trình AI trả về không hợp lệ, em thử lại nhé.' });
  return json(200, { plan, model, usage: usageOf(usageMeta) });
}

export async function onRequestPost(context) {
  return handleTutor(context.request, context.env, fetch, context.waitUntil ? context.waitUntil.bind(context) : null);
}

export async function onRequestGet() {
  return json(405, { error: 'Dùng POST.' });
}
