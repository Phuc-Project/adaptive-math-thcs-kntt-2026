"""Bước 2: theo specs.py, cắt từng câu đề thành ảnh .webp, đọc đáp án, gán chủ đề → out/new.json."""
import json, os, re, sys, difflib, shutil, warnings
warnings.filterwarnings('ignore')
import fitz
import numpy as np
from PIL import Image

import scan
import school
from specs import SPECS
from topicrules import guess

W = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(W, 'out')
IMG = os.path.join(OUT, 'img')
SCALE = 2.0
MAN = {x['id']: x for x in json.load(open(os.path.join(W, 'manifest.json'), encoding='utf-8'))}

Q_RE = re.compile(r'^\s*(Câu|CÂU|Bài|BÀI)\s*(\d{1,2})\s*(?:[.:,)(\-–]|\s|$)')
EMB_Q = re.compile(r'(?:^|[:.)\s])\s*(Câu|Bài)\s*(\d{1,2})\s*[.:(]')
SEC_HEAD = re.compile(r'^\s*((PHẦN|Phần)\s*[IVX\d]*|[IVX]{1,4}\s*[.:/\-]|[A-D]\s*[.:/\-]|TRẮC|TỰ\s*LUẬN|Trắc|Tự\s*luận)')
SEC_TN = re.compile(r'trắc\s*nghiệm|TNKQ|đúng\s*[/-]?\s*sai|trả\s*lời\s*ngắn|lựa\s*chọn', re.I)
SEC_TL = re.compile(r'tự\s*luận', re.I)
PTS_RE = re.compile(r'\(\s*(\d+(?:[,.]\d+)?)\s*(?:điểm|đ)\s*\)', re.I)
LV_TAG = re.compile(r'\[?\(?\s*(NB|TH|VDC|VD|Nhận biết|Thông hiểu|Vận dụng cao|Vận dụng)\s*\]?\)?')
LV_MAP = {'NB': 'N', 'Nhận biết': 'N', 'TH': 'H', 'Thông hiểu': 'H', 'VD': 'V', 'Vận dụng': 'V', 'VDC': 'T', 'Vận dụng cao': 'T'}
TYPE_SHORT = {'GK1': 'Giữa HK I', 'CK1': 'Cuối HK I', 'GK2': 'Giữa HK II', 'CK2': 'Cuối HK II', 'V10': 'Thi vào 10'}
TYPE_TITLE = {'GK1': 'Đề kiểm tra giữa học kì I', 'CK1': 'Đề kiểm tra cuối học kì I', 'GK2': 'Đề kiểm tra giữa học kì II',
              'CK2': 'Đề kiểm tra cuối học kì II', 'V10': 'Đề thi thử tuyển sinh vào lớp 10'}


def norm_pt(p, n):
    p = min(p, n)
    return p


class Doc:
    def __init__(self, fid):
        self.fid = fid
        self.doc = fitz.open(os.path.join(W, 'pdf', fid + '.pdf'))
        self.n = len(self.doc)
        self.lines = []
        self.box = []
        self.left = []
        self.objs = []
        self.school = []
        for pi, page in enumerate(self.doc):
            self.school.append(school.boxes(page))
            ls = scan.page_lines(page)
            for l in ls:
                l['p'] = pi
            self.lines.append(ls)
            self.box.append(scan.page_content_box(page, ls))
            self.left.append(min((l['bb'][0] for l in ls), default=0))
            objs = [im['bbox'] for im in page.get_image_info() if im['bbox'][3] - im['bbox'][1] < 120]
            objs += [tuple(d['rect']) for d in page.get_drawings() if d['rect'].height < 120]
            self.objs.append(objs)

    def top(self, l):
        """Đỉnh thật của dòng: công thức (ảnh/vector) cùng dòng thường cao hơn chữ."""
        t = l['bb'][1]
        cand = list(self.objs[l['p']]) + [z['bb'] for z in self.lines[l['p']]
                                           if z is not l and z['bb'][0] > self.left[l['p']] + 60]
        above = [z['bb'][3] for z in self.lines[l['p']] if z['bb'][3] <= l['bb'][1] + 1]
        floor = max(above) - 1 if above else 0
        for o in cand:
            if o[3] > l['bb'][1] + 2 and o[1] < l['bb'][3] - 1 and o[1] < t and l['bb'][1] - o[1] < 48:
                # công thức nằm trong dòng: nâng hẳn; hình trôi bên phải dòng: không cắt vào dòng trên
                t = o[1] if o[0] < l['bb'][2] else max(o[1], min(t, floor))
        return t

    def pos(self, py):
        p, y = py
        if p >= 99 or p - 1 >= self.n:
            return (self.n, 0)
        return (p - 1, y)

    def iter_zone(self, a, b):
        (p0, y0), (p1, y1) = self.pos(a), self.pos(b)
        for p in range(p0, min(p1, self.n - 1) + 1):
            for l in self.lines[p]:
                y = l['bb'][1]
                if (p, y) < (p0, y0) or (p, y) >= (p1, y1):
                    continue
                yield l


def is_q(l, left):
    t = l['t']
    m = Q_RE.match(t)
    if not m or l['bb'][0] > left + 45:
        return None
    return m


def is_sec(l):
    t = l['t']
    if len(t) > 220 or not SEC_HEAD.match(t):
        return None
    head = t[:90]
    if SEC_TL.search(head) and not SEC_TN.search(head):
        return 'tl'
    if SEC_TN.search(head):
        return 'tn'
    return None


def render(doc, p, y0, y1, x0=None, x1=None, red=()):
    page = doc.doc[p]
    W_ = page.rect.width
    if x0 is None:
        x0 = max(0, doc.left[p] - 12)
    if x1 is None:
        x1 = W_ - 8
    clip = fitz.Rect(x0, max(0, y0), x1, min(page.rect.height, y1))
    if clip.height < 4:
        return None
    pm = page.get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), clip=clip, alpha=False)
    im = Image.frombytes('RGB', (pm.width, pm.height), pm.samples)
    a = np.asarray(im).astype(np.int16)
    # che trắng tên trường / phòng / sở GD (school.py) — đề trong kho không hiện tên trường
    for bb in doc.school[p]:
        sx0 = int((bb[0] - clip.x0) * SCALE) - 3; sy0 = int((bb[1] - clip.y0) * SCALE) - 3
        sx1 = int((bb[2] - clip.x0) * SCALE) + 3; sy1 = int((bb[3] - clip.y0) * SCALE) + 3
        if sx1 <= 0 or sy1 <= 0 or sx0 >= a.shape[1] or sy0 >= a.shape[0]:
            continue
        a[max(sy0, 0):max(sy1, 0), max(sx0, 0):max(sx1, 0)] = 255
    # chữ đỏ (đáp án tô màu, nhãn mức độ) → đen; chỉ trong hộp chữ đỏ, không đụng hình màu
    if red:
        for bb in red:
            rx0 = int((bb[0] - clip.x0) * SCALE) - 2; ry0 = int((bb[1] - clip.y0) * SCALE) - 2
            rx1 = int((bb[2] - clip.x0) * SCALE) + 2; ry1 = int((bb[3] - clip.y0) * SCALE) + 2
            rx0, ry0 = max(rx0, 0), max(ry0, 0)
            sub = a[ry0:ry1, rx0:rx1]
            if sub.size == 0:
                continue
            r, g, b = sub[..., 0], sub[..., 1], sub[..., 2]
            mask = (r - np.maximum(g, b)) > 40
            lum = np.minimum(255, (255 - r) * 2.2 + g * 0.0)  # đậm theo độ "không trắng"
            v = 255 - np.clip((255 - np.minimum(g, b)), 0, 255)
            for c in range(3):
                ch = sub[..., c]
                ch[mask] = v[mask]
    im = Image.fromarray(a.astype(np.uint8))
    # cắt viền trắng
    g = np.asarray(im.convert('L'))
    ink = g < 235
    rowink = ink.any(axis=1)
    # bỏ "vụn" chữ của dòng kề trên/dưới (dải mực mỏng ≤ 8px cách nội dung chính ≥ 4px trắng)
    for _ in range(2):
        r = np.where(rowink)[0]
        if len(r) == 0:
            break
        i = r[0]; j = i
        while j < len(rowink) and rowink[j]:
            j += 1
        k = j
        while k < len(rowink) and not rowink[k]:
            k += 1
        if j - i <= 8 and k - j >= 4 and k < len(rowink):
            rowink[i:j] = False
        r = np.where(rowink)[0]
        if len(r) == 0:
            break
        i = r[-1]; j = i
        while j >= 0 and rowink[j]:
            j -= 1
        k = j
        while k >= 0 and not rowink[k]:
            k -= 1
        if i - j <= 8 and j - k >= 4 and k > 0:
            rowink[j + 1:i + 1] = False
    rows = np.where(rowink)[0]
    ink[~rowink] = False
    cols = np.where(ink.any(axis=0))[0]
    if len(rows) == 0 or len(cols) == 0:
        return None
    pad = 8
    top, bot = max(rows[0] - pad, 0), min(rows[-1] + pad + 1, im.height)
    lef, rig = max(cols[0] - pad, 0), min(cols[-1] + pad + 1, im.width)
    if bot - top < 14:
        return None
    return im.crop((lef, top, rig, bot))


def segments(doc, start, end, red_boxes):
    """start/end: (p, y) chỉ số trang 0-based. Trả về list ảnh PIL."""
    out = []
    (p0, y0), (p1, y1) = start, end
    for p in range(p0, min(p1, doc.n - 1) + 1):
        bt, bb = doc.box[p]
        top = y0 - 3 if p == p0 else bt - 2
        bot = y1 - 1 if p == p1 else bb + 3
        if p == p1 and y1 <= 0:
            continue
        if p != p0:
            top = max(top, bt - 2)
        bot = min(bot, bb + 3)
        if bot - top < 5:
            continue
        reds = [r for (rp, r) in red_boxes if rp == p and r[3] > top and r[1] < bot]
        im = render(doc, p, top, bot, red=reds)
        if im is not None:
            out.append(im)
    return out


def answer_table(doc, a0, a1):
    """Tìm bảng 'Câu 1 2 3 … / Đáp án A B C …' trong vùng đáp án → {số câu: chữ}."""
    (p0, y0), (p1, y1) = doc.pos(a0), doc.pos(a1)
    res = {}
    for p in range(p0, min(p1, doc.n - 1) + 1):
        words = doc.doc[p].get_text('words')
        words = [w for w in words if (p, w[1]) >= (p0, y0) and (p, w[1]) < (p1, y1)]
        rows = []
        for w in sorted(words, key=lambda w: (w[1] + w[3]) / 2):
            yc = (w[1] + w[3]) / 2
            if rows and abs(rows[-1][0] - yc) < 4.5:
                rows[-1][1].append(w)
            else:
                rows.append([yc, [w]])
        for i, (yc, ws) in enumerate(rows):
            nums = [(w, int(w[4])) for w in ws if re.fullmatch(r'\d{1,2}', w[4]) and 0 < int(w[4]) <= 40]
            if len(nums) < 4:
                continue
            # các dòng ngay dưới chứa chữ cái A-D
            for yc2, ws2 in rows[i + 1:i + 4]:
                if yc2 - yc > 70:
                    break
                lets = [w for w in ws2 if re.fullmatch(r'[A-D][.,]?', w[4].strip())]
                if len(lets) < 4:
                    continue
                for w in lets:
                    xc = (w[0] + w[2]) / 2
                    best = min(nums, key=lambda nw: abs((nw[0][0] + nw[0][2]) / 2 - xc))
                    if abs((best[0][0] + best[0][2]) / 2 - xc) < 22 and best[1] not in res:
                        res[best[1]] = w[4][0]
                break
    return res


def opt_count(text):
    return len(set(re.findall(r'(?:^|\s)([A-D])\s*[.)]', text)))


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(IMG)
    all_exams = []
    for fid, specs in SPECS.items():
        x = MAN[fid]
        doc = Doc(fid)
        for k, sp in enumerate(specs):
            g = x['g']
            etype = sp['type']
            zone = list(doc.iter_zone(*sp['q']))
            # mốc: câu hỏi / tiêu đề phần
            marks = []
            part = None
            for l in zone:
                p = l['p']
                sec = is_sec(l)
                m = None if sec else is_q(l, doc.left[p])
                if sec:
                    part = sec
                    marks.append(('sec', l, part))
                    em = EMB_Q.search(l['t'][10:])
                    if em:
                        marks.append(('q', l, part, em.group(1), int(em.group(2))))
                    continue
                if m:
                    marks.append(('q', l, part, m.group(1).capitalize(), int(m.group(2))))
            zend = doc.pos(sp['q'][1])
            qs = []
            for i, mk in enumerate(marks):
                if mk[0] != 'q':
                    continue
                l = mk[1]
                start = (l['p'], doc.top(l))
                nxt = next((m2 for m2 in marks[i + 1:] if (m2[1]['p'], m2[1]['bb'][1]) > (l['p'], l['bb'][1])), None)
                end = (nxt[1]['p'], doc.top(nxt[1])) if nxt else zend
                body = [z for z in zone if (l['p'], l['bb'][1]) <= (z['p'], z['bb'][1]) < (end if not nxt else (nxt[1]['p'], nxt[1]['bb'][1]))]
                text = ' '.join(z['t'] for z in body)
                reds = [(z['p'], r) for z in zone for r in z['red']]
                inq = [z for z in zone if start <= (z['p'], (z['bb'][1] + z['bb'][3]) / 2) < end]
                redopts = [rt[0] for z in inq for rt in z['redtxt'] if re.match(r'^[A-D]\s*[.)]?\s*$', rt.strip()[:3]) and len(rt) < 40]
                qs.append(dict(word=mk[3], no=mk[4], part=mk[2], start=start, end=end, text=text, reds=reds,
                               redopts=redopts))
            if any(q['part'] == 'tl' for q in qs):
                first_tl = next(i for i, q in enumerate(qs) if q['part'] == 'tl')
                for q in qs[:first_tl]:
                    if q['part'] is None:
                        q['part'] = 'tn'
            if not qs:
                print('!! no questions', fid, k)
                continue
            # đáp án
            key = answer_table(doc, *sp['a']) if sp.get('a') else {}
            all_exams.append(dict(fid=fid, k=k, g=g, type=etype, src=sp['src'], label=sp.get('label'), qs=qs, key=key,
                                  a=sp.get('a'), doc=doc))
    # loại đề trùng (cùng một đề lưu ở hai file)
    kept = []
    for e in all_exams:
        sig = re.sub(r'\s+', ' ', ' '.join(q['text'] for q in e['qs']))[:1500]
        dup = None
        for f in kept:
            if f['g'] == e['g'] and difflib.SequenceMatcher(None, f['sig'], sig).quick_ratio() > 0.9 and \
                    difflib.SequenceMatcher(None, f['sig'], sig).ratio() > 0.97:
                dup = f
                break
        e['sig'] = sig
        for f in kept:
            if f['g'] == e['g']:
                r = difflib.SequenceMatcher(None, f['sig'], sig).ratio()
                if r > 0.8 and f is not dup:
                    print('near', e['fid'], e['k'], f['fid'], f['k'], round(r, 3))
        if dup:
            print('dup', e['fid'], e['k'], '==', dup['fid'], dup['k'], round(difflib.SequenceMatcher(None, dup['sig'], sig).ratio(),3))
            continue
        kept.append(e)

    order = {'GK1': 0, 'CK1': 1, 'GK2': 2, 'CK2': 3, 'V10': 4}
    kept.sort(key=lambda e: (e['g'], order[e['type']]))
    counters = {}
    exams_out, items_out = [], []
    for e in kept:
        g, et = e['g'], e['type']
        counters[(g, et)] = counters.get((g, et), 0) + 1
        n = counters[(g, et)]
        eid = 'd%d-%s-%d' % (g, et, n)
        sub = 'de/%s' % eid.lower()
        os.makedirs(os.path.join(IMG, sub), exist_ok=True)
        doc = e['doc']
        parts = {}
        nmcq = 0
        seen = set()
        for q in e['qs']:
            q['part'] = q['part'] or ('tn' if opt_count(q['text']) >= 3 else 'tl')
        tn_list = [q for q in e['qs'] if (q['part'] or ('tn' if opt_count(q['text']) >= 3 else 'tl')) == 'tn']
        for qi, q in enumerate(e['qs']):
            part = q['part'] or ('tn' if opt_count(q['text']) >= 3 else 'tl')
            q['part'] = part
            ims = segments(doc, q['start'], q['end'], q['reds'])
            if not ims:
                print('!! empty crop', eid, q['word'], q['no'])
                continue
            files = []
            for si, im in enumerate(ims):
                fn = '%s/%02d%s.webp' % (sub, qi + 1, '' if si == 0 else chr(97 + si))
                im.save(os.path.join(IMG, fn), 'WEBP', quality=80, method=6)
                files.append([fn, im.width, im.height])
            base = '%s-%s%d' % (eid, 'c' if q['word'] == 'Câu' else 'b', q['no'])
            iid = base
            j = 2
            while iid in seen:
                iid = '%s-%d' % (base, j); j += 1
            seen.add(iid)
            text = re.sub(r'\s+', ' ', q['text']).strip()
            # mức độ
            tag = LV_TAG.search(text[:120])
            if tag:
                lv = LV_MAP[tag.group(1)]
            elif part == 'tn':
                idx = tn_list.index(q) if q in tn_list else 0
                lv = 'N' if idx < len(tn_list) / 2 else 'H'
            else:
                tl = [z for z in e['qs'] if z['part'] == 'tl'] or [q]
                idx = tl.index(q) if q in tl else 0
                frac = idx / max(1, len(tl) - 1)
                lv = 'H' if frac < 0.34 else ('V' if frac < 0.9 else 'T')
                if re.search(r'chứng minh|lớn nhất|nhỏ nhất|GTLN|GTNN|tham số', text, re.I) and lv == 'H':
                    lv = 'V'
                if idx == len(tl) - 1 and len(tl) >= 3 and re.search(r'chứng minh|lớn nhất|nhỏ nhất|GTLN|GTNN|0,5|0.5', text):
                    lv = 'T'
            it = dict(id=iid, g=g, k=part, n='%s %d' % (q['word'], q['no']), lv=lv, img=files,
                      t=guess(text, g, et), d='%s · Đề %d' % (TYPE_SHORT[et], n), ex=eid, p=part, q=text[:200])
            pm = PTS_RE.search(text[:80])
            if pm:
                it['pt'] = pm.group(1).replace('.', ',')
            # đáp án trắc nghiệm 4 lựa chọn
            keyed = len(e['key']) >= 4 and q['no'] in e['key'] and q['word'] == 'Câu'
            if part == 'tn' and (opt_count(text) >= 3 or keyed):
                nmcq += 1
                ans = e['key'].get(q['no']) if keyed else None
                if not ans and len(set(q['redopts'])) == 1:
                    ans = q['redopts'][0][0]
                if ans:
                    it['ans'] = ans
            items_out.append(it)
        # ảnh đáp án / hướng dẫn chấm của cả đề
        sol = []
        if e['a']:
            a0, a1 = doc.pos(e['a'][0]), doc.pos(e['a'][1])
            for si, im in enumerate(segments(doc, a0, a1, [])):
                fn = '%s/da-%d.webp' % (sub, si + 1)
                im.save(os.path.join(IMG, fn), 'WEBP', quality=78, method=6)
                sol.append([fn, im.width, im.height])
        # thời gian làm bài
        head = ' '.join(l['t'] for l in doc.lines[e['qs'][0]['start'][0]][:25])
        tm = re.search(r'(\d{2,3})\s*phút', head)
        time = int(tm.group(1)) if tm and 30 <= int(tm.group(1)) <= 150 else (120 if et == 'V10' else 90)
        ex = dict(id=eid, g=g, type=et, no=n, title=TYPE_TITLE[et], time=time, from_=e['src'])
        if e['label']:
            ex['label'] = e['label']
        if sol:
            ex['sol'] = sol
        exams_out.append(ex)
        got = sum(1 for it in items_out if it['ex'] == eid and 'ans' in it)
        print('%-12s %-5s q=%2d mcq=%2d ans=%2d sol=%d  %s | %s' % (eid, e['fid'], len(e['qs']), nmcq, got, len(sol), e['src'][:40],
              ','.join(('c' if q['word'] == 'Câu' else 'b') + str(q['no']) + q['part'][1] for q in e['qs'])))
    for ex in exams_out:
        ex['from'] = ex.pop('from_')
    json.dump(dict(exams=exams_out, items=items_out), open(os.path.join(OUT, 'new.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=0)
    print('exams', len(exams_out), 'items', len(items_out))


if __name__ == '__main__':
    main()
