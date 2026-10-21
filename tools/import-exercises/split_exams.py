"""Tách các đề kiểm tra trong tài liệu g6a thành từng câu và vá vào data/exercises.js.

build_js.py để mỗi đề kiểm tra là một ảnh dài nguyên đề, không phân loại. Script này
thay chúng bằng từng câu riêng (trắc nghiệm, đúng/sai, tự luận), mỗi câu có:
  ex  — mã đề (vd 'g6a-GK1-2'), khai báo trong mảng `exams` của ngân hàng
  p   — phần: 'tn' (trắc nghiệm, đúng/sai) hoặc 'tl' (tự luận)
  pt  — điểm của câu nếu đề ghi (vd '1,5')
  t   — chủ đề đoán theo từ khóa → câu trong đề cũng hiện ở kho bài tập theo chủ đề

Tài liệu không có đáp án cho các đề này nên học sinh tự đánh giá như bài tự luận.

Chạy (Windows/Linux, cần PyMuPDF + Pillow + numpy), từ gốc repo, SAU build_js.py:
    python tools/import-exercises/split_exams.py
Chạy lại nhiều lần cho cùng kết quả (xóa câu đề cũ rồi ghi lại).
"""
import json, os, re, sys
import fitz  # PyMuPDF
import numpy as np
from PIL import Image, ImageOps

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PDF = os.path.join(ROOT, 'data', 'pdf', 'Cơ bản toán 6 kì 1.pdf')
BANK = os.path.join(ROOT, 'data', 'exercises.js')
IMG_DIR = os.path.join(ROOT, 'data', 'exercises', 'img')
SUB = 'g6a/de'          # ảnh câu đề: data/exercises/img/g6a/de/<mã>.webp
SCALE = 2.0             # 144 dpi, cùng độ phân giải với ảnh bài tập khác
TOP, BOTTOM = 48, 798   # bỏ header (tên GV) và footer (khẩu hiệu + số trang)

# (loại, số đề, trang đầu, trang cuối) — trang đánh số từ 1 như trong PDF.
# Trang 113 có tiêu đề "KIỂM TRA HỌC KÌ I" (thiếu chữ "ĐỀ") nên build_js.py gộp nhầm
# đề 2 và đề 3 cuối kì thành một mục; ở đây tách đúng 5 đề.
EXAMS = [
    ('GK1', 1, 75, 76), ('GK1', 2, 77, 77), ('GK1', 3, 78, 78),
    ('GK1', 4, 79, 80), ('GK1', 5, 81, 81), ('GK1', 6, 82, 83),
    ('CK1', 1, 109, 110), ('CK1', 2, 111, 112), ('CK1', 3, 113, 114),
    ('CK1', 4, 115, 117), ('CK1', 5, 118, 119),
]
TYPE_TITLE = {'GK1': 'Đề kiểm tra giữa học kì I', 'CK1': 'Đề kiểm tra cuối học kì I'}
TYPE_SHORT = {'GK1': 'Giữa HK I', 'CK1': 'Cuối HK I'}

Q_RE = re.compile(r'^(Câu|Bài)\s*(\d+)\s*[:.(]?')
SEC_RE = re.compile(r'^(Phần\s*(I{1,3}|\d)|PHẦN|I{1,3}\s*\.|[AB]\s*\.)', re.I)
SEC_KW = re.compile(r'trắc nghiệm|tự luận|lựa chọn|đúng\s*/\s*sai|trả lời ngắn', re.I)
PTS_RE = re.compile(r'\(\s*([\d]+(?:,\d+)?)\s*điểm\s*\)', re.I)

# Từ khóa → chủ đề lớp 6 (js/core/topics.js). Luật đầu tiên khớp được chọn.
TOPIC_RULES = [
    (r'đối xứng', '6-C4-B4'),
    (r'chu vi|diện tích|hàng rào|mét vuông|\blát\b|\bsơn\b|trồng|dây thép', '6-C4-B3'),
    (r'lục giác|tam giác đều', '6-C4-B1'),
    (r'hình chữ nhật|hình thoi|bình hành|thang cân|hình vuông', '6-C4-B2'),
    (r'ƯCLN|BCNN|ước chung|bội chung|nhiều nhất|ít nhất|xếp (thành )?(các )?hàng|thành hàng|chia đều|phần thưởng|\bnhóm\b|\bbó\b', '6-C1-B7'),
    (r'nguyên tố|hợp số|thừa số', '6-C1-B6'),
    (r'phân số', '6-C3-B1'),
    (r'số đối|trục số|nguyên âm|nhiệt độ|thứ tự (tăng|giảm)', '6-C2-B1'),
    (r'số nguyên', '6-C2-B2'),
    # \b: "ước" không khớp "được", "dư" không khớp "dưới"
    (r'chia hết|\bbội\b|\bước\b|\bdư\b', '6-C1-B5'),
    (r'lũy thừa', '6-C1-B4'),
    (r'la mã|chữ số|giá trị', '6-C1-B2'),
    (r'tập hợp|phần tử|thuộc', '6-C1-B1'),
    (r'phép tính|hợp lí|tìm x|tính|tiền|tuổi', '6-C1-B3'),
]
# Đề cuối kì I đã học số nguyên: "Tính / Tìm x" mặc định thuộc phép tính số nguyên.
DEFAULT_TOPIC = {'GK1': '6-C1-B3', 'CK1': '6-C2-B2'}
# Câu mà từ khóa không đủ (đề chỉ có công thức: lũy thừa, ⋮, ước của số âm …) — đã đọc ảnh đề.
TOPIC_OVERRIDES = {
    'g6a-GK1-3-c2': '6-C1-B4', 'g6a-GK1-4-c5': '6-C1-B5', 'g6a-GK1-4-b5': '6-C1-B3',
    'g6a-GK1-6-c1': '6-C1-B1',
    'g6a-CK1-1-c2': '6-C2-B1', 'g6a-CK1-1-c4': '6-C1-B3', 'g6a-CK1-1-c6': '6-C1-B4',
    'g6a-CK1-1-b5': '6-C2-B3',
    'g6a-CK1-2-c1': '6-C2-B1', 'g6a-CK1-2-c3': '6-C2-B3', 'g6a-CK1-2-c13': '6-C2-B1',
    'g6a-CK1-2-c15': '6-C2-B3',
    'g6a-CK1-3-c3': '6-C1-B4', 'g6a-CK1-3-c4': '6-C2-B1',
    'g6a-CK1-4-c2': '6-C1-B4', 'g6a-CK1-4-b5': '6-C1-B4',
    'g6a-CK1-5-c4': '6-C1-B4', 'g6a-CK1-5-c6': '6-C2-B3',
}


def guess_topic(text, etype):
    for pat, tid in TOPIC_RULES:
        if re.search(pat, text, re.I):
            if tid == '6-C1-B3' and etype == 'CK1':
                return DEFAULT_TOPIC['CK1']
            return tid
    return DEFAULT_TOPIC[etype]


def page_lines(page):
    out = []
    for bl in page.get_text('dict')['blocks']:
        for ln in bl.get('lines', []):
            t = ''.join(s['text'] for s in ln['spans']).strip()
            if t:
                x0, y0, x1, y1 = ln['bbox']
                out.append({'t': t, 'x0': x0, 'x1': x1, 'y0': y0, 'y1': y1})
    out.sort(key=lambda r: (round(r['y0']), r['x0']))
    return out


def margin(lines):
    xs = [r['x0'] for r in lines if Q_RE.match(r['t'])]
    return min(xs) if xs else 72


def is_sentence(o):
    return o['x1'] - o['x0'] > 150


def collided(lines, r):
    """Dòng chữ đầy đủ in đè lên nhãn "Câu N" (lỗi dàn trang của tài liệu gốc, vd Câu 18 tr.112)."""
    # o bắt đầu sát lề như nhãn (mẩu còn lại của chính dòng r bắt đầu xa hơn về bên phải).
    return next((o for o in lines if o is not r and is_sentence(o) and abs(o['y0'] - r['y0']) < 6
                 and o['x0'] < r['x0'] + 40), None)


def start_y(lines, r):
    """Mép trên vùng cắt của câu bắt đầu ở dòng r.

    Tử số / ngoặc nhọn nằm cao hơn chữ "Câu N:" nên lấy đỉnh của mọi dòng chồng dọc lên r,
    nhưng không vượt lên đáy dòng ngay phía trên (tránh cắt vào hàng đáp án / chân chữ của nó).
    """
    # Tử số cao hơn dòng tối đa ~9pt; xa hơn là hàng đáp án A–D của câu trước.
    tops = [o['y0'] for o in lines if o['y1'] > r['y0'] + 1 and r['y0'] - 9 <= o['y0'] < r['y1'] - 1]
    y = min(tops + [r['y0']]) - 3
    # "Phía trên" = dòng kết thúc trước đỉnh r; dòng còn thòng xuống ngang r xem hanging().
    above = [o['y1'] for o in lines if o is not r and o['y0'] < r['y0'] - 9 and o['y1'] <= r['y0'] + 3]
    return min(max(y, max(above) + 0.5), r['y0'] - 0.3) if above else y


def hanging(lines, r):
    """Đáy thấp nhất của dòng câu trước còn thòng xuống ngang dòng r (vd mẫu số ½ ở tr.111).

    Tâm dòng phải nằm trên đỉnh r — ngoặc lớn bao quanh chính dòng r (BCNN(6; 54; 18)) thì không.
    """
    return max((o['y1'] for o in lines if o is not r and o['y0'] < r['y0'] - 9 and o['y1'] > r['y0'] + 3
                and (o['y0'] + o['y1']) / 2 < r['y0']), default=None)


def clean_text(s):
    s = re.sub(r'\s+', ' ', s).strip()
    return s[:160]


def scan_exam(doc, p0, p1):
    """Trả về mốc theo thứ tự: ('sec'|'q', page, y cắt, text, hang, y dòng) và text từng dòng.

    hang = (đáy phần câu trước thòng xuống, y đỉnh dòng này) hoặc None; "y dòng" dùng để
    chia văn bản giữa các câu (y cắt có thể lệch khỏi đỉnh dòng).
    """
    marks, rows = [], []
    for pn in range(p0, p1 + 1):
        lines = [r for r in page_lines(doc[pn - 1]) if TOP < r['y0'] < BOTTOM]
        m = margin(lines)
        for r in lines:
            rows.append((pn, r['y0'], r['t']))
            if r['x0'] > m + 8:
                continue
            if SEC_RE.match(r['t']) and SEC_KW.search(r['t']) and len(r['t']) < 140:
                marks.append(('sec', pn, start_y(lines, r), r['t'], None, r['y0']))
            elif Q_RE.match(r['t']):
                o = collided(lines, r)
                # Dòng bị đè thuộc câu trước; câu này bắt đầu ngay dưới (nhãn vẫn hiện ở thẻ bài).
                y = max(r['y1'], o['y1']) + 1.5 if o else start_y(lines, r)
                h = None if o else hanging(lines, r)
                marks.append(('q', pn, y, r['t'], (h, r['y0']) if h else None, r['y0']))
    return marks, rows


def hanging_parts(qs):
    """Phần câu trước thòng xuống ngang dòng đầu câu sau nằm lệch ngang, không cắt thẳng được:
    câu trước nới tới hết phần thòng và bỏ dòng của câu sau ('newer'); câu sau bỏ phần thòng ('older')."""
    for i, q in enumerate(qs):
        if not q['hang'] or not i:
            continue
        h, ry0 = q['hang']
        pn, a, b, ops = q['segs'][0]
        pp, pa, pb, pops = qs[i - 1]['segs'][-1]
        if pp != pn or pb > a + 1:
            continue
        band = fitz.Rect(30, a, 575, h + 1)
        pops.append(('newer', band, ry0 - 9))
        qs[i - 1]['segs'][-1] = (pp, pa, band.y1, pops)
        ops.append(('older', band, ry0 - 9))


# Nhãn hình: tên điểm (A, B …) hoặc số đo (20 m, 2 cm …).
FIG_LABEL_RE = re.compile(r'^([A-Z]|\d+(,\d+)?\s*(m|cm|dm|mm))$')
FIG_REF_RE = re.compile(r'hình vẽ|như hình|hình bên', re.I)


def figures(page, labels):
    """Khung các hình vẽ trên trang: cụm nét vẽ sát nhau theo chiều dọc (hình + mũi tên kích
    thước bên dưới) gộp làm một, rồi nới thêm nhãn số đo nằm ngay trên/dưới."""
    rects = [fitz.Rect(c) for c in page.cluster_drawings()]
    merged = True
    while merged:
        merged = False
        for i in range(len(rects)):
            for j in range(i + 1, len(rects)):
                a, b = rects[i], rects[j]
                if a.x0 < b.x1 and b.x0 < a.x1 and max(a.y0, b.y0) - min(a.y1, b.y1) < 10:
                    rects[i] = a | b
                    del rects[j]
                    merged = True
                    break
            if merged:
                break
    out = []
    for c in rects:
        near = [r for r in labels if c.x0 - 10 <= r['x0'] <= c.x1
                and (c.y0 - 16 <= r['y0'] < c.y0 or c.y1 - 2 <= r['y0'] <= c.y1 + 12)]
        out.append(fitz.Rect(c.x0, min([c.y0] + [r['y0'] for r in near]),
                             c.x1, max([c.y1] + [r['y1'] for r in near])))
    return out


def side_figures(doc, qs):
    """Hình vẽ đặt bên phải, bắt đầu cạnh mấy dòng cuối của câu trước (vd Bài 4 tr.81).

    Tài liệu gốc vẽ hình đè lên đuôi các dòng chữ của câu trước, nên không cắt ngang được.
    Hình vắt qua ranh giới hai câu thuộc về câu chứa phần lớn hình: câu đó nới vùng cắt tới
    hết hình và bỏ chữ thân bài của câu kia trong dải nới ('text'); câu kia bỏ nét vẽ + nhãn
    hình trong dải đó ('fig').
    """
    for i, q in enumerate(qs):
        pn, a, b, ops = q['segs'][-1]
        page = doc[pn - 1]
        labels = [r for r in page_lines(page) if FIG_LABEL_RE.match(r['t'])]
        # Câu sau trên cùng trang; `nxt` chỉ khi nó bắt đầu ngay dưới b (không có tiêu đề phần xen giữa).
        after = qs[i + 1] if i + 1 < len(qs) and qs[i + 1]['segs'][0][0] == pn else None
        nxt = after if after and abs(after['segs'][0][1] - (b + 1)) < 1.5 else None
        for c in figures(page, labels):
            top = c.y0
            if c.x0 <= 200 or not (a - 1 <= top < b - 1 and c.y1 > b + 1):
                continue
            # Câu nhắc tới hình ("như hình vẽ", "hình bên") nhận hình; không thì câu chứa phần lớn hình.
            cites = [bool(FIG_REF_RE.search(q['text'])), bool(nxt) and bool(FIG_REF_RE.search(nxt['text']))]
            mine = not nxt or (cites[0] if cites[0] != cites[1] else b - top >= c.y1 - b)
            if mine:
                band = fitz.Rect(c.x0 - 4, b, 575, c.y1 + 2)   # phần đáy hình lấn xuống câu / tiêu đề sau
                ops.append(('newer', band, b))
                b = band.y1
                if after and after['segs'][0][1] < band.y1:
                    after['segs'][0][3].append(('fig', band))
            else:
                n_pn, n_a, n_b, n_ops = nxt['segs'][0]
                band = fitz.Rect(c.x0 - 4, top - 2, 575, n_a)  # phần đỉnh hình nằm cạnh câu này
                ops.append(('fig', band))
                n_ops.append(('text', band))
                nxt['segs'][0] = (n_pn, band.y0, n_b, n_ops)
        q['segs'][-1] = (pn, a, b, ops)


def page_for(doc, pn, ops):
    """Trang pn để render; có ops thì dùng bản sao một trang đã xóa phần không thuộc câu."""
    if not ops:
        return doc[pn - 1]
    tmp = fitz.open()
    tmp.insert_pdf(doc, from_page=pn - 1, to_page=pn - 1)
    page = tmp[0]
    lines = [(fitz.Rect(ln['bbox']), ''.join(s['text'] for s in ln['spans']).strip())
             for bl in page.get_text('dict')['blocks'] for ln in bl.get('lines', [])]
    core = lambda r: fitz.Rect(r.x0, r.y0 + r.height * 0.3, r.x1, r.y1 - r.height * 0.3)
    for op, fig, *ycut in ops:
        band = fitz.Rect(30, fig.y0, 575, fig.y1)
        inband = [(r, t) for r, t in lines if t and core(r).intersects(band)]
        labels = [r for r, t in inband if r.x0 >= fig.x0 and FIG_LABEL_RE.match(t)]
        body = [r for r, t in inband if r not in labels]
        if op == 'text':
            drop = body
        elif op in ('older', 'newer'):
            # Cả khung dòng (không chỉ lõi): đỉnh chữ của dòng câu sau ló vào dải cũng phải bỏ.
            touch = [r for r, t in lines if t and r.intersects(band) and r not in labels]
            drop = [r for r in touch if (r.y0 < ycut[0]) == (op == 'older')]
        else:
            # Nhãn in chồng lên chữ thân bài thì giữ (như bản gốc) — xóa nó sẽ xóa lây chữ.
            drop = [r for r in labels if not any(core(r).intersects(b) for b in body)]
        for r in drop:
            # Thu hẹp theo chiều dọc để không xóa lây chữ của dòng sát trên/dưới.
            page.add_redact_annot(core(r), fill=False)
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, graphics=fitz.PDF_REDACT_LINE_ART_NONE)
    for op, fig, *_ in ops:
        if op == 'fig':
            page.add_redact_annot(fig, fill=False)
    page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE, text=fitz.PDF_REDACT_TEXT_NONE,
                          graphics=fitz.PDF_REDACT_LINE_ART_REMOVE_IF_TOUCHED)
    page.tmp_doc = tmp  # giữ tài liệu tạm sống tới khi render xong
    return page


def strip_slivers(im):
    """Bỏ vệt chân chữ của dòng liền trước/sau dính ở mép ảnh (như crop.py)."""
    rows = (np.asarray(im.convert('L')) < 200).sum(axis=1) > 0
    H = len(rows)

    def cut(rows):
        k = 0
        while k < min(14, H) and not rows[k]:
            k += 1
        if k >= min(14, H):
            return 0
        j = k
        while j < min(16, H) and rows[j]:
            j += 1
        g = j
        while g < H and not rows[g]:
            g += 1
        return g - 2 if k <= 8 and (j - k) <= 9 and g - j >= 4 and g < H else 0

    t, b = cut(rows), cut(rows[::-1])
    return im.crop((0, t, im.width, H - b)) if t or b else im


def trim(im):
    g = ImageOps.grayscale(im).point(lambda v: 0 if v > 235 else 255)
    box = g.getbbox()
    if not box:
        return None
    x0, y0, x1, y1 = box
    pad = 10
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def render(doc, segs, stem):
    files = []
    for pn, a, b, ops in segs:
        if b - a < 8:
            continue
        pix = page_for(doc, pn, ops).get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), clip=fitz.Rect(30, a, 575, b))
        im = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        if (np.asarray(im.convert('L')) < 160).sum() < 120:
            continue
        im = trim(im)
        if im is not None and im.height > 40:
            im = trim(strip_slivers(im))
        if im is None or im.height < 14:
            continue
        name = f'{SUB}/{stem}{"" if not files else "-" + str(len(files) + 1)}.webp'
        im.save(os.path.join(IMG_DIR, name), 'WEBP', quality=72, method=6)
        files.append([name, im.width, im.height])
    return files


def strip_background(doc):
    """Nền trang (ảnh 500×500 có watermark tên GV + SĐT) → điểm ảnh trắng."""
    blank = fitz.Pixmap(fitz.csRGB, fitz.IRect(0, 0, 1, 1), False)
    blank.clear_with(255)
    done = set()
    for _, _, p0, p1 in EXAMS:
        for pn in range(p0, p1 + 1):
            page = doc[pn - 1]
            for x in page.get_images(full=True):
                if (x[2], x[3]) == (500, 500) and x[0] not in done:
                    page.replace_image(x[0], pixmap=blank)
                    done.add(x[0])


def take_tf_answers(doc):
    """Bảng Đúng/Sai có sẵn dấu X ở ô đáp án: đọc thành đáp án rồi xóa khỏi trang.

    Trả về {(trang, y đầu bảng): 'a) Sai · b) Đúng …'}; câu nào chứa bảng đó nhận đáp án.
    """
    keys = {}
    for _, _, p0, p1 in EXAMS:
        for pn in range(p0, p1 + 1):
            page = doc[pn - 1]
            words = page.get_text('words')
            head = {w[4]: w for w in words if w[4] in ('Đúng', 'Sai')}
            if len(head) < 2:
                continue
            xd, xs = (head['Đúng'][0] + head['Đúng'][2]) / 2, (head['Sai'][0] + head['Sai'][2]) / 2
            top = min(head['Đúng'][1], head['Sai'][1])
            marks = sorted((w for w in words if w[4] in ('X', 'x') and w[1] > top
                            and min(abs((w[0] + w[2]) / 2 - xd), abs((w[0] + w[2]) / 2 - xs)) < 20),
                           key=lambda w: w[1])
            if not marks:
                continue
            ans = []
            for i, w in enumerate(marks):
                cx = (w[0] + w[2]) / 2
                ans.append(f'{"abcdefgh"[i]}) {"Đúng" if abs(cx - xd) < abs(cx - xs) else "Sai"}')
                # fill=False: chỉ xóa chữ X, không tô trắng đè lên viền bảng
                page.add_redact_annot(fitz.Rect(w[:4]), fill=False)
            page.apply_redactions(images=fitz.PDF_REDACT_IMAGE_NONE,
                                  graphics=fitz.PDF_REDACT_LINE_ART_NONE)
            keys[(pn, top)] = ' · '.join(ans)
    return keys


def level(part, idx, n, text, is_last):
    if part == 'tn':
        return 'N' if idx < n / 2 else 'H'
    if is_last or re.search(r'chứng (minh|tỏ)|nhỏ nhất|lớn nhất|quy luật|tổng số hình', text, re.I):
        return 'T'
    return 'H' if idx < n * 0.34 else 'V'


def build():
    doc = fitz.open(PDF)
    strip_background(doc)
    tf_keys = take_tf_answers(doc)
    os.makedirs(os.path.join(IMG_DIR, SUB), exist_ok=True)
    for f in os.listdir(os.path.join(IMG_DIR, SUB)):
        os.remove(os.path.join(IMG_DIR, SUB, f))

    exams, items = [], []
    for etype, no, p0, p1 in EXAMS:
        eid = f'g6a-{etype}-{no}'
        marks, rows = scan_exam(doc, p0, p1)
        part = 'tn'
        parts = []          # [{p, title}]
        qs = []
        for i, (kind, pn, y, t, hang, ty) in enumerate(marks):
            if kind == 'sec':
                if re.search(r'tự luận', t, re.I):
                    part = 'tl'
                else:
                    part = 'tn'
                pts = PTS_RE.search(t)
                title = re.split(r'\)\s*', t, maxsplit=1)[0] + (')' if pts else '')
                parts.append({'p': part, 'title': clean_text(title)})
                continue
            nxt = marks[i + 1] if i + 1 < len(marks) else ('end', p1, BOTTOM, '', None, BOTTOM)
            segs = [(page, y if page == pn else TOP, nxt[2] - 1 if page == nxt[1] else BOTTOM, [])
                    for page in range(pn, nxt[1] + 1)]
            text = ' '.join(r[2] for r in rows
                            if (pn, ty - 9) <= (r[0], r[1]) < (nxt[1], nxt[5] - 9))
            m = Q_RE.match(t)
            pts = PTS_RE.search(t)
            qs.append({'part': part, 'label': f'{m.group(1)} {m.group(2)}', 'segs': segs, 'hang': hang,
                       'text': re.sub(r'\s+', ' ', text).strip(), 'pt': pts.group(1) if pts else None})
        # Đề không ghi tiêu đề phần tự luận (hiếm) → mọi "Bài" là tự luận.
        for q in qs:
            if q['label'].startswith('Bài'):
                q['part'] = 'tl'
        hanging_parts(qs)
        side_figures(doc, qs)
        for part in ('tn', 'tl'):
            group = [q for q in qs if q['part'] == part]
            for j, q in enumerate(group):
                stem = f'{etype.lower()}-{no}-{len(items) + 1:03d}'
                img = render(doc, q['segs'], stem)
                if not img:
                    print('  ! không cắt được', eid, q['label'], file=sys.stderr)
                    continue
                word, num = q['label'].split()
                qid = f'{eid}-{word[0].lower()}{num}'
                o = {'id': qid, 'g': 6, 'k': part, 'n': q['label'],
                     'lv': level(part, j, len(group), q['text'], j == len(group) - 1 and part == 'tl'),
                     'img': img, 't': TOPIC_OVERRIDES.get(qid) or guess_topic(q['text'], etype),
                     'd': f'{TYPE_SHORT[etype]} · Đề {no}', 'ex': eid, 'p': part, 'q': clean_text(q['text'])}
                if q['pt']:
                    o['pt'] = q['pt']
                key = next((v for (pn, y), v in tf_keys.items()
                            if any(s[0] == pn and s[1] <= y < s[2] for s in q['segs'])), None)
                if key:
                    o['key'] = key
                items.append(o)
        sec_tn = next((s['title'] for s in parts if s['p'] == 'tn'), 'Phần I. Trắc nghiệm')
        sec_tl = next((s['title'] for s in parts if s['p'] == 'tl'), 'Phần II. Tự luận')
        exams.append({'id': eid, 'g': 6, 'type': etype, 'no': no, 'title': TYPE_TITLE[etype],
                      'time': 90, 'src': 0, 'pages': [p0, p1],
                      'parts': {'tn': sec_tn, 'tl': sec_tl}})
        n_tn = sum(1 for o in items if o['ex'] == eid and o['p'] == 'tn')
        n_tl = sum(1 for o in items if o['ex'] == eid and o['p'] == 'tl')
        print(f'{eid}: {n_tn} trắc nghiệm, {n_tl} tự luận')
    return exams, items


def patch_bank(exams, items):
    src = open(BANK, encoding='utf-8').read()
    head, _, body = src.partition('window.AM_EXERCISE_BANK = ')
    bank = json.loads(body.rstrip().rstrip(';'))
    old = [x for x in bank['items'] if x['id'].startswith('g6a-') and (x.get('k') == 'exam' or x.get('ex'))]
    old_ids = {x['id'] for x in old}
    at = next((i for i, x in enumerate(bank['items']) if x['id'] in old_ids), len(bank['items']))
    rest = [x for x in bank['items'] if x['id'] not in old_ids]
    at = sum(1 for x in bank['items'][:at] if x['id'] not in old_ids)
    bank['items'] = rest[:at] + items + rest[at:]
    bank['exams'] = exams
    # Ảnh nguyên đề cũ (g6a/0580.webp …) không còn dùng.
    for x in old:
        for im in x['img']:
            if not im[0].startswith(SUB + '/'):
                p = os.path.join(IMG_DIR, im[0])
                if os.path.exists(p):
                    os.remove(p)
    out = head + 'window.AM_EXERCISE_BANK = ' + json.dumps(bank, ensure_ascii=False, separators=(',', ':')) + ';\n'
    open(BANK, 'w', encoding='utf-8', newline='\n').write(out)
    print(f'exercises.js: bỏ {len(old)} mục đề cũ, thêm {len(items)} câu từ {len(exams)} đề')


if __name__ == '__main__':
    patch_bank(*build())
