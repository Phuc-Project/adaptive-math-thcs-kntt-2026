"""Bước 1: đọc PDF đã chuyển, chia vùng (ma trận / đề / đáp án), tìm từng câu.

Ghi ra scan.json: danh sách đề, mỗi đề có các câu (trang, toạ độ) + vùng đáp án.
"""
import json, re, sys, os, difflib, warnings
warnings.filterwarnings('ignore')
import fitz

W = os.path.dirname(os.path.abspath(__file__))
MAN = json.load(open(os.path.join(W, 'manifest.json'), encoding='utf-8'))

Q_RE = re.compile(r'^\s*(Câu|CÂU|Bài|BÀI)\s*(\d{1,2})\s*(?:[.:,)(]|\s|$)')
MATRIX_RE = re.compile(r'(MA\s*TRẬN|BẢN\s*ĐẶC\s*TẢ|ĐẶC\s*TẢ\s*MỨC|KHUNG\s*MA)', re.I)
ANS_RE = re.compile(r'^\s*(?:[A-Z]\.\s*)?(ĐÁP\s*ÁN|HƯỚNG\s*DẪN\s*CHẤM|HƯỚNG\s*DẪN\s*GIẢI|HƯỚNG\s*DẪN\s*–|BIỂU\s*ĐIỂM|LỜI\s*GIẢI|BẢNG\s*ĐÁP\s*ÁN)')
ANS_INLINE = re.compile(r'(ĐÁP\s*ÁN\s*(VÀ|&|-|–)|HƯỚNG\s*DẪN\s*CHẤM|ĐÁP ÁN – THANG|ĐÁP\s*ÁN\s*ĐỀ|ĐÁP ÁN KIỂM TRA)')
END_RE = re.compile(r'(^|[-–—.\s*])\s*(HẾT|Hết)\s*([-–—.\s*]|$)')
EXAMHDR_RE = re.compile(
    r'^\s*(ĐỀ\s*(SỐ|LẺ|CHẴN|BÀI|\d|0\d|KIỂM\s*TRA|THI|KHẢO\s*SÁT|THAM\s*KHẢO|CHÍNH\s*THỨC|KSCL)|'
    r'Đề\s*(số\s*)?\d+\b|KIỂM\s*TRA\s*(CUỐI|GIỮA|HỌC|CHẤT)|MÃ\s*ĐỀ)')
SEC_RE = re.compile(r'^\s*(PHẦN|Phần|[IV]{1,3}\s*[.:/-]|[AB]\s*[.:]\s*(TRẮC|TỰ|Trắc|Tự)|TRẮC\s*NGHIỆM|TỰ\s*LUẬN|Trắc nghiệm|Tự luận)')
SEC_TN = re.compile(r'trắc\s*nghiệm|TNKQ|đúng\s*[/-]?\s*sai|trả\s*lời\s*ngắn|lựa\s*chọn', re.I)
SEC_TL = re.compile(r'tự\s*luận', re.I)
RED = lambda c: (c >> 16) > 190 and ((c >> 8) & 255) < 90 and (c & 255) < 90


def page_lines(page):
    out = []
    d = page.get_text('dict', sort=True)
    for b in d['blocks']:
        if b.get('type') != 0:
            continue
        for l in b['lines']:
            txt = ''.join(s['text'] for s in l['spans'])
            if not txt.strip():
                continue
            red = [list(s['bbox']) for s in l['spans'] if s['text'].strip() and RED(s['color'])]
            redtxt = [s['text'].strip() for s in l['spans'] if s['text'].strip() and RED(s['color'])]
            bold = any(s['flags'] & 16 for s in l['spans'] if s['text'].strip())
            out.append(dict(t=txt.strip(), bb=list(l['bbox']), red=red, redtxt=redtxt, bold=bold))
    # gộp các mảnh cùng dòng (công thức tách span) theo thứ tự trái → phải
    out.sort(key=lambda r: (round(r['bb'][1] / 3), r['bb'][0]))
    merged = []
    for r in out:
        if merged and abs(merged[-1]['bb'][1] - r['bb'][1]) < 3 and abs(merged[-1]['bb'][3] - r['bb'][3]) < 6:
            m = merged[-1]
            m['parts'].append(r)
            m['bb'] = [min(m['bb'][0], r['bb'][0]), min(m['bb'][1], r['bb'][1]), max(m['bb'][2], r['bb'][2]), max(m['bb'][3], r['bb'][3])]
            m['t'] = m['t'] + ' ' + r['t']
            m['red'] += r['red']; m['redtxt'] += r['redtxt']; m['bold'] = m['bold'] or r['bold']
        else:
            r = dict(r); r['parts'] = [dict(r)]
            merged.append(r)
    # văn bản bắt đầu dòng = mảnh trái nhất
    for m in merged:
        m['first'] = min(m['parts'], key=lambda p: p['bb'][0])['t']
    return merged


def page_content_box(page, lines):
    """Hộp nội dung (bỏ header/footer số trang)."""
    H = page.rect.height
    ys = []
    for l in lines:
        t = l['t']
        if (l['bb'][1] > H * 0.93 or l['bb'][3] < H * 0.05) and (re.fullmatch(r'[\d\s/–-]*(Trang\s*\d+.*)?', t) or len(t) < 4):
            continue
        ys.append((l['bb'][1], l['bb'][3]))
    for b in page.get_text('dict')['blocks']:
        if b.get('type') == 1:
            ys.append((b['bbox'][1], b['bbox'][3]))
    for dr in page.get_drawings():
        r = dr['rect']
        if r.height > H * 0.9:
            continue
        ys.append((r.y0, r.y1))
    if not ys:
        return (0, H)
    return (max(0, min(y[0] for y in ys)), min(H, max(y[1] for y in ys)))


def classify(l, left):
    t = l['t']; f = l['first']
    if MATRIX_RE.search(t) and len(t) < 160 and not Q_RE.match(f):
        return 'matrix'
    if (ANS_RE.match(t) or ANS_INLINE.search(t)) and len(t) < 160:
        return 'ans'
    if END_RE.search(t) and len(t) < 40 and re.search(r'HẾT|Hết', t) and not re.search(r'[a-zà-ỹ]{3,}\s+Hết|Hết\s+[a-zà-ỹ]', t):
        return 'end'
    q = Q_RE.match(f)
    if q and f.lstrip().startswith(q.group(1)) and l['bb'][0] <= left + 45:
        return 'q'
    if EXAMHDR_RE.match(t) and len(t) < 120:
        return 'exam'
    if SEC_RE.match(t) and (SEC_TN.search(t) or SEC_TL.search(t)) and len(t) < 200:
        return 'sec'
    return None


def scan_file(x):
    doc = fitz.open(os.path.join(W, 'pdf', x['id'] + '.pdf'))
    stream = []
    boxes = []
    for pi, page in enumerate(doc):
        lines = page_lines(page)
        boxes.append(page_content_box(page, lines))
        left = min((l['bb'][0] for l in lines), default=0)
        for l in lines:
            l['p'] = pi
            l['cls'] = classify(l, left)
            stream.append(l)

    exams = []
    zone = 'pre'
    cur = None
    part = None

    def new_exam(l):
        nonlocal cur, part
        cur = dict(hdr=[l['t']] if l else [], qs=[], ans=[], start=(l['p'], l['bb'][1]) if l else None)
        exams.append(cur)
        part = None

    def close_q(l):
        if cur and cur['qs'] and cur['qs'][-1].get('end') is None:
            cur['qs'][-1]['end'] = (l['p'], l['bb'][1]) if l else None

    for i, l in enumerate(stream):
        c = l['cls']
        if c == 'matrix':
            close_q(l)
            zone = 'matrix'
            continue
        if c == 'ans':
            close_q(l)
            if cur is not None:
                zone = 'ans'
                cur['ans'].append([l['p'], l['bb'][1], None, None])
            continue
        if c == 'exam':
            # tiêu đề "ĐỀ SỐ 1" ngay trong phần đáp án → vẫn là đáp án
            look = ' '.join(s['t'] for s in stream[max(0, i - 3):i + 6])
            if zone == 'ans' and re.search(r'Đáp án|ĐÁP ÁN|Hướng dẫn|HƯỚNG DẪN|Điểm|biểu điểm|thang điểm', look):
                continue
            close_q(l)
            if zone != 'exam' or (cur and cur['qs']):
                if cur and zone == 'ans' and cur['ans'] and cur['ans'][-1][2] is None:
                    cur['ans'][-1][2:] = [l['p'], l['bb'][1]]
                if not (cur and not cur['qs'] and zone == 'exam'):
                    new_exam(l)
                else:
                    cur['hdr'].append(l['t'])
            else:
                cur['hdr'].append(l['t'])
            zone = 'exam'
            continue
        if c == 'end':
            if zone == 'exam':
                close_q(l)
                zone = 'post'
            continue
        if zone in ('pre', 'post') and c in ('q', 'sec'):
            if zone == 'post' or cur is None:
                new_exam(None)
            zone = 'exam'
        if zone != 'exam':
            if zone == 'ans' and cur is not None:
                cur.setdefault('anslines', []).append(l)
            elif zone == 'pre' and cur is None and len(l['t']) < 120:
                pass
            continue
        if c == 'sec':
            close_q(l)
            part = 'tl' if SEC_TL.search(l['t']) and not SEC_TN.search(l['t']) else 'tn'
            cur.setdefault('secs', {})[part] = l['t']
            continue
        if c == 'q':
            close_q(l)
            m = Q_RE.match(l['first'])
            cur['qs'].append(dict(word=m.group(1).capitalize(), no=int(m.group(2)), part=part,
                                  start=(l['p'], l['bb'][1]), end=None, lines=[l]))
            continue
        if cur and cur['qs'] and cur['qs'][-1].get('end') is None:
            cur['qs'][-1]['lines'].append(l)
        elif cur is not None and not cur['qs']:
            cur['hdr'].append(l['t'])
    close_q(None)
    for e in exams:
        if e['ans'] and e['ans'][-1][2] is None:
            e['ans'][-1][2:] = [None, None]
    return doc, exams, boxes


if __name__ == '__main__':
    only = sys.argv[1:]
    for x in MAN:
        if only and x['id'] not in only:
            continue
        doc, exams, boxes = scan_file(x)
        print('==', x['id'], x['g'], x['sem'], x['rel'][-50:], 'pages', len(doc))
        for k, e in enumerate(exams):
            nq = len(e['qs'])
            parts = ''.join((q['part'] or '--')[1] for q in e['qs'])
            nums = ','.join(str(q['no']) for q in e['qs'])
            print('  [%d] p%s q=%d %s | %s | ans=%s | %s' % (
                k, e['start'][0] + 1 if e['start'] else (e['qs'][0]['start'][0] + 1 if e['qs'] else '?'),
                nq, parts, nums, [(a[0] + 1) for a in e['ans']], ' / '.join(e['hdr'][:3])[:110]))
