export const config = {
  runtime: 'edge',
};

import { handleTutor, handleHealth } from '../functions/api/tutor.js';

/**
 * Vercel Edge Function: POST /api/tutor (Gia sư AI), GET /api/tutor (kiểm tra cấu hình).
 * Toàn bộ logic nằm ở functions/api/tutor.js — dùng chung với Cloudflare Pages.
 */
export default async function handler(request, context) {
  const env = process.env;
  if (request.method === 'GET') return handleHealth(env, fetch);
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Dùng POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  const waitUntil = context && context.waitUntil ? context.waitUntil.bind(context) : null;
  return handleTutor(request, env, fetch, waitUntil);
}
