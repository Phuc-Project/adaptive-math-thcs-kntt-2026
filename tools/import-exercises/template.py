import numpy as np, os, sys, glob
from PIL import Image
WORK = os.path.expanduser('~/work')
for fid in sys.argv[1:]:
    allf = sorted(glob.glob(f'{WORK}/pages/{fid}/p-*.png'))
    for par in (0, 1):
        files = allf[par::2]  # par 0 -> pages 1,3,5 ; par 1 -> pages 2,4,6
        pick = files[1::max(1, len(files)//24)][:24]
        imgs = [np.asarray(Image.open(f).convert('RGB')) for f in pick]
        h = min(i.shape[0] for i in imgs); w = min(i.shape[1] for i in imgs)
        out = np.zeros((h, w, 3), np.uint8)
        for y in range(0, h, 150):
            stack = np.stack([i[y:y+150, :w] for i in imgs])
            out[y:y+150] = np.median(stack, axis=0).astype(np.uint8)
        Image.fromarray(out).save(f'{WORK}/pages/{fid}/template{par}.png')
        print(fid, par, len(pick), int((out.mean(axis=2) < 240).sum()))
