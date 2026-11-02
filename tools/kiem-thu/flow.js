// Luồng học sinh thật qua giao diện: onboarding → kiểm tra đầu vào → luyện tập → GV thấy realtime.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const { createDb } = require('./db');
const { createGemini } = require('./gemini-mock');
const srv = require('./server');
const ROOT = path.resolve(process.argv[2] || '/home/claude/app');
const PORT = 8900 + Math.floor(Math.random() * 90);
const BASE = 'http://localhost:' + PORT + '/';
const KATEX = path.join(__dirname, 'node_modules/katex/dist');
const results = [];
const check = (n, ok, d) => { results.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (!ok && d ? '  →  ' + d : '')); };

async function newPage(browser, db, label, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.exposeBinding('__fb', (_s, op, args) => db.handle(op, args));
  await ctx.route(/gstatic\.com\/firebasejs\//, (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, (r) => r.fulfill({ path: path.join(__dirname, 'mock-firebase.js'), contentType: 'text/javascript' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/katex.*katex\.min\.js/, (r) => r.fulfill({ path: path.join(KATEX, 'katex.min.js'), contentType: 'text/javascript' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/katex.*\.css/, (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('[' + label + '] ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/404/.test(m.text())) errors.push('[' + label + '] ' + m.text()); });
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
const crashed = async (p) => (await p.isVisible('text=Trang này gặp sự cố')) ? await p.locator('pre').first().textContent() : null;

(async () => {
  const db = createDb();
  const gem = createGemini();
  const { close } = await srv.start(ROOT, PORT, gem.gemini);
  const browser = await chromium.launch();
  const errors = [];
  try {
    const T = await newPage(browser, db, 'GV', errors);
    await register(T, 'teacher', 'Thầy Minh', 'minh@test.vn');
    await T.fill('input[placeholder^="Ví dụ"]', 'Toán 8B');
    await T.click('button:has-text("Tạo lớp")');
    await T.waitForTimeout(700);
    const code = [...db.docs.keys()].find((k) => /^classes\/[A-Z0-9]{6}$/.test(k)).split('/')[1];

    const S = await newPage(browser, db, 'HS', errors);
    await register(S, 'student', 'Trần Bình', 'binh@test.vn');
    const uid = [...db.users.values()].find((u) => u.email === 'binh@test.vn').uid;
    // Vào lớp trước khi làm hồ sơ
    await S.evaluate(() => (location.hash = '#/classroom'));
    await S.waitForTimeout(500);
    await S.locator('input.field').first().fill(code);
    await S.locator('button:has-text("Tìm lớp"), button:has-text("Tìm")').first().click();
    await S.waitForTimeout(600);
    await S.locator('button:has-text("Vào lớp"), button:has-text("Tham gia")').first().click();
    await S.waitForTimeout(1000);
    check('HS vào lớp qua giao diện', !!db.docs.get('classes/' + code + '/members/' + uid));

    // GV mở trang lớp, để yên — kiểm tra realtime
    await T.evaluate((c) => (location.hash = '#/teacher?class=' + c), code);
    await T.waitForTimeout(1000);
    check('GV thấy HS trong lớp', await T.isVisible('text=Trần Bình'));

    // ---------- Onboarding qua giao diện
    await S.evaluate(() => (location.hash = '#/onboarding'));
    await S.waitForTimeout(600);
    let steps = 0;
    for (let i = 0; i < 12; i++) {
      if (!(await S.evaluate(() => location.hash.startsWith('#/onboarding')))) break;
      // chọn lựa chọn đầu tiên chưa chọn trong mỗi nhóm hiển thị, rồi bấm Tiếp
      const g8 = S.locator('.option-grid .option:has-text("Lớp 8")');
      if (await g8.count()) await g8.first().click();
      else if (!(await S.locator('.option-grid .option.is-selected').count()) && (await S.locator('.option-grid .option').count()))
        await S.locator('.option-grid .option').first().click();
      const next = S.locator('button:has-text("Tiếp tục"), button:has-text("Bắt đầu kiểm tra")');
      if (!(await next.count())) break;
      await next.last().click().catch(() => {});
      steps++;
      await S.waitForTimeout(400);
    }
    const prof = await S.evaluate(() => AM.store.loadProfile());
    check('Onboarding qua giao diện lưu được hồ sơ (' + steps + ' bước)', !!prof, await S.evaluate(() => location.hash) + ' ' + (await S.locator('main, .main').first().innerText().catch(() => '')).slice(0, 300));
    check('Onboarding không lỗi trang', !(await crashed(S)));

    // ---------- Kiểm tra đầu vào: trả lời đến khi xong
    if (prof) {
      await S.evaluate(() => (location.hash = '#/diagnostic'));
      await S.waitForTimeout(700);
      let answered = 0;
      for (let i = 0; i < 400; i++) {
        const fin = await S.evaluate(() => { const d = AM.store.loadDiagnostic(); return !!(d && d.finished); });
        if (fin) break;
        if (await crashed(S)) break;
        const start = S.locator('button:has-text("Bắt đầu"), button:has-text("Làm bài"), button:has-text("Kiểm tra chương")');
        const choice = S.locator('.choice-btn, .option-btn, .mcq-option, button.choice, .answer-option');
        const input = S.locator('input.blank-input, input.field[type=text], input[inputmode]');
        if (await choice.count()) {
          await choice.nth(i % Math.max(1, await choice.count())).click().catch(() => {});
        } else if (await input.count()) {
          await input.first().fill('1').catch(() => {});
        } else if (await start.count()) {
          await start.first().click().catch(() => {});
          await S.waitForTimeout(300);
          continue;
        }
        const submit = S.locator('button:has-text("Trả lời"), button:has-text("Nộp"), button:has-text("Xác nhận"), button:has-text("Kiểm tra")');
        if (await submit.count()) await submit.first().click().catch(() => {});
        await S.waitForTimeout(80);
        const nxt = S.locator('button:has-text("Câu tiếp"), button:has-text("Tiếp tục"), button:has-text("Tiếp")');
        if (await nxt.count()) await nxt.first().click().catch(() => {});
        answered++;
        await S.waitForTimeout(60);
      }
      const diag = await S.evaluate(() => AM.store.loadDiagnostic());
      check('Kiểm tra đầu vào chạy qua giao diện (' + answered + ' lượt)', diag && (diag.responses || diag.answers || []).length > 0, JSON.stringify(diag || {}).slice(0, 200) + ' | ' + (await S.locator('.main').first().innerText().catch(() => '')).slice(0, 300));
      check('Kiểm tra đầu vào không lỗi trang', !(await crashed(S)), await crashed(S));
      await S.waitForTimeout(2500);
      const m = db.docs.get('classes/' + code + '/members/' + uid) || {};
      check('Tiến độ (lớp 8) tự đồng bộ vào lớp', m.grade === 8, JSON.stringify(m));
      // các trang sau khi có dữ liệu
      for (const r of ['#/', '#/profile', '#/learning-path', '#/exercises', '#/errors', '#/practice', '#/theory', '#/digital-tasks']) {
        await S.evaluate((h) => (location.hash = h), r);
        await S.waitForTimeout(500);
        check('HS (đã có dữ liệu) mở ' + r, !(await crashed(S)), await crashed(S));
      }
    }

    // ---------- Realtime: HS hỏi, GV thấy ngay mà không tải lại
    await S.evaluate(() => (location.hash = '#/classroom'));
    await S.waitForTimeout(800);
    await S.locator('textarea').first().fill('Thầy ơi em vướng bài hằng đẳng thức');
    await S.locator('button:has-text("Gửi")').first().click();
    await S.waitForTimeout(1800);
    check('GV thấy câu hỏi mới NGAY (không bấm tải lại)', await T.isVisible('text=Thầy ơi em vướng bài hằng đẳng thức'));
    // GV trả lời qua giao diện
    const replyBtn = T.locator('button:has-text("Trả lời")');
    if (await replyBtn.count()) {
      await replyBtn.first().click();
      await T.waitForTimeout(200);
      await T.locator('textarea').first().fill('Em xem lại bình phương của một tổng nhé');
      await T.locator('button:has-text("Gửi")').first().click();
      await T.waitForTimeout(1500);
      check('HS thấy câu trả lời NGAY (không tải lại)', await S.isVisible('text=Em xem lại bình phương của một tổng nhé'));
    } else check('GV có nút Trả lời', false);

    // HS luyện thêm → GV thấy xp tăng realtime
    const xpBefore = (db.docs.get('classes/' + code + '/members/' + uid) || {}).xp || 0;
    await S.evaluate(async () => { const st = AM.store.loadLearnerState(); st.gamification.xp += 50; AM.store.saveLearnerState(st); await AM.sync.flush(); });
    await S.waitForTimeout(1500);
    const xpAfter = (db.docs.get('classes/' + code + '/members/' + uid) || {}).xp || 0;
    check('Sau khi GV trả lời, tiến độ HS vẫn vào lớp (xp ' + xpBefore + '→' + xpAfter + ')', xpAfter >= xpBefore + 50);

    // GV dùng gia sư AI
    await T.evaluate(() => (location.hash = '#/tutor'));
    await T.waitForTimeout(500);
    await T.selectOption('select.field >> nth=0', '8');
    await T.waitForTimeout(300);
    await T.fill('textarea.tutor-input', 'Gợi ý cách dạy hằng đẳng thức');
    await T.click('.tutor-foot button:has-text("Gửi")');
    await T.waitForTimeout(2000);
    check('GV hỏi Gia sư AI được', /Gợi ý/.test(await T.locator('.tutor-msg.is-model').last().innerText().catch(() => '')));
    check('Menu GV có Gia sư AI', await T.isVisible('a[href="#/tutor"]'));
  } catch (e) {
    console.error('CRASH', e);
    results.push(false);
  } finally {
    await browser.close();
    await close();
  }
  console.log('\nTừ chối Firestore:', JSON.stringify(db.log));
  console.log('Lỗi JS (' + errors.length + '):\n' + errors.join('\n'));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length);
  process.exit(results.every(Boolean) ? 0 : 1);
})();
