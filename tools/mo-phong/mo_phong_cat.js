/*
 * Mô phỏng bài kiểm tra đầu vào theo từng chương, dùng đúng mã trong js/core
 * (bộ chọn câu hỏi bậc thang N → H → V → T trong cat.js và ước lượng θ trong irt.js).
 * Quy tắc dừng lấy theo js/views/diagnostic.js: mỗi chương tối đa
 * min(50, max(8, 6 × số chủ đề)) câu, dừng sớm khi mọi chủ đề đã xét xong.
 *
 * Chạy: node tools/mo_phong_cat.js [lớp] [số HS ảo mỗi mức] [seed]
 * Học sinh ảo có năng lực thật θ cho trước; xác suất trả lời đúng tính theo
 * 3PL với tham số a, b, c đang lưu trong ngân hàng câu hỏi.
 * Đây là mô phỏng máy tính, KHÔNG phải kết quả của học sinh thật.
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
global.window = { AM: {} };
for (const f of ['js/core/util.js', 'js/core/constants.js', 'js/core/topics.js',
                 'js/core/irt.js', 'js/core/cat.js', 'data/questions.js']) {
  (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8'));
}
const AM = window.AM;
const PER_TOPIC_ITEMS = 6;
const grade = Number(process.argv[2] || 9);
const N = Number(process.argv[3] || 200);
const seed = Number(process.argv[4] || 20261026);
const rng = AM.util.mulberry32(seed);

const pool = window.AM_QUESTION_BANK.questions.filter((q) => q.grade === grade);
const irtById = new Map(pool.map((q) => [q.id, q.irt]));
const chapters = new Map();
for (const t of AM.topics.getTopicsByGrade(grade)) {
  if (!chapters.has(t.chapter)) chapters.set(t.chapter, { topics: [], ids: new Set() });
  chapters.get(t.chapter).topics.push(t);
  chapters.get(t.chapter).ids.add(t.id);
}
const CH = [...chapters.values()].map((c) => Object.assign(c, {
  pool: pool.filter((q) => c.ids.has(q.topicId)),
  maxItems: Math.min(50, Math.max(8, PER_TOPIC_ITEMS * c.topics.length)),
})).filter((c) => c.pool.length > 0);

function runChapter(ch, trueTheta, sessionId, all) {
  const state = { sessionId, sessionStartedAt: Date.now(), responses: [], shownIds: [],
    topicStates: AM.cat.initTopicStates(ch.pool, ch.topics, grade) };
  while (state.responses.length < ch.maxItems) {
    const active = Object.values(state.topicStates).some((s) => s.level !== 'done');
    if (!active) break;
    const q = AM.cat.selectNextQuestion(ch.pool, state);
    if (!q) break;
    const correct = rng() < AM.irt.probabilityCorrect(trueTheta, q.irt);
    const r = { questionId: q.id, answered: true, score: correct ? 1 : 0 };
    state.responses.push(r); all.push(r);
    state.shownIds.push(q.id);
    state.topicStates[q.topicId] = AM.cat.transitionTopicState(
      state.topicStates[q.topicId], q, correct, ch.pool, new Set(state.shownIds));
  }
  return state.responses.length;
}

const thetas = [-2, -1, 0, 1, 2];
const rows = [];
for (const t of thetas) {
  for (let s = 0; s < N; s++) {
    const all = [];
    const perChapter = [];
    let afterFirst = null;
    CH.forEach((ch, i) => {
      perChapter.push(runChapter(ch, t, `sim-${grade}-${t}-${s}-${i}`, all));
      if (i === 0) afterFirst = AM.irt.estimateThetaFromSession(all, (id) => irtById.get(id)).theta;
    });
    const est = AM.irt.estimateThetaFromSession(all, (id) => irtById.get(id));
    rows.push({ t, total: all.length, perChapter, theta: est.theta, se: est.standardError, afterFirst });
  }
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const rmse = (r, k) => Math.sqrt(mean(r.map((x) => (x[k] - x.t) ** 2)));
console.log(`Lớp ${grade}: ${pool.length} câu, ${CH.length} chương, ${N} HS ảo mỗi mức, seed ${seed}`);
console.log('θ thật | tổng số câu TB | câu/chương TB | θ ước lượng TB | RMSE cả khối | SE TB | RMSE sau chương 1');
const summary = thetas.map((t) => {
  const r = rows.filter((x) => x.t === t);
  const o = { trueTheta: t, meanTotalItems: mean(r.map((x) => x.total)),
    meanItemsPerChapter: mean(r.map((x) => mean(x.perChapter))),
    meanTheta: mean(r.map((x) => x.theta)), rmse: rmse(r, 'theta'), meanSE: mean(r.map((x) => x.se)),
    rmseAfterFirstChapter: rmse(r, 'afterFirst') };
  console.log([t, o.meanTotalItems.toFixed(1), o.meanItemsPerChapter.toFixed(1), o.meanTheta.toFixed(2),
    o.rmse.toFixed(2), o.meanSE.toFixed(2), o.rmseAfterFirstChapter.toFixed(2)].join(' | '));
  return o;
});
fs.writeFileSync(path.join(__dirname, `ket_qua_mo_phong_cat_lop${grade}.json`),
  JSON.stringify({ grade, N, seed, chapters: CH.length, questions: pool.length, runAt: new Date().toISOString(), summary }, null, 2));
