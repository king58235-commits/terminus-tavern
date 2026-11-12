import sys, numpy as np
from PIL import Image
src, dst, key, H = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4])
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float32)
k = np.array({'magenta':(255,0,255),'green':(0,255,0)}[key], np.float32)
d = np.sqrt(((a - k) ** 2).sum(2))
alpha = np.clip((d - 90) / (180 - 90), 0, 1)           # 柔邊
out = a.copy()
# 去色溢：邊緣半透明像素把鍵色成分壓掉
edge = (alpha > 0) & (alpha < 1)
if key == 'magenta':
    m = np.minimum(out[...,0], out[...,2]); g = out[...,1]
    ex = np.clip(m - g, 0, None) * (1 - alpha)
    out[...,0] -= ex * edge; out[...,2] -= ex * edge
else:
    ex = np.clip(out[...,1] - np.maximum(out[...,0], out[...,2]), 0, None)
    out[...,1] -= ex * edge
rgba = np.dstack([np.clip(out,0,255), alpha*255]).astype(np.uint8)
img = Image.fromarray(rgba, 'RGBA')
bbox = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
img = img.crop(bbox)
w = round(img.width * H / img.height); img = img.resize((w, H), Image.LANCZOS)
img.save(dst, optimize=True); print(dst, img.size)
