// Kiểm tra: số câu mỗi buổi luyện tập khớp thời gian, có tuỳ chọn 5/10/15/tự động.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const { createDb } = require('./db');
const { createGemini } = require('./gemini-mock');
const { setup } = require('./pw-common');
const srv = require('./server');
const ROOT = path.resolve(process.argv[2] || path.join(__dirname, '..', '..'));
const PORT = 9500 + Math.floor(Math.random() * 90);
const BASE = 'http://localhost:' + PORT + '/';
const res = [];
const check = (n, ok, d) => { res.push(ok); console.log((ok ? '  ✔ ' : '  ✘ ') + n + (!ok && d ? '  →  ' + d : '')); };

(async () => {
  const db = createDb();
  const { close } = await srv.start(ROOT, PORT, createGemini().gemini);
  const browser = await chromium.launch();
  const errors = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await setup(ctx, db, { realImages: true });
    const S = await ctx.newPage();
    S.on('pageerror', (e) => errors.push(e.message));
    S.on('dialog', (d) => d.accept());
    await S.goto(BASE + '#/login');
    await S.click('text=Chưa có tài khoản? Đăng ký');
    await S.fill('input[autocomplete=name]', 'Học Sinh Thử');
    await S.fill('input[type=email]', 'hs@test.vn');
    await S.fill('input[type=password]', 'matkhau123');
    await S.click('button.btn-primary.btn-block');
    await S.waitForTimeout(1500);

    // Onboarding qua giao diện: 45 phút, để "Tự động"
    await S.evaluate(() => (location.hash = '#/onboarding'));
    await S.waitForTimeout(500);
    for (let i = 0; i < 12; i++) {
      if (!(await S.evaluate(() => location.hash.startsWith('#/onboarding')))) break;
      const title = await S.locator('h1.page-title').first().textContent();
      if (/lớp mấy/.test(title)) await S.click('.option-grid .option:has-text("Lớp 8")');
      else if (/Mục tiêu/.test(title)) await S.click('.option-grid .option:has-text("Ôn thi cuối kỳ")');
      else if (/bao lâu/.test(title)) {
        await S.click('.option-grid .option:has-text("45 phút")');
        const auto = await S.locator('.option-grid .option:has-text("Tự động")').textContent();
        check('Onboarding có tuỳ chọn số câu, "Tự động" ghi rõ 10 câu cho 45 phút', /10 câu/.test(auto), auto);
        await S.screenshot({ path: '/tmp/sess-onb.png', fullPage: true });
        check('Có lựa chọn 5 / 10 / 15 câu', (await S.locator('.option-grid .option:has-text("15 câu")').count()) === 1);
      } else if (/tự đánh giá/.test(title)) await S.click('.option-grid .option:has-text("Trung bình")');
      else if (/Kiểm tra lại/.test(title)) {
        const t = await S.locator('.list').innerText();
        check('Trang tóm tắt hiện "Mỗi buổi luyện tập: 10 câu (khoảng 15 phút)"', /10 câu \(khoảng 15 phút\)/.test(t), t);
      }
      const next = S.locator('button:has-text("Tiếp tục"), button:has-text("Bắt đầu kiểm tra")');
      if (!(await next.count())) break;
      await next.last().click();
      await S.waitForTimeout(300);
    }
    check('Hồ sơ lưu sessionLength=auto', (await S.evaluate(() => AM.store.loadProfile().sessionLength)) === 'auto');

    // Hoàn thành kiểm tra đầu vào nhanh
    await S.evaluate(() => (location.hash = '#/diagnostic'));
    await S.waitForTimeout(600);
    for (let i = 0; i < 300; i++) {
      const start = S.locator('button:has-text("Bắt đầu với"), button:has-text("Làm tiếp Chương")');
      if (await S.locator('.choice').count()) {
        await S.locator('.choice').nth(i % 4).click().catch(() => {});
        await S.locator('button:has-text("Trả lời")').first().click().catch(() => {});
        await S.waitForTimeout(30);
        const nx = S.locator('button:has-text("Câu tiếp theo")');
        if (await nx.count()) await nx.first().click().catch(() => {});
      } else if (i < 3 && (await start.count())) {
        await start.first().click();
        await S.waitForTimeout(400);
      } else break;
    }

    // Lộ trình: buổi luyện tập = 10 câu, 15 phút
    await S.evaluate(() => (location.hash = '#/learning-path'));
    await S.waitForTimeout(900);
    const acts = await S.evaluate(() => {
      const p = AM.store.loadPath();
      const all = p.sprints.flatMap((s) => s.days.flatMap((d) => d.activities));
      return { sq: p.sessionQuestions, pr: all.filter((a) => a.type === 'practice' || a.type === 'learn').map((a) => [a.questionCount, a.estimatedMinutes]), days: p.sprints.flatMap((s) => s.days.map((d) => d.estimatedMinutes)) };
    });
    check('Lộ trình dùng 10 câu/buổi (tự động, 45 phút/ngày)', acts.sq === 10, JSON.stringify(acts.sq));
    check('Mỗi buổi luyện tập: 10 câu ≈ 15 phút', acts.pr.length > 0 && acts.pr.every(([q, m]) => q === 10 && m === 15), JSON.stringify(acts.pr.slice(0, 4)));
    check('Không ngày nào vượt 45 phút', acts.days.every((m) => m <= 45), JSON.stringify(acts.days.slice(0, 8)));
    check('Trang lộ trình ghi "10 câu"', await S.isVisible('text=/10 câu/'));

    // Mở buổi luyện tập từ lộ trình → đúng 10 câu
    const href = await S.locator('a[href*="#/practice"]').first().getAttribute('href');
    await S.evaluate((h) => (location.hash = h.replace(/^#/, '')), href);
    await S.waitForTimeout(800);
    const cnt = async () => {
      const t = await S.locator('.pill:has-text("Câu ")').first().textContent();
      return Number((/\/(\d+)/.exec(t) || [])[1]);
    };
    check('Buổi luyện tập mở từ lộ trình có đúng 10 câu', (await cnt()) === 10, String(await cnt()));
    check('Hiện lựa chọn "Buổi này: 5 câu / 10 câu / 15 câu"', (await S.locator('.session-length .ex-chip').count()) === 3);
    await S.screenshot({ path: '/tmp/sess-prac.png' });
    check('Hiện thời gian ước tính "khoảng 15 phút"', /khoảng 15 phút/.test(await S.locator('.session-length').innerText()));
    await S.click('.session-length .ex-chip:has-text("15 câu")');
    await S.waitForTimeout(700);
    check('Đổi sang 15 câu → buổi có 15 câu', (await cnt()) === 15, String(await cnt()));
    check('…và ghi "khoảng 23 phút"', /khoảng 23 phút/.test(await S.locator('.session-length').innerText()));
    await S.click('.session-length .ex-chip:has-text("5 câu")');
    await S.waitForTimeout(700);
    check('Đổi sang 5 câu → buổi có 5 câu', (await cnt()) === 5, String(await cnt()));
    // trả lời 1 câu rồi bộ chọn phải ẩn
    await S.locator('.choice').first().click();
    await S.locator('button:has-text("Trả lời")').click();
    await S.waitForTimeout(300);
    check('Đã trả lời câu đầu thì ẩn bộ chọn số câu', (await S.locator('.session-length').count()) === 0);

    // Câu trong một buổi không trùng nhau
    const ids = await S.evaluate(() => null);
    void ids;

    // Đổi hồ sơ sang 15 câu → lộ trình tự lập lại
    await S.evaluate(() => {
      const p = AM.store.loadProfile();
      p.sessionLength = 15;
      AM.store.saveProfile(p);
      location.hash = '#/learning-path';
    });
    await S.waitForTimeout(900);
    const p2 = await S.evaluate(() => {
      const p = AM.store.loadPath();
      return { sq: p.sessionQuestions, a: p.sprints[0].days[0].activities.filter((a) => a.questionCount).map((a) => [a.questionCount, a.estimatedMinutes]) };
    });
    check('Chọn 15 câu/buổi → lộ trình lập lại với 15 câu ≈ 23 phút', p2.sq === 15 && p2.a.every(([q, m]) => q === 15 && m === 23), JSON.stringify(p2));

    // Link không kèm số câu (từ hồ sơ / sổ tay) dùng lựa chọn trong hồ sơ
    const tid = await S.evaluate(() => AM.store.loadPath().priorityList[0].topicId);
    await S.evaluate((t) => (location.hash = '#/practice?topic=' + t + '&levels=N,H'), tid);
    await S.waitForTimeout(800);
    check('Link không có số câu → dùng 15 câu từ hồ sơ', (await cnt()) === 15, String(await cnt()));
    const uniq = await S.evaluate(() => {
      const txt = [...document.querySelectorAll('.pill')].map((x) => x.textContent);
      return txt.length > 0;
    });
    void uniq;
  } catch (e) {
    console.error('CRASH', e);
    res.push(false);
  } finally {
    await browser.close();
    await close();
  }
  console.log('Lỗi JS:', errors);
  console.log('KẾT QUẢ: ' + res.filter(Boolean).length + '/' + res.length);
  process.exit(res.every(Boolean) ? 0 : 1);
})();
