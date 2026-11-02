// Kiểm thử máy chủ Gia sư AI (bundle như Vercel Edge).
import * as esbuild from 'esbuild';
import { webcrypto } from 'node:crypto';
const root = process.argv[2] || '/home/claude/app';
await esbuild.build({ entryPoints: [root + '/functions/api/tutor.js'], bundle: true, format: 'esm', platform: 'neutral', outfile: './fn-bundle.mjs', logLevel: 'silent' });
await esbuild.build({ entryPoints: [root + '/api/tutor.js'], bundle: true, format: 'esm', platform: 'neutral', outfile: './edge-bundle.mjs', logLevel: 'silent' });
const fn = await import('./fn-bundle.mjs?' + Date.now());
const edge = (await import('./edge-bundle.mjs?' + Date.now())).default;

let pass = 0, fail = 0;
const check = (n, ok, d) => { ok ? pass++ : fail++; console.log((ok ? '  ✔ ' : '  ✘ ') + n + (!ok && d ? ' → ' + d : '')); };
const sse = (pieces, finish = 'STOP') => pieces.map((t, i) => 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] }, finishReason: i === pieces.length - 1 ? finish : undefined }] }) + '\n\n').join('');
const post = (body, headers = {}) => new Request('http://x/api/tutor', { method: 'POST', headers, body: JSON.stringify(body) });
const ask = { mode: 'hint', messages: [{ role: 'user', text: 'x+1=2' }] };
async function events(res) {
  const txt = await res.text();
  return txt.split('\n').filter((l) => l.startsWith('data:')).map((l) => JSON.parse(l.slice(5)));
}
const env0 = { GEMINI_API_KEY: 'k', TUTOR_REQUIRE_AUTH: '0' };

// 1. Chuyển model khi 404/429
{
  const seen = [];
  const f = async (u) => {
    const m = /models\/([^:]+):/.exec(u)[1];
    seen.push(m);
    if (m === 'gemini-3.8-flash') return new Response('{"error":{"message":"not found"}}', { status: 404 });
    if (m === 'gemini-3.6-flash') return new Response('{"error":{"message":"quota"}}', { status: 429 });
    return new Response(sse(['OK ', 'xong']), { status: 200 });
  };
  const ev = await events(await fn.handleTutor(post(ask), env0, f));
  check('Model lỗi 404/429 → tự chuyển model kế tiếp', ev.some((e) => e.t) && ev.find((e) => e.done).model === 'gemini-3.5-flash-lite', JSON.stringify(ev) + seen);
}
// 2. Khóa sai → thông báo rõ
{
  const f = async () => new Response('{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT"}}', { status: 400 });
  const ev = await events(await fn.handleTutor(post(ask), env0, f));
  const e = ev.find((x) => x.error);
  check('Khóa API sai → báo "không hợp lệ"', e && /không hợp lệ/.test(e.error), JSON.stringify(ev));
}
// 3. MAX_TOKENS → cảnh báo, không cache
{
  const f = async () => new Response(sse(['Một nửa'], 'MAX_TOKENS'), { status: 200 });
  const ev = await events(await fn.handleTutor(post(ask), env0, f));
  check('Bị cắt (MAX_TOKENS) → gửi cảnh báo', ev.some((e) => e.warning), JSON.stringify(ev));
}
// 4. Phản hồi rỗng → báo lỗi
{
  const f = async () => new Response(sse(['']), { status: 200 });
  const ev = await events(await fn.handleTutor(post(ask), env0, f));
  check('Phản hồi rỗng → báo lỗi thay vì im lặng', ev.some((e) => e.error), JSON.stringify(ev));
}
// 5. Gemini chậm → phản hồi mở ngay (không chờ token đầu)
{
  let release;
  const gate = new Promise((r) => (release = r));
  const f = async () => { await gate; return new Response(sse(['muộn']), { status: 200 }); };
  const t0 = Date.now();
  const res = await fn.handleTutor(post(ask), env0, f);
  const dt = Date.now() - t0;
  const reader = res.body.getReader();
  const first = new TextDecoder().decode((await reader.read()).value);
  check('Trả header + byte đầu ngay cả khi Gemini còn đang nghĩ (' + dt + 'ms)', dt < 200 && first.startsWith(':'), first);
  release();
  let rest = '';
  for (;;) { const { value, done } = await reader.read(); if (done) break; rest += new TextDecoder().decode(value); }
  check('…rồi vẫn nhận đủ câu trả lời', /muộn/.test(rest));
}
// 6. Lộ trình: JSON có khoảng trắng đầu vẫn parse được; lỗi nằm trong thân
{
  const plan = { summary: 's', strengths: ['a'], weaknesses: ['b'], tips: ['c'], weeks: [{ week: 1, focus: 'f', goal: 'g', days: [{ day: 1, tasks: [{ type: 'theory', topicId: '7-C1-B1', minutes: 20, detail: 'd' }] }] }] };
  const f = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] } }] }), { status: 200 });
  const res = await fn.handleTutor(post({ task: 'roadmap', summary: { grade: 7, topics: [{ id: '7-C1-B1', title: 't' }] } }), env0, f);
  const data = JSON.parse(await res.text());
  check('Lộ trình AI trả JSON hợp lệ', res.status === 200 && data.plan && data.plan.weeks.length === 1, JSON.stringify(data));
  const f2 = async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"summary":"cụt' }] }, finishReason: 'MAX_TOKENS' }] }), { status: 200 });
  const d2 = JSON.parse(await (await fn.handleTutor(post({ task: 'roadmap', summary: { grade: 7, topics: [{ id: '7-C1-B1', title: 't' }] } }), env0, f2)).text());
  check('Lộ trình bị cắt → thông báo dễ hiểu', d2.error && /cắt/.test(d2.error), JSON.stringify(d2));
}
// 7. Kiểm tra cấu hình (GET)
{
  const f = async (u) => new Response(u.endsWith('gemini-3.8-flash') ? '{}' : '{"error":{"message":"nope"}}', { status: u.endsWith('gemini-3.8-flash') ? 200 : 404 });
  const d = JSON.parse(await (await fn.handleHealth({ GEMINI_API_KEY: 'k' }, f)).text());
  check('GET /api/tutor báo model dùng được', d.ok && d.firstWorkingModel === 'gemini-3.8-flash', JSON.stringify(d));
  const d2 = JSON.parse(await (await fn.handleHealth({}, f)).text());
  check('GET /api/tutor báo thiếu khóa', !d2.ok && /GEMINI_API_KEY/.test(d2.error));
  check('GET không lộ khóa', !JSON.stringify(d).includes('"k"'));
}
// 8. Xác thực Firebase ID token thật (RS256)
{
  const { subtle } = webcrypto;
  const kp = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = Object.assign(await subtle.exportKey('jwk', kp.publicKey), { kid: 'k1', alg: 'RS256', use: 'sig' });
  const b64u = (b) => Buffer.from(b).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const mk = async (claims) => {
    const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' }));
    const p = b64u(JSON.stringify(claims));
    const sig = await subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p));
    return h + '.' + p + '.' + b64u(sig);
  };
  const good = await mk({ aud: 'adaptivemath-tmhp-2026', iss: 'https://securetoken.google.com/adaptivemath-tmhp-2026', sub: 'u1', iat: now - 10, exp: now + 3600 });
  const expired = await mk({ aud: 'adaptivemath-tmhp-2026', iss: 'https://securetoken.google.com/adaptivemath-tmhp-2026', sub: 'u1', iat: now - 7200, exp: now - 3600 });
  const f = async (u) => (String(u).includes('jwk') ? new Response(JSON.stringify({ keys: [jwk] }), { status: 200 }) : new Response(sse(['chào']), { status: 200 }));
  fn._resetJwksCache();
  const env = { GEMINI_API_KEY: 'k' };
  const r1 = await fn.handleTutor(post(ask, { Authorization: 'Bearer ' + good }), env, f);
  check('Token Firebase hợp lệ → được hỏi', r1.status === 200 && (await r1.text()).includes('chào'));
  const r2 = await fn.handleTutor(post(ask, { Authorization: 'Bearer ' + expired }), env, f);
  const j2 = await r2.json();
  check('Token hết hạn → 401 + hướng dẫn tải lại', r2.status === 401 && /hết hạn/.test(j2.error), JSON.stringify(j2));
  const r3 = await fn.handleTutor(post(ask), env, f);
  check('Không token → 401', r3.status === 401);
}
// 9. Vercel edge wrapper
{
  process.env.GEMINI_API_KEY = 'k';
  globalThis.fetch = async () => new Response('{}', { status: 200 });
  const g = await edge(new Request('http://x/api/tutor'), {});
  check('Edge: GET → kiểm tra cấu hình (200 JSON)', g.status === 200 && (await g.json()).hasKey === true);
  const p = await edge(new Request('http://x/api/tutor', { method: 'PUT' }), {});
  check('Edge: PUT → 405', p.status === 405);
}
console.log('\nMáy chủ: ' + pass + '/' + (pass + fail) + ' đạt');
process.exit(fail ? 1 : 0);
