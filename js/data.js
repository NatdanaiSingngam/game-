// ===== ข้อมูลเกม: สเตตัส อาชีพ สกิล มอนสเตอร์ ห้อง =====

const STATS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'];
const STAT_INFO = {
  str: { label: 'STR', desc: 'พลังโจมตีกายภาพ' },
  agi: { label: 'AGI', desc: 'ความเร็ว (ได้เทิร์นถี่ขึ้น) + หลบ' },
  vit: { label: 'VIT', desc: 'HP สูงสุด + ป้องกัน' },
  int: { label: 'INT', desc: 'SP สูงสุด + พลังเวท/ฮีล' },
  dex: { label: 'DEX', desc: 'ATK สายธนู + คริติคอล' },
  luk: { label: 'LUK', desc: 'โอกาสคริติคอล + หลบ' },
};

const PLAYER_COLORS = ['#ff5d73', '#3fa4ff', '#3ddc84', '#ffcc3d', '#b072ff', '#ff8f3d', '#29d3c7', '#ff6fd8', '#a3e635', '#c7d2fe'];
const HAIR_COLORS = ['#6b4226', '#f2c14e', '#d94f3d', '#2b2b3a', '#eeeef5', '#7a5cff', '#3fa46a', '#ff8fb1', '#4fa3ff'];
const SKIN = '#ffe2cc';

const JOBS = {
  swordsman: {
    name: 'นักดาบ', en: 'Swordsman', icon: '⚔️',
    base: { str: 8, agi: 4, vit: 8, int: 2, dex: 5, luk: 3 },
    hpMod: 1.3, spMod: 0.8, weapon: 8, atkStat: 'str',
    look: { main: '#4a7bd1', trim: '#e8c35a', pants: '#3a3a52' },
    desc: 'แทงก์สายบู๊ HP สูง ยั่วยุให้มอนตีตัวเองได้',
    skills: ['bash', 'magnum', 'provoke'],
  },
  mage: {
    name: 'เมจ', en: 'Mage', icon: '🔮',
    base: { str: 2, agi: 5, vit: 4, int: 10, dex: 6, luk: 3 },
    hpMod: 0.8, spMod: 1.5, weapon: 2, atkStat: 'str',
    look: { main: '#7b4fd1', trim: '#ffd34d', pants: '#2f2747' },
    desc: 'ปืนใหญ่เวทมนตร์ ตีแรงทั้งเดี่ยวและหมู่ แต่บาง',
    skills: ['firebolt', 'frost', 'storm'],
  },
  archer: {
    name: 'อาร์เชอร์', en: 'Archer', icon: '🏹',
    base: { str: 4, agi: 6, vit: 4, int: 3, dex: 10, luk: 3 },
    hpMod: 0.9, spMod: 1.0, weapon: 6, atkStat: 'dex',
    look: { main: '#3f9a5a', trim: '#c98a3f', pants: '#4a3a2a' },
    desc: 'ยิงไกลแม่นยำ คริติคอลสูง',
    skills: ['doublestrafe', 'arrowshower', 'sharpshoot'],
  },
  acolyte: {
    name: 'อะโคไลท์', en: 'Acolyte', icon: '✨',
    base: { str: 4, agi: 4, vit: 6, int: 8, dex: 5, luk: 3 },
    hpMod: 1.0, spMod: 1.3, weapon: 4, atkStat: 'str',
    look: { main: '#f4f1ea', trim: '#c43c4c', pants: '#3a3a52' },
    desc: 'ฮีลเลอร์ประจำปาร์ตี้ บัฟพลังโจมตีทั้งทีม',
    skills: ['heal', 'holylight', 'blessing', 'sanctuary'],
  },
  thief: {
    name: 'ทีฟ', en: 'Thief', icon: '🗡️',
    base: { str: 6, agi: 10, vit: 4, int: 2, dex: 5, luk: 3 },
    hpMod: 0.95, spMod: 0.9, weapon: 6, atkStat: 'str',
    look: { main: '#4b3a6b', trim: '#c43c4c', pants: '#2a2236' },
    desc: 'เร็วที่สุด ได้เทิร์นบ่อย ใส่พิษ ซ่อนตัว',
    skills: ['envenom', 'backstab', 'hiding'],
  },
  merchant: {
    name: 'เมอร์ชานท์', en: 'Merchant', icon: '💰',
    base: { str: 7, agi: 4, vit: 7, int: 2, dex: 5, luk: 5 },
    hpMod: 1.15, spMod: 0.9, weapon: 7, atkStat: 'str',
    look: { main: '#b5793f', trim: '#3f7ab5', pants: '#4a3a2a' },
    desc: 'ตีหนักด้วยเงิน ตะโกนบัฟ ATK ทั้งทีม',
    skills: ['mammonite', 'cartrev', 'loud'],
  },
};

// target: enemy | allEnemies | ally | party | self
// kind: phys | magic | heal | buff
const ATTACK = { key: 'attack', name: 'โจมตี', icon: '⚔️', sp: 0, target: 'enemy', kind: 'phys', mult: 1, fx: 'slash', desc: 'โจมตีปกติ ไม่ใช้ SP' };

const SKILLS = {
  bash:        { name: 'Bash', icon: '💥', lv: 1, sp: 10, target: 'enemy', kind: 'phys', mult: 2.2, fx: 'impact', desc: 'ฟาดหนัก 220% ATK' },
  magnum:      { name: 'Magnum Break', icon: '🔥', lv: 5, sp: 18, target: 'allEnemies', kind: 'phys', mult: 1.3, fx: 'fire', desc: 'ระเบิดไฟรอบตัว 130% ใส่มอนทุกตัว' },
  provoke:     { name: 'Provoke', icon: '😤', lv: 10, sp: 10, target: 'self', kind: 'buff', fx: 'shield', effects: [['taunt', 3], ['defUp', 3, 0.6]], desc: 'ยั่วยุ มอนตีแต่เรา 3 เทิร์น + DEF +60%' },

  firebolt:    { name: 'Fire Bolt', icon: '🔥', lv: 1, sp: 12, target: 'enemy', kind: 'magic', mult: 2.4, fx: 'fire', desc: 'ลูกไฟ 240% MATK' },
  frost:       { name: 'Frost Diver', icon: '❄️', lv: 5, sp: 15, target: 'enemy', kind: 'magic', mult: 1.7, fx: 'ice', freeze: 0.5, desc: '170% MATK + 50% แช่แข็ง (ข้ามเทิร์น)' },
  storm:       { name: 'Storm Gust', icon: '🌪️', lv: 10, sp: 32, target: 'allEnemies', kind: 'magic', mult: 1.6, fx: 'ice', freeze: 0.25, desc: 'พายุน้ำแข็ง 160% ใส่ทุกตัว + 25% แช่แข็ง' },

  doublestrafe:{ name: 'Double Strafe', icon: '🏹', lv: 1, sp: 10, target: 'enemy', kind: 'phys', mult: 1.2, hits: 2, fx: 'arrow', desc: 'ยิง 2 ดอก ดอกละ 120%' },
  arrowshower: { name: 'Arrow Shower', icon: '🌧️', lv: 5, sp: 16, target: 'allEnemies', kind: 'phys', mult: 1.1, fx: 'arrow', desc: 'ฝนธนู 110% ใส่ทุกตัว' },
  sharpshoot:  { name: 'Sharp Shooting', icon: '🎯', lv: 10, sp: 24, target: 'enemy', kind: 'phys', mult: 3.4, alwaysCrit: true, fx: 'arrow', desc: 'ยิงทะลุ 340% คริติคอลแน่นอน' },

  heal:        { name: 'Heal', icon: '💚', lv: 1, sp: 10, target: 'ally', kind: 'heal', power: 1, fx: 'heal', desc: 'ฮีลเพื่อน 1 คน' },
  holylight:   { name: 'Holy Light', icon: '🌟', lv: 3, sp: 12, target: 'enemy', kind: 'magic', mult: 2.2, fx: 'holy', desc: 'แสงศักดิ์สิทธิ์ 220% MATK' },
  blessing:    { name: 'Blessing', icon: '😇', lv: 5, sp: 18, target: 'party', kind: 'buff', fx: 'buff', effects: [['atkUp', 3, 0.25]], desc: 'บัฟ ATK/MATK +25% ทั้งปาร์ตี้ 3 เทิร์น' },
  sanctuary:   { name: 'Sanctuary', icon: '⛪', lv: 10, sp: 30, target: 'party', kind: 'heal', power: 0.7, fx: 'heal', desc: 'ฮีลทั้งปาร์ตี้' },

  envenom:     { name: 'Envenom', icon: '☠️', lv: 1, sp: 8, target: 'enemy', kind: 'phys', mult: 1.5, poison: 3, fx: 'poison', desc: '150% + ติดพิษ 3 เทิร์น' },
  backstab:    { name: 'Back Stab', icon: '🔪', lv: 5, sp: 16, target: 'enemy', kind: 'phys', mult: 3.0, fx: 'slash', desc: 'แทงข้างหลัง 300%' },
  hiding:      { name: 'Hiding', icon: '💨', lv: 10, sp: 10, target: 'self', kind: 'buff', fx: 'smoke', effects: [['hide', 1], ['atkUp', 2, 0.5]], desc: 'ซ่อนตัว มอนตีไม่ได้ + ATK +50%' },

  mammonite:   { name: 'Mammonite', icon: '🪙', lv: 1, sp: 10, target: 'enemy', kind: 'phys', mult: 2.5, fx: 'coin', desc: 'ฟาดด้วยเหรียญ 250%' },
  cartrev:     { name: 'Cart Revolution', icon: '🛒', lv: 5, sp: 16, target: 'allEnemies', kind: 'phys', mult: 1.4, fx: 'impact', desc: 'เหวี่ยงรถเข็น 140% ใส่ทุกตัว' },
  loud:        { name: 'Loud Exclamation', icon: '📣', lv: 10, sp: 14, target: 'party', kind: 'buff', fx: 'buff', effects: [['atkUp', 3, 0.3]], desc: 'ตะโกนปลุกใจ ATK +30% ทั้งปาร์ตี้' },
};

const EFFECT_ICON = { taunt: '😤', defUp: '🛡️', atkUp: '⬆️', hide: '💨', poison: '☠️', freeze: '🧊', defend: '🛡️' };

// ---------- มอนสเตอร์ ----------
const MONSTERS = {
  jelly:      { name: 'เจลลี่ชมพู', sprite: 'slime', colors: { body: '#ff9cc4', dark: '#d9568a' }, hp: 55, atk: 14, def: 2, spd: 8, tier: 1 },
  jellygreen: { name: 'เจลลี่เขียว', sprite: 'slime', colors: { body: '#8be06b', dark: '#4fa83a' }, hp: 65, atk: 15, def: 3, spd: 8, tier: 1 },
  shroom:     { name: 'เห็ดพิษ', sprite: 'mushroom', colors: { cap: '#e2483d', spot: '#fff4e0' }, hp: 70, atk: 16, def: 4, spd: 7, tier: 1, skills: ['poison'] },
  bat:        { name: 'ค้างคาวถ้ำ', sprite: 'bat', colors: { body: '#6a58a0', wing: '#3a2f63' }, hp: 45, atk: 16, def: 1, spd: 15, tier: 1 },
  wolf:       { name: 'หมาป่าเทา', sprite: 'wolf', colors: { body: '#9aa3b5', light: '#e3e7ef' }, hp: 90, atk: 22, def: 5, spd: 13, tier: 2 },
  skeleton:   { name: 'ทหารกระดูก', sprite: 'skeleton', colors: { bone: '#efe8d4', eye: '#ff4b4b', cloth: '#5a3a2a' }, hp: 100, atk: 24, def: 8, spd: 10, tier: 2 },
  ghost:      { name: 'วิญญาณเร่ร่อน', sprite: 'ghost', colors: { body: '#cfe6ff' }, hp: 80, atk: 20, def: 3, spd: 11, tier: 2, skills: ['drain'] },
  orc:        { name: 'ออร์คนักรบ', sprite: 'orc', colors: { skin: '#7fbf5a', armor: '#7a5a3a' }, hp: 130, atk: 27, def: 8, spd: 9, tier: 2, skills: ['smash'] },
  golem:      { name: 'โกเลมหิน', sprite: 'golem', colors: { body: '#9a8f80', glow: '#7ee3ff' }, hp: 200, atk: 30, def: 15, spd: 6, tier: 3, skills: ['smash', 'quake'] },
  imp:        { name: 'ปีศาจน้อย', sprite: 'demon', colors: { body: '#e0484f', horn: '#3a2a3a' }, hp: 120, atk: 28, def: 7, spd: 14, tier: 3, skills: ['drain', 'fireball'] },
  boneknight: { name: 'อัศวินกระดูก', sprite: 'skeleton', colors: { bone: '#d8d2e8', eye: '#7ee3ff', cloth: '#3a2f63' }, hp: 170, atk: 33, def: 13, spd: 11, tier: 3, skills: ['smash'] },
  drake:      { name: 'มังกรน้อย', sprite: 'dragon', colors: { body: '#d9563d', belly: '#ffd08a', wing: '#9a2f2f' }, hp: 220, atk: 36, def: 12, spd: 12, tier: 4, skills: ['breath'] },
  shade:      { name: 'เงามรณะ', sprite: 'ghost', colors: { body: '#8a6fd1' }, hp: 160, atk: 34, def: 8, spd: 15, tier: 4, skills: ['manaburn', 'drain'] },
  warlord:    { name: 'ออร์คขุนศึก', sprite: 'orc', colors: { skin: '#4f8f5a', armor: '#3a3a52' }, hp: 260, atk: 38, def: 14, spd: 10, tier: 4, skills: ['smash', 'quake'] },
  mimic:      { name: 'มิมิค', sprite: 'mimic', colors: { box: '#a8743f', band: '#e8c35a' }, hp: 150, atk: 26, def: 10, spd: 12, tier: 0, skills: ['smash', 'drain'] },
};

const BOSSES = [
  { name: 'ราชาเจลลี่', sprite: 'slime', colors: { body: '#ffd34d', dark: '#c99a1a' }, hp: 380, atk: 20, def: 5, spd: 9, skills: ['quake', 'drain'] },
  { name: 'ออร์คฮีโร่', sprite: 'orc', colors: { skin: '#6fae4a', armor: '#8a2f2f' }, hp: 440, atk: 26, def: 9, spd: 10, skills: ['smash', 'quake'] },
  { name: 'ลอร์ดกระดูก', sprite: 'skeleton', colors: { bone: '#e8e2d0', eye: '#7ee3ff', cloth: '#3a2f63' }, hp: 420, atk: 28, def: 11, spd: 12, skills: ['freezeall', 'manaburn'] },
  { name: 'มังกรดำ', sprite: 'dragon', colors: { body: '#3a3550', belly: '#8a7fb0', wing: '#25213a' }, hp: 520, atk: 30, def: 12, spd: 11, skills: ['breath', 'smash'] },
  { name: 'จอมมารแห่งเหว', sprite: 'demon', colors: { body: '#7a1f3a', horn: '#1a1424' }, hp: 600, atk: 32, def: 12, spd: 13, skills: ['manaburn', 'breath', 'freezeall'] },
];

const MON_SKILLS = {
  basic:     { name: 'โจมตี', kind: 'phys', mult: 1, fx: 'claw' },
  poison:    { name: 'พ่นสปอร์พิษ', kind: 'magic', mult: 0.8, fx: 'poison', poison: 3 },
  drain:     { name: 'ดูดมานา', kind: 'magic', mult: 0.6, fx: 'drain', drain: 14 },
  smash:     { name: 'ทุบสุดแรง', kind: 'phys', mult: 1.8, fx: 'impact' },
  fireball:  { name: 'ลูกไฟนรก', kind: 'magic', mult: 0.7, aoe: true, fx: 'fire' },
  breath:    { name: 'ลมหายใจมังกร', kind: 'magic', mult: 0.9, aoe: true, fx: 'fire', shake: true },
  quake:     { name: 'แผ่นดินไหว', kind: 'phys', mult: 0.75, aoe: true, fx: 'impact', shake: true, alwaysHit: true },
  freezeall: { name: 'พายุหิมะ', kind: 'magic', mult: 0.6, aoe: true, fx: 'ice', freeze: 0.2 },
  manaburn:  { name: 'เผามานาทั้งทีม', kind: 'magic', mult: 0.5, aoe: true, fx: 'drain', drain: 10, shake: true },
};

// ---------- ดันเจี้ยน ----------
const THEMES = [
  { name: 'ถ้ำเจลลี่', bg1: '#4a3424', bg2: '#1c140e', tile: '#5a4230', glow: '#ffb86b' },
  { name: 'ป่าต้องสาป', bg1: '#24503a', bg2: '#0b1a12', tile: '#2f5e44', glow: '#9bff8a' },
  { name: 'สุสานใต้ดิน', bg1: '#3a2f58', bg2: '#110d1c', tile: '#463a6a', glow: '#b9a0ff' },
  { name: 'ปล่องลาวา', bg1: '#5e2418', bg2: '#1e0907', tile: '#6e3220', glow: '#ff7b3d' },
  { name: 'ปราสาทมืด', bg1: '#222a52', bg2: '#080b1a', tile: '#2e3870', glow: '#7ee3ff' },
];

const ROOM_TYPES = {
  battle: { icon: '⚔️', name: 'ห้องมอนสเตอร์' },
  elite:  { icon: '💀', name: 'ห้องอีลีท' },
  chest:  { icon: '🎁', name: 'หีบสมบัติ' },
  event:  { icon: '❓', name: 'ห้องปริศนา' },
  rest:   { icon: '🔥', name: 'กองไฟพักผ่อน' },
  stairs: { icon: '🚪', name: 'ผู้พิทักษ์บันได' },
  boss:   { icon: '👑', name: 'ห้อง MVP' },
};
