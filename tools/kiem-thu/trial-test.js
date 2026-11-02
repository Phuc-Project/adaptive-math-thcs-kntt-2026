// Kiểm thử bài học dùng thử "Hằng đẳng thức đáng nhớ" (#/thu).
// node trial-test.js <appRoot>
'use strict';
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');
const { createDb } = require('./db');
const { createGemini } = require('./gemini-mock');
const { setup } = require('./pw-common');
const srv = require('./server');

const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const PORT = 8700 + Math.floor(Math.random() * 100);
const BASE = 'http://localhost:' + PORT + '/';
const SHOTS = path.join(__dirname, 'anh-chup', 'dung-thu');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? '  ✔ ' : '  ✘ ') + name + (detail && !ok ? '  →  ' + String(detail).slice(0, 400) : ''));
}
const wait = (p, ms) => p.waitForTimeout(ms);
const hash = (p) => p.evaluate(() => location.hash);
const go = async (p, h) => { await p.evaluate((x) => (location.hash = x), h); await wait(p, 450); };
const text = (p, sel) => p.locator(sel || '.main').first().innerText().catch(() => '');

async function newPage(browser, db, label, errors, viewport) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 900 } });
  await setup(ctx, db);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push('[' + label + '] pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[' + label + '] console.error: ' + m.text()); });
  return page;
}

async function signupFromForm(page, name, email, role) {
  await page.waitForSelector('input[type=email]');
  if (role === 'teacher') await page.click('.role-option:has-text("Giáo viên")');
  await page.fill('input[autocomplete=name]', name);
  await page.fill('input[type=email]', email);
  await page.fill('input[type=password]', 'matkhau123');
  await page.click('button.btn-primary.btn-block');
  await wait(page, 1800);
}

async function katexErrors(page) {
  return page.evaluate(() => document.querySelectorAll('.katex-error').length);
}

(async function main() {
  const db = createDb({ rules: 'new' });
  const gem = createGemini();
  const { close } = await srv.start(ROOT, PORT, gem.gemini);
  const browser = await chromium.launch();
  const errors = [];
  try {
    // ------------------------------------------------ 1. Khách mới từ trang giới thiệu
    console.log('\n[1] Khách mới: trang giới thiệu → đăng ký → vào thẳng bài dùng thử');
    const S = await newPage(browser, db, 'HS', errors);
    await S.goto(BASE);
    await S.waitForSelector('.landing');
    const cta = S.locator('.landing-cta a.btn-primary');
    check('Nút chính trang giới thiệu là "Học thử"', /Học thử/.test(await cta.innerText()), await cta.innerText());
    await S.screenshot({ path: SHOTS + '/01-landing.png' });
    await cta.click();
    await wait(S, 400);
    check('Mở form đăng ký', /mode=signup/.test(await hash(S)) && (await S.locator('input[autocomplete=name]').count()) > 0, await hash(S));
    await signupFromForm(S, 'Trần Minh', 'minh@test.vn');
    check('Đăng ký xong vào thẳng #/thu', (await hash(S)) === '#/thu', await hash(S));
    const hubTxt = await text(S);
    check('Trang dùng thử có tiêu đề bài', /Hằng đẳng thức đáng nhớ/.test(hubTxt), hubTxt.slice(0, 200));
    check('Có 4 bước học', (await S.locator('.trial-step').count()) === 4);
    check('Bước 1 được đánh dấu "làm tiếp"', await S.locator('.trial-step').nth(0).evaluate((n) => n.classList.contains('is-next')));
    check('Bảng 7 hằng đẳng thức hiển thị bằng KaTeX', (await S.locator('.trial-formulas li .katex').count()) === 7);
    check('Mục "Học thử" đứng đầu thanh bên (sau Trang chính)', /Bài học dùng thử/.test(await S.locator('.sidebar a.sidebar-link').nth(1).innerText().catch(() => '')), await S.locator('.sidebar a.sidebar-link').nth(1).innerText().catch((e) => e.message));
    await S.screenshot({ path: SHOTS + '/02-hub.png', fullPage: true });

    // ------------------------------------------------ 2. Lý thuyết
    console.log('\n[2] Bước 1 — lý thuyết');
    await S.locator('.trial-step').nth(0).locator('a.btn').click();
    await wait(S, 500);
    check('Mở trang lý thuyết dạng dùng thử', /#\/theory\?topic=8-C2-B1&from=thu/.test(await hash(S)), await hash(S));
    const thTxt = await text(S);
    check('Có dải "Bài học dùng thử · Bước 1/4"', (await S.locator('.trial-crumb').count()) === 1 && /Bước 1\/4/.test(thTxt));
    check('Lý thuyết đủ 7 hằng đẳng thức', ['hiệu hai bình phương', 'lập phương của một tổng', 'tổng hai lập phương', 'hiệu hai lập phương'].every((s) => thTxt.toLowerCase().includes(s)), thTxt.slice(0, 300));
    check('Có ví dụ mẫu và 5 dạng bài', (thTxt.match(/Ví dụ \d/g) || []).length >= 4 && (thTxt.match(/Dạng \d/g) || []).length >= 5);
    check('KaTeX không lỗi trên trang lý thuyết', (await katexErrors(S)) === 0, await katexErrors(S));
    check('Không còn ký tự LaTeX thô (\\\\ hoặc $)', !/\$|\\\\|\\dfrac|\\cdot/.test(thTxt), (thTxt.match(/.{20}(\$|\\\\|\\dfrac|\\cdot).{20}/) || [''])[0]);
    await S.locator('details summary:has-text("Lời giải")').first().click();
    await wait(S, 200);
    check('Mở được lời giải ví dụ', await S.locator('details[open]').count() > 0);
    await S.screenshot({ path: SHOTS + '/03-theory.png', fullPage: true });
    const toPractice = S.locator('a:has-text("Sang bước 2")');
    check('Nút "Sang bước 2" trỏ tới luyện 10 câu', /from=thu/.test(await toPractice.getAttribute('href')), await toPractice.getAttribute('href'));

    // ------------------------------------------------ 3. Luyện tập
    console.log('\n[3] Bước 2 — luyện 10 câu');
    await toPractice.click();
    await wait(S, 600);
    const head = await text(S);
    check('Phiên luyện có 10 câu', /Câu 1\/10/.test(head), head.slice(0, 300));
    check('Không có câu khởi động chủ đề khác', !/Khởi động/.test(head));
    check('Câu hỏi hiển thị KaTeX không lỗi', (await S.locator('.qbox .katex').count()) > 0 && (await katexErrors(S)) === 0);
    await S.screenshot({ path: SHOTS + '/04-practice.png', fullPage: true });
    let firstReveal = null;
    for (let i = 0; i < 10; i++) {
      const choices = S.locator('.choices .choice');
      await choices.nth(i % 4).click();
      await S.click('#prac-submit');
      await wait(S, 120);
      if (i === 0) {
        firstReveal = await text(S);
        await S.screenshot({ path: SHOTS + '/05-practice-reveal.png', fullPage: true });
      }
      await S.locator('button:has-text("Câu tiếp theo"), button:has-text("Kết thúc phiên")').first().click();
      await wait(S, 120);
    }
    check('Sau khi trả lời có lời giải', /lời giải/i.test(firstReveal || ''), (firstReveal || '').slice(0, 300));
    check('Sau khi trả lời có nút hỏi Gia sư AI', /Hỏi gia sư AI/i.test(firstReveal || ''));
    const sum = await text(S);
    check('Hiện trang kết quả', /Hoàn thành phiên luyện tập/.test(sum), sum.slice(0, 200));
    const lv = (sum.match(/mức ([NHVT])/g) || []).map((m) => m.slice(-1));
    const rank = { N: 0, H: 1, V: 2, T: 3 };
    check('10 câu, mức độ tăng dần N→H→V→T', lv.length === 10 && lv.every((l, i) => i === 0 || rank[l] >= rank[lv[i - 1]]), lv.join(''));
    check('Đủ 4 mức theo tỉ lệ 3-3-2-2', lv.join('') === 'NNNHHHVVTT', lv.join(''));
    check('Nút sang bước 3', (await S.locator('a:has-text("Sang bước 3")').count()) === 1);
    await S.screenshot({ path: SHOTS + '/06-summary.png', fullPage: true });
    // Luyện thêm → bộ câu khác
    const firstSet = await S.evaluate(() => AM.store.loadLearnerState().usedQuestionIds.slice());
    await S.locator('button:has-text("Luyện thêm")').click();
    await wait(S, 400);
    check('"Luyện thêm" mở phiên mới', /Câu 1\/10/.test(await text(S)));
    await go(S, '#/thu');
    const hub2 = await text(S);
    check('Trang dùng thử ghi nhận bước 1, 2 xong', (await S.locator('.trial-step.is-done').count()) >= 2 && /Mức thành thạo/.test(hub2), hub2.slice(0, 500));
    check('Bước 3 thành bước tiếp theo', await S.locator('.trial-step').nth(2).evaluate((n) => n.classList.contains('is-next')));
    check('Đã ghi câu đã làm', firstSet.length >= 10, firstSet.length);

    // ------------------------------------------------ 4. Bài tập trong sách
    console.log('\n[4] Bước 3 — bài tập trong sách');
    await S.locator('.trial-step').nth(2).locator('a.btn').click();
    await wait(S, 700);
    const exTxt = await text(S);
    check('Mở trang bài tập chỉ của chủ đề', /Bài tập: Hằng đẳng thức đáng nhớ/.test(exTxt) && (await S.locator('#ex-browse').count()) === 0, exTxt.slice(0, 200));
    const cards = await S.locator('[data-ex]').count();
    check('Có bài tập hiển thị', cards > 0, cards);
    const doneBtn = S.locator('[data-ex] button:has-text("Làm được")').first();
    if (await doneBtn.count()) {
      await doneBtn.click();
      await wait(S, 300);
      check('Bấm "Làm được" cập nhật đếm', /Đã làm được 1\//.test(await text(S, '#ex-stats')), await text(S, '#ex-stats'));
    } else {
      const mcq = S.locator('[data-ex] .choice, [data-ex] button.ex-opt').first();
      check('Có cách tự đánh giá bài', (await mcq.count()) > 0);
    }
    await S.screenshot({ path: SHOTS + '/07-exercises.png' });

    // ------------------------------------------------ 5. Gia sư AI
    console.log('\n[5] Bước 4 — Gia sư AI');
    await go(S, '#/tutor?topic=8-C2-B1');
    await wait(S, 300);
    check('Gia sư chọn sẵn chủ đề HĐT', (await S.locator('.tutor-topic select').last().inputValue()) === '8-C2-B1');
    check('Địa chỉ được dọn về #/tutor', (await hash(S)) === '#/tutor', await hash(S));
    const chips = S.locator('.tutor-suggest-chip');
    check('Có gợi ý câu hỏi', (await chips.count()) === 4);
    await S.screenshot({ path: SHOTS + '/08-tutor.png' });
    await chips.first().click();
    await S.waitForFunction(() => document.querySelectorAll('.tutor-msg, .tutor-msgs > *').length >= 2, null, { timeout: 15000 }).catch(() => {});
    await wait(S, 2500);
    const tutTxt = await text(S, '.tutor-msgs');
    check('Gia sư trả lời câu gợi ý', tutTxt.length > 60 && !/lỗi|Lỗi/.test(tutTxt.slice(-200)), tutTxt.slice(0, 300));
    const lastReq = gem.requests ? gem.requests[gem.requests.length - 1] : null;
    if (lastReq) check('Câu hỏi gửi kèm chủ đề HĐT', /Hằng đẳng thức/.test(JSON.stringify(lastReq)), JSON.stringify(lastReq).slice(0, 300));
    await S.screenshot({ path: SHOTS + '/09-tutor-answer.png' });
    // Đổi chủ đề vẫn giữ lựa chọn của học sinh
    await S.locator('.tutor-topic select').last().selectOption('');
    await wait(S, 300);
    check('Đổi chủ đề không bị ghi đè', (await S.locator('.tutor-topic select').last().inputValue()) === '');

    // ------------------------------------------------ 6. Trang chính
    console.log('\n[6] Trang chính có thẻ dùng thử ở đầu');
    await go(S, '#/');
    const firstCard = await S.locator('.main .trial-banner, .main .next-step').first().evaluate((n) => n.className);
    check('Thẻ "Bài học dùng thử" đứng trước thẻ việc tiếp theo', /trial-banner/.test(firstCard), firstCard);
    check('Nút trên thẻ là "Học tiếp"', /Học tiếp/.test(await text(S, '.trial-banner')));
    await S.screenshot({ path: SHOTS + '/10-home.png' });

    // ------------------------------------------------ 7. Học sinh lớp 6 đã có hồ sơ
    console.log('\n[7] Học sinh lớp 6 (đã có hồ sơ) mở bài dùng thử lớp 8');
    await S.evaluate(() => {
      AM.store.saveProfile({ grade: 6, goal: 'cuoi-ky', dailyMinutes: 30, deadline: null, selfLevel: 'tb', weakTopicIds: [], sessionLength: 'auto' });
    });
    await go(S, '#/practice?topic=8-C2-B1&levels=N,H,V,T&count=10&from=thu');
    check('Lớp 6 vẫn luyện được bài lớp 8', /Câu 1\/10/.test(await text(S)), (await text(S)).slice(0, 200));
    await go(S, '#/exercises?topic=8-C2-B1&from=thu');
    check('Lớp 6 vẫn mở được bài tập HĐT', (await S.locator('[data-ex]').count()) > 0);
    await go(S, '#/exercises');
    check('Trang Bài tập thường vẫn theo lớp 6', /lớp 6/i.test(await text(S, '.page-title')), await text(S, '.page-title'));
    await go(S, '#/tutor?topic=8-C2-B1');
    check('Gia sư: hiện chọn lớp 8 cho học sinh lớp 6', (await S.locator('.tutor-topic select').count()) === 2 && (await S.locator('.tutor-topic select').first().inputValue()) === '8');
    await go(S, '#/learning-path');
    await go(S, '#/theory?topic=8-C2-B1');
    check('Lý thuyết mở thường (không dùng thử) vẫn có nút lộ trình', /Về lộ trình/.test(await text(S)));

    // ------------------------------------------------ 8. Điện thoại
    console.log('\n[8] Giao diện điện thoại');
    const M = await newPage(browser, db, 'ĐT', errors, { width: 390, height: 844 });
    await M.goto(BASE + '#/login');
    await M.waitForSelector('input[type=email]');
    await M.fill('input[type=email]', 'minh@test.vn');
    await M.fill('input[type=password]', 'matkhau123');
    await M.click('button.btn-primary.btn-block');
    await wait(M, 1800);
    await go(M, '#/thu');
    const overflow = await M.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('Trang dùng thử không tràn ngang trên điện thoại', overflow <= 1, overflow);
    await M.screenshot({ path: SHOTS + '/11-mobile-hub.png', fullPage: true });
    await go(M, '#/theory?topic=8-C2-B1&from=thu');
    const overflow2 = await M.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check('Lý thuyết không tràn ngang trên điện thoại', overflow2 <= 1, overflow2);
    await M.screenshot({ path: SHOTS + '/12-mobile-theory.png', fullPage: true });
    await go(M, '#/');
    await M.screenshot({ path: SHOTS + '/13-mobile-home.png' });

    // ------------------------------------------------ 9. Giáo viên
    console.log('\n[9] Giáo viên không bị lạc vào trang học sinh');
    const T = await newPage(browser, db, 'GV', errors);
    await T.goto(BASE + '#/login?mode=signup&next=thu');
    await signupFromForm(T, 'Cô Hoa', 'hoa@test.vn', 'teacher');
    const tTxt = await text(T);
    check('Giáo viên đăng ký qua nút học thử → về trang lớp', /Lớp của tôi|Tạo lớp/.test(tTxt), (await hash(T)) + ' ' + tTxt.slice(0, 150));
    await go(T, '#/thu');
    check('Giáo viên mở #/thu → trang lớp', /Lớp của tôi|Tạo lớp/.test(await text(T)));
  } catch (err) {
    check('Kịch bản chạy hết không ngoại lệ', false, err.stack);
  } finally {
    const bad = errors.filter((e) => !/favicon|net::ERR|Failed to load resource/.test(e));
    check('Không có lỗi JS trên trang', bad.length === 0, bad.slice(0, 6).join('\n'));
    await browser.close();
    await close();
    const ok = results.filter((r) => r.ok).length;
    console.log('\n' + ok + '/' + results.length + ' đạt');
    process.exit(ok === results.length ? 0 : 1);
  }
})();
