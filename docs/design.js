/* 說明頁：表格、範例、試算器、平衡概況，全部直接讀 data.js / story.js / engine.js，與遊戲同源。 */
(function () {
  'use strict';
  const E = Engine, D = E.D, ING = E.ING, DIMS = D.dims;
  const $ = s => document.querySelector(s);
  const heat = v => `<td class="n" style="background:rgba(232,180,92,${(Math.max(0, Math.min(10, v)) / 10 * 0.38).toFixed(2)})">${v}</td>`;
  const dimName = id => DIMS.find(d => d.id === id).name;
  const slotName = id => D.slots.find(s => s.id === id).name;
  const ingName = id => ING[id].name;

  // ---------- 欄位 ----------
  const SLOT_DESC = { base: '整杯酒的主體與濃度', modifier: '修飾風味（利口酒、糖漿）', mixer: '酸甜與稀釋（果汁、汽水、奶）', spice: '微調：苦、辣、香氣', garnish: '最後的加成與香氣' };
  $('#t-slots').innerHTML = '<tr><th>欄位</th><th>影響力</th><th>必選</th><th>角色</th></tr>' +
    D.slots.map(s => `<tr><td>${s.name}</td><td class="n">× ${s.weight}</td><td class="n">${s.required ? '是' : '否'}</td><td>${SLOT_DESC[s.id] || ''}</td></tr>`).join('');

  // ---------- 材料 ----------
  $('#t-ingredients').innerHTML = '<tr><th>材料</th>' + DIMS.map(d => `<th>${d.name}</th>`).join('') + '<th>標籤</th></tr>' +
    D.slots.map(s => `<tr class="grp"><td colspan="${DIMS.length + 2}">${s.name}（影響力 × ${s.weight}）</td></tr>` +
      D.ingredients.filter(i => i.slot === s.id).map(i =>
        `<tr><td>${i.emoji} ${i.name}</td>${DIMS.map(d => heat(i.attr[d.id])).join('')}<td>${i.tags.map(t => `<span class="tag">${t}</span>`).join('')}</td></tr>`).join('')).join('');

  // ---------- 招牌配方 ----------
  $('#t-recipes').innerHTML = '<tr><th>招牌配方</th><th>必要材料</th><th>品質加成</th></tr>' +
    D.recipes.map(r => `<tr><td>${r.name}</td><td>${r.req.map(id => `${ingName(id)}<span style="color:var(--mute)">（${slotName(ING[id].slot)}）</span>`).join(' + ')}</td><td class="n">+${r.bonus}</td></tr>`).join('');

  // ---------- 客人 ----------
  $('#t-npcs').innerHTML = '<tr><th>角色</th><th>職業</th>' + DIMS.map(d => `<th>理想${d.name}</th>`).join('') + '<th>特別在意</th><th>固定個性（角色卡）</th><th>喜歡</th><th>討厭</th></tr>' +
    D.npcs.map(n => {
      const w = Object.keys(n.w || {}).map(k => `${dimName(k)}×${n.w[k]}`).join('、') || '—';
      return `<tr><td>${n.name}</td><td>${n.title}</td>${DIMS.map(d => heat(n.ideal[d.id])).join('')}<td>${w}</td>` +
        `<td>${E.hintsOf(n).map(h => `<span class="tag">${h}</span>`).join('') || '—'}</td>` +
        `<td>${n.like.map(t => `<span class="tag like">♥ ${t}</span>`).join('') || '—'}</td><td>${n.hate.map(t => `<span class="tag hate">✕ ${t}</span>`).join('') || '—'}</td></tr>`;
    }).join('');

  // ---------- 等級 ----------
  $('#t-tiers').innerHTML = '<tr><th>最終分數</th><th>等級</th><th>星級</th><th>好感變化</th></tr>' +
    E.TIERS.map((t, i) => `<tr><td class="n">${t.min}${i < E.TIERS.length - 1 ? ' ~ ' + (E.TIERS[i + 1].min - 1) : ' ~ 100'}</td><td>${t.label}</td><td class="n">${'★'.repeat(t.stars)}${'☆'.repeat(4 - t.stars)}</td><td class="n ${t.gain < 0 ? 'neg' : 'pos'}">${t.gain > 0 ? '+' : ''}${t.gain}</td></tr>`).join('');

  // ---------- 事件 ----------
  $('#t-events').innerHTML = '<tr><th>角色</th>' + [0, 25, 50, 75, 100].map(v => `<th>好感 ${v}</th>`).join('') + '</tr>' +
    D.npcs.map(n => `<tr><td>${n.name}<br><span style="color:var(--mute);font-size:12px">${n.title}</span></td>${(n.events || []).map(e => `<td>${e.title}</td>`).join('')}</tr>`).join('');

  // ---------- 範例：曼哈頓 ----------
  (function () {
    const sel = { base: 'whisky', modifier: 'vermouth', spice: 'bitters' };
    const f = E.flavor(sel), q = E.quality(sel, f), name = E.cocktailName(sel, f, q.recipe);
    const rows = DIMS.map(d => {
      const parts = D.slots.filter(s => sel[s.id]).map(s => `${ING[sel[s.id]].attr[d.id]}×${s.weight}`);
      return `<tr><td>${d.name}</td><td>${parts.join(' + ')}</td><td class="n">${f[d.id]}</td></tr>`;
    }).join('');
    $('#example').innerHTML = `<div class="card"><h4>算一杯看看：${D.slots.filter(s => sel[s.id]).map(s => ingName(sel[s.id])).join(' + ')}（${name}）</h4>
      <div class="tblwrap"><table><tr><th>維度</th><th>（屬性 × 欄位影響力）加總</th><th>成品風味</th></tr>${rows}</table></div>
      <p>這一杯風味偏苦、濃度很高、香氣足；品質分 <b>${q.score}</b>（命中招牌配方）。</p></div>`;
  })();

  // ---------- 全部組合 ----------
  const slotOpts = D.slots.map(s => [null].concat(D.ingredients.filter(i => i.slot === s.id).map(i => i.id)));
  slotOpts[0].shift();
  const ALL = [];
  (function rec(i, c) { if (i === D.slots.length) { ALL.push(Object.assign({}, c)); return; } slotOpts[i].forEach(id => { c[D.slots[i].id] = id; rec(i + 1, c); }); })(0, {});

  // ---------- 品質分分佈 ----------
  (function () {
    const q = ALL.map(s => E.quality(s, E.flavor(s)).score).sort((a, b) => a - b);
    const at = p => q[Math.floor(q.length * p)];
    $('#q-dist').textContent = `全部 ${ALL.length.toLocaleString()} 種組合的品質分：最低 ${q[0]}、中位數 ${at(0.5)}、前 10% 在 ${at(0.9)} 以上、最高 ${q[q.length - 1]}；≥ 70 分的組合約佔 ${(q.filter(x => x >= 70).length / q.length * 100).toFixed(1)}%。`;
  })();

  // ---------- 平衡概況（分段計算，避免卡住畫面） ----------
  (function () {
    const DAYS = 10, rows = [], npcs = D.npcs; let ni = 0, di = 1, acc = null;
    const prog = $('#stats-prog'), tbl = $('#t-stats');
    function newAcc() { return { share: [0, 0, 0, 0, 0], total: 0, meds: [], dayBest: [] }; }
    function step() {
      if (ni >= npcs.length) return finish();
      if (!acc) acc = newAcc();
      const n = npcs[ni], sc = [];
      let best = 0;
      ALL.forEach(s => { const j = E.judge(s, n, di); sc.push(j.final); acc.share[j.tier.stars]++; acc.total++; if (j.final > best) best = j.final; });
      sc.sort((a, b) => a - b); acc.meds.push(sc[sc.length >> 1]); acc.dayBest.push(best);
      di++; if (di > DAYS) { rows.push({ n, acc }); acc = null; ni++; di = 1; }
      prog.textContent = `計算中… ${ni * DAYS + di - 1} / ${npcs.length * DAYS}`;
      setTimeout(step, 0);
    }
    function finish() {
      prog.textContent = `完成：${ALL.length.toLocaleString()} 種組合 × ${DAYS} 夜 × ${npcs.length} 位客人，共 ${(ALL.length * DAYS * npcs.length).toLocaleString()} 次評分。`;
      const pc = (a, k) => (a.share[k] / a.total * 100).toFixed(1) + '%';
      tbl.innerHTML = '<tr><th>角色</th><th>隨機一杯的<br>中位分數</th><th>難以下嚥</th><th>普通</th><th>喜歡</th><th>很喜歡</th><th>完美</th><th>每夜最高分<br>（最低 ~ 最高）</th></tr>' +
        rows.map(({ n, acc }) => {
          const med = Math.round(acc.meds.reduce((a, b) => a + b, 0) / acc.meds.length), lo = Math.min.apply(null, acc.dayBest), hi = Math.max.apply(null, acc.dayBest);
          const hard = acc.share[0] / acc.total > 0.2 ? ' class="neg"' : '';
          return `<tr><td>${n.name}</td><td class="n">${med}</td><td class="n"${hard}>${pc(acc, 0)}</td><td class="n">${pc(acc, 1)}</td><td class="n">${pc(acc, 2)}</td><td class="n">${pc(acc, 3)}</td><td class="n pos">${pc(acc, 4)}</td><td class="n ${lo >= 75 ? 'pos' : 'neg'}">${lo} ~ ${hi}</td></tr>`;
        }).join('');
    }
    setTimeout(step, 200);
  })();

  // ---------- 互動試算器 ----------
  (function () {
    const selBox = $('#calc-sel'), npcBox = $('#calc-npc'), out = $('#calc-out');
    const state = { sel: { base: 'whisky', modifier: 'vermouth', spice: 'bitters' }, npc: D.npcs[1].id, day: 1 };
    selBox.innerHTML = D.slots.map(s => `<label>${s.name}${s.required ? '（必選）' : ''}<select data-s="${s.id}">${s.required ? '' : '<option value="">（不選）</option>'}` +
      D.ingredients.filter(i => i.slot === s.id).map(i => `<option value="${i.id}"${state.sel[s.id] === i.id ? ' selected' : ''}>${i.emoji} ${i.name}</option>`).join('') + '</select></label>').join('');
    npcBox.innerHTML = `<label>客人<select id="c-npc">${D.npcs.map(n => `<option value="${n.id}"${n.id === state.npc ? ' selected' : ''}>${n.name}（${n.title}）</option>`).join('')}</select></label>` +
      '<label>第幾夜（影響今日心情）<input id="c-day" type="number" min="1" max="999" value="1"></label>';
    selBox.querySelectorAll('select').forEach(s => s.onchange = () => { state.sel[s.dataset.s] = s.value || null; render(); });
    $('#c-npc').onchange = e => { state.npc = e.target.value; render(); };
    $('#c-day').oninput = e => { state.day = Math.max(1, parseInt(e.target.value, 10) || 1); render(); };

    function render() {
      const sel = state.sel, npc = D.npcs.find(n => n.id === state.npc), day = state.day;
      if (!sel.base) { out.innerHTML = '<p class="prog">請先選一種基酒。</p>'; return; }
      const j = E.judge(sel, npc, day), f = j.f, q = j.q, name = E.cocktailName(sel, f, q.recipe), mood = E.moodOf(npc, day);
      const bars = DIMS.map(d => `<div class="r"><span>${d.icon} ${d.name}</span><div class="track"><div class="fill" style="width:${f[d.id] * 10}%"></div><div class="mk" style="left:calc(${j.ideal[d.id] * 10}% - 1px)"></div></div><span>${f[d.id]}</span></div>`).join('');
      const qsteps = q.items.map(i => `<div><span>${i.text}</span><span class="${i.delta < 0 ? 'neg' : 'pos'}">${i.delta > 0 ? '+' : ''}${i.delta}</span></div>`).join('');
      const diffRows = j.diffs.map(x => `<div><span>${x.dim.name}：成品 ${x.val} vs 今日理想 ${x.ideal}（重視 ×${x.w}）</span><span class="${Math.abs(x.diff) >= 2 ? 'neg' : ''}">偏差 ${x.diff > 0 ? '+' : ''}${x.diff.toFixed(1)}</span></div>`).join('');
      const lines = E.reaction(npc, name, j).map(l => `<div class="${l.w === 'sys' ? 's' : ''}">${l.w === 'npc' ? '<b>' + npc.name + '：</b>' : ''}${l.t}</div>`).join('');
      const gain = j.tier.gain;
      out.innerHTML = `
        <div class="big">${name} ${q.recipe ? '<span class="tag like">★ 招牌配方</span>' : ''}</div>
        <h4>成品風味（藍線＝${npc.name}今天的理想值）</h4><div class="bars">${bars}</div>
        <h4>品質分 <span class="big">${q.score}</span>（與客人無關）</h4><div class="steps">${qsteps}</div>
        <h4>${npc.name}（${npc.title}）</h4>
        <p>固定個性：${E.hintsOf(npc).map(h => `<span class="tag">${h}</span>`).join('') || '—'}　喜歡：${npc.like.map(t => `<span class="tag like">♥ ${t}</span>`).join('') || '—'}　討厭：${npc.hate.map(t => `<span class="tag hate">✕ ${t}</span>`).join('') || '—'}<br>
        第 ${day} 夜的心情：<b>${mood.text}</b>（${dimName(mood.dim)} ${mood.delta > 0 ? '+' : ''}${mood.delta}）</p>
        <h4>契合計算</h4><div class="steps">${diffRows}
          <div><span>平均加權偏差</span><span>${j.avg}</span></div>
          <div><span>契合度 = 1 − 偏差 ÷ 5</span><span>${j.fit}%</span></div>
          <div><span>品質係數 = 0.6 + 0.4 × 品質 ÷ 100</span><span>× ${j.qFactor}</span></div>
          <div><span>標籤加減（♥ ${j.likeHit.join('、') || '—'}　✕ ${j.hateHit.join('、') || '—'}）</span><span class="${j.tagAdj < 0 ? 'neg' : 'pos'}">${j.tagAdj > 0 ? '+' : ''}${j.tagAdj}</span></div>
          <div><span><b>最終分數</b></span><span><b>${j.final}</b>（${j.tier.label}　${'★'.repeat(j.tier.stars)}${'☆'.repeat(4 - j.tier.stars)}）</span></div>
          <div><span>好感變化</span><span class="${gain < 0 ? 'neg' : 'pos'}">${gain > 0 ? '+' : ''}${gain}</span></div></div>
        <h4>客人的反應（遊戲裡實際的對話）</h4><div class="dlg">${lines}</div>`;
    }
    render();
  })();
})();
