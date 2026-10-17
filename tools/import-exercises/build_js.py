import json, re, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from mapping import FILES
WORK = os.path.expanduser('~/work')
ROOT = os.path.expanduser('~/mnt/adaptivemath-main')
d = json.load(open(f'{WORK}/extract.json', encoding='utf-8'))
man = json.load(open(f'{WORK}/manifest.json'))

# topic chapter numbers from topics.js
tj = open(f'{ROOT}/js/core/topics.js', encoding='utf-8').read()
TOPIC_CH = {m.group(1): int(m.group(3)) for m in re.finditer(r'\["([0-9]+-C[0-9]+-B[0-9]+)", (\d+), (\d+), (\d+)', tj)}

FIX = [('euclid', 'Euclid'), ('thalès', 'Thalès'), ('pythagore', 'Pythagore'), ('vi – ét', 'Vi-ét'), ('y = ax , a 0', 'y = ax² (a ≠ 0)'),
       ('hiệu hai bình phương,', 'Hiệu hai bình phương, bình phương của một tổng hay một hiệu')]
def nice(title):
    t = title.strip().lower()
    for a, b in FIX: t = t.replace(a, b)
    t = re.sub(r'\s+', ' ', t)
    return t[:1].upper() + t[1:]

HARD = re.compile(r'chứng minh|lớn nhất|nhỏ nhất|GTLN|GTNN|với mọi|nguyên tố cùng nhau|tìm số tự nhiên n|tìm n\b|tìm các số nguyên n|tham số', re.I)
REAL = re.compile(r'\b(km|giờ|học sinh|người|mua|bán|giá|tiền|đồng|xe|lớp|cửa hàng|mét|tấn|sản phẩm)\b', re.I)

lessons_out = []; items_out = []; sources = []
stats = {}
for fi, (fid, grade, source, _) in enumerate(FILES):
    res = d[fid]; sources.append(source)
    lesson_ids = {}
    for L in res['lessons']:
        lid = f"{fid}-L{L['idx']:02d}"
        lesson_ids[L['idx']] = lid
        lessons_out.append({'id': lid, 'g': grade, 't': L['topicId'], 'title': nice(L['title']), 'src': fi})
    # level estimation needs per-lesson ordering
    by_lesson = {}
    for i, it in enumerate(res['items']):
        by_lesson.setdefault((it['lesson'], it['kind']), []).append(i)
    last_ch = None
    for i, it in enumerate(res['items']):
        m = man[fid][i]
        if not m['img']: continue
        L = res['lessons'][it['lesson']] if it['lesson'] is not None else None
        kind = it['kind']
        topic = L['topicId'] if (L and kind not in ('exam', 'review')) else None
        ch = TOPIC_CH.get(L['topicId']) if L else None
        text = ' '.join(it['rows'])
        text = re.sub(r'\s+', ' ', text).strip()
        # level guess
        seq = by_lesson.get((it['lesson'], kind), [i]); pos = seq.index(i) / max(1, len(seq) - 1) if len(seq) > 1 else 0.0
        if kind == 'tn': lv = 'N' if pos < 0.5 else 'H'
        elif kind == 'mau': lv = 'H'
        elif kind in ('review', 'exam'): lv = 'V'
        else: lv = 'H' if pos < 0.34 else ('V' if pos < 0.75 else 'T')
        if kind in ('tl', 'review') and HARD.search(text): lv = 'T'
        elif kind == 'tl' and lv == 'H' and REAL.search(text): lv = 'V'
        o = {'id': f'{fid}-{i:04d}', 'g': grade, 'k': kind, 'n': it['label'], 'lv': lv,
             'img': [[x['f'], x['w'], x['h']] for x in m['img']]}
        if topic: o['t'] = topic
        if it['lesson'] is not None and kind != 'exam': o['l'] = lesson_ids[it['lesson']]
        if kind == 'review' and ch: o['ch'] = ch
        if it.get('dang'): o['d'] = it['dang'][:80]
        if it.get('answer'): o['ans'] = it['answer']
        if m.get('sol'): o['sol'] = [[x['f'], x['w'], x['h']] for x in m['sol']]
        if kind == 'exam': o['n'] = it['label']
        o['q'] = text[:160]
        items_out.append(o)
        stats[grade] = stats.get(grade, 0) + 1

bank = {'builtAt': '2026-10-17', 'imgBase': 'data/exercises/img/', 'sources': sources,
        'lessons': lessons_out, 'items': items_out}
js = '/* Ngân hàng bài tập tự luyện THCS 6–9, tách tự động từ tài liệu PDF trong data/ (tools/import-exercises). */\n'
js += 'window.AM_EXERCISE_BANK = ' + json.dumps(bank, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(f'{ROOT}/data/exercises.js', 'w', encoding='utf-8').write(js)
print('items', len(items_out), 'lessons', len(lessons_out), 'by grade', stats, 'bytes', len(js.encode()))
from collections import Counter
print(Counter((o['g'], o['k']) for o in items_out))
print(Counter((o['g'], o['lv']) for o in items_out))
missing = [l for l in lessons_out if not l['t']]
print('lessons without topic', missing)
tcount = Counter(o.get('t') for o in items_out)
alltopics = set(TOPIC_CH)
print('topics with 0 exercises:', sorted(alltopics - set(tcount)))
