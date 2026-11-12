/* 終末酒吧 — 遊戲流程：入口 → 開場 → 酒吧 → (事件) → 調酒 → 回饋 → 事件解鎖 */
(function () {
  'use strict';
  const E = Engine, D = E.D, S = STORY;
  const $ = (s, r) => (r || document).querySelector(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const KEY = 'km_terminal_bar_v1';
  const THRESH = [0, 25, 50, 75, 100];

  // ---------- 存檔 ----------
  const fresh = () => ({ day: 1, affinity: {}, gifts: {}, seen: {}, seenIntro: false, log: [] });
  let st;
  try { st = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || 'null') || {}); } catch (e) { st = fresh(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };

  let planner = false, busy = false, mixNpc = null, sel = {}, scene = 'title';
  const aff = n => st.affinity[n.id] || 0;
  const giftsLeft = n => D.giftsPerNpcPerDay - (st.gifts[st.day + ':' + n.id] || 0);
  const seenOf = n => st.seen[n.id] || (st.seen[n.id] = []);
  const pending = n => n.events.filter(e => aff(n) >= e.at && !seenOf(n).includes(e.at));

  function rng(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------- 舞台縮放 ----------
  const stage = $('#stage');
  // 縮放對齊「整數個裝置像素」：像素美術才不會因為放大倍率不整齊而發糊
  function fit() {
    const dpr = window.devicePixelRatio || 1, q = 4 * dpr;           // 場景 1 個像素 = 4 個舞台像素
    let s = Math.min(innerWidth / 1280, innerHeight / 720);
    const snapped = Math.floor(s * q) / q; if (snapped >= 0.5 / dpr) s = snapped;
    stage.style.transform = `translate(-50%,-50%) scale(${s})`;
    window.__stageScale = s; window.dispatchEvent(new Event('stagefit'));   // 通知酒吧畫布依實際螢幕像素重繪
  }
  addEventListener('resize', fit); fit();

  // ---------- 通用 ----------
  const fade = $('#fade');
  async function xfade(fn) { fade.classList.add('on'); await sleep(450); await fn(); fade.classList.remove('on'); await sleep(450); }
  function showScene(id) {
    scene = id;
    document.querySelectorAll('.scene').forEach(s => s.classList.toggle('active', s.id === id));
    $('#hud').classList.toggle('on', id !== 'title');
    $('#endNight').style.display = id === 'bar' ? '' : 'none';
    $('#nightLbl').textContent = `第 ${st.day} 夜`;
  }
  let toastT;
  function toast(t) { const el = $('#toast'); el.textContent = t; el.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => (el.style.display = 'none'), 1800); }
  async function card(title, sub, mid) {
    const c = $('#card'); c.innerHTML = `<h2>${title}</h2><p>${sub || ''}</p>`;
    c.classList.add('show'); await sleep(30); c.classList.add('in'); await sleep(650);
    if (mid) await mid(); await sleep(1100);
    c.classList.remove('in'); await sleep(650); c.classList.remove('show');
  }

  // ---------- 對話系統 ----------
  const dlg = $('#dlg'); let curAdvance = null, skipAll = false;
  document.addEventListener('keydown', e => {
    if ((e.code === 'Space' || e.code === 'Enter') && dlg.classList.contains('show') && curAdvance) { e.preventDefault(); curAdvance(); }
  });
  function speak(line, n) {
    return new Promise(res => {
      const nameEl = $('.dname', dlg), textEl = $('.dtext', dlg), arrow = $('.darrow', dlg);
      const w = line.w;
      nameEl.textContent = w === 'npc' ? (n ? n.name : '') : w === 'me' ? '老闆' : '';
      textEl.className = 'dtext' + (w === 'sys' ? ' sys' : ''); textEl.textContent = ''; arrow.style.opacity = 0;
      const L = $('#dfL', dlg), R = $('#dfR', dlg);
      if (L && R) { L.classList.toggle('dim', w === 'me'); R.classList.toggle('dim', w === 'npc'); }
      let i = 0, typing = true; const txt = line.t;
      const finish = () => { clearInterval(timer); typing = false; textEl.textContent = txt; arrow.style.opacity = 1; };
      const timer = setInterval(() => { i++; textEl.textContent = txt.slice(0, i); if (i >= txt.length) finish(); }, 26);
      const adv = () => { if (typing) { finish(); return; } curAdvance = null; dlg.onclick = null; res(); };
      curAdvance = adv; dlg.onclick = adv;
    });
  }
  async function playDlg(lines, ctx) {
    ctx = ctx || {}; skipAll = false; const n = ctx.npc;
    dlg.className = 'show ' + (ctx.mode || '');
    const figs = ctx.noFigs ? '' : (n
      ? `<div class="dfig left" id="dfL">${Art.fig(n.look, { id: n.id })}</div><div class="dfig right" id="dfR">${Art.keeper()}</div>`
      : `<div class="dfig center">${Art.keeper()}</div>`);
    dlg.innerHTML = `<div class="dbg"></div>${figs}<div class="dtitle"></div><div class="dbox"><div class="dname"></div><div class="dtext"></div><div class="darrow">▼</div></div><button class="dskip">SKIP ▶▶</button>`;
    const box = $('.dbox', dlg), skip = $('.dskip', dlg);
    if (ctx.mode === 'dark' && S.assets.event_bg) {      // 事件對話：酒館插畫（沒有吧台）加一層暗色，讓立繪與文字清楚
      $('.dbg', dlg).style.background = `linear-gradient(rgba(8,5,12,.28),rgba(8,5,12,.5)), url(${S.assets.event_bg}) center/cover`;
    }
    skip.onclick = e => { e.stopPropagation(); skipAll = true; if (curAdvance) { curAdvance(); if (curAdvance) curAdvance(); } };
    if (ctx.title) {
      dlg.classList.add('titling');                       // 標題出現時先藏起立繪，避免蓋住標題文字
      box.style.visibility = 'hidden'; skip.style.visibility = 'hidden';
      const t = $('.dtitle', dlg); t.innerHTML = `<small>${ctx.sub || ''}</small><h2>${ctx.title}</h2>`;
      await sleep(150); t.classList.add('on'); await sleep(1800); t.classList.remove('on'); await sleep(500);
      box.style.visibility = ''; skip.style.visibility = '';
      dlg.classList.remove('titling');
    }
    for (const line of lines) { if (skipAll) break; await speak(line, n); }
    dlg.className = ''; dlg.innerHTML = ''; curAdvance = null;
  }
  async function playEvent(n, ev) {
    const idx = THRESH.indexOf(ev.at) + 1;
    await playDlg(ev.script, { npc: n, mode: 'dark', title: ev.title, sub: `${n.name}　事件 ${idx} / 5` });
    if (!seenOf(n).includes(ev.at)) seenOf(n).push(ev.at);
    save();
  }

  // ---------- 入口頁 ----------
  // 在入口頁先把所有素材載入快取，進酒吧時才不會看到「舊版 → 新圖」的跳換
  (function preload(o) { for (const k in o) { if (typeof o[k] === 'string') { const im = new Image(); im.src = o[k]; } else if (o[k] && typeof o[k] === 'object') preload(o[k]); } })(S.assets);
  function buildTitle() {
    const t = $('#title');
    if (S.assets.title_bg) {            // 正式美術版：背景圖 + 門板圖
      t.innerHTML = `<div class="tw art" style="background-image:url(${S.assets.title_bg})">
        <div class="ttl"><h1>${S.title}</h1><div class="sub">${S.subtitle}</div></div>
        <div class="doorway"><img class="door l" id="dL" src="${S.assets.door_l}" alt=""><img class="door r" id="dR" src="${S.assets.door_r}" alt=""></div>
        <button id="startBtn">${st.seenIntro ? '繼續營業' : '開始遊戲'}</button></div>
        <button class="rstbtn" id="rst">重置存檔</button>`;
    } else {                            // 備用：CSS 繪製版
      t.innerHTML = `<div class="tw"><div class="stars"></div><div class="moon"></div>
        <div class="ttl"><h1>${S.title}</h1><div class="sub">${S.subtitle}</div></div>
        <button id="startBtn">${st.seenIntro ? '繼續營業' : '開始遊戲'}</button>
        <div class="wall"><i class="wlamp" style="left:290px"></i><i class="wlamp" style="right:290px"></i></div>
        <div class="frame"><div class="interior"><i class="sil" style="left:60px;width:46px;height:110px"></i><i class="sil" style="left:190px;width:60px;height:92px"></i><i class="sil" style="right:70px;width:50px;height:120px"></i></div>
        <div class="door l" id="dL"></div><div class="door r" id="dR"></div></div></div>
        <button class="rstbtn" id="rst">重置存檔</button>`;
    }
    $('#startBtn').onclick = startGame;
    $('#rst').onclick = resetAll;
  }
  function resetAll() { if (confirm('確定重置所有進度（好感、事件、天數）？')) { try { localStorage.removeItem(KEY); } catch (e) {} location.reload(); } }

  async function startGame() {
    const t = $('#title'); $('#startBtn').disabled = true;
    t.classList.add('opening'); await sleep(1250);
    t.classList.add('enter'); await sleep(950);
    fade.classList.add('on'); await sleep(450);
    buildBar(); showScene('bar'); fade.classList.remove('on'); await sleep(800);
    if (!st.seenIntro) { await playDlg(S.intro, { mode: 'dim', noFigs: true }); st.seenIntro = true; save(); }
  }

  // ---------- 酒吧場景 ----------
  let barScene = null;
  function buildBar() {
    if (barScene) barScene.destroy();
    const el = $('#bar'); el.classList.add('isobar');
    barScene = BarScene.mount(el, {
      day: st.day, guests: E.guestsOfDay(st.day),
      pending: n => pending(n).length, giftsLeft,
      onSpecial: n => openGuest(n),
      onKeeper: () => toast('老闆：「想喝什麼，就看你想先聽誰的故事。」'),
    });
  }

  async function openGuest(n) {
    if (busy) return; busy = true;
    try {
      const pend = pending(n);
      if (!pend.length && giftsLeft(n) <= 0) { toast(`${n.name} 今晚已經喝夠了。`); return; }
      for (const ev of pend) await playEvent(n, ev);
      await xfade(() => { enterMix(n); });
    } finally { busy = false; }
  }

  async function endNight() {
    if (busy) return; busy = true;
    try {
      await card(`第 ${st.day} 夜　打烊`, '客人們各自散去……', async () => { st.day++; save(); buildBar(); $('#nightLbl').textContent = `第 ${st.day} 夜`; });
    } finally { busy = false; }
  }

  // ---------- 調酒模式 ----------
  function enterMix(n) {
    mixNpc = n; sel = {};
    const m = E.moodOf(n, st.day);
    const el = $('#mix');
    el.innerHTML = `<div class="mwall"></div><div class="mcounter"></div>
      <div class="moodbub">💭 ${m.text}</div>
      <div class="guestfig">${Art.fig(n.look, { id: n.id })}</div>
      <button class="btn" id="leave" style="position:absolute;left:330px;top:64px;z-index:8">← 回到酒吧</button>
      <aside class="panel" id="info"></aside><aside class="panel" id="pick"></aside><div class="panel" id="prev"></div>`;
    Art.applyBg(el, S.assets.mix_bg);
    $('#leave').onclick = () => { if (!busy) leaveMix(); };
    showScene('mix'); renderInfo(); renderPick(); renderPrev();
  }
  async function leaveMix() { busy = true; await xfade(() => { buildBar(); showScene('bar'); }); busy = false; }

  function renderInfo() {
    const n = mixNpc, a = aff(n), seen = seenOf(n), m = E.moodOf(n, st.day);
    const hints = E.hintsOf(n).map(t => `<span class="tag">${t}</span>`).join('');
    const likes = n.like.map(t => `<span class="tag like">♥ ${t}</span>`).join('');
    const hates = n.hate.map(t => `<span class="tag hate">✕ ${t}</span>`).join('');
    const evs = n.events.map(e => {
      if (seen.includes(e.at)) return `<div class="evrow done">✔ ${e.title}</div>`;
      if (a >= e.at) return `<div class="evrow new">❗ ${e.title}（未讀）</div>`;
      return `<div class="evrow">🔒 好感 ${e.at} 解鎖</div>`;
    }).join('');
    const ideal = E.idealToday(n, st.day);
    const plan = planner ? `<div class="sect"><h3>企劃模式</h3><div class="planbox">今日理想：${D.dims.map(d => d.name + ideal[d.id]).join(' ')}</div><button class="btn" id="dbg25" style="margin-top:6px;padding:3px 10px;font-size:13px">好感 +25（測試）</button></div>` : '';
    $('#info').innerHTML = `<h3>今夜的客人</h3><div class="iname">${n.name}</div><div class="ijob">${n.title}</div>
      <div class="sect"><h3>今天想喝</h3><div>${m.text}</div></div>
      <div class="sect"><h3>個人喜好</h3>${hints}${likes}${hates}</div>
      <div class="sect"><h3>好感度　${a} / 100</h3>
        <div class="affbar"><i style="width:${a}%"></i>${THRESH.map(v => `<b style="left:${v}%"></b><span style="left:${v}%">${v}</span>`).join('')}</div>
        ${evs}</div>${plan}`;
    const b = $('#dbg25');
    if (b) b.onclick = () => { st.affinity[n.id] = Math.min(100, aff(n) + 25); save(); renderInfo(); };
  }

  function renderPick() {
    $('#pick').innerHTML = `<h3>調酒台</h3>` + D.slots.map(s => {
      const opts = D.ingredients.filter(i => i.slot === s.id);
      const chips = (s.required ? [] : [{ id: '', name: '無', emoji: '∅' }]).concat(opts).map(i =>
        `<div class="chip ${(sel[s.id] || '') === i.id ? 'on' : ''}" data-s="${s.id}" data-i="${i.id}">${i.emoji} ${i.name}</div>`).join('');
      return `<div class="slot"><div class="lb"><b>${s.name}</b>${s.required ? '（必選）' : ''}</div><div class="chips">${chips}</div></div>`;
    }).join('');
    $('#pick').querySelectorAll('.chip').forEach(c => c.onclick = () => { if (busy) return; sel[c.dataset.s] = c.dataset.i || null; renderPick(); renderPrev(); });
  }

  function renderPrev() {
    const n = mixNpc, left = giftsLeft(n), el = $('#prev');
    if (!sel.base) { el.innerHTML = `<div class="empty">先在右側選一種基酒開始調製　（今晚還能送 ${left} 杯）</div>`; return; }
    const f = E.flavor(sel), q = E.quality(sel, f), name = E.cocktailName(sel, f, q.recipe);
    const ideal = planner ? E.idealToday(n, st.day) : null;
    const j = planner ? E.judge(sel, n, st.day) : null;
    const bars = D.dims.map(d => `<div class="frow"><span>${d.icon} ${d.name}</span><div class="track"><div class="fill" style="width:${f[d.id] * 10}%"></div>${ideal ? `<div class="mk" style="left:calc(${ideal[d.id] * 10}% - 1px)"></div>` : ''}</div><span>${f[d.id]}</span></div>`).join('');
    el.innerHTML = `<div class="pl"><div style="font-size:34px">🍸</div><div class="pname">${name}</div>${q.recipe ? '<div class="badge">★ 招牌配方</div>' : ''}
        <div class="qn">品質 <b>${q.score}</b></div>${j ? `<div class="planbox">對 ${n.name}：${j.final} 分（${j.tier.label}）</div>` : ''}</div>
      <div class="pbars">${bars}</div>
      <div class="go"><button class="btn primary" id="serve" ${left <= 0 ? 'disabled' : ''}>送出這杯</button><div class="left">${left > 0 ? `今晚還能送 ${left} 杯` : '他今晚喝夠了'}</div></div>`;
    $('#serve').onclick = serve;
  }

  async function serve() {
    if (busy || !sel.base || giftsLeft(mixNpc) <= 0) return; busy = true;
    const n = mixNpc;
    try {
      const j = E.judge(sel, n, st.day), name = E.cocktailName(sel, j.f, j.q.recipe);
      const from = aff(n), to = clamp(from + j.tier.gain, 0, 100);
      st.affinity[n.id] = to; const k = st.day + ':' + n.id; st.gifts[k] = (st.gifts[k] || 0) + 1;
      st.log.unshift({ day: st.day, npc: n.name, name, final: j.final, gain: to - from }); st.log = st.log.slice(0, 30);
      save(); renderInfo(); renderPrev();

      const lines = [{ w: 'sys', t: `（你把「${name}」推到${n.name}面前。）` }, { w: 'npc', t: j.line }];
      if (j.hints.length) lines.push({ w: 'npc', t: '……' + j.hints.join('，') + '。' });
      if (j.likeHit.length) lines.push({ w: 'sys', t: `（「${j.likeHit.join('、')}」的味道，似乎正中他的喜好。）` });
      if (j.hateHit.length) lines.push({ w: 'sys', t: `（他皺了一下眉——大概是「${j.hateHit.join('、')}」。）` });
      await playDlg(lines, { npc: n, mode: 'clear', noFigs: true });

      const pend = pending(n);
      const choice = await showResult({ name, j, from, to, pend: pend.length });
      if (choice === 'event') for (const ev of pend) await playEvent(n, ev);
      renderInfo();
      if (giftsLeft(n) <= 0) { await leaveMix(); } else { sel = {}; renderPick(); renderPrev(); }
    } finally { busy = false; }
  }

  function showResult(r) {
    return new Promise(res => {
      const el = $('#result'), t = r.j.tier, gain = r.to - r.from;
      el.innerHTML = `<div class="rcard"><div class="rname">${r.name}</div>
        <div class="rstars">${'★'.repeat(t.stars)}${'☆'.repeat(4 - t.stars)}</div>
        <div class="rtier">${t.label}</div><div class="rscore">契合 ${r.j.final} 分　（品質 ${r.j.q.score}）</div>
        <div class="rgain ${gain < 0 ? 'neg' : 'pos'}">好感 ${gain >= 0 ? '+' : ''}${gain}　（${r.from} → ${r.to}）</div>
        ${r.pend ? `<div class="rnew">🎉 解鎖了 ${r.pend} 段新事件！</div>` : ''}
        <div class="rbtns">${r.pend ? '<button class="btn primary" data-c="event">查看事件</button><button class="btn" data-c="later">稍後</button>' : '<button class="btn primary" data-c="later">繼續</button>'}</div></div>`;
      el.classList.add('show');
      el.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { el.classList.remove('show'); res(b.dataset.c); });
    });
  }

  // ---------- HUD ----------
  $('#plan').onchange = e => { planner = e.target.checked; if (scene === 'mix') { renderInfo(); renderPrev(); } };
  $('#endNight').onclick = endNight;
  $('#hudReset').onclick = resetAll;

  buildTitle(); showScene('title');
})();
