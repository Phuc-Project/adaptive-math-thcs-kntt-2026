'use strict';
// Gemini giả lập: ghi lại yêu cầu, trả SSE cho chat, JSON cho lộ trình.
function createGemini(opts) {
  const calls = [];
  const o = Object.assign({ failModels: [], status: 200, delayMs: 0, finish: 'STOP' }, opts || {});
  async function gemini(url, init) {
    const model = /models\/([^:]+):/.exec(url)[1];
    const body = JSON.parse(init.body);
    calls.push({ url, model, body });
    if (o.delayMs) await new Promise((r) => setTimeout(r, o.delayMs));
    if (o.failModels.includes(model)) return new Response(JSON.stringify({ error: { code: 404, message: 'models/' + model + ' is not found' } }), { status: 404 });
    if (o.status !== 200) return new Response(JSON.stringify({ error: { code: o.status, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' } }), { status: o.status });
    if (url.includes(':generateContent')) {
      const prompt = body.contents[0].parts.map((p) => p.text || '').join('');
      const ids = [...prompt.matchAll(/^([6-9]-C\d+-B\d+)\|/gm)].map((m) => m[1]);
      const plan = {
        summary: 'Em đang tiến bộ tốt.',
        strengths: ['Tính toán cẩn thận'],
        weaknesses: ['Hình học'],
        tips: ['Ôn mỗi ngày 15 phút'],
        weeks: [{ week: 1, focus: 'Củng cố', goal: 'Đạt 70%', days: [{ day: 1, tasks: [{ type: 'theory', topicId: ids[0], minutes: 20, detail: 'Đọc lại lý thuyết' }, { type: 'practice', topicId: ids[1] || ids[0], minutes: 20, detail: 'Luyện 10 câu' }] }] }],
      };
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const pieces = o.pieces || ['**Gợi ý:** Ta có $x + 3 = 5$ ', 'nên $x = 2$. Bước 1: chuyển vế 3 sang phải.\n', '- Kết quả là 2 và 10 cũng đúng.'];
    const sse = pieces
      .map((t, i) => 'data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text: t }] }, finishReason: i === pieces.length - 1 ? o.finish : undefined }], usageMetadata: i === pieces.length - 1 ? { promptTokenCount: 50, candidatesTokenCount: 20, thoughtsTokenCount: 10 } : undefined }) + '\r\n\r\n')
      .join('');
    return new Response(sse, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }
  return { gemini, calls, opts: o };
}
module.exports = { createGemini };
