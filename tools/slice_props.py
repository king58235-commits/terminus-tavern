"""把 Codex 生成的家具組（洋紅背景、2 列 x 3 欄）切成單件透明 PNG，並依「每場景像素 8 px」縮放。
用法: python slice_props.py props.png 輸出資料夾
"""
import sys, json, numpy as np
from PIL import Image
src, outdir = sys.argv[1], sys.argv[2]
NAMES = [('table', 26), ('stool', 13), ('barrels', 26), ('pillar', 15), ('plant', 18), ('sidetable', 24)]  # (檔名, 顯示寬度：場景像素)
PPU = 8
im = Image.open(src).convert('RGB'); a = np.asarray(im).astype(np.float32)
d = np.sqrt(((a - np.array([255, 0, 255], np.float32)) ** 2).sum(2))
alpha = np.clip((d - 80) / 80, 0, 1)
H, W = d.shape; cw, ch = W // 3, H // 2
meta = {}
for i, (name, wu) in enumerate(NAMES):
    r, c = divmod(i, 3)
    cell = (alpha[r*ch:(r+1)*ch, c*cw:(c+1)*cw] > 0.5)
    ys, xs = np.nonzero(cell); x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    box = (c*cw + x0 - 2, r*ch + y0 - 2, c*cw + x1 + 2, r*ch + y1 + 2)
    rgb = a[box[1]:box[3], box[0]:box[2]]; al = alpha[box[1]:box[3], box[0]:box[2]]
    pm = np.dstack([rgb * al[..., None], al * 255])
    w = wu * PPU; h = round((box[3] - box[1]) * w / (box[2] - box[0]))
    ch4 = [Image.fromarray(pm[..., k]).resize((w, h), Image.LANCZOS) for k in range(4)]
    P = np.dstack([np.asarray(x).astype(np.float32) for x in ch4]); A = P[..., 3] / 255
    out = np.zeros((h, w, 4), np.uint8); ok = A > 0.02
    out[..., :3][ok] = np.clip(P[..., :3][ok] / A[ok][:, None], 0, 255); out[..., 3][ok] = np.clip(A[ok] * 255, 0, 255)
    Image.fromarray(out, 'RGBA').save(f'{outdir}/{name}.png', optimize=True)
    meta[name] = {'w': wu, 'h': round(h / PPU, 1)}
    print(name, (w, h))
print(json.dumps(meta))
