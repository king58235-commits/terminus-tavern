/* ============================================================
   終末酒吧 — 音訊：BGM（mp3）＋全部用 WebAudio 合成的音效
   - 音效不依賴任何外部檔案（水聲、冰塊、搖酒杯、杯子碰撞、門聲、提示音……都是程式合成）
   - BGM 路徑在 story.js 的 STORY.audio.bgm
   - 音量與靜音存在 localStorage（km_audio_v2），HUD／入口頁右上角的喇叭按鈕可調整
   ============================================================ */
const Sound = (function () {
  'use strict';
  const KEY = 'km_audio_v2';   // v2：BGM 音量改為曲線對應，舊設定不沿用
  const st = { bgm: 0.5, sfx: 0.9, muted: false };
  try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} };
  const rnd = (a, b) => a + Math.random() * (b - a);

  // 合成音效本身偏小聲（短音效峰值多在 0.05~0.3），所以整體乘上 makeup，再用限幅器擋住過大的峰值
  const SFX_MAKEUP = 2.6;
  function limiter(c) {
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -10; comp.knee.value = 6; comp.ratio.value = 10; comp.attack.value = 0.002; comp.release.value = 0.12;
    comp.connect(c.destination); return comp;
  }

  // ---------- 合成器（可用於即時或離線 AudioContext） ----------
  function makeSynth(ctx, out) {
    const sr = ctx.sampleRate;
    const nb = ctx.createBuffer(1, sr * 2, sr), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const ir = ctx.createBuffer(2, Math.floor(sr * 1.8), sr);
    for (let c = 0; c < 2; c++) { const ch = ir.getChannelData(c); for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 3); }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.35; verb.connect(verbOut); verbOut.connect(out);

    const decay = (g, t, a, peak, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };
    const sustain = (g, t, a, peak, dur, rel) => {
      const p = Math.max(peak, 0.0002); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(p, t + a);
      g.gain.setValueAtTime(p, t + Math.max(a, dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    };
    const wire = (g, wet) => { g.connect(out); if (wet) { const w = ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(verb); } };

    function tone(t, f, dur, o) {
      o = o || {}; const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(f, t); if (o.slide) osc.frequency.exponentialRampToValueAtTime(o.slide, t + dur);
      if (o.rel) sustain(g, t, o.a || 0.005, o.vol == null ? 0.2 : o.vol, dur, o.rel); else decay(g, t, o.a || 0.005, o.vol == null ? 0.2 : o.vol, dur);
      osc.connect(g); wire(g, o.wet); osc.start(t); osc.stop(t + dur + 0.05);
    }
    function noise(t, dur, o) {
      o = o || {}; const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true;
      const fl = ctx.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.frequency.setValueAtTime(o.f || 1000, t); if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t + dur); fl.Q.value = o.Q || 1;
      const g = ctx.createGain(); if (o.rel) sustain(g, t, o.a || 0.005, o.vol == null ? 0.2 : o.vol, dur, o.rel); else decay(g, t, o.a || 0.005, o.vol == null ? 0.2 : o.vol, dur);
      s.connect(fl); fl.connect(g); wire(g, o.wet); s.start(t, rnd(0, 1.5)); s.stop(t + dur + 0.05);
    }

    const S = {
      click(t) { tone(t, 1500, 0.05, { slide: 900, vol: 0.11 }); noise(t, 0.02, { type: 'highpass', f: 4000, vol: 0.06 }); return 0.1; },
      select(t) { tone(t, 520, 0.09, { slide: 260, vol: 0.11 }); noise(t, 0.035, { f: 1800, Q: 2, vol: 0.05 }); return 0.15; },
      blip(t, f) { tone(t, f || 620, 0.035, { type: 'triangle', vol: 0.055 }); return 0.05; },
      next(t) { tone(t, 880, 0.06, { type: 'triangle', vol: 0.08 }); return 0.1; },
      whoosh(t, dur) { dur = dur || 0.55; noise(t, dur, { f: 300, f2: 1800, Q: 0.7, vol: 0.13, a: dur * 0.4 }); return dur; },
      thump(t, f) { tone(t, f || 90, 0.2, { slide: 45, vol: 0.28 }); noise(t, 0.07, { type: 'lowpass', f: 320, vol: 0.12 }); return 0.25; },
      creak(t, dur) {
        dur = dur || 1; const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(), bp = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(120, t); o.frequency.linearRampToValueAtTime(185, t + dur);
        lfo.frequency.value = 9; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency);
        bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 4; sustain(g, t, 0.08, 0.1, dur, 0.25);
        o.connect(bp); bp.connect(g); wire(g, 0.15); o.start(t); lfo.start(t); o.stop(t + dur + 0.05); lfo.stop(t + dur + 0.05);
        noise(t, dur, { f: 1500, Q: 3, vol: 0.03, a: 0.1, rel: 0.2 }); return dur;
      },
      doorOpen(t) { S.creak(t, 0.9); S.thump(t + 0.9, 110); for (let i = 0; i < 3; i++) noise(t + 0.95 + i * 0.09, 0.07, { f: 1200 + i * 200, Q: 2, vol: 0.1 }); return 1.4; },
      footsteps(t, n) { n = n || 4; for (let i = 0; i < n; i++) { tone(t + i * 0.3, 85 + rnd(-8, 8), 0.12, { slide: 55, vol: 0.12 }); noise(t + i * 0.3, 0.05, { type: 'lowpass', f: 500, vol: 0.05 }); } return n * 0.3; },
      clink(t, v) { v = v || 1; tone(t, 2637, 0.55, { vol: 0.12 * v, wet: 0.3 }); tone(t, 3951, 0.35, { vol: 0.07 * v }); tone(t, 5300, 0.18, { vol: 0.03 * v }); noise(t, 0.015, { type: 'highpass', f: 5000, vol: 0.05 * v }); return 0.6; },
      result(t, stars, gain) {
        if (gain < 0) { tone(t, 190, 0.6, { type: 'triangle', slide: 70, vol: 0.2 }); noise(t, 0.3, { type: 'lowpass', f: 300, vol: 0.1 }); return 0.7; }
        const notes = [[523], [523, 659], [523, 659, 784], [523, 659, 784, 1047], [523, 659, 784, 1047, 1319]][Math.min(4, Math.max(0, stars))];
        notes.forEach((f, i) => { tone(t + i * 0.09, f, 0.9, { vol: 0.1, wet: 0.5 }); tone(t + i * 0.09, f * 2, 0.5, { vol: 0.03 }); });
        if (stars >= 4) S.sparkle(t + 0.3);
        return 1.2;
      },
      sparkle(t) { for (let i = 0; i < 9; i++) tone(t + i * 0.06, rnd(2200, 5200), 0.5, { vol: 0.04, wet: 0.6 }); return 0.9; },
      unlock(t) { [784, 988, 1175, 1568].forEach((f, i) => tone(t + i * 0.1, f, 0.8, { vol: 0.09, wet: 0.6 })); S.sparkle(t + 0.3); return 1.2; },
      bell(t, n) { n = n || 3; for (let k = 0; k < n; k++) [1, 2.76, 5.4, 8.9].forEach((m, i) => tone(t + k * 0.95, 392 * m, 2.8, { vol: 0.1 / (i + 1), wet: 0.5 })); return n * 0.95 + 2.8; },
      murmurClink(t) { S.clink(t, 0.25); return 0.6; },
    };
    return S;
  }

  // ---------- 即時播放 ----------
  let ctx = null, master = null, synth = null, ambNode = null, ambTimer = null;
  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return false;
      ctx = new AC(); master = ctx.createGain();
      master.connect(limiter(ctx)); synth = makeSynth(ctx, master); applyVol();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }
  function play(name) { const a = [].slice.call(arguments, 1); if (st.muted || !ensure()) return 0; return synth[name].apply(null, [ctx.currentTime + 0.01].concat(a)); }

  // ---------- BGM ----------
  let bgm = null, duckF = 1, duckTo = 1, duckTimer = null, bgmWanted = false;
  // 滑桿 50% = 實際音量 0.13（這首 BGM 母帶很響，RMS 約 0.18）；用平方曲線，低音量時調整更細
  function bgmVol() { return st.muted ? 0 : Math.min(1, 0.13 * Math.pow(st.bgm / 0.5, 2) * duckF); }
  function applyVol() { if (master) master.gain.value = st.muted ? 0 : st.sfx * SFX_MAKEUP; if (bgm) bgm.volume = bgmVol(); }
  function bgmStart() {
    bgmWanted = true; const src = (typeof STORY !== 'undefined' && STORY.audio && STORY.audio.bgm); if (!src) return;   // 注意：STORY 是 const，不在 window 上
    if (!bgm) { bgm = new Audio(src); bgm.loop = true; bgm.preload = 'auto'; }
    bgm.volume = bgmVol(); const p = bgm.play(); if (p && p.catch) p.catch(() => {});
  }
  function duck(on) {
    duckTo = on ? 0.55 : 1; clearInterval(duckTimer);
    duckTimer = setInterval(() => { duckF += (duckTo - duckF) * 0.2; if (Math.abs(duckTo - duckF) < 0.01) { duckF = duckTo; clearInterval(duckTimer); } if (bgm) bgm.volume = bgmVol(); }, 50);
  }
  document.addEventListener('visibilitychange', () => { if (!bgm || !bgmWanted) return; if (document.hidden) bgm.pause(); else { const p = bgm.play(); if (p && p.catch) p.catch(() => {}); } });

  // ---------- 環境音（酒館低語＋偶爾的杯子聲） ----------
  function ambient(on) {
    if (!on) { if (ambNode) { try { ambNode.stop(); } catch (e) {} ambNode = null; } clearInterval(ambTimer); ambTimer = null; return; }
    if (ambNode || st.muted || !ensure()) return;
    const nb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate), d = nb.getChannelData(0); let last = 0;
    for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }   // 棕噪音
    const s = ctx.createBufferSource(); s.buffer = nb; s.loop = true; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    const g = ctx.createGain(); g.gain.value = 0.05; const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.12; lg.gain.value = 0.02; lfo.connect(lg); lg.connect(g.gain); lfo.start();
    s.connect(lp); lp.connect(g); g.connect(master); s.start(); ambNode = s;
    ambTimer = setInterval(() => { if (!st.muted && Math.random() < 0.6) play('murmurClink'); }, 7000);
  }

  // ---------- 音量面板 ----------
  let panel = null, buttons = [];
  function refreshButtons() { buttons.forEach(b => (b.textContent = st.muted ? '🔇' : '🔊')); }
  function buildPanel() {
    if (panel) return panel; const stage = document.getElementById('stage');
    panel = document.createElement('div'); panel.id = 'audioPanel';
    panel.innerHTML = `<h4>聲音</h4>
      <label>音樂 <input type="range" min="0" max="100" id="aBgm"></label>
      <label>音效 <input type="range" min="0" max="100" id="aSfx"></label>
      <label class="chk"><input type="checkbox" id="aMute"> 靜音</label>`;
    stage.appendChild(panel);
    panel.querySelector('#aBgm').value = Math.round(st.bgm * 100); panel.querySelector('#aSfx').value = Math.round(st.sfx * 100); panel.querySelector('#aMute').checked = st.muted;
    panel.querySelector('#aBgm').oninput = e => { st.bgm = e.target.value / 100; applyVol(); save(); };
    panel.querySelector('#aSfx').oninput = e => { st.sfx = e.target.value / 100; applyVol(); save(); };
    panel.querySelector('#aSfx').onchange = () => play('select');
    panel.querySelector('#aMute').onchange = e => { st.muted = e.target.checked; applyVol(); save(); refreshButtons(); if (st.muted) ambient(false); };
    document.addEventListener('pointerdown', e => { if (panel.classList.contains('on') && !panel.contains(e.target) && !e.target.closest('.audio-btn')) panel.classList.remove('on'); });
    return panel;
  }
  function bindButton(btn) {
    if (!btn) return; buttons.push(btn); refreshButtons();
    btn.onclick = e => {
      e.stopPropagation(); const p = buildPanel(); const stage = document.getElementById('stage'), sr = stage.getBoundingClientRect(), br = btn.getBoundingClientRect(), k = sr.width / 1280;
      p.style.left = Math.max(8, Math.min(1280 - 220, (br.right - sr.left) / k - 210)) + 'px'; p.style.top = ((br.bottom - sr.top) / k + 8) + 'px'; p.classList.toggle('on');
    };
  }

  // ---------- 離線驗證用：渲染某個音效並回報峰值，檢查是否有聲音、有沒有爆音 ----------
  async function measure(name, args) {
    const sec = 4, oc = new OfflineAudioContext(2, 44100 * sec, 44100), g = oc.createGain();
    g.gain.value = st.sfx * SFX_MAKEUP; g.connect(limiter(oc)); const sy = makeSynth(oc, g); const dur = sy[name].apply(null, [0.05].concat(args || []));
    const buf = await oc.startRendering(), d = buf.getChannelData(0); let peak = 0, sum = 0, nz = 0;
    for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += v * v; if (v > 0.001) nz++; }
    return { name, dur: +(+dur).toFixed(2), peak: +peak.toFixed(3), rms: +Math.sqrt(sum / d.length).toFixed(4), audibleMs: Math.round(nz / 44.1) };
  }

  return {
    names: ['click', 'select', 'blip', 'next', 'whoosh', 'thump', 'creak', 'doorOpen', 'footsteps', 'clink', 'result', 'sparkle', 'unlock', 'bell'],
    measure, bindButton,
    unlock() { ensure(); if (!bgm) bgmStart(); },
    bgmStart, duck, ambient,
    click: () => play('click'), select: () => play('select'), next: () => play('next'), whoosh: () => play('whoosh'),
    doorOpen: () => play('doorOpen'), footsteps: n => play('footsteps', n), bell: () => play('bell'),
    blip: w => play('blip', w === 'me' ? 420 : w === 'npc' ? 640 : 520), unlockFx: () => play('unlock'),
    result: (stars, gain) => play('result', stars, gain),
    get muted() { return st.muted; },
    // 除錯用：回報 BGM 的實際狀態（是否在播、音量、讀取狀態、錯誤）
    status() { return { wanted: bgmWanted, has: !!bgm, paused: bgm ? bgm.paused : null, volume: bgm ? +bgm.volume.toFixed(2) : null, time: bgm ? +bgm.currentTime.toFixed(1) : null, ready: bgm ? bgm.readyState : null, error: bgm && bgm.error ? bgm.error.code : null, src: bgm ? bgm.currentSrc.split('/').slice(-2).join('/') : null, ctx: ctx ? ctx.state : null, st: Object.assign({}, st), duck: +duckF.toFixed(2) }; },
  };
})();
