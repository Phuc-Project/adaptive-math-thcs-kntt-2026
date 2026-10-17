import json, os, sys, re
from PIL import Image, ImageOps, ImageChops
WORK = os.path.expanduser('~/work')
SCALE = 2.0  # 144 dpi renders
OUT = sys.argv[1] if len(sys.argv) > 1 else f'{WORK}/out'
LIMIT = int(sys.argv[2]) if len(sys.argv) > 2 else 0
ONLY = sys.argv[3].split(',') if len(sys.argv) > 3 else None
data = json.load(open(f'{WORK}/extract.json', encoding='utf-8'))
_cache = {}
def page_img(fid, n, npages):
    key = (fid, n)
    if key not in _cache:
        if len(_cache) > 6: _cache.clear()
        w = len(str(npages))
        _cache[key] = Image.open(f'{WORK}/pages/{fid}/p-{str(n).zfill(w)}.png').convert('RGB')
    return _cache[key]

def segments(item, bounds, last_page):
    (p0, y0) = item['start']; (p1, y1) = item['end']
    if y1 is None: p1 = last_page; y1 = None
    segs = []
    for p in range(p0, p1 + 1):
        top, bot, W, H = bounds[str(p)] if str(p) in bounds else bounds[p]
        a = (y0 - 3) if p == p0 else top
        b = (y1 - 2) if (p == p1 and y1 is not None) else bot
        if b - a > 8: segs.append((p, a, b, W))
    return segs

import numpy as np
_tpl = {}
def template(fid):
    if fid not in _tpl:
        _tpl[fid] = np.asarray(Image.open(f'{WORK}/pages/{fid[0]}/template{fid[1]}.png').convert('RGB')).astype(np.int16)
    return _tpl[fid]

def clean_bg(arr, tpl):
    a = arr.astype(np.int16)
    h = min(a.shape[0], tpl.shape[0]); w = min(a.shape[1], tpl.shape[1])
    t = tpl[:h, :w]; aa = a[:h, :w]
    tlum = t.mean(axis=2)
    diff = np.abs(aa - t).max(axis=2)
    m = (tlum < 245) & (diff < 48)
    aa[m] = 255
    lum = aa.mean(axis=2)
    aa[lum > 228] = 255
    a[:h, :w] = aa
    return a.astype(np.uint8)

def strip_slivers(im):
    a = np.asarray(im.convert('L')) < 200
    rows = a.sum(axis=1) > 0
    H = len(rows)
    def cut_top(rows):
        # ink within the first 14px followed by >=4 blank rows -> drop the sliver
        k = 0
        while k < min(14, H) and not rows[k]: k += 1
        if k >= min(14, H): return 0
        j = k
        while j < min(16, H) and rows[j]: j += 1
        g = j
        while g < H and not rows[g]: g += 1
        if k <= 8 and (j - k) <= 9 and g - j >= 4 and g < H: return g - 2
        return 0
    t = cut_top(rows)
    b = cut_top(rows[::-1])
    if t or b:
        im = im.crop((0, t, im.width, H - b))
    return im

def trim(im):
    g = ImageOps.grayscale(im)
    # treat near-white as background
    bw = g.point(lambda v: 255 if v > 235 else 0)
    inv = ImageOps.invert(bw)
    box = inv.getbbox()
    if not box: return None
    x0, y0, x1, y1 = box
    pad = 10
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))

def render(fid, item, bounds, npages, stem):
    files = []
    for k, (p, a, b, W) in enumerate(segments(item, bounds, npages)):
        img = page_img(fid, p, npages)
        x0, x1 = 24 * SCALE, (W - 20) * SCALE
        X0, Y0, X1, Y1 = int(x0), int(max(0, a) * SCALE), int(x1), int(b * SCALE)
        arr = np.asarray(img)[Y0:Y1, X0:X1]
        tpl = template((fid, (p - 1) % 2))[Y0:Y1, X0:X1]
        c = Image.fromarray(clean_bg(arr, tpl))
        ink = (np.asarray(c.convert('L')) < 160).sum()
        if ink < 120: continue
        c = trim(strip_slivers(c)) if c.height > 40 else trim(c)
        if c is None or c.height < 14: continue
        name = f'{stem}{"" if k == 0 else "-" + str(k + 1)}.webp'
        c.save(os.path.join(OUT, name), 'WEBP', quality=72, method=6)
        files.append({'f': name, 'w': c.width, 'h': c.height})
    return files

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    manifest = {}
    for fid, res in data.items():
        if ONLY and fid not in ONLY: continue
        npages = max(int(k) for k in res['bounds'].keys())
        os.makedirs(os.path.join(OUT, fid), exist_ok=True)
        for idx, it in enumerate(res['items']):
            if LIMIT and idx >= LIMIT: break
            stem = f'{fid}/{idx:04d}'
            it['img'] = render(fid, it, res['bounds'], npages, stem)
            sol_imgs = []
            for k, sv in enumerate(it.get('solutions') or []):
                sol_imgs += render(fid, sv, res['bounds'], npages, stem + 's' + ('' if k == 0 else str(k + 1)))
            it['solImg'] = sol_imgs
        manifest[fid] = [{'img': it.get('img'), 'sol': it.get('solImg') or None} for it in res['items']]
        print(fid, 'done', flush=True)
    json.dump(manifest, open(os.path.join(WORK, f'manifest-{"_".join(ONLY) if ONLY else "all"}.json'), 'w'), ensure_ascii=False)
