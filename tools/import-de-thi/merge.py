"""Bước 3: vá đề mới (out/new.json) vào data/exercises.js của repo — chạy lại nhiều lần cho cùng kết quả.

    python merge.py <thư mục repo> <out/new.json>

- Xóa các đề/câu đã vá lần trước (mã đề bắt đầu bằng 'd<khối>-'), rồi ghi lại.
- Đánh số đề tiếp nối các đề sẵn có cùng khối + loại (vd lớp 6 đã có 5 đề cuối HK I → đề mới là Đề 6, 7…).
- Thêm một nguồn vào `sources`, giữ nguyên mọi bài tập khác.
"""
import json, os, re, sys

repo, newp = sys.argv[1], sys.argv[2]
path = os.path.join(repo, 'data', 'exercises.js')
raw = open(path, encoding='utf-8').read()
head, body = raw.split('\n', 1) if raw.startswith('/*') else ('', raw)
i, j = body.index('{'), body.rindex('}')
bank = json.loads(body[i:j + 1])
new = json.load(open(newp, encoding='utf-8'))

NEW_ID = re.compile(r'^d\d-')
bank['exams'] = [e for e in bank['exams'] if not NEW_ID.match(e['id'])]
bank['items'] = [x for x in bank['items'] if not NEW_ID.match(x.get('ex') or '')]

SRC = 'Đề kiểm tra giữa kì, cuối kì lớp 6–9 và đề ôn thi vào 10 (bộ sưu tầm 2025–2026)'
if SRC not in bank['sources']:
    bank['sources'].append(SRC)
src_idx = bank['sources'].index(SRC)

SHORT = {'GK1': 'Giữa HK I', 'CK1': 'Cuối HK I', 'GK2': 'Giữa HK II', 'CK2': 'Cuối HK II', 'V10': 'Thi vào 10'}
have = {}
for e in bank['exams']:
    have[(e['g'], e['type'])] = max(have.get((e['g'], e['type']), 0), e['no'])
renum = {}
for e in new['exams']:
    k = (e['g'], e['type'])
    have[k] = have.get(k, 0) + 1
    e['no'] = have[k]
    e['src'] = src_idx
    renum[e['id']] = '%s · Đề %d' % (SHORT[e['type']], e['no'])
for x in new['items']:
    x['d'] = renum[x['ex']]

# Kho đề không hiện tên trường: `from` chỉ giữ năm học; chữ trích (q) bỏ tên trường / phòng / sở GD.
YEAR = re.compile(r'(20\d\d)\s*[–-]\s*(20\d\d)')
SCHOOL = re.compile(r'\b(trường|Trường|TRƯỜNG)\s+(THCS|THPT|PT\s*DTNT|PTDTNT|TH\s*[-–&]\s*THCS|TRUNG HỌC CƠ SỞ)'
                    r'(\s+(?!năm|Năm|NĂM|được|có|từ)[A-ZĐÂĂÊÔƠƯ][\wÀ-ỹ.]*){1,4}')
UNIT = re.compile(r'(PHÒNG\s*(GD|GIÁO)[^\s]*|UBND|SỞ\s*(GD|GIÁO)[^\s]*)((\s+[A-ZĐÂĂÊÔƠƯÀ-Ỹ&.]+){0,6})')
for e in new['exams']:
    m = YEAR.search(e.get('from') or '')
    e['from'] = ('Năm học %s–%s' % m.groups()) if m else ''
for x in new['items']:
    if x.get('q'):
        x['q'] = UNIT.sub('', SCHOOL.sub(lambda m: m.group(1) + ' ' + m.group(2), x['q']))

order = {'GK1': 0, 'CK1': 1, 'GK2': 2, 'CK2': 3, 'V10': 4}
bank['exams'] = sorted(bank['exams'] + new['exams'], key=lambda e: (e['g'], order[e['type']], e['no']))
bank['items'] += new['items']

out = (head + '\n' if head else '') + 'window.AM_EXERCISE_BANK = ' + \
    json.dumps(bank, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(path, 'w', encoding='utf-8').write(out)
print('exams', len(bank['exams']), 'items', len(bank['items']), 'new exams', len(new['exams']), 'new items', len(new['items']))
