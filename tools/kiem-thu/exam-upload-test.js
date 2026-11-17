// Giáo viên tải đề lên lớp → học sinh làm & nộp → giáo viên xem bảng điểm (kiểu Azota).
// node exam-upload-test.js <appRoot>   — ảnh chụp ở anh-chup/giao-de/
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { createDb } = require('./db');
const { createGemini } = require('./gemini-mock');
const srv = require('./server');
const { setup } = require('./pw-common');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const PORT = 8700 + Math.floor(Math.random() * 90);
const BASE = 'http://localhost:' + PORT + '/';
const SHOTS = path.join(__dirname, 'anh-chup', 'giao-de');
const PDFJS = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'build');
const PDF = path.join(__dirname, 'fixtures', 'de-mau.pdf');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  console.log((ok ? '  ✔ ' : '  ✘ ') + name + (detail && !ok ? '  →  ' + detail : ''));
}

async function newPage(browser, db, label, errors, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1440, height: 950 } });
  await setup(ctx, db, { realImages: true });
  // pdf.js chạy offline từ node_modules (npm i pdfjs-dist@3.11.174)
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/pdfjs-dist@[^/]+\/build\/(pdf(\.worker)?\.min\.js)/, (r) => {
    const f = r.request().url().split('/').pop();
    r.fulfill({ path: path.join(PDFJS, f), contentType: 'text/javascript' });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('[' + label + '] pageerror: ' + e.message));
  page.on('dialog', (d) => d.accept());
  return page;
}

async function register(page, role, name, email) {
  await page.goto(BASE + '#/login');
  await page.click('text=Chưa có tài khoản? Đăng ký');
  if (role === 'teacher') await page.click('.role-option:has-text("Giáo viên")');
  await page.fill('input[autocomplete=name]', name);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'matkhau123');
  await page.click('button.btn-primary.btn-block');
  await page.waitForTimeout(1500);
}

async function go(page, hash, wait) {
  await page.evaluate((h) => (window.location.hash = h), hash);
  await page.waitForTimeout(wait || 900);
}

(async function main() {
  const db = createDb({});
  const gem = createGemini();
  const { close } = await srv.start(ROOT, PORT, gem.gemini);
  const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {});
  const errors = [];
  try {
    console.log('\n[1] Giáo viên tạo lớp, tải đề PDF lên');
    const T = await newPage(browser, db, 'teacher', errors);
    await register(T, 'teacher', 'Cô Hạnh', 'co.hanh@test.vn');
    const code = await T.evaluate(async () => (await AM.classroom.createClass('Toán 8A')).code);
    check('Tạo lớp', !!code, code);
    check('Thanh điều hướng giáo viên có "Giao đề thi"', await T.isVisible('.sidebar >> text=Giao đề thi'));
    await go(T, '#/exams');
    check('Lớp chưa có đề → mở sẵn form tải đề', await T.isVisible('text=Tải đề lên cho lớp'));
    await T.setInputFiles('input[type=file]', PDF);
    await T.waitForSelector('.xm-thumb', { timeout: 15000 });
    check('PDF dựng thành 2 trang xem trước', (await T.locator('.xm-thumb').count()) === 2);
    const coveredText = await T.textContent('.xm-thumbs');
    check('Tự che tên trường / phòng GD ở trang 1', /đã che [2-9] chỗ/.test(coveredText), coveredText);
    // Trang 1 sau khi che: vùng dòng "TRƯỜNG THCS KIỂM THỬ" phải trắng.
    const blank = await T.evaluate(() => {
      const c = document.querySelector('.xm-thumb');
      const g = c.getContext('2d');
      const k = c.width / 595;
      const d = g.getImageData(Math.round(45 * k), Math.round(56 * k), Math.round(150 * k), Math.round(12 * k)).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 200) dark++;
      return dark;
    });
    check('Dòng tên trường trên trang đề đã trắng', blank === 0, String(blank));
    // Câu 3 nhắc "trường THCS Kiểm Thử" giữa câu: chỉ che tên, phần đầu câu vẫn còn.
    const q3 = await T.evaluate(() => {
      const c = document.querySelector('.xm-thumb');
      const k = c.width / 595;
      const d = c.getContext('2d').getImageData(Math.round(42 * k), Math.round(226 * k), Math.round(150 * k), Math.round(12 * k)).data;
      let dark = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] < 200) dark++;
      return dark;
    });
    check('Câu có nhắc tên trường vẫn giữ nội dung câu', q3 > 50, String(q3));
    await T.fill('input[placeholder^="Ví dụ: Kiểm tra"]', 'Kiểm tra giữa kì II – Toán 8');
    await T.selectOption('.xm-form-grid select >> nth=0', 'GK2');
    const nums = T.locator('.xm-form-grid input[type=number]');
    await nums.nth(0).fill('45');
    await nums.nth(1).fill('3');
    await nums.nth(2).fill('2');
    await nums.nth(3).fill('3');
    await T.fill('input[placeholder^="Ví dụ: ABCDA"]', '1A 2B 3B');
    check('Đọc đáp án "1A 2B 3B" = 3 câu', /Đọc được 3 đáp án\./.test(await T.textContent('.xm-upload')));
    await T.screenshot({ path: path.join(SHOTS, '1-gv-tai-de.png'), fullPage: true });
    await T.click('button:has-text("Giao đề cho lớp")');
    await T.waitForTimeout(2500);
    const exKey = [...db.docs.keys()].find((k) => new RegExp('^classes/' + code + '/exams/[^/]+$').test(k));
    check('Đề lưu vào classes/' + code + '/exams', !!exKey);
    const eid = exKey && exKey.split('/').pop();
    check('Lưu 2 trang ảnh', [...db.docs.keys()].filter((k) => k.startsWith(exKey + '/pages/')).length === 2);
    check('Đáp án lưu riêng (key/main)', JSON.stringify((db.docs.get(exKey + '/key/main') || {}).ans) === '["A","B","B"]');
    check('Danh sách "Đề đã giao" hiện đề mới', await T.isVisible('.xm-file:has-text("Kiểm tra giữa kì II")'));

    console.log('\n[2] Học sinh vào lớp, làm đề, nộp');
    const S = await newPage(browser, db, 'student', errors);
    await register(S, 'student', 'Lê Minh', 'minh@test.vn');
    await S.evaluate(() => {
      const now = new Date().toISOString();
      AM.store.saveProfile({ grade: 8, goal: 'cuoi-ky', dailyMinutes: 45, deadline: null, selfLevel: 'tb', weakTopicIds: [], createdAt: now, updatedAt: now });
    });
    const outsider = await S.evaluate(async (a) => {
      try {
        await AM.classExams.list(a);
        return 'đọc được';
      } catch (e) {
        return 'bị chặn';
      }
    }, code);
    check('Chưa vào lớp thì không đọc được đề của lớp', outsider === 'bị chặn', outsider);
    const joined = await S.evaluate(async (c) => {
      try {
        await AM.classroom.joinClass(c);
        return 'ok';
      } catch (e) {
        return e.message;
      }
    }, code);
    check('Vào lớp', joined === 'ok', joined);
    const peek = await S.evaluate(async (a) => {
      try {
        return 'đọc được ' + JSON.stringify(await AM.classExams.key(a.code, a.eid));
      } catch (e) {
        return 'bị chặn';
      }
    }, { code, eid });
    check('Chưa nộp thì không đọc được đáp án', peek === 'bị chặn', peek);
    await go(S, '#/exams', 1500);
    check('Kho đề có mục "Đề giáo viên giao"', await S.isVisible('text=Đề giáo viên giao (1)'));
    await S.screenshot({ path: path.join(SHOTS, '2-hs-kho-de.png') });
    await S.click('.xm-file.is-class');
    await S.waitForSelector('.xm-page img', { timeout: 8000 });
    check('Mở đề: hiện 2 trang đề', (await S.locator('.xm-page').count()) === 2);
    check('Phiếu trả lời có 3 câu TN + 2 câu TL', (await S.locator('.xm-row').count()) === 3 && (await S.locator('.xm-tl-row').count()) === 2);
    await S.click('button:has-text("Bắt đầu làm bài")');
    await S.locator('.xm-row >> nth=0').locator('.xm-bubble >> nth=0').click(); // A đúng
    await S.locator('.xm-row >> nth=1').locator('.xm-bubble >> nth=1').click(); // B đúng
    await S.locator('.xm-row >> nth=2').locator('.xm-bubble >> nth=2').click(); // C sai
    await S.locator('.xm-tl-row >> nth=0').locator('.xm-tl-btn >> nth=0').click();
    await S.screenshot({ path: path.join(SHOTS, '3-hs-lam-bai.png') });
    await S.click('button:has-text("Nộp bài")');
    await S.waitForTimeout(1500);
    const result = await S.textContent('.xm-result');
    check('Chấm: đúng 2/3, 2 điểm / 3 điểm phần TN', /đúng\s*2\/3/.test(result) && /^2\/3 điểm/.test((await S.textContent('.xm-score')).replace(/\s+/g, ' ')), result);
    check('Ô đáp án đúng/sai hiện màu', (await S.locator('.xm-bubble.is-key').count()) === 3 && (await S.locator('.xm-bubble.is-wrong').count()) === 1);
    check('Bài nộp lưu trên Firestore', !!db.docs.get(exKey + '/subs/' + (await S.evaluate(() => AM.auth.currentUser().uid))));
    await S.screenshot({ path: path.join(SHOTS, '4-hs-da-nop.png') });
    const again = await S.evaluate(async (a) => {
      try {
        await AM.classExams.submit(a.code, a.eid, { answers: ['A', 'B', 'B'], tl: [true, true] });
        return 'sửa được';
      } catch (e) {
        return 'bị chặn';
      }
    }, { code, eid });
    check('Không sửa được bài đã nộp', again === 'bị chặn', again);
    await S.reload();
    await S.waitForTimeout(1500);
    check('Mở lại vẫn thấy kết quả đã nộp', await S.isVisible('.xm-result'));

    console.log('\n[3] Giáo viên xem bảng điểm, cho làm lại, xóa đề');
    await go(T, '#/exams?cls=' + code + '&id=' + eid, 1500);
    check('Bảng nộp bài có học sinh', await T.isVisible('.xm-table >> text=Lê Minh'));
    check('Điểm tính lại từ đáp án: 2/3, 2 điểm', /2\/3/.test(await T.textContent('.xm-table tbody')));
    await T.screenshot({ path: path.join(SHOTS, '5-gv-bang-diem.png'), fullPage: true });
    await T.click('button:has-text("Cho làm lại")');
    await T.waitForTimeout(1200);
    check('Cho làm lại → xóa bài nộp', !db.docs.get(exKey + '/subs/' + (await S.evaluate(() => AM.auth.currentUser().uid))));
    await T.click('button:has-text("Xóa đề")');
    await T.waitForTimeout(1500);
    check('Xóa đề → xóa cả trang, đáp án', ![...db.docs.keys()].some((k) => k.startsWith(exKey)));

    console.log('\n[4] Kho đề có sẵn không hiện tên trường');
    await go(S, '#/exams?grade=8', 1200);
    const listText = await S.textContent('.main');
    check('Danh sách không có "THCS" / "Trường"', !/THCS|Trường|TRƯỜNG|PTDTNT/.test(listText));
    await S.setViewportSize({ width: 390, height: 844 });
    await go(T, '#/exams', 1200);
  } finally {
    await browser.close();
    await close();
  }
  check('Không có lỗi JavaScript', errors.length === 0, errors.join(' | '));
  const bad = results.filter((r) => !r.ok).length;
  console.log('\n' + (results.length - bad) + '/' + results.length + ' đạt');
  process.exit(bad ? 1 : 0);
})();
