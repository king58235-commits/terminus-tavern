/* ============================================================
   終末酒吧 — 劇情與外觀資料（文字、角色造型、素材槽）
   數值平衡在 data.js；這裡只放「文字」與「長相」。
   w: 'npc' = 該客人說話　'me' = 老闆說話　'sys' = 旁白
   ============================================================ */
const STORY = {
  title: '終末酒吧',
  subtitle: 'THE LAST CALL',

  // 素材槽：填入圖片路徑就會取代 CSS 繪製（留 null 則使用 CSS 版）
  assets: {
    title_bg: 'backgrounds/title_bg.png',   // 入口頁背景（1280x720）
    door_l: 'backgrounds/door_l.png',     // 左門板
    door_r: 'backgrounds/door_r.png',     // 右門板
    bar_bg: null,     // 酒吧背景（1280x720）
    event_bg: 'backgrounds/event_bg.jpg',   // 事件對話背景：酒館內部插畫（沒有吧台）
    mix_bg: 'backgrounds/mix_bg.jpg',     // 調酒模式背景：老闆視角，吧台檯面在下、客人身後是柔焦的酒館（不必是像素風）
    keeper: 'portraits/keeper.png',     // 老闆立繪
    portrait: {       // 各客人立繪（約 400x720，透明背景）
      rena: 'portraits/rena.png', kael: 'portraits/kael.png', mira: 'portraits/mira.png',
      luna: 'portraits/luna.png', hero: 'portraits/hero.png', lot: 'portraits/lot.png',
    },
    // 像素小人 sprite sheet（格式見 ASSETS.md：每格 32x40、8 欄 x 2 列）
    sprites: {
      keeper: 'sprites/keeper.png', waiter: 'sprites/waiter.png',
      rena: 'sprites/rena.png', kael: 'sprites/kael.png', mira: 'sprites/mira.png',
      luna: 'sprites/luna.png', hero: 'sprites/hero.png', lot: 'sprites/lot.png',
      passer_0: 'sprites/passer_0.png', passer_1: 'sprites/passer_1.png', passer_2: 'sprites/passer_2.png', passer_3: 'sprites/passer_3.png',
      passer_4: 'sprites/passer_4.png', passer_5: 'sprites/passer_5.png', passer_6: 'sprites/passer_6.png', passer_7: 'sprites/passer_7.png',
    },
    // 各小人「頭頂高度」（腳底往上，單位＝場景像素），由 tools/measure_tops.py 量出；泡泡與名牌依此定位
    spriteTops: {
      keeper: { stand: 35.2, sit: 33.5 }, waiter: { stand: 35.2, sit: 33.7 },
      rena: { stand: 35.5, sit: 34.8 }, kael: { stand: 35.2, sit: 33.8 }, mira: { stand: 35.3, sit: 33.8 },
      luna: { stand: 35.0, sit: 33.3 }, hero: { stand: 35.0, sit: 33.5 }, lot: { stand: 35.0, sit: 32.0 },
      passer_0: { stand: 33.8, sit: 31.0 }, passer_1: { stand: 33.5, sit: 32.8 }, passer_2: { stand: 33.5, sit: 33.2 }, passer_3: { stand: 33.8, sit: 31.2 },
      passer_4: { stand: 33.7, sit: 32.3 }, passer_5: { stand: 33.3, sit: 32.0 }, passer_6: { stand: 33.5, sit: 31.3 }, passer_7: { stand: 33.5, sit: 30.5 },
    },
    // 場景貼圖（地板含地毯 9x8 格、右牆 9 格長、左牆 8 格長；程式依等距座標貼上）
    scene: { floor: 'scene/floor.png', wall_r: 'scene/wall_r.png', wall_l: 'scene/wall_l.png' },
    // 家具：w = 顯示寬度（場景像素）、ax/ay = 接地點在圖內的位置比例；counter 另有專用設定
    props: {
      table:   { src: 'props/table.png',   w: 26, ax: 0.5, ay: 0.93 },
      barrels: { src: 'props/barrels.png', w: 26, ax: 0.5, ay: 0.90 },
      pillar:  { src: 'props/pillar.png',  w: 15, ax: 0.5, ay: 0.95 },
      stool:   { src: 'props/stool.png',   w: 12, ax: 0.5, ay: 0.95 },
      sidetable: { src: 'props/sidetable.png', w: 24, ax: 0.5, ay: 0.92 },
      plant:   { src: 'props/plant.png',   w: 18, ax: 0.5, ay: 0.96 },
      counter: { src: 'props/counter.png', w: 80, cx: 0.1, cy: 4.7, shear: 0.165 },
    },
  },

  waiter: { style: 'hood', skin: '#d9c7ae', hair: '#222', cloth: '#e9e4d8', acc: '#6a7390' },

  // 客人在桌邊閒聊的短句
  chatLines: [
    '乾杯。', '這酒不錯。', '你聽說了嗎？', '外面的鐘又響了。', '再來一杯？',
    '我以前也有一間店。', '哈哈哈……', '別說了，喝吧。', '今晚的月亮真大。', '嗯……是啊。',
    '老闆的手藝沒話說。', '你看，那個人又在發呆。',
  ],

  // 開場事件（僅第一次）
  intro: [
    { w: 'sys', t: '風停了。街道盡頭，只剩一盞還亮著的燈。' },
    { w: 'sys', t: '推開門，是一間不屬於任何地圖的酒吧。' },
    { w: 'me',  t: '歡迎光臨。這裡是終末酒吧——迷惘的靈魂，最後會聚集的地方。' },
    { w: 'me',  t: '世界是怎麼結束的，我早就不記得了。我只知道，每個走進來的人，都想喝點什麼。' },
    { w: 'me',  t: '酒能讓人想起忘掉的事。至於想起什麼，就看我怎麼調。' },
    { w: 'sys', t: '（頭上浮著「…」的客人，有話想對你說。點選他們吧。）' },
    { w: 'me',  t: '來吧。今晚，你想喝些什麼？' },
  ],

  passerLines: [
    '……（低頭喝著自己的酒）', '別管我，我只是路過。', '這裡的燈，比外面暖和。',
    '你聽見了嗎？外面的鐘聲。', '老闆，這杯我不會付錢的。反正……沒人收了。',
    '我好像忘了什麼，不過不重要。', '今晚也沒有星星呢。', 'zzz……',
  ],

  // 路人造型庫
  passers: [
    { style: 'hood',  skin: '#b9c3cf', hair: '#2b2f3a', cloth: '#3b3f54', acc: '#6a7390' },
    { style: 'long',  skin: '#c9d1da', hair: '#4a3b52', cloth: '#5a3d4a', acc: '#a76b7e', ghost: true },
    { style: 'helm',  skin: '#b5bcc6', hair: '#333',    cloth: '#4b5560', acc: '#7a8591' },
    { style: 'hood',  skin: '#cfc8bd', hair: '#3a3028', cloth: '#5b4a36', acc: '#a8875a' },
    { style: 'long',  skin: '#bfc9c4', hair: '#26403a', cloth: '#2f4f4a', acc: '#5fa597', ghost: true },
    { style: 'witch', skin: '#c7c0cf', hair: '#443a5c', cloth: '#443a5c', acc: '#8a7bb5' },
    { style: 'hood',  skin: '#b3bdc6', hair: '#222',    cloth: '#26303d', acc: '#4c6a8a' },
    { style: 'long',  skin: '#d0c9c0', hair: '#5a4630', cloth: '#6b5236', acc: '#c9a269' },
  ],

  keeper: { style: 'keeper', skin: '#e3c9aa', hair: '#2a211b', cloth: '#2b2630', acc: '#c0392b' },

  // 客人（會與 data.js 同 id 的資料合併，覆蓋名稱/職業/事件）
  npcs: {
    rena: {
      name: '莉澤', title: '忘川書記官',
      look: { style: 'long', skin: '#d3dbe6', hair: '#6b5b8a', cloth: '#3d4a6b', acc: '#e8b45c', ghost: true },
      events: [
        { at: 0, title: '迷路的帳本', script: [
          { w: 'npc', t: '……這裡是哪裡？我明明在整理名冊，一抬頭就站在門口了。' },
          { w: 'me',  t: '終末酒吧。迷路的人，最後都會走到這裡。' },
          { w: 'npc', t: '哦。那我先喝點東西好了。反正名冊上的人，已經沒有人會來領了。' } ] },
        { at: 25, title: '寫不完的名字', script: [
          { w: 'npc', t: '我是負責登記亡者的書記官。可是最近，我開始記不清自己的名字了。' },
          { w: 'me',  t: '那就先記住這杯酒的味道吧。' },
          { w: 'npc', t: '呵，你這個人，還挺會說話的。' } ] },
        { at: 50, title: '空白的那一頁', script: [
          { w: 'npc', t: '你看，這本名冊的最後一頁是空的。我一直以為，那是留給還沒輪到的人。' },
          { w: 'npc', t: '今天才發現——那一頁，是留給我自己的。' },
          { w: 'me',  t: '那你想先寫什麼？' },
          { w: 'npc', t: '……酒單。我想先寫，這間酒吧的酒單。' } ] },
        { at: 75, title: '第一行字', script: [
          { w: 'npc', t: '我試著寫了。「酸的、冷的、讓人醒過來的味道。」' },
          { w: 'me',  t: '聽起來像是我的招牌。' },
          { w: 'npc', t: '我把你也寫進去了。不介意吧，老闆？' } ] },
        { at: 100, title: '署名', script: [
          { w: 'npc', t: '名冊寫完了。最後一行，是我的名字——莉澤。' },
          { w: 'npc', t: '我想起來了。我不是來登記別人的，我是來把自己領回去的。' },
          { w: 'me',  t: '那麼，最後一杯，我請客。' },
          { w: 'npc', t: '……謝謝。這間酒吧的燈，我會記得。' } ] },
      ],
    },
    kael: {
      name: '戈爾', title: '無名亡靈騎士',
      look: { style: 'helm', skin: '#aeb5bf', hair: '#222', cloth: '#59606b', acc: '#b03a3a' },
      events: [
        { at: 0, title: '沉默的入座', script: [
          { w: 'npc', t: '……給我最烈的。' },
          { w: 'me',  t: '先坐下。你看起來站了很久。' },
          { w: 'npc', t: '站了很久？呵，大概吧。從那場仗之後，我就沒坐過了。' } ] },
        { at: 25, title: '鏽掉的劍', script: [
          { w: 'npc', t: '這把劍，連鞘都拔不出來了。' },
          { w: 'me',  t: '那就別拔，放在吧台上休息一下。' },
          { w: 'npc', t: '……你這老闆，比我的隊長還囉嗦。' } ] },
        { at: 50, title: '戰友的名字', script: [
          { w: 'npc', t: '第三小隊，十二個人。我只記得七個人的名字。' },
          { w: 'npc', t: '你說，忘掉的那五個，會怪我嗎？' },
          { w: 'me',  t: '會怪你的人，不會讓你一直想起他們。' } ] },
        { at: 75, title: '頭盔底下', script: [
          { w: 'npc', t: '我很久沒脫下這個了。你想看看嗎？……算了，沒什麼好看的。' },
          { w: 'me',  t: '你不需要給我看。' },
          { w: 'npc', t: '……謝了。這比任何一杯酒都好喝。' } ] },
        { at: 100, title: '最後的集合', script: [
          { w: 'npc', t: '我聽見了。他們在門外點名。十二個人，一個不少。' },
          { w: 'npc', t: '老闆，我該走了。這杯，算我敬你。' },
          { w: 'me',  t: '路上小心，騎士。' },
          { w: 'sys', t: '他起身，頭盔在燈下閃了一下，像是在笑。' } ] },
      ],
    },
    mira: {
      name: '米菈', title: '迷路的見習魔女',
      look: { style: 'witch', skin: '#f0d3bd', hair: '#7a4bb0', cloth: '#5b3f95', acc: '#ffd166' },
      events: [
        { at: 0, title: '迷路的小魔女', script: [
          { w: 'npc', t: '那、那個！請問這裡是魔法學院嗎？' },
          { w: 'me',  t: '這裡是酒吧。' },
          { w: 'npc', t: '咦——！那我是不是走錯門了？……不過，這裡好溫暖。' },
          { w: 'me',  t: '要不要來杯甜的？' } ] },
        { at: 25, title: '失敗的魔法', script: [
          { w: 'npc', t: '我今天又把掃帚弄壞了……老師說我是學院史上最糟糕的見習生。' },
          { w: 'me',  t: '但你還是飛到這裡了。' },
          { w: 'npc', t: '那是掉下來的啦！' } ] },
        { at: 50, title: '偷偷練習', script: [
          { w: 'npc', t: '我偷偷練了新咒語，可以讓飲料冒出星星！看好喔——' },
          { w: 'sys', t: '（杯口噗地冒出一小撮火花。）' },
          { w: 'npc', t: '……好像變成煙火了？' },
          { w: 'me',  t: '很漂亮。' } ] },
        { at: 75, title: '不想畢業', script: [
          { w: 'npc', t: '如果我畢業了，是不是就得離開這裡？' },
          { w: 'me',  t: '畢業的人，也可以回來喝一杯。' },
          { w: 'npc', t: '真的嗎？那我可以一直畢業！' } ] },
        { at: 100, title: '畢業試驗', script: [
          { w: 'npc', t: '我通過了！試驗官說，我的魔法是「讓人覺得溫暖」。' },
          { w: 'npc', t: '老闆，這杯讓我用魔法親手為你調一次。' },
          { w: 'me',  t: '好，我來當客人。' },
          { w: 'sys', t: '（她笨拙地搖著雪克杯，星星從杯口飄了出來。）' } ] },
      ],
    },
    luna: {
      name: '露娜', title: '失聲的歌姬',
      look: { style: 'long', skin: '#e6cfd8', hair: '#e07ba0', cloth: '#7a3d63', acc: '#ffd1e3', ghost: true },
      events: [
        { at: 0, title: '無聲的歌', script: [
          { w: 'sys', t: '（她張開嘴，卻沒有聲音。）' },
          { w: 'npc', t: '……抱歉。我以前是歌手，現在只剩旋律，沒有聲音了。' },
          { w: 'me',  t: '這裡很安靜，剛好適合只聽旋律。' } ] },
        { at: 25, title: '哼唱', script: [
          { w: 'npc', t: '你聽，這杯酒的味道，像一段歌的開頭。' },
          { w: 'me',  t: '那結尾呢？' },
          { w: 'npc', t: '還沒想好。再一杯，也許就有了。' } ] },
        { at: 50, title: '最後一場演唱會', script: [
          { w: 'npc', t: '我最後一場演唱會，台下坐滿了人。可是散場之後，我一個都不認得了。' },
          { w: 'me',  t: '現在這裡有一個。' },
          { w: 'npc', t: '……那你要當我的第一位觀眾嗎？' } ] },
        { at: 75, title: '找回的音符', script: [
          { w: 'sys', t: '（空氣中，忽然傳來一個很輕的音符。）' },
          { w: 'npc', t: '剛才……是我嗎？' },
          { w: 'me',  t: '是你。' },
          { w: 'npc', t: '再來一次。再一次就好！' } ] },
        { at: 100, title: '只唱給你聽', script: [
          { w: 'sys', t: '（酒吧的燈暗了下來，她站到吧台前。）' },
          { w: 'npc', t: '這首歌，沒有名字。因為它是在這間酒吧裡寫的。' },
          { w: 'sys', t: '（歌聲很輕，卻讓整間酒吧都安靜了。）' } ] },
      ],
    },
    hero: {
      name: '赫洛', title: '末日料理人',
      look: { style: 'chef', skin: '#e0b894', hair: '#5a2e1a', cloth: '#a63d2f', acc: '#ffe9c2' },
      events: [
        { at: 0, title: '飢餓的旅人', script: [
          { w: 'npc', t: '老闆，有吃的嗎？……沒有？那我自己來。借你廚房用一下！' },
          { w: 'me',  t: '這裡是酒吧……' },
          { w: 'npc', t: '酒也是料理的一種啦！' } ] },
        { at: 25, title: '末日的食材', script: [
          { w: 'npc', t: '世界結束之後，我還是每天都在找食材。你知道最難找的是什麼嗎？' },
          { w: 'npc', t: '是「想吃的人」。' },
          { w: 'me',  t: '現在有一個坐在你面前。' } ] },
        { at: 50, title: '祖傳的辣椒', script: [
          { w: 'npc', t: '這是我奶奶留下的辣椒種子，種了三十年，只長出這一顆。' },
          { w: 'me',  t: '你要拿來調酒？' },
          { w: 'npc', t: '第一口，誰都會哭；第二口，就會笑。' } ] },
        { at: 75, title: '被叼走的食譜', script: [
          { w: 'npc', t: '我的食譜本，被一隻烏鴉叼走了。' },
          { w: 'me',  t: '……黑色的烏鴉？' },
          { w: 'npc', t: '你怎麼知道？' },
          { w: 'me',  t: '他常常坐在那邊那桌。' } ] },
        { at: 100, title: '新菜單', script: [
          { w: 'npc', t: '老闆，我決定了。我要在這裡開一天的餐廳，菜單只有一道。' },
          { w: 'me',  t: '哪一道？' },
          { w: 'npc', t: '「今晚你想喝什麼」的下酒菜！' } ] },
      ],
    },
    lot: {
      name: '洛特', title: '渡鴉行商',
      look: { style: 'raven', skin: '#cfc3b0', hair: '#1d1b24', cloth: '#2b2a38', acc: '#8fbf7f' },
      events: [
        { at: 0, title: '渡鴉的生意', script: [
          { w: 'npc', t: '歡迎光臨——啊不對，我是客人。習慣了。' },
          { w: 'npc', t: '在下洛特，什麼都賣，連「時間」也賣。' },
          { w: 'me',  t: '那你有沒有賣醒酒的？' },
          { w: 'npc', t: '那個要加價。' } ] },
        { at: 25, title: '來路不明的貨', script: [
          { w: 'npc', t: '這只懷錶，是從一個沒有名字的人那裡收來的。據說它能走回過去。' },
          { w: 'me',  t: '能走回去的，我看過，都沒走回來。' },
          { w: 'npc', t: '老闆真是……一點商機都不給我。' } ] },
        { at: 50, title: '商會的陰影', script: [
          { w: 'npc', t: '我以前是商會的人。他們的帳，是用「記憶」結的。' },
          { w: 'me',  t: '你付了多少？' },
          { w: 'npc', t: '……我連自己付了什麼，都不記得了。' } ] },
        { at: 75, title: '鼓起來的包包', script: [
          { w: 'npc', t: '聽說有廚師在找一本食譜？' },
          { w: 'me',  t: '在你包包裡鼓起來的那本？' },
          { w: 'npc', t: '……我是想拿去估個價！真的！' },
          { w: 'sys', t: '（他尷尬地把書推了過來。）' } ] },
        { at: 100, title: '合夥提案', script: [
          { w: 'npc', t: '老闆，我有個提案：我負責把全世界的酒運來，你負責調。' },
          { w: 'npc', t: '利潤五五——不，三七，你七我三。' },
          { w: 'me',  t: '為什麼對我這麼好？' },
          { w: 'npc', t: '因為這間店，是我賺不到、卻最想回來的地方。' } ] },
      ],
    },
  },
};

// 合併進 GAME_DATA.npcs（以 id 對應）
GAME_DATA.npcs.forEach(n => Object.assign(n, STORY.npcs[n.id]));

// 素材版本號：換圖後請把這個字串改掉（例如改成日期），瀏覽器就會重新下載，不會用到舊快取。
// （用程式載入的圖片，Ctrl+F5 不一定會重新抓，所以所有素材路徑都自動加上 ?v=版本）
STORY.version = '20251113m';
STORY.audio = { bgm: 'audio/threshold-between-worlds.mp3' };   // BGM（Suno 生成）；音效全部由 audio.js 合成
(function bust(o) {
  for (const k in o) {
    if (typeof o[k] === 'string') o[k] += '?v=' + STORY.version;
    else if (o[k] && typeof o[k] === 'object') bust(o[k]);
  }
})(STORY.assets);
STORY.audio.bgm += '?v=' + STORY.version;
