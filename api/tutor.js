export const config = {
  runtime: 'edge',
};

import { handleTutor } from '../functions/api/tutor.js';

export default async function handler(request, context) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Dùng POST.' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  const env = process.env;
  const waitUntil = context?.waitUntil ? context.waitUntil.bind(context) : null;
  return handleTutor(request, env, fetch, waitUntil);
}
