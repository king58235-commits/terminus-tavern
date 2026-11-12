/* 美術層：CSS 繪製的人物。若 STORY.assets 有填圖片路徑就改用圖片。 */
const Art = (function () {
  const A = STORY.assets;

  // look = { style, skin, hair, cloth, acc, ghost }
  function fig(look, opts) {
    opts = opts || {};
    const img = opts.id && A.portrait[opts.id];
    if (opts.keeper && A.keeper) return `<img class="figimg" src="${A.keeper}" alt="">`;
    if (img) return `<img class="figimg" src="${img}" alt="">`;
    const l = look;
    return `<div class="fig st-${l.style}${l.ghost ? ' ghost' : ''}" style="--skin:${l.skin};--hair:${l.hair};--cloth:${l.cloth};--acc:${l.acc}">
      <div class="back"></div>
      <div class="body"><i class="chest"></i></div>
      <div class="head"><i class="eye l"></i><i class="eye r"></i><b class="mouth"></b></div>
      <div class="hair"></div>
      <div class="extra"></div>
    </div>`;
  }

  const keeper = () => fig(STORY.keeper, { keeper: true });

  // 背景素材槽：有圖就套上
  function applyBg(el, path) {
    if (path) { el.style.backgroundImage = `url(${path})`; el.style.backgroundSize = 'cover'; el.classList.add('has-img'); }
  }

  // 酒架上的酒瓶
  function bottles(seed, n) {
    const cols = ['#7a3b2e', '#2f6b57', '#b8893a', '#3a4c8a', '#6e3a7a', '#a34848', '#4d7a8a', '#8a6b3a'];
    let s = seed, out = '';
    const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
    for (let i = 0; i < n; i++) {
      const c = cols[Math.floor(r() * cols.length)], h = 40 + Math.floor(r() * 30);
      out += `<i class="bottle" style="height:${h}px;background:${c}"></i>`;
    }
    return out;
  }

  return { fig, keeper, applyBg, bottles };
})();
