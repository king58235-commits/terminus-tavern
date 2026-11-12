/* ============================================================
   酒館系統 Prototype — 資料表（企劃可直接修改這個檔案）
   屬性範圍 0~10（濃度的「稀釋」可為負值）
   屬性順序：A(甜, 酸, 苦, 辣, 濃度, 香氣)
   ============================================================ */
const A = (sweet, sour, bitter, spicy, strong, aroma) => ({ sweet, sour, bitter, spicy, strong, aroma });

const GAME_DATA = {
  guestsPerDay: 3,        // 每天輪替幾位 NPC
  giftsPerNpcPerDay: 2,   // 每位 NPC 每天可送幾杯

  // 風味維度
  dims: [
    { id: 'sweet',  name: '甜',   icon: '🍬', tooMuch: '太甜了',     tooLittle: '甜味不夠' },
    { id: 'sour',   name: '酸',   icon: '🍋', tooMuch: '太酸了',     tooLittle: '酸味不夠' },
    { id: 'bitter', name: '苦',   icon: '☕', tooMuch: '太苦了',     tooLittle: '苦味不夠' },
    { id: 'spicy',  name: '辣',   icon: '🌶️', tooMuch: '太辣了',     tooLittle: '辣度不夠' },
    { id: 'strong', name: '濃度', icon: '🔥', tooMuch: '太烈了',     tooLittle: '太淡了' },
    { id: 'aroma',  name: '香氣', icon: '🌸', tooMuch: '香氣太濃郁', tooLittle: '香氣不足' },
  ],

  // 五個欄位（weight = 該欄位對風味的影響力）
  slots: [
    { id: 'base',     name: '基酒',       weight: 1.0, required: true  },
    { id: 'modifier', name: '輔酒／糖漿', weight: 0.7 },
    { id: 'mixer',    name: '果汁／汽水', weight: 1.0 },
    { id: 'spice',    name: '香料／苦精', weight: 0.4 },
    { id: 'garnish',  name: '裝飾',       weight: 0.3 },
  ],

  ingredients: [
    // ---- 基酒 ----
    { id: 'gin',      slot: 'base', name: '琴酒',   emoji: '🌿', attr: A(0, 0, 2, 1, 8, 5), tags: [] },
    { id: 'vodka',    slot: 'base', name: '伏特加', emoji: '🧊', attr: A(0, 0, 0, 1, 8, 0), tags: [] },
    { id: 'rum',      slot: 'base', name: '蘭姆酒', emoji: '🏴‍☠️', attr: A(2, 0, 0, 1, 7, 3), tags: [] },
    { id: 'whisky',   slot: 'base', name: '威士忌', emoji: '🥃', attr: A(1, 0, 3, 2, 8, 4), tags: [] },
    { id: 'tequila',  slot: 'base', name: '龍舌蘭', emoji: '🌵', attr: A(0, 0, 1, 3, 7, 2), tags: [] },
    // ---- 輔酒／糖漿 ----
    { id: 'triple_sec',  slot: 'modifier', name: '橙皮酒',   emoji: '🍊', attr: A(4, 0, 1, 0, 3, 4), tags: ['柑橘'] },
    { id: 'vermouth',    slot: 'modifier', name: '苦艾酒',   emoji: '🍷', attr: A(2, 0, 3, 0, 2, 4), tags: [] },
    { id: 'coffee_liq',  slot: 'modifier', name: '咖啡酒',   emoji: '☕', attr: A(4, 0, 2, 0, 2, 3), tags: ['咖啡'] },
    { id: 'mint_liq',    slot: 'modifier', name: '薄荷酒',   emoji: '🍃', attr: A(3, 0, 0, 1, 2, 5), tags: ['薄荷'] },
    { id: 'syrup',       slot: 'modifier', name: '糖漿',     emoji: '🍯', attr: A(6, 0, 0, 0, 0, 0), tags: [] },
    // ---- 果汁／汽水 ----
    { id: 'lemon',     slot: 'mixer', name: '檸檬汁',   emoji: '🍋', attr: A(1, 8, 0, 0, -3, 2), tags: ['柑橘'] },
    { id: 'lime',      slot: 'mixer', name: '萊姆汁',   emoji: '🟢', attr: A(1, 7, 0, 0, -3, 3), tags: ['柑橘'] },
    { id: 'cranberry', slot: 'mixer', name: '蔓越莓汁', emoji: '🍒', attr: A(3, 3, 0, 0, -3, 1), tags: ['莓果'] },
    { id: 'tonic',     slot: 'mixer', name: '通寧水',   emoji: '🫧', attr: A(1, 0, 3, 0, -3, 1), tags: [] },
    { id: 'ginger',    slot: 'mixer', name: '薑汁汽水', emoji: '🫚', attr: A(3, 0, 0, 4, -3, 1), tags: ['香料'] },
    { id: 'cream',     slot: 'mixer', name: '鮮奶油',   emoji: '🥛', attr: A(3, 0, 0, 0, -2, 1), tags: ['奶味'] },
    // ---- 香料／苦精 ----
    { id: 'bitters',   slot: 'spice', name: '苦精',     emoji: '💧', attr: A(0, 0, 5, 1, 0, 2), tags: ['苦精'] },
    { id: 'chili',     slot: 'spice', name: '辣椒',     emoji: '🌶️', attr: A(0, 0, 0, 7, 0, 0), tags: ['香料'] },
    { id: 'mint_leaf', slot: 'spice', name: '薄荷葉',   emoji: '🌱', attr: A(0, 0, 0, 1, 0, 5), tags: ['薄荷'] },
    { id: 'pepper',    slot: 'spice', name: '黑胡椒',   emoji: '⚫', attr: A(0, 0, 0, 5, 0, 2), tags: ['香料'] },
    { id: 'cinnamon',  slot: 'spice', name: '肉桂',     emoji: '🪵', attr: A(1, 0, 0, 2, 0, 5), tags: ['香料'] },
    // ---- 裝飾 ----
    { id: 'lemon_slice', slot: 'garnish', name: '檸檬片', emoji: '🍋', attr: A(0, 1, 0, 0, 0, 2), tags: ['柑橘'] },
    { id: 'cherry',      slot: 'garnish', name: '櫻桃',   emoji: '🍒', attr: A(2, 0, 0, 0, 0, 1), tags: ['櫻桃'] },
    { id: 'olive',       slot: 'garnish', name: '橄欖',   emoji: '🫒', attr: A(0, 0, 1, 0, 0, 1), tags: ['橄欖'] },
    { id: 'mint_sprig',  slot: 'garnish', name: '薄荷枝', emoji: '🌿', attr: A(0, 0, 0, 0, 0, 3), tags: ['薄荷'] },
    { id: 'salt_rim',    slot: 'garnish', name: '鹽邊',   emoji: '🧂', attr: A(0, 0, 1, 0, 0, 0), tags: [] },
    { id: 'orange_peel', slot: 'garnish', name: '橙皮',   emoji: '🟠', attr: A(0, 0, 1, 0, 0, 3), tags: ['柑橘'] },
  ],

  // 招牌配方：只要「包含」所有 req 的成分就算命中（命中最多條件者優先），品質分加成
  recipes: [
    { name: '琴湯尼',       req: ['gin', 'tonic', 'lemon_slice'],            bonus: 15 },
    { name: '莫斯科騾子',   req: ['vodka', 'ginger'],                         bonus: 15 },
    { name: '黛綺莉',       req: ['rum', 'lime', 'syrup'],                    bonus: 15 },
    { name: '莫吉托',       req: ['rum', 'lime', 'syrup', 'mint_leaf'],       bonus: 18 },
    { name: '瑪格麗特',     req: ['tequila', 'triple_sec', 'lime'],           bonus: 15 },
    { name: '曼哈頓',       req: ['whisky', 'vermouth', 'bitters'],           bonus: 15 },
    { name: '內格羅尼風',   req: ['gin', 'vermouth', 'bitters'],              bonus: 15 },
    { name: '白色俄羅斯',   req: ['vodka', 'coffee_liq', 'cream'],            bonus: 15 },
    { name: '威士忌酸',     req: ['whisky', 'lemon', 'syrup'],                bonus: 15 },
    { name: '紅寶石龍舌蘭', req: ['tequila', 'cranberry', 'cherry'],          bonus: 15 },
  ],

  // NPC：ideal = 理想風味、w = 各維度重視程度（預設 1）、like/hate = 喜惡標籤
  npcs: [
    {
      id: 'rena', name: '蕾娜', title: '公會接待員', emoji: '👩‍💼', color: '#e08a5a',
      ideal: A(2, 6, 2, 3, 6, 4), w: { sour: 1.6 }, like: ['柑橘'], hate: ['奶味'],
      lines: ['……下次別再端這種東西給我。', '還行吧，至少能喝。', '嗯，這個酸度剛好，不錯。', '就是這個！你怎麼知道我今天想喝這個？'],
      events: [{ at: 30, title: '深夜的帳本' }, { at: 60, title: '她不想說的過去' }, { at: 100, title: '公會之外的約定' }],
    },
    {
      id: 'kael', name: '凱爾', title: '退役老兵', emoji: '🧔', color: '#8b9bb4',
      ideal: A(1, 2, 6, 3, 9, 4), w: { strong: 1.8, sweet: 1.3 }, like: ['橄欖', '苦精'], hate: ['櫻桃', '奶味'],
      lines: ['小鬼才喝這種甜水。', '湊合。', '夠勁，有點樣子了。', '哈！這才叫酒。坐下，我跟你講個故事。'],
      events: [{ at: 30, title: '舊傷' }, { at: 60, title: '戰友的名字' }, { at: 100, title: '最後一次出征' }],
    },
    {
      id: 'mira', name: '米菈', title: '見習魔法師', emoji: '🧙‍♀️', color: '#c58be0',
      ideal: A(8, 3, 0, 1, 2, 5), w: { sweet: 1.6, bitter: 1.5, strong: 1.2 }, like: ['櫻桃', '莓果'], hate: ['苦精'],
      lines: ['嗚……好難喝……', '還可以喔，謝謝～', '好好喝！甜甜的！', '這是我喝過最棒的！可以再來一杯嗎？'],
      events: [{ at: 30, title: '偷偷練習的咒語' }, { at: 60, title: '失敗的實驗' }, { at: 100, title: '畢業試驗' }],
    },
    {
      id: 'luna', name: '露娜', title: '酒館歌手', emoji: '🎤', color: '#e0a3b8',
      ideal: A(4, 3, 1, 1, 4, 8), w: { aroma: 1.8 }, like: ['薄荷', '咖啡'], hate: ['辣椒'],
      lines: ['這味道……會毀了我的嗓子。', '普通普通，不過謝啦。', '香氣很棒，我喜歡！', '太完美了，今晚這首歌是為你唱的。'],
      events: [{ at: 30, title: '後台的聊天' }, { at: 60, title: '未寫完的歌' }, { at: 100, title: '只唱給你聽' }],
    },
    {
      id: 'hero', name: '赫洛', title: '流浪廚師', emoji: '👨‍🍳', color: '#d9534f',
      ideal: A(3, 3, 2, 8, 6, 5), w: { spicy: 1.8 }, like: ['香料'], hate: ['薄荷'],
      lines: ['這是給嬰兒喝的嗎？', '嗯……少了點什麼。', '有層次，我喜歡！', '絕妙！我要把這個寫進我的食譜！'],
      events: [{ at: 30, title: '秘密配方' }, { at: 60, title: '被偷走的食譜' }, { at: 100, title: '新菜單' }],
    },
    {
      id: 'lot', name: '洛特', title: '行商', emoji: '🧳', color: '#8fbf7f',
      ideal: A(5, 5, 3, 2, 5, 5), w: { sweet: 0.8, sour: 0.8 }, like: ['莓果'], hate: [],
      lines: ['這杯的成本我算過了，不划算啊。', '中規中矩，不賠不賺。', '平衡得漂亮，是門好生意。', '這杯值得我專程繞路來喝！'],
      events: [{ at: 30, title: '路上的見聞' }, { at: 60, title: '商會的陰影' }, { at: 100, title: '合夥提案' }],
    },
  ],
};

globalThis.GAME_DATA = GAME_DATA; // 讓 engine.js 讀得到
