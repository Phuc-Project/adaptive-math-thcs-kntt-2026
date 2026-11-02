// Kiểm thử đầu-cuối AdaptiveMath: giáo viên + học sinh + gia sư AI.
// node e2e.js <appRoot> [rules=old|new]
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { createDb } = require('./db');
const { createGemini } = require('./gemini-mock');
const srv = require('./server');

const ROOT = path.resolve(process.argv[2] || '/home/claude/app');
const RULES = process.argv[3] || 'new';
const PORT = 8800 + Math.floor(Math.random() * 100);
const BASE = 'http://localhost:' + PORT + '/';
const KATEX = path.join(__dirname, 'node_modules/katex/dist');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? '  ✔ ' : '  ✘ ') + name + (detail && !ok ? '  →  ' + detail : ''));
}

async function newPage(browser, db, label, errors) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.exposeBinding('__fb', (_src, op, args) => db.handle(op, args));
  await ctx.route(/gstatic\.com\/firebasejs\//, (r) => r.fulfill({ body: '', contentType: 'text/javascript' }));
  await ctx.route(/gstatic\.com\/firebasejs\/.*firebase-app-compat/, (r) => r.fulfill({ path: path.join(__dirname, 'mock-firebase.js'), contentType: 'text/javascript' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/katex.*katex\.min\.js/, (r) => r.fulfill({ path: path.join(KATEX, 'katex.min.js'), contentType: 'text/javascript' }));
  await ctx.route(/cdn\.jsdelivr\.net\/npm\/katex.*katex\.min\.css/, (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ body: '', contentType: 'text/css' }));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('[' + label + '] pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('[' + label + '] console.error: ' + m.text());
  });
  return page;
}

async function go(page, hash) {
  await page.evaluate((h) => (window.location.hash = h), hash);
  await page.waitForTimeout(400);
}

async function register(page, role, name, email) {
  await page.goto(BASE + '#/login');
  await page.waitForSelector('text=Chưa có tài khoản? Đăng ký');
  await page.click('text=Chưa có tài khoản? Đăng ký');
  if (role === 'teacher') await page.click('.role-option:has-text("Giáo viên")');
  await page.fill('input[autocomplete=name]', name);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'matkhau123');
  await page.click('button.btn-primary.btn-block');
  await page.waitForTimeout(1500);
}

(async function main() {
  const db = createDb({ rules: RULES });
  const gem = createGemini();
  const { close } = await srv.start(ROOT, PORT, gem.gemini);
  const browser = await chromium.launch();
  const errors = [];
  try {
    // ------------------------------------------------------------------ GIÁO VIÊN
    console.log('\n[1] Giáo viên đăng ký + tạo lớp');
    const T = await newPage(browser, db, 'teacher', errors);
    await register(T, 'teacher', 'Cô Lan', 'co.lan@test.vn');
    const tProfile = db.docs.get('users/u1');
    check('Tài khoản giáo viên được lưu đúng role=teacher', tProfile && tProfile.role === 'teacher', JSON.stringify(tProfile));
    check('Giáo viên vào thẳng trang Lớp của tôi', await T.isVisible('h1:has-text("Lớp của tôi")'), await T.locator('h1').first().textContent().catch(() => ''));
    await T.fill('input[placeholder^="Ví dụ"]', 'Toán 7A1');
    await T.click('button:has-text("Tạo lớp")');
    await T.waitForTimeout(800);
    const code = [...db.docs.keys()].find((k) => /^classes\/[A-Z0-9]{6}$/.test(k)).split('/')[1];
    check('Tạo lớp thành công, có mã lớp', !!code, code);
    check('Mã lớp hiện trên danh sách', await T.isVisible('.class-code:has-text("' + code + '")'));

    // ------------------------------------------------------------------ HỌC SINH
    console.log('\n[2] Học sinh đăng ký, onboarding, vào lớp');
    const S = await newPage(browser, db, 'student', errors);
    await register(S, 'student', 'Nguyễn An', 'an@test.vn');
    const sUid = [...db.users.values()].find((u) => u.email === 'an@test.vn').uid;
    check('Tài khoản học sinh role=student', (db.docs.get('users/' + sUid) || {}).role === 'student');
    // Hồ sơ học sinh (bỏ qua bài kiểm tra đầu vào cho nhanh — kiểm thử riêng bên dưới).
    await S.evaluate(() => {
      const now = new Date().toISOString();
      AM.store.saveProfile({ grade: 7, goal: 'cuoi-ky', dailyMinutes: 45, deadline: null, selfLevel: 'tb', weakTopicIds: [], createdAt: now, updatedAt: now });
    });
    await S.waitForTimeout(2500);
    check('Hồ sơ học tập đẩy lên Firestore (learners/uid/data/profile)', db.docs.has('learners/' + sUid + '/data/profile'));
    check('Tóm tắt users/uid.grade = 7', (db.docs.get('users/' + sUid) || {}).grade === 7, JSON.stringify(db.docs.get('users/' + sUid)));

    await go(S, '#/classroom');
    const joinInput = S.locator('input.field').first();
    await joinInput.fill(code.toLowerCase());
    await S.locator('button:has-text("Tìm lớp"), button:has-text("Vào lớp"), button:has-text("Tham gia")').first().click();
    await S.waitForTimeout(800);
    const confirmBtn = S.locator('button:has-text("Vào lớp"), button:has-text("Tham gia"), button:has-text("Xác nhận")');
    if (await confirmBtn.count()) {
      await confirmBtn.first().click();
      await S.waitForTimeout(1500);
    }
    const member = db.docs.get('classes/' + code + '/members/' + sUid);
    check('Học sinh vào lớp bằng mã (nhập chữ thường)', !!member, '');
    check('Dòng thành viên có tiến độ (grade=7)', member && member.grade === 7, JSON.stringify(member));

    // ------------------------------------------------------------------ HỎI GIÁO VIÊN
    console.log('\n[3] Học sinh hỏi bài → giáo viên trả lời → tiến độ vẫn đồng bộ');
    await S.evaluate(() => AM.classroom.requestHelp('Cô ơi em chưa hiểu bài số nguyên'));
    await go(T, '#/teacher?class=' + code);
    await T.waitForTimeout(1200);
    check('Giáo viên thấy học sinh trong lớp', await T.isVisible('text=Nguyễn An'));
    check('Giáo viên thấy câu hỏi của học sinh', await T.isVisible('text=Cô ơi em chưa hiểu bài số nguyên'));
    const ans = await T.evaluate(async (a) => {
      try {
        await AM.classroom.answerHelp(a.code, a.uid, 'Em xem lại ví dụ 2 nhé');
        return 'ok';
      } catch (e) {
        return e.message;
      }
    }, { code, uid: sUid });
    check('Giáo viên trả lời được', ans === 'ok', ans);
    // Học sinh luyện tập thêm → tiến độ phải được mirror vào lớp.
    const mirror = await S.evaluate(async () => {
      const st = AM.store.loadLearnerState();
      st.gamification.xp += 123;
      st.gamification.totalQuestionsAttempted += 7;
      AM.store.saveLearnerState(st);
      const r = await AM.sync.flush();
      return r;
    });
    await S.waitForTimeout(500);
    const m2 = db.docs.get('classes/' + code + '/members/' + sUid) || {};
    check('Sau khi GV trả lời, tiến độ HS vẫn đồng bộ vào lớp (xp tăng)', m2.xp >= 123, 'xp=' + m2.xp + ' flush=' + JSON.stringify(mirror) + ' denied=' + JSON.stringify(db.log.slice(-3)));
    await go(S, '#/classroom');
    await S.waitForTimeout(1000);
    check('Học sinh thấy câu trả lời của giáo viên', await S.isVisible('text=Em xem lại ví dụ 2 nhé'));

    // ------------------------------------------------------------------ ĐĂNG NHẬP LẠI / MÁY KHÁC
    console.log('\n[4] Đăng nhập lại trên máy khác — dữ liệu và vai trò giữ nguyên');
    const S2 = await newPage(browser, db, 'student-2', errors);
    await S2.goto(BASE + '#/login');
    await S2.fill('input[type=email]', 'an@test.vn');
    await S2.fill('input[type=password]', 'matkhau123');
    await S2.click('button.btn-primary.btn-block');
    await S2.waitForTimeout(2000);
    const prof2 = await S2.evaluate(() => AM.store.loadProfile());
    check('Máy thứ 2 tải được hồ sơ học tập (lớp 7)', prof2 && prof2.grade === 7);
    check('Máy thứ 2 nhận đúng lớp học', await S2.evaluate(() => AM.auth.classCode()) === code);
    const T2 = await newPage(browser, db, 'teacher-2', errors);
    await T2.goto(BASE + '#/login');
    await T2.fill('input[type=email]', 'co.lan@test.vn');
    await T2.fill('input[type=password]', 'matkhau123');
    await T2.click('button.btn-primary.btn-block');
    await T2.waitForTimeout(2000);
    check('Giáo viên đăng nhập lại vẫn là giáo viên', await T2.evaluate(() => AM.auth.isTeacher()));
    check('Giáo viên đăng nhập lại thấy lớp', await T2.isVisible('text=Toán 7A1'));

    // ------------------------------------------------------------------ MỌI TRANG
    console.log('\n[5] Mở mọi trang (học sinh & giáo viên) — không được lỗi');
    const studentRoutes = ['#/', '#/onboarding', '#/diagnostic', '#/profile', '#/learning-path', '#/theory', '#/practice', '#/exercises', '#/tutor', '#/errors', '#/classroom', '#/digital-tasks', '#/admin', '#/teacher', '#/khongtontai'];
    for (const r of studentRoutes) {
      await go(S, r);
      const crashed = await S.isVisible('text=Trang này gặp sự cố');
      check('HS mở ' + r, !crashed, crashed ? await S.locator('pre').first().textContent() : '');
    }
    for (const r of ['#/teacher', '#/', '#/practice', '#/tutor', '#/admin', '#/khongtontai']) {
      await go(T, r);
      const crashed = await T.isVisible('text=Trang này gặp sự cố');
      check('GV mở ' + r, !crashed, crashed ? await T.locator('pre').first().textContent() : '');
    }

    // ------------------------------------------------------------------ GIA SƯ AI
    console.log('\n[6] Gia sư AI');
    await go(S, '#/tutor');
    await S.waitForTimeout(300);
    await S.fill('textarea.tutor-input', 'Giải phương trình x + 3 = 5');
    await S.click('.tutor-foot button:has-text("Gửi")');
    await S.waitForTimeout(2500);
    const replyHtml = await S.locator('.tutor-msg.is-model').last().innerHTML().catch(() => '');
    const replyText = await S.locator('.tutor-msg.is-model').last().innerText().catch(() => '');
    check('Gia sư trả lời (trang #/tutor)', /Gợi ý/.test(replyText), replyText.slice(0, 200) + ' | errors: ' + (await S.locator('.tutor-foot .banner').allInnerTexts()).join(';'));
    check('Công thức hiển thị bằng KaTeX', /katex/.test(replyHtml));
    check('Số thường (2 và 10) không bị mất', /2 và 10/.test(replyText), replyText);
    const last = gem.calls[gem.calls.length - 1];
    check('Gửi đúng lớp cho Gemini (grade 7)', last && /grade 7/.test(JSON.stringify(last.body.systemInstruction)));

    // Hỏi tiếp lượt 2
    await S.fill('textarea.tutor-input', 'Vì sao lại chuyển vế?');
    await S.click('.tutor-foot button:has-text("Gửi")');
    await S.waitForTimeout(2000);
    check('Hỏi tiếp lượt 2 được', (await S.locator('.tutor-msg.is-model').count()) === 2, (await S.locator('.tutor-foot .banner').allInnerTexts()).join(';'));

    // Gia sư trong thẻ bài tập
    await go(S, '#/exercises');
    await S.waitForTimeout(800);
    const launch = S.locator('.tutor-launch button').first();
    if (await launch.count()) {
      await launch.click();
      await S.waitForTimeout(300);
      await S.locator('.tutor .ex-chip:has-text("Gợi ý bước đầu")').first().click();
      await S.waitForTimeout(2500);
      const t = await S.locator('.tutor .tutor-msg.is-model').first().innerText().catch(() => '');
      check('Gia sư trong thẻ bài tập trả lời', /Gợi ý/.test(t), t + ' | ' + (await S.locator('.tutor-foot .banner').allInnerTexts()).join(';'));
      const lastc = gem.calls[gem.calls.length - 1];
      const hasImg = lastc && JSON.stringify(lastc.body).includes('inline_data');
      check('Ảnh đề bài được gửi kèm cho Gemini (nếu có ảnh)', hasImg || !fs.existsSync(path.join(ROOT, 'data/exercises/img')), '');
    } else {
      check('Có nút Gia sư AI trên thẻ bài tập', false, 'không tìm thấy .tutor-launch');
    }

    // Lộ trình AI
    const rm = await S.evaluate(async () => {
      try {
        const ctx = AM.ui.buildContext();
        const sm = AM.tutor.buildRoadmapSummary(ctx, 1);
        const r = await AM.tutor.roadmap(sm);
        return { ok: !!(r.plan && r.plan.weeks.length) };
      } catch (e) {
        return { ok: false, err: e.message };
      }
    });
    check('Lộ trình học do AI lập', rm.ok, JSON.stringify(rm));

    // Giáo viên dùng gia sư AI
    await go(T, '#/tutor');
    const tTutor = await T.isVisible('textarea.tutor-input');
    check('Giáo viên mở được Gia sư AI', tTutor);

    // ------------------------------------------------------------------ RỜI LỚP / XOÁ HỌC SINH
    console.log('\n[7] Giáo viên xoá học sinh → học sinh tự cập nhật');
    await T.evaluate((a) => AM.classroom.removeMember(a.code, a.uid), { code, uid: sUid });
    await go(S, '#/classroom');
    await S.waitForTimeout(1200);
    check('HS bị xoá khỏi lớp thì classCode được gỡ', (await S.evaluate(() => AM.auth.classCode())) === null);

    // ------------------------------------------------------------------ ĐĂNG XUẤT
    console.log('\n[8] Đăng xuất');
    const so = await S.evaluate(async () => {
      try {
        await AM.auth.signOut();
        return 'ok';
      } catch (e) {
        return e.message;
      }
    });
    await S.waitForTimeout(800);
    check('Học sinh đăng xuất được', so === 'ok', so);
    check('Đăng xuất xoá dữ liệu cục bộ', (await S.evaluate(() => AM.store.loadProfile())) === null);
  } catch (e) {
    console.error('TEST CRASH', e);
    check('Test chạy hết không crash', false, e.message);
  } finally {
    await browser.close();
    await close();
  }
  const denied = db.log.filter((l) => l.denied);
  console.log('\nFirestore bị từ chối (' + denied.length + '):', JSON.stringify(denied, null, 0));
  console.log('\nLỗi JS trên trang (' + errors.length + '):\n' + errors.map((e) => '  ' + e).join('\n'));
  const fail = results.filter((r) => !r.ok);
  console.log('\nKẾT QUẢ: ' + (results.length - fail.length) + '/' + results.length + ' đạt');
  fs.writeFileSync(path.join(__dirname, 'last-result.json'), JSON.stringify({ results, errors, denied }, null, 2));
  process.exit(fail.length ? 1 : 0);
})();
