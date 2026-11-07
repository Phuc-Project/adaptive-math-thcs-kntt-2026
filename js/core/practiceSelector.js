/**
 * Practice question selector. Ported from src/lib/practiceSelector.ts.
 *
 * Picks questions for each phase of a practice session (warm-up, practice,
 * mini assessment). Questions used in earlier sessions are deprioritised
 * rather than hard-blocked — some topics have small pools and a hard block
 * would leave the student with nothing to do.
 */
(function (AM) {
  'use strict';

  const U = AM.util;

  /**
   * Take up to `n` from `pool`, preferring unseen questions and padding with
   * already-used ones only when the pool is too small.
   */
  function pickN(pool, n, usedSet, rng) {
    const fresh = pool.filter((q) => !usedSet.has(q.id));
    const used = pool.filter((q) => usedSet.has(q.id));
    return U.shuffled(fresh, rng).concat(U.shuffled(used, rng)).slice(0, n);
  }

  const LEVEL_ORDER = ['N', 'H', 'V', 'T'];

  /** Khoảng cách từ một mức tới mức gần nhất trong danh sách mục tiêu. */
  function levelDistance(level, targets) {
    const i = LEVEL_ORDER.indexOf(level === 'unknown' ? 'H' : level);
    let best = 9;
    for (const t of targets) {
      const j = LEVEL_ORDER.indexOf(t);
      if (i !== -1 && j !== -1) best = Math.min(best, Math.abs(i - j));
    }
    return best;
  }

  /**
   * Select questions for a full three-phase practice session.
   *
   * @param pool             Question bank for the student's grade.
   * @param topicId          Target topic.
   * @param levels           Levels to practise (from the Activity).
   * @param learner          Learner state, for used-question tracking.
   * @param masteredTopicIds Topics already BKT-mastered — source of warm-ups.
   * @param sessionSeed      Seed for this session's RNG.
   * @param counts           { warmup, practice, assessment } — số câu mỗi phần.
   *                         Mỗi mức chỉ có 4 câu/chủ đề, nên khi cần nhiều câu
   *                         hơn, phần luyện tập lấy thêm từ mức kề bên.
   */
  function selectPracticeQuestions(
    pool,
    topicId,
    levels,
    learner,
    masteredTopicIds,
    sessionSeed,
    counts,
  ) {
    const want = Object.assign({ warmup: 3, practice: 8, assessment: 5 }, counts || {});
    const rng = U.mulberry32(sessionSeed);
    const usedSet = new Set(learner.usedQuestionIds);

    // --- Warm-up: recognition items from mastered topics OF THE SAME CHAPTER ---
    // Học sinh chọn luyện một chương thì mọi câu trong buổi phải thuộc chương đó;
    // trước đây câu khởi động lấy từ bất kì chủ đề đã thành thạo nào nên buổi
    // "Tam giác" có thể mở đầu bằng câu chương khác. Không có chủ đề thành thạo
    // cùng chương → không có câu khởi động (practice.js bù vào phần luyện tập).
    const target = AM.topics ? AM.topics.getTopicById(topicId) : null;
    const sameChapter = function (id) {
      const t = AM.topics ? AM.topics.getTopicById(id) : null;
      return !!(t && target && t.grade === target.grade && t.chapter === target.chapter);
    };
    const warmupPool = pool.filter(
      (q) =>
        masteredTopicIds.indexOf(q.topicId) !== -1 &&
        q.topicId !== topicId &&
        sameChapter(q.topicId) &&
        (q.level === 'N' || q.level === 'unknown'),
    );
    const warmup = pickN(warmupPool, want.warmup, usedSet, rng);

    // --- Practice: target levels first, then the nearest other levels ---
    const targetLevelSet = new Set(levels);
    if (targetLevelSet.has('H')) targetLevelSet.add('unknown');
    const topicPool = pool.filter((q) => q.topicId === topicId);
    const primary = topicPool.filter((q) => targetLevelSet.has(q.level));
    let practice = pickN(primary, want.practice, usedSet, rng);
    if (practice.length < want.practice) {
      const taken = new Set(practice.map((q) => q.id));
      const rest = topicPool.filter((q) => !taken.has(q.id));
      // Gần mức mục tiêu trước; cùng khoảng cách thì câu chưa làm trước.
      const groups = {};
      for (const q of rest) {
        const d = levelDistance(q.level, levels);
        (groups[d] = groups[d] || []).push(q);
      }
      Object.keys(groups)
        .map(Number)
        .sort((x, y) => x - y)
        .forEach(function (d) {
          if (practice.length >= want.practice) return;
          practice = practice.concat(pickN(groups[d], want.practice - practice.length, usedSet, rng));
        });
    }

    // --- Assessment: mixed levels N, H, V, N, H… — none reused from practice --
    const practiceIds = new Set(practice.map((p) => p.id));
    const assessPool = topicPool.filter((q) => !practiceIds.has(q.id));
    const assessment = [];
    const byLevel = {
      N: U.shuffled(assessPool.filter((q) => q.level === 'N' || q.level === 'unknown'), rng),
      H: U.shuffled(assessPool.filter((q) => q.level === 'H'), rng),
      V: U.shuffled(assessPool.filter((q) => q.level === 'V'), rng),
      T: U.shuffled(assessPool.filter((q) => q.level === 'T'), rng),
    };
    const order = ['N', 'H', 'N', 'H', 'V', 'V', 'T'];
    for (let i = 0; assessment.length < want.assessment && i < order.length * 3; i++) {
      const lv = order[i % order.length];
      const list = byLevel[lv];
      if (!list.length) continue;
      // ưu tiên câu chưa làm
      const k = list.findIndex((q) => !usedSet.has(q.id));
      assessment.push(list.splice(k === -1 ? 0 : k, 1)[0]);
    }

    return { warmup: warmup, practice: practice, assessment: assessment };
  }

  /** Serialize a student's answer for the error journal. */
  function serializeAnswer(answer) {
    if (typeof answer === 'string') return answer;
    if (Array.isArray(answer)) {
      return answer.map((v) => (v === true ? 'Đ' : v === false ? 'S' : '—')).join(',');
    }
    return String(answer === null || answer === undefined ? '' : answer);
  }

  /** Serialize the correct answer for a question. */
  function serializeCorrectAnswer(question) {
    if (question.type === 'mcq') {
      const correct = question.options.find((o) => o.isCorrect);
      return correct ? correct.label : '?';
    }
    if (question.type === 'tf') {
      return question.statements.map((s) => (s.isTrue ? 'Đ' : 'S')).join(',');
    }
    if (question.type === 'shortans') return question.correctAnswer;
    return '?';
  }

  AM.practiceSelector = {
    selectPracticeQuestions: selectPracticeQuestions,
    serializeAnswer: serializeAnswer,
    serializeCorrectAnswer: serializeCorrectAnswer,
  };
})(window.AM);
