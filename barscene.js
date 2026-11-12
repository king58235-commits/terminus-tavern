/* ============================================================
   終末酒吧 — 45 度等距（2.5D）像素場景
   內部畫布 320x180，放大 4 倍顯示（像素格中等偏大）。
   物件用「格子座標」擺放，自動深度排序；客人會走動、入座、閒聊。
   之後換美術：人物用 STORY.assets.sprites 的 sprite sheet 取代即可。
   ============================================================ */
const BarScene = (function () {
  'use strict';
  const W = 320, H = 180, PS = 4, OX = 152, OY = 38, WH = 36, GX = 9, GY = 8;
  const iso = (gx, gy) => ({ x: OX + (gx - gy) * 16, y: OY + (gx + gy) * 8 });
  const S = STORY;

  const C = {
    floorA: '#2c4a50', floorB: '#325359', rugA: '#3c4c78', rugB: '#445a8c', rugEdge: '#c9a24d',
    wallR: '#35425f', wallRd: '#2b3652', wallL: '#2c3452', wallLd: '#232a44', cap: '#566588', base: '#1f2640',
    wood: '#8a5a34', woodD: '#5d3b20', woodL: '#a8733f',
  };

  // ---------- 小工具 ----------
  const hash = n => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); return (n ^ (n >>> 15)) >>> 0; };
  function rng(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  const dk = {};
  function shade(hex, f) {
    const key = hex + f; if (dk[key]) return dk[key];
    const n = parseInt(hex.slice(1), 16); const r = Math.min(255, ((n >> 16) & 255) * f | 0), g = Math.min(255, ((n >> 8) & 255) * f | 0), b = Math.min(255, (n & 255) * f | 0);
    return (dk[key] = `rgb(${r},${g},${b})`);
  }
  // 2:1 等距菱形（與相鄰格完美拼接）
  function dia(g, cx, cy, hw, hh, c) {
    g.fillStyle = c; const k = (2 * hw) / hh;
    for (let i = 0; i < hh; i++) {
      const w = Math.round((i + 1) * k);
      g.fillRect(Math.round(cx - w / 2), Math.round(cy - hh + i), w, 1);
      g.fillRect(Math.round(cx - w / 2), Math.round(cy + hh - 1 - i), w, 1);
    }
  }
  function poly(g, pts, c) {
    g.fillStyle = c; let y0 = Infinity, y1 = -Infinity;
    pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
    y0 = Math.round(y0); y1 = Math.round(y1);
    for (let y = y0; y < y1; y++) {
      const yy = y + 0.5; let xl = Infinity, xr = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i], b = pts[(i + 1) % pts.length];
        if ((a[1] <= yy && b[1] > yy) || (b[1] <= yy && a[1] > yy)) {
          const x = a[0] + (yy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]); xl = Math.min(xl, x); xr = Math.max(xr, x);
        }
      }
      if (xr > xl) { const l = Math.round(xl), r = Math.round(xr); g.fillRect(l, y, Math.max(1, r - l), 1); }
    }
  }
  function line(g, x0, y0, x1, y1, c) {
    g.fillStyle = c; x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
    for (;;) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  // 等距方塊：c = {top,l,r,hi,bands:[高度],bl}
  function box(g, gx, gy, w, d, h, c, z) {
    z = z || 0;
    const A = iso(gx, gy), B = iso(gx + w, gy), Cc = iso(gx + w, gy + d), D = iso(gx, gy + d);
    const up = (p, hh) => [p.x, p.y - z - hh];
    poly(g, [up(D, 0), up(Cc, 0), up(Cc, h), up(D, h)], c.l);
    poly(g, [up(Cc, 0), up(B, 0), up(B, h), up(Cc, h)], c.r);
    (c.bands || []).forEach(y => {
      poly(g, [up(D, y), up(Cc, y), up(Cc, y + 1), up(D, y + 1)], c.bl || 'rgba(0,0,0,.35)');
      poly(g, [up(Cc, y), up(B, y), up(B, y + 1), up(Cc, y + 1)], c.bl || 'rgba(0,0,0,.35)');
    });
    poly(g, [up(A, h), up(B, h), up(Cc, h), up(D, h)], c.top);
    if (c.hi) { line(g, D.x, D.y - z - h, Cc.x, Cc.y - z - h, c.hi); line(g, Cc.x, Cc.y - z - h, B.x, B.y - z - h, c.hi); }
  }

  // ---------- 靜態背景（地板、牆、窗、酒架） ----------
  function buildStatic() {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = '#080a11'; g.fillRect(0, 0, W, H);
    // 外圍星點
    for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(hash(i * 3) % W, hash(i * 7 + 1) % 30, 1, 1); }

    // 地板厚度
    const L = iso(0, GY), Bm = iso(GX, GY), R = iso(GX, 0);
    poly(g, [[L.x, L.y], [Bm.x, Bm.y], [Bm.x, Bm.y + 5], [L.x, L.y + 5]], '#1a2230');
    poly(g, [[Bm.x, Bm.y], [R.x, R.y], [R.x, R.y + 5], [Bm.x, Bm.y + 5]], '#121824');

    // 地板
    for (let gy = 0; gy < GY; gy++) for (let gx = 0; gx < GX; gx++) {
      const p = iso(gx, gy), rug = gx >= 2 && gx <= 6 && gy >= 3 && gy <= 6;
      const odd = (gx + gy) & 1;
      dia(g, p.x, p.y + 8, 16, 8, rug ? (odd ? C.rugA : C.rugB) : (odd ? C.floorA : C.floorB));
    }
    // 地毯金邊
    const q = [iso(2, 3), iso(7, 3), iso(7, 7), iso(2, 7)];
    for (let i = 0; i < 4; i++) line(g, q[i].x, q[i].y + 8 * 0, q[(i + 1) % 4].x, q[(i + 1) % 4].y, C.rugEdge);
    // 地板上的窗光（冷色）
    g.save();
    [[0.7, 1.9], [2.3, 3.5], [3.9, 4.8]].forEach(w => {
      const a = iso(w[0], 0), b = iso(w[1], 0), c2 = iso(w[1], 3.2), d2 = iso(w[0], 3.2);
      g.fillStyle = 'rgba(130,200,255,.11)'; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.lineTo(c2.x, c2.y); g.lineTo(d2.x, d2.y); g.closePath(); g.fill();
    });
    g.restore();

    // 右後牆（gy=0）：窗戶 + 酒架
    const wins = [[0.7, 1.9], [2.3, 3.5], [3.9, 4.8]];
    for (let x = OX; x < OX + GX * 16; x++) {
      const yb = OY + ((x - OX) >> 1), gxf = (x - OX) / 16;
      for (let off = 1; off <= WH; off++) {
        let c = wallPix(C.wallR, C.wallRd, x, off);
        const win = wins.find(w => gxf >= w[0] && gxf <= w[1]);
        if (win && off >= 10 && off <= 31) {
          const edge = off === 10 || off === 31 || gxf - win[0] < 0.07 || win[1] - gxf < 0.07;
          const mid = Math.abs(gxf - (win[0] + win[1]) / 2) < 0.04 || off === 21;
          c = edge || mid ? '#4a3020' : (off > 26 ? '#9bd0f2' : off > 16 ? '#6fb4ea' : '#4f95d6');
        }
        if (gxf >= 5.1 && off >= 8 && off <= 34) c = (off === 15 || off === 27) ? C.woodL : '#221a26';
        g.fillStyle = c; g.fillRect(x, yb - off, 1, 1);
      }
    }
    // 酒瓶
    const cols = ['#a34848', '#3f8a6e', '#c9993f', '#4a5fb0', '#8a4fa0', '#5a9cb0'];
    [16, 28].forEach((off, row) => {
      for (let x = OX + 5.2 * 16; x < OX + 8.9 * 16; x += 5) {
        const k = hash(x * 13 + row * 7), h = 5 + (k % 4), yb = OY + (((x | 0) - OX) >> 1);
        g.fillStyle = cols[k % cols.length]; g.fillRect(x | 0, yb - off - h + 1, 3, h); g.fillStyle = '#e8d8b0'; g.fillRect((x | 0) + 1, yb - off - h, 1, 1);
      }
    });

    // 左後牆（gx=0）：門 + 告示板
    for (let x = OX - GY * 16; x < OX; x++) {
      const yb = OY + ((OX - x) >> 1), gyf = (OX - x) / 16;
      for (let off = 1; off <= WH; off++) {
        let c = wallPix(C.wallL, C.wallLd, x, off);
        if (gyf >= 5.3 && gyf <= 6.9 && off <= 27) {
          const edge = gyf - 5.3 < 0.1 || 6.9 - gyf < 0.1 || off >= 26;
          c = edge ? '#4a3020' : (off > 18 ? '#d9a04e' : '#8a5a2a');
        }
        if (gyf >= 1.9 && gyf <= 3.6 && off >= 12 && off <= 28) {
          const edge = off === 12 || off === 28 || gyf < 1.97 || gyf > 3.53;
          c = edge ? '#4a3020' : '#a8855a';
          if (!edge && (x + off) % 5 === 0 && off % 4) c = '#e9e0c8';
        }
        g.fillStyle = c; g.fillRect(x, yb - off, 1, 1);
      }
    }
    // 牆角亮線
    g.fillStyle = '#6f80a8'; g.fillRect(OX, OY - WH, 1, WH);
    return cv;
  }
  function wallPix(base, dark, x, off) {
    if (off > WH - 2) return C.cap;
    if (off <= 4) return C.base;
    const row = Math.floor(off / 6);
    if (off % 6 === 0) return dark;
    if (((x + (row & 1) * 6) % 12) === 0) return dark;
    return base;
  }

  // ---------- 人物（像素小人） ----------
  const SW = 32, SH = 40;   // sprite sheet 每格尺寸（8 欄 x 2 列）
  const sheets = {};
  function sheetFor(id) {
    const p = S.assets.sprites && S.assets.sprites[id]; if (!p) return null;
    if (!sheets[id]) { const im = new Image(); im.src = p; sheets[id] = im; }
    const im = sheets[id]; return im.complete && im.naturalWidth ? im : null;
  }
  function drawPerson(g, x, y, p, t) {
    x = Math.round(x); y = Math.round(y);
    const L = p.look, dir = p.dir || 1, mode = p.mode, sit = mode === 'sit', walk = mode === 'walk';
    const fr = Math.floor(t / 220) % 2, wf = Math.floor(t / 130) % 4;
    // 影子
    g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(x - 5, y - 1, 10, 2); g.fillRect(x - 3, y + 1, 6, 1);
    const im = p.id && sheetFor(p.id);
    if (im) {
      const col = sit ? (p.drink ? 7 : 6) : walk ? 2 + wf : fr, row = dir === 1 ? 0 : 1;
      // sprite sheet 每格 = 圖寬/8 x 圖高/2（建議 128x160，高解析）；整格對應到 32x40 個場景像素，腳底基準線在格內 95%
      const fw = im.width / 8, fh = im.height / 2;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(im, col * fw, row * fh, fw, fh, x - SW / 2, y - 38, SW, SH);
      g.imageSmoothingEnabled = false; return;
    }
    let by = y; if (sit) by = y - 1;
    if (L.ghost) by = y - 4 + (Math.floor(t / 450) & 1);
    const cloth = L.cloth, clothD = shade(cloth, .7), skin = L.skin, hair = L.hair;
    const bob = (p.chat ? (Math.floor(t / 160) & 1) : 0);
    // 後髮/兜帽（畫在身體後面）
    if (L.style === 'long') { g.fillStyle = hair; g.fillRect(x - 5, by - 21 - bob, 10, 13); }
    if (L.style === 'hood' || L.style === 'raven') { g.fillStyle = L.style === 'raven' ? '#15131b' : cloth; g.fillRect(x - 5, by - 22 - bob, 10, 11); g.fillRect(x - 4, by - 23 - bob, 8, 1); }
    // 腿
    if (!sit && !L.ghost) {
      const up = walk && (wf === 0 || wf === 2) ? 0 : walk ? 1 : 0;
      g.fillStyle = shade(cloth, .55);
      g.fillRect(x - 3, by - 4, 2, 4 - (walk && wf === 1 ? 1 : 0)); g.fillRect(x + 1, by - 4, 2, 4 - (walk && wf === 3 ? 1 : 0));
      void up;
    }
    // 身體
    g.fillStyle = cloth; g.fillRect(x - 3, by - 13, 6, 1); g.fillRect(x - 4, by - 12, 8, 8);
    if (L.ghost) { g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x - 4, by - 12, 8, 1); }
    if (L.style === 'keeper') {
      g.fillStyle = '#efe9de'; g.fillRect(x - 2, by - 12, 4, 7); g.fillStyle = L.acc; g.fillRect(x - 1, by - 12, 2, 1);
    } else { g.fillStyle = L.acc; g.fillRect(x - 1 + (dir > 0 ? 1 : -1) * 0, by - 11, 2, 1); }
    // 手
    g.fillStyle = clothD; g.fillRect(x - 5, by - 12, 1, 6); g.fillRect(x + 4, by - 12, 1, 6);
    if (mode === 'wipe') { g.fillStyle = skin; g.fillRect(x + 4 * dir, by - 12 - (fr ? 1 : 0), 2, 3); g.fillStyle = '#cfe4f0'; g.fillRect(x + 5 * dir, by - 14 - (fr ? 1 : 0), 2, 3); }
    if (p.carry) { g.fillStyle = '#d8d2c4'; g.fillRect(x + 3 * dir - 1, by - 10, 7, 1); g.fillStyle = '#cfe4f0'; g.fillRect(x + 4 * dir, by - 13, 2, 3); }
    if (sit && p.drink) { g.fillStyle = '#cfe4f0'; g.fillRect(x + 5 * dir - 1, by - 11, 2, 3); }
    // 頭
    const hy = by - 20 - bob;
    g.fillStyle = (L.style === 'raven') ? '#e7ddc9' : skin;
    g.fillRect(x - 3, hy, 6, 1); g.fillRect(x - 4, hy + 1, 8, 5); g.fillRect(x - 3, hy + 6, 6, 1);
    const ex = dir > 0 ? 0 : -2;
    if (L.style !== 'helm') { g.fillStyle = L.style === 'raven' ? '#f2c94c' : '#1a1420'; g.fillRect(x - 3 + ex + 1, hy + 3, 1, 2); g.fillRect(x + 1 + ex + 1, hy + 3, 1, 2); }
    // 髮型 / 帽子
    g.fillStyle = hair;
    if (L.style === 'long') { g.fillRect(x - 4, hy - 1, 8, 3); g.fillRect(x - 5, hy + 1, 1, 8); g.fillRect(x + 4, hy + 1, 1, 8); }
    else if (L.style === 'keeper') { g.fillRect(x - 4, hy - 1, 8, 3); g.fillRect(x - 5, hy + 1, 1, 2); g.fillStyle = '#c0392b'; g.fillRect(x - 1, by - 13, 2, 1); }
    else if (L.style === 'hood') { /* 兜帽已畫 */ g.fillStyle = shade(cloth, 1.1); g.fillRect(x - 4, hy - 1, 8, 2); }
    else if (L.style === 'raven') { g.fillStyle = '#e08a2e'; g.fillRect(x + (dir > 0 ? 3 : -4), hy + 4, 2, 2); g.fillStyle = '#15131b'; g.fillRect(x - 4, hy - 1, 8, 2); }
    else if (L.style === 'helm') { g.fillStyle = '#9aa2ad'; g.fillRect(x - 4, hy - 1, 8, 5); g.fillStyle = '#6b727c'; g.fillRect(x - 4, hy + 3, 8, 1); g.fillStyle = '#14161b'; g.fillRect(x - 3, hy + 2, 6, 1); g.fillStyle = '#b03a3a'; g.fillRect(x - 1, hy - 3, 2, 2); }
    else if (L.style === 'witch') {
      g.fillRect(x - 4, hy, 8, 2); g.fillStyle = cloth; g.fillRect(x - 7, hy - 1, 14, 2); g.fillRect(x - 4, hy - 3, 8, 2); g.fillRect(x - 3, hy - 5, 6, 2); g.fillRect(x - 2, hy - 7, 4, 2); g.fillRect(x - 1, hy - 9, 2, 2);
      g.fillStyle = L.acc; g.fillRect(x - 4, hy - 2, 8, 1);
    } else if (L.style === 'chef') {
      g.fillRect(x - 4, hy, 8, 2); g.fillStyle = '#f4efe6'; g.fillRect(x - 4, hy - 4, 8, 4); g.fillRect(x - 5, hy - 3, 2, 3); g.fillRect(x + 3, hy - 3, 2, 3); g.fillRect(x - 2, hy - 5, 4, 1);
    } else { g.fillRect(x - 4, hy - 1, 8, 2); }
    if (L.ghost) { g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(x - 6, by - 22, 12, 22); }
  }

  // ---------- 世界 ----------
  function create(root, opts) {
    const day = opts.day, guests = opts.guests, r = rng(day * 97 + 3);

    // 家具與格子
    const tables = [{ gx: 2, gy: 3 }, { gx: 5, gy: 5 }, { gx: 7, gy: 4 }, { gx: 2, gy: 6 }, { gx: 7, gy: 6 }];
    const blocked = Array.from({ length: GY }, () => Array(GX).fill(false));
    const block = (x, y) => { if (x >= 0 && x < GX && y >= 0 && y < GY) blocked[y][x] = true; };
    for (let gx = 5; gx <= 8; gx++) block(gx, 1);
    block(0, 1); block(0, 2); block(0, 3);
    block(4, 1); block(1, 7);
    tables.forEach(t => block(t.gx, t.gy));

    const furn = [];
    const add = (key, fn) => furn.push({ key, fn });
    const lights = [];
    const wood = { top: C.woodL, l: C.wood, r: C.woodD, hi: '#c9915a' };
    const stone = { top: '#b9b4a6', l: '#8a867a', r: '#68655c', hi: '#d5d0c2' };
    // 吧台
    for (let gx = 5; gx <= 8; gx++) add(gx + 1.5 + 0.1, g => box(g, gx, 1, 1, 1, 12, { top: '#c8b08c', l: '#7a5a3a', r: '#5d4229', hi: '#e0cba6', bands: [3, 8], bl: 'rgba(0,0,0,.3)' }));
    add(5 + 1.5 + 0.3, g => { const p = iso(5.5, 1.5); g.fillStyle = '#cfe4f0'; g.fillRect(p.x - 1, p.y - 16, 2, 3); });
    add(8 + 1.5 + 0.3, g => { const p = iso(7.5, 1.5); g.fillStyle = '#cfe4f0'; g.fillRect(p.x - 1, p.y - 16, 2, 3); g.fillStyle = '#e8b45c'; g.fillRect(p.x + 3, p.y - 17, 2, 4); });
    // 酒桶
    [[0.15, 1.0], [0.15, 2.0], [0.2, 3.05]].forEach(b => add(b[0] + b[1] + 0.8, g => box(g, b[0], b[1], 0.8, 0.8, 17, { top: '#9a6a3c', l: '#7a4c26', r: '#5a381c', hi: '#b98550', bands: [3, 9, 14], bl: '#2a2a30' })));
    // 柱子
    [[4, 1], [1, 7]].forEach(p => {
      add(p[0] + p[1] + 1, g => { box(g, p[0] + .2, p[1] + .2, .6, .6, 42, { top: '#8b91a0', l: '#6a7080', r: '#4c515e', hi: '#a3a9b8' }); box(g, p[0] + .05, p[1] + .05, .9, .9, 5, { top: '#232630', l: '#171a22', r: '#101218', hi: '#3a3f4c' }, 38); box(g, p[0] + .05, p[1] + .05, .9, .9, 3, { top: '#4a4f5c', l: '#3a3f4c', r: '#2a2e38' }); });
    });
    // 植栽
    add(0.6 + 5.2, g => { const p = iso(0.6, 5.0); box(g, 0.35, 4.7, 0.5, 0.5, 5, { top: '#6a4a30', l: '#5a3c26', r: '#42291a' }); g.fillStyle = '#3f8a54'; g.fillRect(p.x - 4, p.y - 14, 9, 7); g.fillStyle = '#58b06c'; g.fillRect(p.x - 2, p.y - 18, 5, 6); g.fillStyle = '#2d6a40'; g.fillRect(p.x - 5, p.y - 10, 3, 4); });

    // 桌椅、座位
    const seats = [];
    tables.forEach((t, ti) => {
      const key = t.gx + t.gy + 1;
      add(key, g => {
        box(g, t.gx + .4, t.gy + .4, .2, .2, 8, { top: '#6b4a30', l: '#5a3c26', r: '#42291a' });
        box(g, t.gx + .06, t.gy + .06, .88, .88, 3, { top: '#5aa59a', l: '#3f857a', r: '#2f6a62', hi: '#8fd0c4' }, 8);
        const p = iso(t.gx + .5, t.gy + .5);
        g.fillStyle = '#e8d8b0'; g.fillRect(p.x + 3, p.y - 17, 1, 4);
        g.fillStyle = (Math.floor(performance.now() / 140) & 1) ? '#ffd36a' : '#ffb54a'; g.fillRect(p.x + 3, p.y - 19, 1, 2);
        g.fillStyle = '#e9e4d4'; g.fillRect(p.x - 3, p.y - 14, 3, 1);
      });
      const pc = iso(t.gx + .5, t.gy + .5); lights.push({ x: pc.x + 3, y: pc.y - 18, r: 26 });
      const sBR = { id: ti + 'a', gx: t.gx + .5, gy: t.gy - .5, dir: -1, table: ti, occ: null, tile: [t.gx, t.gy - 1] };
      const sBL = { id: ti + 'b', gx: t.gx - .5, gy: t.gy + .5, dir: 1, table: ti, occ: null, tile: [t.gx - 1, t.gy] };
      [sBR, sBL].forEach(s => { seats.push(s); add(s.gx + s.gy - 0.3, g => { if (s.occ && sheetFor(s.occ)) return; box(g, s.gx - .2, s.gy - .2, .4, .4, 6, { top: '#c9c4b4', l: '#8a867a', r: '#68655c', hi: '#e2ddcc' }); }); });
    });
    // 牆燈光
    [[OX + 2.8 * 16, OY + 22], [OX + 6.8 * 16, OY + 20], [OX - 2 * 16, OY + 18], [OX - 5.2 * 16, OY + 26]].forEach(p => lights.push({ x: p[0], y: p[1], r: 30 }));

    // 人物
    const people = [];
    const pool = S.passers.slice();
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const mk = (o) => Object.assign({ gx: 0, gy: 0, dir: 1, mode: 'sit', path: [], timer: 5, away: false, chatT: 3 + r() * 6, chat: false, drink: false, say: null }, o);
    const keeper = mk({ kind: 'keeper', id: 'keeper', look: S.keeper, gx: 6.5, gy: 0.55, dir: -1, mode: 'wipe' });
    people.push(keeper);
    guests.forEach((n, i) => {
      const s = seats.find(q => q.id === i + 'a'); s.occ = n.id;
      people.push(mk({ kind: 'special', id: n.id, npc: n, look: n.look, gx: s.gx, gy: s.gy, dir: s.dir, mode: 'sit', timer: 4 + r() * 6 }));
    });
    const freeSeats = () => seats.filter(s => !s.occ);
    const passers = [];
    for (let i = 0; i < 4; i++) {
      const cand = freeSeats(), s = cand[Math.floor(r() * cand.length)]; s.occ = 'p' + i;
      const p = mk({ kind: 'passer', id: null, pid: 'p' + i, look: pool[i % pool.length], gx: s.gx, gy: s.gy, dir: s.dir, seat: s, timer: 6 + r() * 16 });
      people.push(p); passers.push(p);
    }
    const waiter = mk({ kind: 'waiter', id: 'waiter', look: S.waiter, gx: 5.5, gy: 2.5, dir: 1, mode: 'stand', timer: 2 });
    people.push(waiter);

    // 路徑
    const tileC = (x, y) => [x + .5, y + .5];
    function bfs(from, to, avoid) {
      const q = [from], prev = {}, k = (a, b) => a + ',' + b; prev[k(from[0], from[1])] = null;
      while (q.length) {
        const c = q.shift(); if (c[0] === to[0] && c[1] === to[1]) break;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
          const nx = c[0] + d[0], ny = c[1] + d[1];
          if (nx < 0 || ny < 0 || nx >= GX || ny >= GY || prev[k(nx, ny)] !== undefined) return;
          if (blocked[ny][nx] && !(nx === to[0] && ny === to[1])) return;
          if (avoid(nx, ny) && !(nx === to[0] && ny === to[1])) return;
          prev[k(nx, ny)] = c; q.push([nx, ny]);
        });
      }
      if (prev[k(to[0], to[1])] === undefined) return null;
      const path = []; let c = to; while (c) { path.unshift(c); c = prev[k(c[0], c[1])]; } path.shift(); return path;
    }
    const occupiedTile = (nx, ny) => seats.some(s => s.occ && s.tile[0] === nx && s.tile[1] === ny);
    function walkTo(p, tile, finalPos, onArrive) {
      const from = [Math.max(0, Math.min(GX - 1, Math.floor(p.gx))), Math.max(0, Math.min(GY - 1, Math.floor(p.gy)))];
      const path = bfs(from, tile, occupiedTile); if (!path) return false;
      p.path = path.map((t, i) => (i === path.length - 1 && finalPos) ? finalPos : tileC(t[0], t[1]));
      p.mode = 'walk'; p.onArrive = onArrive; return true;
    }
    function sendToSeat(p) {
      const cand = freeSeats().filter(s => s !== p.seat); if (!cand.length) { p.timer = 6; return; }
      const s = cand[Math.floor(Math.random() * cand.length)];
      if (p.seat) p.seat.occ = null; s.occ = p.pid; p.seat = s;
      if (!walkTo(p, s.tile, [s.gx, s.gy], () => { p.mode = 'sit'; p.dir = s.dir; p.timer = 10 + Math.random() * 18; })) { p.seat = null; s.occ = null; p.mode = 'stand'; p.timer = 3; }
    }
    function leave(p) {
      if (p.seat) { p.seat.occ = null; p.seat = null; }
      if (!walkTo(p, [0, 6], [0.5, 6.5], () => { p.away = true; p.timer = 6 + Math.random() * 8; })) p.timer = 5;
    }

    function update(dt, now) {
      people.forEach(p => {
        if (p.kind === 'passer') {
          if (p.away) { p.timer -= dt; if (p.timer <= 0) { p.away = false; p.gx = 0.5; p.gy = 6.5; p.mode = 'stand'; sendToSeat(p); } return; }
          if (p.mode === 'sit') {
            p.timer -= dt; p.chatT -= dt; p.drink = (Math.floor(now / 3000) % 3 === (p.pid.charCodeAt(1) % 3));
            if (p.chatT <= 0) { p.chatT = 5 + Math.random() * 9; showSay(p, S.chatLines[Math.floor(Math.random() * S.chatLines.length)], 3200); }
            if (p.timer <= 0) { if (Math.random() < 0.3 && passers.filter(q => q.away).length < 2) leave(p); else sendToSeat(p); }
          } else if (p.mode === 'stand') { p.timer -= dt; if (p.timer <= 0) sendToSeat(p); }
        }
        if (p.kind === 'special') p.drink = (Math.floor(now / 3500 + (p.npc.name.charCodeAt(0) % 5)) % 3 === 1);
        if (p.kind === 'waiter') {
          if (p.mode === 'stand') {
            p.timer -= dt;
            if (p.timer <= 0) {
              if (p.atCounter !== false) { // 送去某桌
                const t = tables[Math.floor(Math.random() * tables.length)];
                p.carry = true; p.atCounter = false;
                if (!walkTo(p, [Math.min(GX - 1, t.gx + 1), t.gy], null, () => { p.mode = 'stand'; p.timer = 2.2; })) { p.timer = 2; p.atCounter = true; }
              } else { p.carry = false; p.atCounter = true; if (!walkTo(p, [5, 2], null, () => { p.mode = 'stand'; p.timer = 3 + Math.random() * 4; })) p.timer = 2; }
            }
          }
        }
        if (p.mode === 'walk') {
          const tg = p.path[0]; if (!tg) { p.mode = 'stand'; return; }
          const dx = tg[0] - p.gx, dy = tg[1] - p.gy, d = Math.hypot(dx, dy), sp = 1.25 * dt;
          if (d <= sp) { p.gx = tg[0]; p.gy = tg[1]; p.path.shift(); if (!p.path.length) { const cb = p.onArrive; p.onArrive = null; if (cb) cb(); else p.mode = 'stand'; } }
          else { p.gx += dx / d * sp; p.gy += dy / d * sp; p.dir = (dx - dy) >= 0 ? 1 : -1; }
        }
        if (p.say && now > p.say.until) { p.say = null; }
      });
    }

    // DOM 疊層（泡泡、名牌、點擊範圍）
    const layer = root.querySelector('.ents');
    function showSay(p, text, ms) { p.say = { text, until: performance.now() + ms }; }
    people.forEach(p => {
      const el = document.createElement('div'); el.className = 'ent k-' + p.kind; p.el = el;
      if (p.kind === 'special') {
        const pend = opts.pending(p.npc), left = opts.giftsLeft(p.npc);
        el.innerHTML = `<div class="bubble ${pend ? 'ev' : ''}">${pend ? '!' : left <= 0 ? '💤' : '…'}</div><div class="nameplate">${p.npc.name}</div>`;
        el.onclick = () => opts.onSpecial(p.npc);
        el.onmouseenter = () => (hover = p); el.onmouseleave = () => (hover = null);
      } else if (p.kind === 'keeper') { el.onclick = () => opts.onKeeper(); }
      else { el.onclick = () => { const l = S.passerLines[Math.floor(Math.random() * S.passerLines.length)]; showSay(p, l, 2600); }; }
      layer.appendChild(el);
    });
    let hover = null;

    const stat = buildStatic();
    return { people, furn, lights, update, stat, setHover: v => (hover = v), get hover() { return hover; } };
  }

  // ---------- 掛載 ----------
  function mount(root, opts) {
    root.innerHTML = '';
    const cv = document.createElement('canvas'); cv.width = W * PS; cv.height = H * PS; cv.className = 'isocv'; root.appendChild(cv);   // 高解析畫布，座標仍用 320x180 的像素格
    const layer = document.createElement('div'); layer.className = 'ents'; root.appendChild(layer);
    const pill = document.createElement('div'); pill.className = 'pill'; pill.textContent = '點擊頭上有泡泡的客人　「!」＝有新事件'; root.appendChild(pill);
    const g = cv.getContext('2d'); g.setTransform(PS, 0, 0, PS, 0, 0); g.imageSmoothingEnabled = false;
    const w = create(root, opts);
    let alive = true, last = performance.now(), raf;

    function render(now) {
      g.drawImage(w.stat, 0, 0);
      const list = w.furn.map(f => ({ key: f.key, fn: f.fn }));
      w.people.forEach(p => {
        if (p.away) return;
        const pos = iso(p.gx, p.gy);
        list.push({ key: p.gx + p.gy + 0.01, fn: gg => {
          if (w.hover === p) dia(gg, pos.x, pos.y, 14, 7, 'rgba(255,225,130,.38)');
          drawPerson(gg, pos.x, pos.y, p, now);
        } });
      });
      list.sort((a, b) => a.key - b.key).forEach(o => o.fn(g));
      // 光暈（暖色）
      g.save(); g.globalCompositeOperation = 'lighter';
      w.lights.forEach((l, i) => {
        const fl = 0.85 + 0.15 * Math.sin(now / 230 + i * 2);
        const gr = g.createRadialGradient(l.x, l.y, 1, l.x, l.y, l.r);
        gr.addColorStop(0, `rgba(255,170,70,${0.26 * fl})`); gr.addColorStop(1, 'rgba(255,170,70,0)');
        g.fillStyle = gr; g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
      });
      g.restore();
      // 暗角
      const vg = g.createRadialGradient(W / 2, H / 2 + 6, 70, W / 2, H / 2, 200);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = vg; g.fillRect(0, 0, W, H);

      // DOM 疊層同步
      w.people.forEach(p => {
        const el = p.el; if (!el) return;
        if (p.away) { el.style.display = 'none'; return; } el.style.display = '';
        const pos = iso(p.gx, p.gy), sit = p.mode === 'sit';
        el.style.left = (pos.x * PS - 26) + 'px'; el.style.top = ((pos.y - (sit ? 30 : 29)) * PS) + 'px';
        let sayEl = el.querySelector('.say');
        if (p.say) {
          if (!sayEl) { sayEl = document.createElement('div'); sayEl.className = 'say'; el.appendChild(sayEl); }
          if (sayEl.textContent !== p.say.text) sayEl.textContent = p.say.text;
        } else if (sayEl) sayEl.remove();
      });
    }
    function frame(now) {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      w.update(dt, now); render(now); raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return { destroy() { alive = false; cancelAnimationFrame(raf); root.innerHTML = ''; } };
  }

  return { mount };
})();
