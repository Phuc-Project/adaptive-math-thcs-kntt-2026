// Kho đề thi (#/exams): danh sách tệp đề, mở đề kiểu Azota, tô đáp án, nộp bài, chấm.
// node exam-test.js <appRoot>   — ảnh chụp ở anh-chup/kho-de/
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { createDb } = require('./db');
const { createGemini } = require('./gemini-mock');
const srv = require('./server');
const { setup } = require('./pw-common');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const PORT = 8900 + Math.floor(Math.random() * 90);
const BASE = 'http://localhost:' + PORT + '/';
const SHOTS = path.join(__dirname, 'anh-chup', 'kho-de');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  ✔ ' : '  ✘ ') + name + (detail && !ok ? '  →  ' + detail : ''));
}

(async function main() {
  const db = createDb({});
  const gem = createGemini();
  const { close } = await srv.start(ROOT, PORT, gem.gemini);
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const errors = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
    await setup(ctx, db, { realImages: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('dialog', (d) => d.accept());

    await page.goto(BASE + '#/login');
    await page.click('text=Chưa có tài khoản? Đăng ký');
    await page.fill('input[autocomplete=name]', 'Đoàn Phương Linh');
    await page.fill('input[type=email]', 'linh@test.vn');
    await page.fill('input[type=password]', 'matkhau123');
    await page.click('button.btn-primary.btn-block');
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const now = new Date().toISOString();
      AM.store.saveProfile({ grade: 8, goal: 'cuoi-ky', dailyMinutes: 45, deadline: null, selfLevel: 'tb', weakTopicIds: [], createdAt: now, updatedAt: now });
    });
    await page.waitForTimeout(800);

    console.log('\n[1] Danh sách đề lớp 8');
    await page.evaluate(() => (window.location.hash = '#/exams'));
    await page.waitForTimeout(800);
    const files = await page.locator('.xm-file').count();
    check('Kho đề lớp 8 có đề (không còn trống)', files >= 9, String(files));
    check('Không còn thông báo "Chưa có đề thi"', !(await page.isVisible('text=Chưa có đề thi')));
    await page.screenshot({ path: path.join(SHOTS, '1-danh-sach-lop8.png'), fullPage: true });

    await page.click('.xm-tabs a:has-text("Cuối HK I")');
    await page.waitForTimeout(500);
    check('Lọc theo loại đề: Cuối HK I', (await page.locator('.xm-file').count()) === 3);

    console.log('\n[2] Mở đề — tờ đề + phiếu trả lời');
    await page.click('.xm-file >> nth=2');
    await page.waitForTimeout(1200);
    check('Có trình xem tờ đề', await page.isVisible('.xm-paper'));
    check('Có phiếu trả lời', await page.isVisible('.xm-sheet'));
    const imgs = await page.$$eval('.xm-paper img', (a) => a.filter((i) => i.complete && i.naturalWidth > 0).length);
    check('Ảnh câu đề tải được', imgs > 5, String(imgs));
    await page.screenshot({ path: path.join(SHOTS, '2-mo-de.png') });

    console.log('\n[3] Làm bài + nộp');
    await page.click('button:has-text("Bắt đầu làm bài")');
    await page.waitForTimeout(1200);
    const clock = await page.textContent('#xm-clock');
    check('Đồng hồ chạy ngược', /^89:5\d$|^90:00$/.test(clock.trim()), clock);
    const rows = page.locator('.xm-row');
    const n = await rows.count();
    for (let i = 0; i < n; i++) await rows.nth(i).locator('.xm-bubble').nth(i % 4).click();
    const tl = page.locator('.xm-tl-row');
    for (let i = 0; i < (await tl.count()); i++) await tl.nth(i).locator('.xm-tl-btn').nth(i % 2).click();
    await page.click('.xm-row >> nth=3 >> .xm-qno');
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SHOTS, '3-dang-lam.png') });

    await page.reload();
    await page.waitForTimeout(1200);
    check('Tải lại trang vẫn giữ đáp án đã tô', (await page.locator('.xm-bubble.is-on').count()) === n);

    await page.click('button:has-text("Nộp bài")');
    await page.waitForTimeout(1000);
    check('Hiện kết quả sau khi nộp', await page.isVisible('.xm-result'));
    check('Đánh dấu đúng/sai trên tờ đề', (await page.locator('.xm-mark').count()) > 0);
    check('Mở đáp án – hướng dẫn chấm', await page.isVisible('.xm-paper-sol'));
    const learner = await page.evaluate(() => AM.store.loadLearnerState().exercises);
    check('Kết quả từng câu ghi vào hồ sơ', Object.keys(learner).filter((k) => /^d8-/.test(k)).length >= n);
    await page.screenshot({ path: path.join(SHOTS, '4-da-nop.png') });
    await page.evaluate(() => document.querySelector('.xm-paper-sol').scrollIntoView());
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, '5-dap-an.png') });

    await page.evaluate(() => (window.location.hash = '#/exams'));
    await page.waitForTimeout(700);
    check('Danh sách hiện trạng thái "Đã nộp"', await page.isVisible('.xm-file :text("Đã nộp")'));

    console.log('\n[4] Điện thoại + lớp 9 (thi vào 10)');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => (window.location.hash = '#/exams?grade=9&type=V10'));
    await page.waitForTimeout(800);
    check('Lớp 9 có đề thi thử vào 10', (await page.locator('.xm-file').count()) >= 10);
    await page.screenshot({ path: path.join(SHOTS, '6-dien-thoai-lop9.png') });
    await page.click('.xm-file >> nth=0');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SHOTS, '7-dien-thoai-de.png') });

    await page.evaluate(() => (window.location.hash = '#/exercises'));
    await page.waitForTimeout(800);
    check('Trang Bài tập dẫn sang Kho đề thi', await page.isVisible('a:has-text("Mở Kho đề thi")'));
  } finally {
    await browser.close();
    await close();
  }
  check('Không có lỗi JavaScript', errors.length === 0, errors.join(' | '));
  const bad = results.filter((r) => !r.ok).length;
  console.log('\n' + (results.length - bad) + '/' + results.length + ' đạt');
  process.exit(bad ? 1 : 0);
})();
