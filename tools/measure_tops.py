"""量出每張小人 sprite sheet 的「頭頂高度」（腳底往上，單位＝場景像素），貼進 story.js 的 spriteTops。
站立/走路看第 0~5 欄、坐著看第 6~7 欄，取兩個朝向中最高的那個。
用法: python measure_tops.py   （在專案根目錄）
"""
import glob, os, json, numpy as np
from PIL import Image
FW, FH, BASE = 192, 240, 228          # 每格大小與腳底基準線（像素）；FH 對應 40 個場景像素
PPU = FH / 40
out = {}
for f in sorted(glob.glob('sprites/*.png')):
    name = os.path.splitext(os.path.basename(f))[0]
    a = np.asarray(Image.open(f))[..., 3] > 20
    tops = {'stand': 1e9, 'sit': 1e9}
    for r in range(2):
        for c in range(8):
            cell = a[r * FH:(r + 1) * FH, c * FW:(c + 1) * FW]
            ys = np.nonzero(cell.any(1))[0]
            if len(ys): tops['sit' if c >= 6 else 'stand'] = min(tops['sit' if c >= 6 else 'stand'], ys.min())
    out[name] = {k: round((BASE - v) / PPU, 1) for k, v in tops.items()}
print('spriteTops: ' + json.dumps(out, ensure_ascii=False).replace('"', ''))
