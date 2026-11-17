/**
 * Đề giáo viên tải lên cho lớp — kiểu Azota.
 *
 * Dữ liệu (Firestore, không dùng Cloud Storage — Storage bắt buộc gói trả phí):
 *
 *   classes/{CODE}/exams/{id}              title, type, grade, time, nTn, nTl, tnPoints,
 *                                          pages, hasKey, teacherId, teacherName, createdAt
 *   classes/{CODE}/exams/{id}/pages/{n}    { n, img: "data:image/webp;base64,…", w, h }  (≤ ~850 KB/trang)
 *   classes/{CODE}/exams/{id}/key/main     { ans: ['A','C',…] }   — đáp án trắc nghiệm
 *   classes/{CODE}/exams/{id}/subs/{uid}   bài nộp: uid, name, answers[], tl[], startedAt, submittedAt
 *
 * Quyền (firestore.rules): giáo viên chủ lớp đọc/ghi tất cả; học sinh trong lớp
 * đọc đề + trang đề, nộp bài MỘT lần (không sửa được), và chỉ đọc được đáp án
 * SAU KHI đã có bài nộp — nên không thể mở đáp án trước rồi mới làm.
 *
 * Tệp đề: PDF được dựng thành ảnh từng trang bằng pdf.js (nạp khi cần), ảnh
 * chụp (JPG/PNG) giữ nguyên thứ tự chọn. Với PDF có lớp chữ, các dòng tên
 * trường / phòng / sở GD được che trắng tự động; giáo viên che thêm phần đầu
 * trang 1 bằng thanh trượt nếu đề là ảnh chụp.
 */
(function (AM) {
  'use strict';

  const fb = AM.fb;
  const toDate = AM.util.toDate;

  const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/';
  const PAGE_W = 1100; // px — đủ nét cho chữ đề in A4, ảnh WebP ~100–250 KB
  const MAX_BYTES = 850 * 1024; // giới hạn một tài liệu Firestore là 1 MiB
  const MAX_PAGES = 12;

  function requireReady() {
    if (!fb.isReady()) throw new Error(fb.initError() || 'Firebase chưa sẵn sàng.');
  }

  function examsCol(code) {
    return fb.db().collection(fb.PATHS.classes).doc(code).collection('exams');
  }

  function examDoc(code, id) {
    return examsCol(code).doc(id);
  }

  function fromDoc(doc) {
    const d = doc.data() || {};
    return {
      id: doc.id,
      title: d.title || 'Đề kiểm tra',
      type: d.type || 'KT',
      grade: d.grade || null,
      time: d.time || 45,
      nTn: d.nTn || 0,
      nTl: d.nTl || 0,
      tnPoints: typeof d.tnPoints === 'number' ? d.tnPoints : null,
      pages: d.pages || 0,
      hasKey: !!d.hasKey,
      teacherName: d.teacherName || '',
      createdAt: toDate(d.createdAt),
    };
  }

  // ---------------------------------------------------------------------------
  // Đọc (giáo viên + học sinh trong lớp)
  // ---------------------------------------------------------------------------

  async function list(code) {
    requireReady();
    if (!code) return [];
    const snap = await examsCol(code).get();
    return snap.docs.map(fromDoc).sort(function (a, b) {
      return (b.createdAt ? b.createdAt.getTime() : 0) - (a.createdAt ? a.createdAt.getTime() : 0);
    });
  }

  async function get(code, id) {
    requireReady();
    const snap = await examDoc(code, id).get();
    return snap.exists ? fromDoc(snap) : null;
  }

  async function pages(code, id) {
    requireReady();
    const snap = await examDoc(code, id).collection('pages').get();
    return snap.docs
      .map((d) => d.data() || {})
      .sort((a, b) => a.n - b.n)
      .map((d) => ({ src: d.img, w: d.w, h: d.h }));
  }

  /** Đáp án — học sinh chỉ đọc được sau khi đã nộp bài (rules). */
  async function key(code, id) {
    requireReady();
    const snap = await examDoc(code, id).collection('key').doc('main').get();
    return snap.exists ? (snap.data() || {}).ans || [] : [];
  }

  // ---------------------------------------------------------------------------
  // Học sinh
  // ---------------------------------------------------------------------------

  async function mySubmission(code, id) {
    requireReady();
    const user = AM.auth.currentUser();
    if (!user) return null;
    const snap = await examDoc(code, id).collection('subs').doc(user.uid).get();
    if (!snap.exists) return null;
    const d = snap.data() || {};
    return { answers: d.answers || [], tl: d.tl || [], startedAt: d.startedAt || null, submittedAt: d.submittedAt || null };
  }

  async function submit(code, id, payload) {
    requireReady();
    const user = AM.auth.currentUser();
    if (!user) throw new Error('Bạn cần đăng nhập.');
    await examDoc(code, id)
      .collection('subs')
      .doc(user.uid)
      .set({
        uid: user.uid,
        name: AM.auth.displayName(),
        answers: payload.answers,
        tl: payload.tl,
        startedAt: payload.startedAt || null,
        submittedAt: payload.submittedAt || Date.now(),
        at: fb.serverTimestamp(),
      });
  }

  // ---------------------------------------------------------------------------
  // Giáo viên
  // ---------------------------------------------------------------------------

  /** Tạo đề: tài liệu đề → từng trang → đáp án. Trả về id đề. */
  async function create(code, meta, pageImgs, ans, onProgress) {
    requireReady();
    const user = AM.auth.currentUser();
    if (!user) throw new Error('Bạn cần đăng nhập.');
    if (!pageImgs.length) throw new Error('Chưa có trang đề nào.');
    const ref = examsCol(code).doc();
    const keyOk = ans.length > 0 && ans.every((x) => /^[A-D]$/.test(x));
    await ref.set({
      title: meta.title,
      type: meta.type,
      grade: meta.grade,
      time: meta.time,
      nTn: meta.nTn,
      nTl: meta.nTl,
      tnPoints: typeof meta.tnPoints === 'number' ? meta.tnPoints : null,
      pages: pageImgs.length,
      hasKey: keyOk,
      teacherId: user.uid,
      teacherName: AM.auth.displayName(),
      createdAt: fb.serverTimestamp(),
    });
    for (let i = 0; i < pageImgs.length; i++) {
      const p = pageImgs[i];
      await ref.collection('pages').doc(String(i + 1).padStart(2, '0')).set({ n: i + 1, img: p.src, w: p.w, h: p.h });
      if (onProgress) onProgress(i + 1, pageImgs.length);
    }
    if (keyOk) await ref.collection('key').doc('main').set({ ans: ans });
    return ref.id;
  }

  async function submissions(code, id) {
    requireReady();
    const snap = await examDoc(code, id).collection('subs').get();
    return snap.docs.map(function (doc) {
      const d = doc.data() || {};
      return {
        uid: doc.id,
        name: d.name || '(học sinh)',
        answers: d.answers || [],
        tl: d.tl || [],
        startedAt: d.startedAt || null,
        submittedAt: d.submittedAt || null,
      };
    });
  }

  /** Cho học sinh làm lại: xóa bài nộp. */
  async function resetSubmission(code, id, uid) {
    requireReady();
    await examDoc(code, id).collection('subs').doc(uid).delete();
  }

  /** Xóa đề: các tài liệu con trước (Firestore không xóa dây chuyền), rồi đến đề. */
  async function remove(code, id) {
    requireReady();
    const ref = examDoc(code, id);
    for (const sub of ['pages', 'subs', 'key']) {
      const snap = await ref.collection(sub).get();
      await Promise.all(snap.docs.map((d) => d.ref.delete()));
    }
    await ref.delete();
  }

  // ---------------------------------------------------------------------------
  // Chấm
  // ---------------------------------------------------------------------------

  /** answers/ans: mảng chữ cái; trả về { correct, keyed, score|null }. */
  function grade(exam, answers, ans) {
    let correct = 0;
    let keyed = 0;
    for (let i = 0; i < exam.nTn; i++) {
      if (!ans[i]) continue;
      keyed++;
      if (answers[i] === ans[i]) correct++;
    }
    const score =
      exam.tnPoints !== null && keyed ? Math.round((correct / exam.nTn) * exam.tnPoints * 100) / 100 : null;
    return { correct: correct, keyed: keyed, score: score };
  }

  /** "1A 2B 3_ 4D" → ['A','B','','D'] ("_" hoặc "?" = câu không có đáp án). */
  function parseKey(text) {
    return String(text || '')
      .toUpperCase()
      .replace(/\d+\s*[.:)-]?\s*/g, ' ')
      .split('')
      .filter((c) => /[A-D_?]/.test(c))
      .map((c) => (/[A-D]/.test(c) ? c : ''));
  }

  // ---------------------------------------------------------------------------
  // Tệp đề → ảnh trang
  // ---------------------------------------------------------------------------

  let pdfjsPromise = null;
  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfjsPromise) {
      pdfjsPromise = new Promise(function (resolve, reject) {
        const s = document.createElement('script');
        s.src = PDFJS + 'pdf.min.js';
        s.onload = function () {
          if (!window.pdfjsLib) return reject(new Error('Không nạp được trình đọc PDF.'));
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
          resolve(window.pdfjsLib);
        };
        s.onerror = function () {
          pdfjsPromise = null;
          reject(new Error('Không tải được trình đọc PDF (cần kết nối mạng).'));
        };
        document.head.appendChild(s);
      });
    }
    return pdfjsPromise;
  }

  // Dòng tiêu đề đơn vị — giống tools/import-de-thi/school.py.
  const HEAD = /^\s*(PHÒNG\s*(GD|GIÁO)|UBND|Ủ?Y\s*BAN|UỶ\s*BAN|SỞ\s*(GD|GIÁO)|TRƯỜNG\b|Trường\s+(THCS|TH\b|TH\s*[-–&]|PT|THPT|Tiểu|Trung))/;
  const RUNNING = /Trường\s+THCS\s+\S/;
  const KINDS = ['THCS', 'THPT', 'PTDTNT', 'TH-THCS', 'TH–THCS', 'TH&THCS'];

  let measure = null;
  function measureCtx() {
    if (!measure) {
      measure = document.createElement('canvas').getContext('2d');
      measure.font = '20px "Times New Roman", Times, serif';
    }
    return measure;
  }

  /** Hộp (toạ độ canvas) cần che trắng trên một trang PDF. */
  async function schoolBoxes(page, viewport, pdfjs) {
    const tc = await page.getTextContent();
    const items = tc.items
      .filter((it) => it.str && it.str.trim())
      .map(function (it) {
        const t = pdfjs.Util.transform(viewport.transform, it.transform);
        const h = Math.hypot(t[2], t[3]) || 10;
        return { s: it.str, x: t[4], y: t[5] - h, w: it.width * viewport.scale, h: h * 1.25 };
      });
    // gom thành dòng theo y
    const lines = [];
    for (const it of items.sort((a, b) => a.y - b.y || a.x - b.x)) {
      const ln = lines.find((l) => Math.abs(l.y - it.y) < it.h * 0.5);
      if (ln) ln.items.push(it);
      else lines.push({ y: it.y, items: [it] });
    }
    const out = [];
    for (const ln of lines) {
      ln.items.sort((a, b) => a.x - b.x);
      const text = ln.items.map((i) => i.s).join(' ').replace(/\s+/g, ' ');
      const box = (arr) => ({
        x: Math.min(...arr.map((i) => i.x)),
        y: Math.min(...arr.map((i) => i.y)),
        x1: Math.max(...arr.map((i) => i.x + i.w)),
        y1: Math.max(...arr.map((i) => i.y + i.h)),
      });
      if (!HEAD.test(text) && RUNNING.test(text) && /Đề|Năm học|NĂM HỌC|kì|kỳ/i.test(text)) {
        out.push(box(ln.items));
        continue;
      }
      if (HEAD.test(text)) {
        // dòng hai cột (trái: đơn vị — phải: tên kì thi): chỉ che cụm bên trái
        let cut = ln.items.length;
        for (let i = 1; i < ln.items.length; i++) {
          if (ln.items[i].x - (ln.items[i - 1].x + ln.items[i - 1].w) > 60) {
            cut = i;
            break;
          }
        }
        out.push(box(ln.items.slice(0, cut)));
        continue;
      }
      // "… trường THCS Vân Hán …" trong nội dung: chỉ che phần tên riêng (ước vị trí theo số kí tự)
      for (const it of ln.items) {
        for (const k of KINDS) {
          const m = new RegExp(k + '\\s+((?:[A-ZĐÂĂÊÔƠƯ][^\\s,.;:()]*\\.?\\s*){1,4})').exec(it.s);
          if (!m) continue;
          const name = m[1].replace(/\s+$/, '');
          const i0 = m.index + m[0].indexOf(m[1]);
          // vị trí theo độ rộng chữ đo bằng canvas (tỉ lệ), không theo số kí tự
          const g = measureCtx();
          const full = g.measureText(it.s).width || 1;
          const a = g.measureText(it.s.slice(0, i0)).width / full;
          const b = g.measureText(it.s.slice(0, i0 + name.length)).width / full;
          out.push({ x: it.x + it.w * a - 2, y: it.y, x1: it.x + it.w * b - 3, y1: it.y + it.h });
        }
      }
    }
    return out;
  }

  function canvasToImage(canvas) {
    let q = 0.78;
    let src = canvas.toDataURL('image/webp', q);
    const webp = src.indexOf('data:image/webp') === 0;
    if (!webp) src = canvas.toDataURL('image/jpeg', q);
    while (src.length > MAX_BYTES && q > 0.35) {
      q -= 0.12;
      src = canvas.toDataURL(webp ? 'image/webp' : 'image/jpeg', q);
    }
    if (src.length > MAX_BYTES) throw new Error('Một trang đề quá nặng sau khi nén. Hãy chia nhỏ hoặc chụp lại ảnh rõ hơn.');
    return { src: src, w: canvas.width, h: canvas.height };
  }

  function whiteBoxes(canvas, boxes) {
    const g = canvas.getContext('2d');
    g.fillStyle = '#fff';
    for (const b of boxes) g.fillRect(b.x - 3, b.y - 3, b.x1 - b.x + 6, b.y1 - b.y + 6);
  }

  /**
   * Đọc tệp (PDF hoặc ảnh) → [{ canvas, boxes }] (chưa nén; để xem trước, che
   * thêm rồi mới nén bằng `finalize`).
   */
  async function readFiles(files, onProgress) {
    const out = [];
    for (const f of files) {
      if (/pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)) {
        const pdfjs = await loadPdfJs();
        const doc = await pdfjs.getDocument({ data: await f.arrayBuffer() }).promise;
        for (let p = 1; p <= doc.numPages; p++) {
          if (out.length >= MAX_PAGES) break;
          const page = await doc.getPage(p);
          const base = page.getViewport({ scale: 1 });
          const viewport = page.getViewport({ scale: PAGE_W / base.width });
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const g = canvas.getContext('2d');
          g.fillStyle = '#fff';
          g.fillRect(0, 0, canvas.width, canvas.height);
          await page.render({ canvasContext: g, viewport: viewport }).promise;
          let boxes = [];
          try {
            boxes = await schoolBoxes(page, viewport, pdfjs);
          } catch (err) {
            boxes = [];
          }
          out.push({ canvas: canvas, boxes: boxes });
          if (onProgress) onProgress(out.length);
        }
      } else if (/^image\//.test(f.type)) {
        if (out.length >= MAX_PAGES) break;
        const bmp = await createImageBitmap(f);
        const scale = Math.min(1, PAGE_W / bmp.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(bmp.width * scale);
        canvas.height = Math.round(bmp.height * scale);
        const g = canvas.getContext('2d');
        g.fillStyle = '#fff';
        g.fillRect(0, 0, canvas.width, canvas.height);
        g.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        out.push({ canvas: canvas, boxes: [] });
        if (onProgress) onProgress(out.length);
      } else {
        throw new Error('Tệp "' + f.name + '" không phải PDF hay ảnh. Với file Word, hãy "Lưu dưới dạng PDF" rồi tải lên.');
      }
    }
    return out;
  }

  /**
   * Bản đã che: tên trường (tự động) + `topCover` (0–0.4) phần đầu trang 1.
   * Trả về canvas mới, không đụng canvas gốc (để kéo thanh trượt lại được).
   */
  function covered(page, index, opts) {
    const c = document.createElement('canvas');
    c.width = page.canvas.width;
    c.height = page.canvas.height;
    const g = c.getContext('2d');
    g.drawImage(page.canvas, 0, 0);
    if (opts.hideSchool) whiteBoxes(c, page.boxes);
    if (index === 0 && opts.topCover > 0) {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, c.width, Math.round(c.height * opts.topCover));
    }
    return c;
  }

  function finalize(pagesIn, opts) {
    return pagesIn.map((p, i) => canvasToImage(covered(p, i, opts)));
  }

  AM.classExams = {
    MAX_PAGES: MAX_PAGES,
    list: list,
    get: get,
    pages: pages,
    key: key,
    mySubmission: mySubmission,
    submit: submit,
    create: create,
    submissions: submissions,
    resetSubmission: resetSubmission,
    remove: remove,
    grade: grade,
    parseKey: parseKey,
    readFiles: readFiles,
    covered: covered,
    finalize: finalize,
  };
})(window.AM);
