'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { createDb } = require('./db');
const { createGemini } = require('./gemini-mock');
const { setup } = require('./pw-common');
const srv = require('./server');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const OUT = path.join(__dirname, 'anh-chup', 'gia-su');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8600 + Math.floor(Math.random() * 90);
const ANSWER = [
  '### Nhận dạng\nHai biểu thức trông giống nhau nhưng khác hẳn: $(a-b)^3$ là **lập phương của một hiệu**, còn $a^3-b^3$ là **hiệu hai lập phương**.\n\n',
  'Bước 1: Khai triển $(a-b)^3$ theo hằng đẳng thức (5):\n$$(a-b)^3=a^3-3a^2b+3ab^2-b^3$$\n',
  'Bước 2: Viết $a^3-b^3$ thành tích theo hằng đẳng thức (7):\n$$a^3-b^3=(a-b)(a^2+ab+b^2)$$\n',
  'Bước 3: Thử với $a=2,\\ b=1$: $(2-1)^3=1$ nhưng $2^3-1^3=7$.\n\n',
  '### Mẹo nhớ\n- Có dấu ngoặc rồi mũ 3 → **khai triển** 4 hạng tử, dấu đan xen.\n- Hai lập phương trừ nhau → **viết thành tích**.\n\n',
  'Kết luận: $(a-b)^3 \\ne a^3-b^3$ (trừ khi $ab(a-b)=0$).',
];
(async () => {
  const db = createDb({ rules: 'new' });
  const gem = createGemini({ pieces: ANSWER, delayMs: 300 });
  const { close } = await srv.start(ROOT, PORT, gem.gemini);
  const browser = await chromium.launch();
  const errs = [];
  async function page(vp) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: vp.width < 500 ? 2 : 1 });
    await setup(ctx, db);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message));
    return p;
  }
  const S = await page({ width: 1440, height: 960 });
  const B = 'http://localhost:' + PORT + '/';
  await S.goto(B + '#/login?mode=signup');
  await S.waitForSelector('input[type=email]');
  await S.fill('input[autocomplete=name]', 'Trần Minh');
  await S.fill('input[type=email]', 'minh@test.vn');
  await S.fill('input[type=password]', 'matkhau123');
  await S.click('button.btn-primary.btn-block');
  await S.waitForTimeout(1800);
  await S.evaluate(() => (location.hash = '#/tutor?topic=8-C2-B1'));
  await S.waitForTimeout(700);
  await S.screenshot({ path: OUT + '/1-empty.png' });
  await S.click('.tutor-suggest-chip >> nth=0');
  await S.waitForTimeout(500);
  await S.screenshot({ path: OUT + '/2-streaming.png' });
  await S.waitForTimeout(3500);
  await S.screenshot({ path: OUT + '/3-answer.png' });
  await S.fill('.tutor-input', 'Còn (a+b)^3 với a^3+b^3 thì sao ạ?');
  await S.screenshot({ path: OUT + '/4-typing.png' });
  // general topic no topic
  await S.evaluate(() => (location.hash = '#/practice?topic=8-C2-B1&levels=N,H,V,T&count=10&from=thu'));
  await S.waitForTimeout(600);
  await S.click('.choices .choice >> nth=1');
  await S.click('#prac-submit');
  await S.waitForTimeout(200);
  await S.click('.tutor-launch > button');
  await S.waitForTimeout(4500);
  await S.screenshot({ path: OUT + '/5-compact.png', fullPage: true });
  const M = await page({ width: 390, height: 844 });
  await M.goto(B + '#/login');
  await M.waitForSelector('input[type=email]');
  await M.fill('input[type=email]', 'minh@test.vn');
  await M.fill('input[type=password]', 'matkhau123');
  await M.click('button.btn-primary.btn-block');
  await M.waitForTimeout(1800);
  await M.evaluate(() => (location.hash = '#/tutor?topic=8-C2-B1'));
  await M.waitForTimeout(600);
  await M.screenshot({ path: OUT + '/6-mobile-empty.png', fullPage: true });
  await M.click('.tutor-suggest-chip >> nth=1');
  await M.waitForTimeout(4200);
  await M.screenshot({ path: OUT + '/7-mobile-answer.png', fullPage: true });
  const ov = await M.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  console.log('overflow', ov, 'errors', errs);
  await browser.close();
  await close();
})();
