/* ============================================================
   酒館系統 Prototype — 計分引擎（純函式，不碰 DOM）
   流程：選材料 → 風味向量 → 品質分 →（對 NPC）契合分 → 好感
   ============================================================ */
(function (root) {
  const D = root.GAME_DATA;
  const ING = Object.fromEntries(D.ingredients.map(i => [i.id, i]));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const r1 = x => Math.round(x * 10) / 10;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // sel = { base: ingredientId|null, modifier: ..., ... }
  function picked(sel) {
    return D.slots.map(s => ING[sel[s.id]]).filter(Boolean);
  }

  // 1) 風味向量 = Σ(欄位權重 × 成分屬性)，夾在 0~10
  function flavor(sel) {
    const f = {};
    D.dims.forEach(d => (f[d.id] = 0));
    D.slots.forEach(s => {
      const ing = ING[sel[s.id]];
      if (!ing) return;
      D.dims.forEach(d => (f[d.id] += s.weight * ing.attr[d.id]));
    });
    D.dims.forEach(d => (f[d.id] = r1(clamp(f[d.id], 0, 10))));
    return f;
  }

  function tagsOf(sel) {
    return [...new Set(picked(sel).flatMap(i => i.tags))];
  }

  // 招牌配方：命中條件最多者優先
  function matchRecipe(sel) {
    const ids = picked(sel).map(i => i.id);
    let best = null;
    D.recipes.forEach(r => {
      if (r.req.every(id => ids.includes(id)) && (!best || r.req.length > best.req.length)) best = r;
    });
    return best;
  }

  // 2) 品質分（與 NPC 無關）：調得好不好
  function quality(sel, f) {
    const items = [];
    let score = 45;
    items.push({ text: '基礎分', delta: 45 });

    const filled = D.slots.filter(s => !s.required && sel[s.id]).length;
    if (filled) { items.push({ text: `搭配完整度（${filled} 個副成分）`, delta: filled * 4 }); score += filled * 4; }

    if (f.sweet + f.sour > 3) {
      const bal = 1 - Math.abs(f.sweet - f.sour) / Math.max(f.sweet, f.sour);
      const d = Math.round(bal * 20);
      items.push({ text: `酸甜平衡（${Math.round(bal * 100)}%）`, delta: d }); score += d;
    } else {
      items.push({ text: '酒體取向（不走酸甜路線）', delta: 10 }); score += 10;
    }

    D.dims.filter(d => d.id !== 'strong').forEach(d => {
      if (f[d.id] > 8.5) {
        const p = -Math.round((f[d.id] - 8.5) * 10);
        items.push({ text: `${d.name}味過頭`, delta: p }); score += p;
      }
    });
    if (f.strong < 2) { const p = -Math.round((2 - f.strong) * 6); items.push({ text: '酒精感過低，像果汁', delta: p }); score += p; }
    if (f.strong > 9) { const p = -Math.round((f.strong - 9) * 10); items.push({ text: '酒精感過強', delta: p }); score += p; }

    if (f.bitter > 5 && f.sour > 5) { items.push({ text: '苦酸衝突', delta: -15 }); score -= 15; }
    if (f.sweet > 6 && f.bitter > 5) { items.push({ text: '甜苦打架', delta: -10 }); score -= 10; }

    const rec = matchRecipe(sel);
    if (rec) { items.push({ text: `招牌配方「${rec.name}」`, delta: rec.bonus }); score += rec.bonus; }

    return { score: clamp(Math.round(score), 0, 100), items, recipe: rec };
  }

  // 成品命名：招牌配方 > 基酒 + 最突出的風味
  function cocktailName(sel, f, rec) {
    if (rec) return rec.name;
    const base = ING[sel.base];
    if (!base) return '（尚未選擇基酒）';
    const adj = { sweet: '甘甜', sour: '酸爽', bitter: '苦韻', spicy: '辛辣', aroma: '芬芳' };
    let top = null;
    Object.keys(adj).forEach(k => { if (f[k] >= 3 && (!top || f[k] > f[top])) top = k; });
    return `${top ? adj[top] : '清淡'}${base.name}特調`;
  }

  // 每日心情：每位 NPC 每天某個維度 ±2
  function moodOf(npc, day) {
    const idx = D.npcs.indexOf(npc);
    const r = mulberry32(day * 131 + idx * 17 + 5);
    const dim = D.dims[Math.floor(r() * D.dims.length)];
    const delta = r() < 0.5 ? -2 : 2;
    return { dim: dim.id, delta, text: `今天${delta > 0 ? '特別想喝偏' : '想喝比較不'}${dim.name}的` };
  }

  function idealToday(npc, day) {
    const m = moodOf(npc, day);
    const ideal = { ...npc.ideal };
    ideal[m.dim] = clamp(ideal[m.dim] + m.delta, 0, 10);
    return ideal;
  }

  // 每日輪替：用日期當種子抽 N 位
  function guestsOfDay(day) {
    const r = mulberry32(day * 7919 + 13);
    const arr = D.npcs.slice();
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr.slice(0, D.guestsPerDay);
  }

  const TIERS = [
    { min: 0,  label: '難以下嚥', stars: 0, gain: -3,  line: 0 },
    { min: 25, label: '普通',     stars: 1, gain: 2,   line: 1 },
    { min: 45, label: '喜歡',     stars: 2, gain: 6,   line: 2 },
    { min: 60, label: '很喜歡',   stars: 3, gain: 12,  line: 2 },
    { min: 75, label: '完美',     stars: 4, gain: 20,  line: 3 },
  ];

  // 3) 契合分：成品風味 vs NPC 今日理想
  function judge(sel, npc, day) {
    const f = flavor(sel);
    const q = quality(sel, f);
    const ideal = idealToday(npc, day);

    let wsum = 0, dsum = 0;
    const diffs = D.dims.map(d => {
      const w = (npc.w && npc.w[d.id]) || 1;
      const diff = f[d.id] - ideal[d.id];
      wsum += w; dsum += w * Math.abs(diff);
      return { dim: d, diff, w, ideal: ideal[d.id], val: f[d.id] };
    });
    const avg = dsum / wsum;
    const fit = clamp(1 - avg / 5, 0, 1);

    const tags = tagsOf(sel);
    const likeHit = npc.like.filter(t => tags.includes(t));
    const hateHit = npc.hate.filter(t => tags.includes(t));
    const tagAdj = likeHit.length * 8 - hateHit.length * 12;

    const qFactor = 0.6 + 0.4 * q.score / 100;
    const final = clamp(Math.round(fit * 100 * qFactor + tagAdj), 0, 100);

    let tier = TIERS[0];
    TIERS.forEach(t => { if (final >= t.min) tier = t; });

    // 回饋：挑偏差最大的 1~2 個維度
    const worst = diffs.filter(x => Math.abs(x.diff) >= 2)
      .sort((a, b) => Math.abs(b.diff) * b.w - Math.abs(a.diff) * a.w).slice(0, 2)
      .map(x => (x.diff > 0 ? x.dim.tooMuch : x.dim.tooLittle));

    return { f, q, ideal, diffs, avg: r1(avg), fit: Math.round(fit * 100), qFactor: r1(qFactor), tagAdj, likeHit, hateHit, final, tier, hints: worst, line: npc.lines[tier.line] };
  }

  // 顯示在卡片上的模糊喜好提示（不洩漏確切數值）
  function hintsOf(npc) {
    const out = [];
    D.dims.forEach(d => {
      const v = npc.ideal[d.id];
      if (v >= 6) out.push(`愛${d.name}`);
      else if (v <= 1.5) out.push(`怕${d.name}`);
    });
    return out;
  }

  root.Engine = { D, ING, flavor, quality, matchRecipe, cocktailName, moodOf, idealToday, guestsOfDay, judge, hintsOf, tagsOf, TIERS };
})(typeof globalThis !== 'undefined' ? globalThis : window);
