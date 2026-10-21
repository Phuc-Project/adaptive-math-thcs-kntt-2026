/**
 * Ngân hàng bài tập tự luyện (data/exercises.js) + bộ gợi ý cá nhân hóa.
 *
 * Bài tập được tách tự động từ 8 tài liệu PDF lớp 6–9 (tools/import-exercises),
 * mỗi bài là một ảnh cắt đúng vùng đề trong tài liệu gốc — giữ nguyên công thức
 * và hình vẽ — kèm siêu dữ liệu: khối, chủ đề (topicId), bài học, dạng, loại
 * (trắc nghiệm / tự luận / bài tập mẫu / ôn tập chương / đề kiểm tra), mức gợi ý
 * N/H/V/T, và với tài liệu có đáp án: đáp án trắc nghiệm + ảnh hướng dẫn giải.
 *
 * Đề kiểm tra (tools/import-exercises/split_exams.py) được tách thành từng câu:
 * mỗi câu là bài trắc nghiệm / tự luận bình thường (có chủ đề) kèm `ex` = mã đề
 * trong RAW.exams, `p` = phần ('tn' | 'tl'), `pt` = điểm, `key` = đáp án dạng chữ.
 *
 * Phần gợi ý là hàm thuần (không đụng DOM, không I/O):
 *   mastery(topic) = BKT pL nếu đã luyện, nếu không thì mastery từ hồ sơ năng lực
 *   priority       = (target − mastery) + 0.15·[tự đánh dấu yếu] + 0.1·[còn bài "chưa làm được"]
 *   mức bài tập    = theo dải mastery: <0.3 → N,H · <0.55 → H,V · <0.8 → V,T · còn lại → T
 */
(function (AM) {
  'use strict';

  const U = AM.util;

  const RAW =
    window.AM_EXERCISE_BANK && Array.isArray(window.AM_EXERCISE_BANK.items)
      ? window.AM_EXERCISE_BANK
      : { imgBase: 'data/exercises/img/', sources: [], lessons: [], items: [] };
  if (!Array.isArray(RAW.exams)) RAW.exams = [];

  if (RAW.items.length === 0) {
    console.warn('[exercises] Không nạp được data/exercises.js — trang Bài tập sẽ trống.');
  }

  const KIND_LABELS = {
    tn: 'Trắc nghiệm',
    tl: 'Tự luận',
    mau: 'Bài tập mẫu',
    review: 'Ôn tập chương',
    exam: 'Đề kiểm tra',
  };

  const STATUS_LABELS = {
    done: 'Đã làm được',
    stuck: 'Chưa làm được',
  };

  const EXAM_TYPE_LABELS = {
    GK1: 'Đề kiểm tra giữa học kì I',
    CK1: 'Đề kiểm tra cuối học kì I',
    GK2: 'Đề kiểm tra giữa học kì II',
    CK2: 'Đề kiểm tra cuối học kì II',
  };

  const LESSON_BY_ID = new Map(RAW.lessons.map((l) => [l.id, l]));
  const EXAM_BY_ID = new Map(RAW.exams.map((e) => [e.id, e]));
  const BY_ID = new Map(RAW.items.map((x) => [x.id, x]));

  // Index once: grade → topicId → items (giữ thứ tự xuất hiện trong tài liệu).
  const BY_GRADE = new Map();
  const BY_TOPIC = new Map();
  for (const item of RAW.items) {
    if (!BY_GRADE.has(item.g)) BY_GRADE.set(item.g, []);
    BY_GRADE.get(item.g).push(item);
    if (item.t) {
      if (!BY_TOPIC.has(item.t)) BY_TOPIC.set(item.t, []);
      BY_TOPIC.get(item.t).push(item);
    }
  }

  function imgUrl(file) {
    return RAW.imgBase + file;
  }

  function forGrade(grade) {
    return BY_GRADE.get(grade) || [];
  }

  function forTopic(topicId) {
    return BY_TOPIC.get(topicId) || [];
  }

  function countForTopic(topicId) {
    return forTopic(topicId).length;
  }

  function getById(id) {
    return BY_ID.get(id) || null;
  }

  function lesson(id) {
    return LESSON_BY_ID.get(id) || null;
  }

  function sourceName(item) {
    const l = item.l ? LESSON_BY_ID.get(item.l) : null;
    const idx = l ? l.src : null;
    return idx !== null && idx !== undefined ? RAW.sources[idx] || '' : '';
  }

  /** Ôn tập chương + đề kiểm tra nguyên khối (chưa tách câu): không gắn chủ đề cụ thể. */
  function extrasForGrade(grade) {
    return forGrade(grade).filter((x) => (x.k === 'exam' || x.k === 'review') && !x.ex);
  }

  function exam(id) {
    return EXAM_BY_ID.get(id) || null;
  }

  /** Đề đã tách câu của một khối: [{ exam, items }] theo thứ tự trong tài liệu. */
  function examsForGrade(grade) {
    const groups = new Map();
    for (const e of RAW.exams) if (e.g === grade) groups.set(e.id, { exam: e, items: [] });
    for (const x of forGrade(grade)) if (x.ex && groups.has(x.ex)) groups.get(x.ex).items.push(x);
    return Array.from(groups.values()).filter((g) => g.items.length > 0);
  }

  /** "Đề kiểm tra giữa học kì I · Đề 2" */
  function examTitle(e) {
    return (EXAM_TYPE_LABELS[e.type] || e.title) + ' · Đề ' + e.no;
  }

  // -------------------------------------------------------------------------
  // Tiến độ của học sinh (lưu trong LearnerState.exercises)
  // -------------------------------------------------------------------------

  function statusOf(learner, id) {
    const rec = learner && learner.exercises ? learner.exercises[id] : null;
    return rec ? rec.s : null;
  }

  function topicProgress(learner, topicId) {
    const items = forTopic(topicId);
    let done = 0;
    let stuck = 0;
    for (const x of items) {
      const s = statusOf(learner, x.id);
      if (s === 'done') done++;
      else if (s === 'stuck') stuck++;
    }
    return { total: items.length, done: done, stuck: stuck };
  }

  function levelsForMastery(m) {
    if (m < 0.3) return ['N', 'H'];
    if (m < 0.55) return ['H', 'V'];
    if (m < 0.8) return ['V', 'T'];
    return ['T', 'V'];
  }

  /** Mastery hiện tại của một chủ đề: BKT (đã luyện) → hồ sơ (CAT) → trung tính. */
  function topicMastery(topicId, ctx) {
    const bkt = ctx.learner && ctx.learner.bkt ? ctx.learner.bkt[topicId] : null;
    if (bkt && bkt.totalAttempts > 0) return { value: bkt.pL, source: 'bkt' };
    if (ctx.knowledge) {
      const t = ctx.knowledge.topics.find((x) => x.topicId === topicId);
      if (t) return { value: t.mastery, source: t.tested ? 'cat' : 'theta' };
    }
    return { value: 0.4, source: 'default' };
  }

  /**
   * Gợi ý bài tập cho hôm nay.
   *
   * Trả về [{ topic, mastery, source, levels, reason, items[] }]. Kết quả ổn
   * định trong ngày (RNG seed = ngày + uid hồ sơ) nên tải lại trang không làm
   * danh sách nhảy lung tung, nhưng hôm sau sẽ có bài mới.
   */
  function recommend(ctx, opts) {
    const options = Object.assign({ topics: 3, perTopic: 3 }, opts || {});
    const grade = ctx.profile.grade;
    const target = AM.const.TARGET_BY_GOAL[ctx.profile.goal] || 0.75;
    const weak = new Set(ctx.profile.weakTopicIds || []);
    const learner = ctx.learner;
    const rng = U.mulberry32(U.hashStringToU32(U.todayVNStr() + ':' + grade + ':' + (options.salt || '')));

    const rows = [];
    for (const topic of AM.topics.getTopicsByGrade(grade)) {
      const items = forTopic(topic.id);
      if (items.length === 0) continue;
      const open = items.filter((x) => statusOf(learner, x.id) !== 'done');
      if (open.length === 0) continue;
      const m = topicMastery(topic.id, ctx);
      const prog = topicProgress(learner, topic.id);
      const gap = Math.max(0, target - m.value);
      const priority = gap + (weak.has(topic.id) ? 0.15 : 0) + (prog.stuck > 0 ? 0.1 : 0) + rng() * 0.02;
      rows.push({ topic: topic, mastery: m.value, source: m.source, open: open, priority: priority, gap: gap });
    }
    rows.sort((a, b) => b.priority - a.priority);

    return rows.slice(0, options.topics).map(function (row) {
      const levels = levelsForMastery(row.mastery);
      // Ưu tiên: bài "chưa làm được" (làm lại) → đúng mức → còn lại.
      const stuck = row.open.filter((x) => statusOf(learner, x.id) === 'stuck');
      const atLevel = U.shuffled(
        row.open.filter((x) => levels.indexOf(x.lv) !== -1 && statusOf(learner, x.id) !== 'stuck'),
        rng,
      );
      // Giữ thứ tự mức: mức đầu tiên trong `levels` lên trước.
      atLevel.sort((a, b) => levels.indexOf(a.lv) - levels.indexOf(b.lv));
      const rest = U.shuffled(
        row.open.filter((x) => levels.indexOf(x.lv) === -1 && statusOf(learner, x.id) !== 'stuck'),
        rng,
      );
      const picked = stuck.slice(0, 1).concat(atLevel, rest).slice(0, options.perTopic);

      let reason;
      if (row.source === 'default') {
        reason = 'Chưa có dữ liệu kiểm tra cho chủ đề này — bắt đầu ở mức Thông hiểu.';
      } else {
        reason =
          'Mức hiện tại ' + U.pct(row.mastery) + ' (mục tiêu ' + U.pct(target) + ') → ' +
          'chọn bài mức ' + levels.map((l) => AM.const.LEVEL_LABELS[l]).join(' / ') + '.';
      }
      return {
        topic: row.topic,
        mastery: row.mastery,
        source: row.source,
        levels: levels,
        reason: reason,
        items: picked,
      };
    });
  }

  AM.exercises = {
    BANK: RAW,
    isLoaded: RAW.items.length > 0,
    KIND_LABELS: KIND_LABELS,
    STATUS_LABELS: STATUS_LABELS,
    EXAM_TYPE_LABELS: EXAM_TYPE_LABELS,
    imgUrl: imgUrl,
    forGrade: forGrade,
    forTopic: forTopic,
    countForTopic: countForTopic,
    extrasForGrade: extrasForGrade,
    exam: exam,
    examsForGrade: examsForGrade,
    examTitle: examTitle,
    getById: getById,
    lesson: lesson,
    sourceName: sourceName,
    statusOf: statusOf,
    topicProgress: topicProgress,
    topicMastery: topicMastery,
    levelsForMastery: levelsForMastery,
    recommend: recommend,
  };
})(window.AM);
