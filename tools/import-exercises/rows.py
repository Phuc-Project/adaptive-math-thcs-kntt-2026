import sys, json, re, html
from xml.etree import ElementTree as ET
# Build visual rows from pdftotext -bbox-layout output.
def parse(path):
    raw = open(path, encoding='utf-8', errors='replace').read()
    raw = re.sub(r'<!DOCTYPE[^>]*>', '', raw)
    raw = raw.replace('xmlns="http://www.w3.org/1999/xhtml"', '')
    root = ET.fromstring(raw)
    pages = []
    for pi, page in enumerate(root.iter('page')):
        W = float(page.get('width')); H = float(page.get('height'))
        words = []
        for w in page.iter('word'):
            t = (w.text or '').strip()
            if not t: continue
            words.append((float(w.get('xMin')), float(w.get('yMin')), float(w.get('xMax')), float(w.get('yMax')), t))
        # group into rows by vertical overlap of center
        words.sort(key=lambda w: ((w[1]+w[3])/2, w[0]))
        rows = []
        for w in words:
            cy = (w[1]+w[3])/2; h = w[3]-w[1]
            placed = False
            for r in rows[-6:]:
                rcy = (r['y0']+r['y1'])/2
                if abs(cy - rcy) < max(2.5, 0.35*min(h, r['y1']-r['y0'])):
                    r['w'].append(w); r['y0']=min(r['y0'],w[1]); r['y1']=max(r['y1'],w[3]); placed=True; break
            if not placed:
                rows.append({'y0':w[1],'y1':w[3],'w':[w]})
        out = []
        for r in rows:
            ws = sorted(r['w'], key=lambda w: w[0])
            text = ' '.join(w[4] for w in ws)
            out.append({'y0':round(r['y0'],1),'y1':round(r['y1'],1),'x0':round(ws[0][0],1),'x1':round(max(w[2] for w in ws),1),'t':text,
                        'hmed': round(sorted([w[3]-w[1] for w in ws])[len(ws)//2],1)})
        out.sort(key=lambda r: r['y0'])
        pages.append({'n':pi+1,'W':W,'H':H,'rows':out})
    return pages
if __name__ == '__main__':
    src, dst = sys.argv[1], sys.argv[2]
    json.dump(parse(src), open(dst,'w',encoding='utf-8'), ensure_ascii=False)
