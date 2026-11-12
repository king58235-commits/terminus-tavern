"""把 Codex 生成的 2x8 像素小人圖（洋紅背景）切格、縮成原生像素並收斂色盤。
用法: python slice_sprite.py 原圖.png sprites/<id>.png 32 40 38 30 24
       （格寬 格高 腳底基準線 角色高度 色數 [magenta|green] [hires]）
高解析建議: ... 192 240 228 210 0 magenta hires"""
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst, FW, FH, BASE, TARGET_H, NCOL = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), int(sys.argv[5]), int(sys.argv[6]), int(sys.argv[7])
HIRES = len(sys.argv) > 9 and sys.argv[9] == 'hires'   # 高解析模式：保留細節與平滑邊緣，不收斂色盤
KEY = {'magenta': (255, 0, 255), 'green': (0, 255, 0)}[sys.argv[8] if len(sys.argv) > 8 else 'magenta']
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float32)
d = np.sqrt(((a - np.array(KEY, np.float32)) ** 2).sum(2))
mask = (d > 110)
m_img = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3))   # 去掉邊緣洋紅殘留
mask = np.asarray(m_img) > 128

def runs(v):
    r = []; s = None
    for i, x in enumerate(v):
        if x and s is None: s = i
        if not x and s is not None: r.append((s, i)); s = None
    if s is not None: r.append((s, len(v)))
    return r
rowruns = [r for r in runs(mask.any(1)) if r[1] - r[0] > 40]
assert len(rowruns) == 2, rowruns
cells = []
for (y0, y1) in rowruns:
    cr = [c for c in runs(mask[y0:y1].any(0)) if c[1] - c[0] > 30]
    assert len(cr) == 8, cr
    cells.append([(x0, y0, x1, y1) for (x0, x1) in cr])

# 統一縮放：以待機第一格高度為準
h0 = cells[0][0][3] - cells[0][0][1]
scale = TARGET_H / h0
print('scale', scale, 'idle height', h0)

sheet = Image.new('RGBA', (FW * 8, FH * 2), (0, 0, 0, 0))
rgb_all = []
tmp = []
for ri, row in enumerate(cells):
    bottoms = sorted(c[3] for c in row); base_src = bottoms[len(bottoms) // 2]
    for ci, (x0, y0, x1, y1) in enumerate(row):
        sub = mask[y0:y1, x0:x1]
        ys, xs = np.nonzero(sub)
        low = ys > ys.min() + (ys.max() - ys.min()) * 0.65            # 只看下半身（腳、凳子），避免手臂/披風晃動造成偏移
        cx = xs[low].mean() + x0                                      # 以腳部重心對齊 x
        pad = 4
        box = (x0 - pad, y0 - pad, x1 + pad, y1 + pad)
        rgb = a[box[1]:box[3], box[0]:box[2]].copy()
        al = mask[box[1]:box[3], box[0]:box[2]].astype(np.float32)
        pm = np.dstack([rgb * al[..., None], al * 255])
        w = int(round((box[2] - box[0]) * scale)); h = int(round((box[3] - box[1]) * scale))
        chans = [Image.fromarray(pm[..., k]).resize((w, h), Image.BOX) for k in range(4)]
        P = np.dstack([np.asarray(c).astype(np.float32) for c in chans])
        A = P[..., 3] / 255.0
        out = np.zeros((h, w, 4), np.uint8)
        ok = A > (0.02 if HIRES else 0.5)
        out[..., :3][ok] = np.clip(P[..., :3][ok] / A[ok][:, None], 0, 255)
        out[..., 3][ok] = (np.clip(A[ok] * 255, 0, 255) if HIRES else 255)
        tile = Image.fromarray(out, 'RGBA')
        # 放進格子：質心對齊中線、共同基準線對齊 BASE
        px = int(round(FW / 2 - (cx - box[0]) * scale)); py = int(round(BASE - (base_src - box[1]) * scale))
        sheet.alpha_composite(tile, (ci * FW + px, ri * FH + py)) if (px >= 0 and py >= 0 and px + w <= FW and py + h <= FH) else sheet.paste(tile, (ci * FW + px, ri * FH + py), tile)

# 色盤收斂（高解析模式略過）
if HIRES:
    sheet.save(dst, optimize=True); print(dst, sheet.size); sys.exit(0)
arr = np.asarray(sheet).copy(); fg = arr[..., 3] > 0
q = Image.fromarray(arr[..., :3]).quantize(colors=NCOL, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
qa = np.asarray(q); arr[..., :3][fg] = qa[fg]; arr[..., 3] = np.where(fg, 255, 0)
sheet = Image.fromarray(arr, 'RGBA'); sheet.save(dst, optimize=True)
print(dst, sheet.size)
