import json, re, os, sys, unicodedata
sys.path.insert(0, os.path.dirname(__file__))
from mapping import RULES, FILES

WORK = os.path.expanduser('~/work')
NOISE = re.compile(r'0358952666|0978207193|lưu hành nội bộ|TRÊN CON ĐƯỜNG THÀNH CÔNG|Trên con đường thành công|detoan\.com|Website|Liên hệ tài liệu|Điện thoại \(Zalo\)|Lớp Toán cô Tuyến|GV: Lê Thị Tuyến|dấu chân của kẻ lười biếng', re.I)
PUA = re.compile('[-�]')
CH = re.compile(r'^\s*(CHƯƠNG|Chương)\s*([0-9]+|[IVXL]+)\b')
LES = re.compile(r'^\s*(BÀI|Bài)\s*([0-9]+)\s*[\.:]?\s*(.*)$')
SEC = re.compile(r'^\s*([A-E]|I{1,3}|IV|V)\s*[\.\)]\s*(.*)$')
EX = re.compile(r'^\s*(Bài tập|Bài|Câu)\s*([0-9]+)\s*([\.:\)]|$)\s*(.*)$')
DANG = re.compile(r'^\s*(Dạng|DẠNG)\s*\d+')

def upper_ratio(s):
    letters = [c for c in s if c.isalpha()]
    if not letters: return 0
    return sum(1 for c in letters if c == c.upper()) / len(letters)

def clean(s):
    s = PUA.sub(' ', s)
    return re.sub(r'\s+', ' ', s).strip()

def line_top(rows, i):
    r = rows[i]; top = r['y0']
    for j in range(max(0, i - 6), i):
        q = rows[j]
        if q.get('noise'): continue
        if q['y0'] < r['y0'] and q['y1'] > r['y0'] + 1 and q['y0'] > r['y0'] - 22:
            top = min(top, q['y0'])
    return top

def map_topic(grade, title):
    T = unicodedata.normalize('NFC', title.upper()).strip(' .,:')
    for rx, tid in RULES[grade]:
        if re.search(rx, T): return tid
    return None

SECKW = re.compile(r'^\s*(LÝ\s*TH|TÓM TẮT|BÀI T|LUYỆN TẬP|TRẮC NGHIỆM|TỰ LUẬN|CÂU HỎI TRẮC|PHẦN TỰ LUẬN|PHẦN TRẮC|CÁC DẠNG)', re.I)
def classify_sec(text):
    if not SECKW.match(text): return None
    t = text.upper()
    if 'BÀI T' in t and 'MẪU' not in t and 'TỰ LUẬN' not in t and 'TRẮC' not in t: return 'tl'
    if 'LÝ TH' in t or 'TÓM TẮT' in t: return 'theory'
    if 'MẪU' in t or 'LUYỆN TẬP' in t and 'TỰ LUYỆN' not in t or 'CÁC DẠNG' in t: return 'mau'
    if 'TRẮC NGHIỆM' in t: return 'tn'
    if 'TỰ LUẬN' in t or 'TỰ LUYỆN' in t or 'BÀI TẬP' in t: return 'tl'
    return None

def process(fid, grade, source, default_mode):
    pages = json.load(open(f'{WORK}/rows/{fid}.json', encoding='utf-8'))
    events = []   # ordered: ('row', page, row) with classification
    # page content bounds
    bounds = {}
    for p in pages:
        H = p['H']; top = 22; bot = H - 22
        for r in p['rows']:
            noisy = bool(NOISE.search(r['t'])) or (re.fullmatch(r'\d{1,3}', r['t'].strip()) and (r['y0'] < 70 or r['y1'] > H - 70))
            r['noise'] = bool(noisy)
            if noisy:
                if r['y1'] < H * 0.2: top = max(top, r['y1'] + 2)
                elif r['y0'] > H * 0.8: bot = min(bot, r['y0'] - 2)
        clean_rows = [r for r in p['rows'] if not r['noise']]
        if clean_rows:
            top = max(top, min(r['y0'] for r in clean_rows) - 6)
            bot = min(bot, max(r['y1'] for r in clean_rows) + 8)
        bounds[p['n']] = (top, bot, p['W'], H)

    lessons = []; items = []; seen_titles = {}
    chapter = None; lesson = None; mode = 'skip'; dang = None
    in_solutions = False; sol_lesson = None
    exam = None
    cur = None   # current open item
    sol_store = {}  # (lessonIdx, kind, num, occ) -> segments
    sol_keys = {}   # lessonIdx -> [letters]
    occ = {}

    def close(at_page, at_y):
        nonlocal cur
        if cur is None: return
        cur['end'] = (at_page, at_y)
        if cur.get('_sol'):
            k = cur['_key']
            sol_store.setdefault(k, cur)
        else:
            items.append(cur)
        cur = None

    for p in pages:
        rows = p['rows']
        for i, r in enumerate(rows):
            if r['noise']: continue
            t = r['t']; n = p['n']; ty = line_top(rows, i) - 1
            nxt = None
            for j in range(i+1, min(i+4, len(rows))):
                if not rows[j]['noise']: nxt = rows[j]; break
            # --- chapter heading
            if CH.match(t) and (r['x0'] > 50 or upper_ratio(t) > 0.8):
                if not (fid == 'g8b' and n == 2):  # table of contents page
                    close(n, ty)
                    chapter = clean(t); exam = None
                    if mode == 'exam': mode = 'skip'
                continue
            # --- lesson heading
            m = LES.match(t); title = None
            if m:
                rest = m.group(3)
                letters = re.sub(r'[^A-Za-zÀ-ỹĐđ]', '', rest)
                if letters and upper_ratio(rest) > 0.85 and len(letters) >= 3 and not re.match(r'^\s*[a-d]\)', rest):
                    title = rest
                elif rest.strip() == '' and r['x0'] > 180 and nxt is not None and abs((nxt['x0']+nxt['x1'])/2 - p['W']/2) < 90 and upper_ratio(nxt['t']) > 0.4:
                    title = nxt['t']; nxt['_consumed'] = True
            if title is not None:
                close(n, ty)
                title = clean(title).strip(' .')
                key = re.sub(r'\W+', '', title.upper())[:40]
                if key in seen_titles and fid == 'g8b':
                    in_solutions = True; sol_lesson = seen_titles[key]; mode = 'sol'; occ = {}
                    continue
                tid = map_topic(grade, title)
                lesson = {'idx': len(lessons), 'title': title, 'topicId': tid, 'chapter': chapter, 'page': n, 'num': m.group(2)}
                lessons.append(lesson); seen_titles[key] = lesson['idx']
                mode = default_mode; dang = None; exam = None
                continue
            if r.get('_consumed'): continue
            # --- misc block headings
            U = t.upper()
            if len(t) < 90 and re.search(r'ĐỀ KIỂM TRA|ĐỀ THI|ĐỀ ÔN', U) and r['x0'] > 150:
                close(n, ty)
                if in_solutions: mode = 'skip'; continue
                mode = 'exam'; dang = None
                cur = {'kind': 'exam', 'label': clean(t).title(), 'num': None, 'start': (n, ty), 'lesson': lesson['idx'] if lesson else None,
                       'chapter': chapter, 'dang': None, 'rows': []}
                continue
            if len(t) < 60 and re.search(r'ÔN TẬP CHƯƠNG', U):
                close(n, ty); mode = 'review'; dang = None; continue
            if len(t) < 60 and re.search(r'BÀI TẬP RÈN LUYỆN|BÀI TẬP CUỐI', U):
                close(n, ty);
                if mode != 'sol': mode = 'tl'
                dang = 'Bài tập rèn luyện'; continue
            if mode == 'exam':
                if cur is not None: cur['rows'].append(clean(t))
                continue
            # --- section headings
            m = SEC.match(t)
            if m and len(t) < 110:
                kind = classify_sec(m.group(2))
                if kind:
                    close(n, ty)
                    if mode == 'sol': continue
                    if mode != 'review' or kind == 'theory': mode = kind
                    dang = None
                    continue
            if DANG.match(t) and len(t) < 120:
                close(n, ty); dang = clean(t).rstrip('.:'); continue
            if in_solutions and re.match(r'^\s*Đáp án\b', t):
                close(n, ty)
                letters = re.findall(r'\b([A-D])\b', t[t.find('án')+2:])
                sol_keys.setdefault(sol_lesson, []).extend(letters)
                continue
            # --- exercise start
            m = EX.match(t)
            if m and r['x0'] < 200 and mode in ('mau', 'tn', 'tl', 'review', 'sol'):
                close(n, ty)
                word, num = m.group(1), int(m.group(2))
                if mode == 'sol':
                    k0 = (sol_lesson, 'tn' if word == 'Câu' else 'tl', num)
                    occ[k0] = occ.get(k0, 0) + 1
                    cur = {'_sol': True, '_key': k0 + (occ[k0],), 'start': (n, ty), 'rows': [clean(t)]}
                    continue
                kind = mode
                if word == 'Câu' and mode in ('tl', 'review'):
                    win = ' '.join(x['t'] for x in rows[i:i+9])
                    if re.search(r'(^|\s)A\.', win) and re.search(r'(^|\s)B\.', win): kind = 'tn'
                cur = {'kind': 'review' if mode == 'review' else kind, 'label': f"{word} {num}", 'num': num, 'start': (n, ty),
                       'lesson': lesson['idx'] if lesson else None, 'chapter': chapter, 'dang': dang, 'rows': [clean(t)]}
                continue
            if cur is not None:
                cur['rows'].append(clean(t))
    close(pages[-1]['n'], None)

    # side-by-side exercises ("Bài 7: ...   Bài 8: ...") share one crop
    for it in items:
        if it['num'] is None or it['kind'] == 'exam': continue
        word = it['label'].split(' ')[0] if not it['label'].startswith('Bài tập') else 'Bài tập'
        nums = [it['num']]
        text = ' '.join(it['rows'])
        for m in re.finditer(re.escape(word) + r'\s*(\d+)\s*[:.]', text):
            v = int(m.group(1))
            if v == nums[-1] + 1: nums.append(v)
        if len(nums) > 1:
            it['nums'] = nums
            it['label'] = f"{word} {nums[0]}–{nums[-1]}"
    # attach solutions (g8b)
    occ2 = {}
    tn_counter = {}
    for it in items:
        if it['lesson'] is None: continue
        k = (it['lesson'], 'tn' if it['kind'] == 'tn' else 'tl', it['num'])
        if it['kind'] in ('tn',):
            tn_counter[it['lesson']] = tn_counter.get(it['lesson'], 0) + 1
            it['_tnIndex'] = tn_counter[it['lesson']]
        if it['kind'] in ('tl', 'review'):
            sols = []
            for num in it.get('nums', [it['num']]):
                kk = (it['lesson'], 'tl', num)
                occ2[kk] = occ2.get(kk, 0) + 1
                sv = sol_store.get(kk + (occ2[kk],))
                if sv: sols.append(sv)
            if sols: it['solutions'] = sols
    for li, letters in sol_keys.items():
        tns = [it for it in items if it['lesson'] == li and it['kind'] == 'tn']
        if len(tns) == len(letters):
            for it, L in zip(tns, letters): it['answer'] = L
        else:
            print(f'  [warn] {fid} lesson {li}: {len(tns)} tn items vs {len(letters)} keys', file=sys.stderr)
    return {'fid': fid, 'grade': grade, 'source': source, 'lessons': lessons, 'items': items, 'bounds': bounds}

if __name__ == '__main__':
    out = {}
    for fid, grade, source, dm in FILES:
        res = process(fid, grade, source, dm)
        out[fid] = res
        kinds = {}
        for it in res['items']: kinds[it['kind']] = kinds.get(it['kind'], 0) + 1
        nsol = sum(1 for it in res['items'] if it.get('solutions')); nans = sum(1 for it in res['items'] if it.get('answer'))
        print(f"{fid}: lessons={len(res['lessons'])} items={len(res['items'])} {kinds} sol={nsol} ans={nans}")
        for L in res['lessons']:
            cnt = sum(1 for it in res['items'] if it['lesson'] == L['idx'])
            print(f"   L{L['idx']:02d} p{L['page']:>3} {str(L['topicId']):9} n={cnt:3}  {L['title'][:70]}")
    json.dump(out, open(f'{WORK}/extract.json', 'w', encoding='utf-8'), ensure_ascii=False, default=list)
