'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { createDb } = require('./db');
const { createGemini } = require('./gemini-mock');
const { setup } = require('./pw-common');
const srv = require('./server');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const OUT = path.join(__dirname, 'anh-chup', 'dien-thoai');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8500 + Math.floor(Math.random() * 90);
(async () => {
  const db = createDb({ rules: 'new' });
  const { close } = await srv.start(ROOT, PORT, createGemini().gemini);
  const browser = await chromium.launch();
  const errs = [];
  const B = 'http://localhost:' + PORT + '/';
  async function mk(email, name, role) {
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 1 });
    await setup(ctx, db);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    await p.goto(B + '#/login?mode=signup');
    await p.waitForSelector('input[type=email]');
    if (role === 'teacher') await p.click('.role-option:has-text("Giáo viên")');
    await p.fill('input[autocomplete=name]', name);
    await p.fill('input[type=email]', email);
    await p.fill('input[type=password]', 'matkhau123');
    await p.click('button.btn-primary.btn-block');
    await p.waitForTimeout(1800);
    return p;
  }
  const bad = [];
  async function sweep(p, routes, tag) {
    for (const r of routes) {
      await p.evaluate((h) => (location.hash = h), r);
      await p.waitForTimeout(600);
      const o = await p.evaluate(() => {
        const ov = document.documentElement.scrollWidth - innerWidth;
        const wide = [...document.querySelectorAll('.main *')].filter((n) => { const b = n.getBoundingClientRect(); return b.right > innerWidth + 1 && b.width > 0 && getComputedStyle(n).position !== 'fixed'; }).slice(0, 3).map((n) => n.className || n.tagName);
        return { ov, wide };
      });
      const name = tag + r.replace(/[#/?=&,]/g, '_');
      await p.screenshot({ path: OUT + '/' + name + '.png' });
      if (o.ov > 1) bad.push(tag + ' ' + r + ' tràn ' + o.ov + 'px ' + JSON.stringify(o.wide));
    }
  }
  const S = await mk('hs@test.vn', 'Nguyễn An');
  await S.evaluate(() => AM.store.saveProfile({ grade: 8, goal: 'cuoi-ky', dailyMinutes: 30, deadline: null, selfLevel: 'tb', weakTopicIds: [], sessionLength: 'auto' }));
  await sweep(S, ['#/', '#/thu', '#/theory?topic=8-C2-B1&from=thu', '#/practice?topic=8-C2-B1&levels=N,H,V,T&count=10&from=thu', '#/exercises?topic=8-C2-B1&from=thu', '#/exercises', '#/tutor', '#/learning-path', '#/errors', '#/classroom', '#/diagnostic', '#/profile', '#/onboarding'], 'hs');
  const T = await mk('gv@test.vn', 'Cô Lan', 'teacher');
  await sweep(T, ['#/teacher', '#/tutor'], 'gv');
  const G = await browser.newContext({ viewport: { width: 375, height: 812 } });
  await setup(G, db);
  const gp = await G.newPage();
  await gp.goto(B);
  await gp.waitForTimeout(800);
  await sweep(gp, ['#/', '#/login'], 'khach');
  console.log(bad.length ? bad.join('\n') : 'Không trang nào tràn ngang', '| lỗi JS:', errs);
  await browser.close();
  await close();
})();
