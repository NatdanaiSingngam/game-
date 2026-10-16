'use strict';
// ===== ระบบเกม: ปาร์ตี้ ดันเจี้ยน ห้อง การต่อสู้ตามสปีด เลเวล =====

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let SPEED = 1;
const wait = ms => new Promise(r => setTimeout(r, ms / SPEED));
const SAVE_KEY = 'mdb-dungeon-v1';
const app = () => $('#app');

let S = null;          // สถานะเกม
let B = null;          // สถานะการต่อสู้
let partySize = 8;
let setupList = [];
let uidSeq = 0;
let roomBusy = false;

// ---------- ผู้เล่น ----------
const DEFAULT_JOBS = ['swordsman', 'mage', 'archer', 'acolyte', 'thief', 'merchant', 'swordsman', 'acolyte', 'mage', 'archer'];

function makePlayer(i, e) {
  const J = JOBS[e.job];
  const p = {
    id: 'p' + i, side: 'p', name: e.name.trim() || `ผู้เล่น ${i + 1}`, job: e.job,
    hair: e.hair, hairStyle: e.hairStyle, color: PLAYER_COLORS[i],
    lv: 1, exp: 0, points: 3, stats: { ...J.base },
    glasses: 0, deaths: 0, kills: 0, effects: [], ct: 0,
  };
  const d = derive(p); p.hp = d.maxHp; p.sp = d.maxSp;
  return p;
}

function derive(p) {
  const J = JOBS[p.job], s = p.stats, lv = p.lv;
  const main = s[J.atkStat], sub = J.atkStat === 'dex' ? s.str : s.dex;
  return {
    maxHp: Math.round((50 + lv * 10 + s.vit * 6) * J.hpMod),
    maxSp: Math.round((20 + lv * 2 + s.int * 3) * J.spMod),
    atk: main * 2 + Math.floor(sub / 2) + lv + J.weapon,
    matk: Math.round(s.int * 2.2 + lv),
    def: Math.round(s.vit * 0.8 + lv * 0.3),
    mdef: Math.round(s.int * 0.5 + s.vit * 0.3),
    spd: 10 + s.agi,
    crit: Math.min(50, Math.round(s.luk * 1.2 + s.dex * 0.3)),
    flee: Math.min(40, Math.round(s.agi + s.luk * 0.5)),
  };
}

const expNeed = lv => Math.round(20 * Math.pow(lv, 1.5));

function gainExp(p, x) {
  p.exp += x;
  let ups = 0;
  while (p.exp >= expNeed(p.lv)) { p.exp -= expNeed(p.lv); p.lv++; p.points += 3; ups++; }
  if (ups) { const d = derive(p); p.hp = d.maxHp; p.sp = d.maxSp; }
  return ups;
}

function healParty(frac) {
  S.players.forEach(p => {
    const d = derive(p);
    p.hp = Math.min(d.maxHp, p.hp + Math.round(d.maxHp * frac));
    p.sp = Math.min(d.maxSp, p.sp + Math.round(d.maxSp * frac));
  });
}

function fmtGlass(g) {
  const whole = Math.floor(g + 1e-9), q = Math.round((g - whole) * 4);
  const frac = ['', '¼', '½', '¾'][q];
  if (!whole && !frac) return '0';
  return (whole || '') + (whole && frac ? ' ' : '') + frac;
}
const nm = u => `<b style="color:${u.side === 'p' ? u.color : '#ff8a8a'}">${esc(u.name)}</b>`;

// ---------- บันทึกเกม ----------
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ floor: S.floor, deepest: S.deepest, players: S.players, rooms: S.rooms, need: S.need, uidSeq })); } catch (e) { /* ไม่มี storage ก็เล่นต่อได้ */ }
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.players ? s : null; } catch (e) { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

// =====================================================================
// หน้าตั้งค่าปาร์ตี้
// =====================================================================
function initSetup() {
  setupList = Array.from({ length: 10 }, (_, i) => ({
    name: `ผู้เล่น ${i + 1}`, job: DEFAULT_JOBS[i], hair: HAIR_COLORS[i % HAIR_COLORS.length], hairStyle: i % 4,
  }));
}

function renderSetup() {
  S = null; B = null;
  const sv = loadSave();
  app().innerHTML = `
  <section class="screen setup">
    <div class="logo">
      <div class="logo-sub">DUNGEON PARTY</div>
      <h1>Monster Drink Battle</h1>
      <p>ลงดันเจี้ยนเป็นทีม · ตายยก <b>1 แก้ว</b> · มานาหมดยก <b>¼ แก้ว</b> (+10 SP)</p>
    </div>
    ${sv ? `<div class="win continue"><div class="win-title">บันทึกเกม</div><div class="win-body">
      <span>ปาร์ตี้ ${sv.players.length} คน · อยู่ชั้น <b>B${sv.floor}F</b> · ดื่มรวม ${fmtGlass(sv.players.reduce((a, p) => a + p.glasses, 0))} แก้ว</span>
      <button class="btn gold" id="btnContinue">▶ เล่นต่อ</button></div></div>` : ''}
    <div class="win"><div class="win-title">จำนวนคนในปาร์ตี้</div>
      <div class="win-body size-picker">${[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<button class="chip ${n === partySize ? 'on' : ''}" data-size="${n}">${n}</button>`).join('')}</div></div>
    <div class="setup-grid" id="setupGrid"></div>
    <div class="setup-actions"><button class="btn gold big" id="btnStart">⚔️ ลงดันเจี้ยน!</button></div>
    <div class="win rules"><div class="win-title">กติกา</div><div class="win-body">
      <ul>
        <li>เลือกห้องในแต่ละชั้นได้เอง (สุ่ม 3–6 ห้อง) ต้องเคลียร์อย่างน้อย 2 ห้องก่อนบุกห้องบันไดลงชั้นถัดไป</li>
        <li>ทุก 5 ชั้นจะเจอบอส <b>MVP</b> 👑 · ยิ่งลงลึก มอนยิ่งเลเวลสูงและโหดขึ้น</li>
        <li>เทิร์นนับตาม <b>SPD</b> (AGI สูง = ได้เล่นถี่) ดูลำดับได้ที่แถบด้านบนสนาม</li>
        <li>เลเวลอัพได้ <b>+3 แต้มสเตตัส</b> กดที่การ์ดผู้เล่นเพื่ออัพ STR / AGI / VIT / INT / DEX / LUK</li>
        <li>💀 <b>HP หมด</b> → ยก 1 แก้ว แล้วฟื้นคืนชีพเต็ม · 💧 <b>มานาหมด</b> (SP ไม่พอใช้สกิลที่ถูกสุด) → ยก ¼ แก้ว ได้ +10 SP</li>
        <li>ดื่มอย่างรับผิดชอบ รู้ลิมิตตัวเอง ห้ามขับขี่ 🚫🚗</li>
      </ul></div></div>
  </section>`;
  renderSetupGrid();
}

function renderSetupGrid() {
  $('#setupGrid').innerHTML = setupList.slice(0, partySize).map((e, i) => {
    const J = JOBS[e.job];
    return `<div class="setup-card" style="--c:${PLAYER_COLORS[i]}">
      <div class="sc-num">P${i + 1}</div>
      <div class="sc-ava"><div class="bob" style="--d:${-i * 0.2}s">${chibi(e)}</div></div>
      <input class="sc-name" data-i="${i}" value="${esc(e.name)}" maxlength="14" aria-label="ชื่อผู้เล่น ${i + 1}">
      <div class="sc-jobs">${Object.entries(JOBS).map(([k, j]) => `<button class="job-btn ${e.job === k ? 'on' : ''}" data-i="${i}" data-job="${k}" title="${j.name}">${j.icon}</button>`).join('')}</div>
      <div class="sc-jobname"><b>${J.icon} ${J.name}</b><small>${J.desc}</small></div>
      <div class="sc-look"><button class="btn tiny" data-i="${i}" data-look="hair">🎨 สีผม</button><button class="btn tiny" data-i="${i}" data-look="style">💇 ทรงผม</button></div>
    </div>`;
  }).join('');
}

function startGame() {
  S = { floor: 1, deepest: 1, players: setupList.slice(0, partySize).map((e, i) => makePlayer(i, e)), rooms: [], need: 2 };
  genFloor();
  goMap();
  floorBanner();
}

function continueGame() {
  const sv = loadSave(); if (!sv) return;
  S = { floor: sv.floor, deepest: sv.deepest || sv.floor, players: sv.players, rooms: sv.rooms, need: sv.need };
  uidSeq = sv.uidSeq || 0;
  S.players.forEach(p => { p.effects = []; p.ct = 0; });
  goMap();
}

// =====================================================================
// ดันเจี้ยน / แผนที่ชั้น
// =====================================================================
const theme = () => THEMES[Math.floor((S.floor - 1) / 5) % THEMES.length];
const isExit = r => r.type === 'stairs' || r.type === 'boss';
const bossOfFloor = () => BOSSES[(Math.floor(S.floor / 5) - 1) % BOSSES.length];

function genFloor() {
  const F = S.floor, n = ri(3, 6), base = 1 + (F - 1) * 2;
  const types = [];
  for (let i = 0; i < n - 1; i++) {
    const r = Math.random();
    types.push(r < 0.5 ? 'battle' : (r < 0.62 && F >= 2) ? 'elite' : r < 0.75 ? 'chest' : r < 0.88 ? 'event' : 'rest');
  }
  if (!types.includes('battle')) types[0] = 'battle';
  types.push(F % 5 === 0 ? 'boss' : 'stairs');
  S.rooms = shuffle(types).map((type, id) => {
    const r = { id, type, cleared: false };
    if (type === 'battle') { r.lvMin = base; r.lvMax = base + 2; }
    if (type === 'elite' || type === 'chest') { r.lvMin = base + 2; r.lvMax = base + 4; }
    if (type === 'stairs') { r.lvMin = base; r.lvMax = base + 3; }
    if (type === 'boss') { r.lvMin = base; r.lvMax = base + 4; }
    return r;
  });
  S.need = Math.min(2, n - 1);
}

function clearedCount() { return S.rooms.filter(r => r.cleared && !isExit(r)).length; }

function roomSub(r) {
  switch (r.type) {
    case 'battle': return `มอน Lv ${r.lvMin}–${r.lvMax}`;
    case 'elite': return `★ Lv ${r.lvMax} · EXP ×2.5`;
    case 'chest': return 'สมบัติ... หรือกับดัก?';
    case 'event': return 'ไม่รู้จะเจออะไร';
    case 'rest': return 'ฟื้น HP/SP 60%';
    case 'stairs': return `ผู้พิทักษ์ Lv ${r.lvMax} → ลงชั้นถัดไป`;
    case 'boss': return `MVP: ${bossOfFloor().name} Lv ${r.lvMax}`;
  }
  return '';
}

function goMap() {
  S.screen = 'map';
  roomBusy = false;
  save();
  renderMap();
}

function renderMap() {
  const th = theme(), done = clearedCount(), locked = done < S.need;
  app().innerHTML = `
  <section class="screen map" style="--bg1:${th.bg1};--bg2:${th.bg2};--tile:${th.tile};--glow:${th.glow}">
    <div class="topbar">
      <div class="floor-badge">B${S.floor}F</div>
      <div class="floor-info"><h2>${th.name}</h2>
        <p>เคลียร์แล้ว ${done}/${S.rooms.length - 1} ห้อง · ${locked ? `ต้องเคลียร์อีก ${S.need - done} ห้องก่อนลงบันได` : 'ห้องบันไดเปิดแล้ว!'}</p></div>
      <div class="top-btns"><button class="btn" data-open="board">🍺<span class="hide-sm"> ตารางดื่ม</span></button><button class="btn" data-open="menu">☰</button></div>
    </div>
    <div class="dungeon">
      <div class="torch l">🔥</div><div class="torch r">🔥</div>
      <div class="rooms">${S.rooms.map(r => {
        const T = ROOM_TYPES[r.type], lk = isExit(r) && locked;
        return `<button class="door t-${r.type} ${r.cleared ? 'cleared' : ''} ${lk ? 'locked' : ''}" data-room="${r.id}" ${r.cleared || lk ? 'disabled' : ''}>
          <div class="door-arch"><div class="door-leaf l"></div><div class="door-leaf r"></div><div class="door-icon">${r.cleared ? '✔️' : lk ? '🔒' : T.icon}</div></div>
          <div class="door-name">${T.name}</div>
          <div class="door-sub">${r.cleared ? 'เคลียร์แล้ว' : lk ? `เคลียร์อีก ${S.need - done} ห้อง` : roomSub(r)}</div>
        </button>`;
      }).join('')}</div>
    </div>
    <div class="section-title">ปาร์ตี้ ${S.players.length} คน <small>กดที่การ์ดเพื่อดูสเตตัส / อัพแต้ม</small></div>
    <div class="party-cards full">${S.players.map(p => playerCard(p, 'full')).join('')}</div>
  </section>`;
}

async function enterRoom(id) {
  if (roomBusy) return;
  const r = S.rooms[id];
  if (!r || r.cleared || (isExit(r) && clearedCount() < S.need)) return;
  roomBusy = true;
  const door = $(`.door[data-room="${id}"]`);
  if (door) door.classList.add('opening');
  await wait(650);
  if (['battle', 'elite', 'stairs', 'boss'].includes(r.type)) return startBattle(r);
  if (r.type === 'chest') return chestRoom(r);
  if (r.type === 'event') return eventRoom(r);
  if (r.type === 'rest') return restRoom(r);
}

function upsText(list) {
  return list.length ? `<div class="lvups">${list.map(p => `<div>🎉 ${nm(p)} เลเวลอัพ → Lv${p.lv}</div>`).join('')}</div>` : '';
}

async function chestRoom(r) {
  if (Math.random() < 0.35) {
    await showModal({ icon: '😱', title: 'มิมิค!', html: 'หีบสมบัติลืมตาขึ้นมา... มันคือมอนสเตอร์!', buttons: [{ label: '⚔️ สู้!', cls: 'red' }] });
    return startBattle(r);
  }
  const roll = Math.random();
  let html;
  if (roll < 0.4) {
    const x = S.floor * 30;
    const ups = S.players.filter(p => gainExp(p, x));
    html = `เจอหนังสือเวท! ทุกคนได้ <b>+${x} EXP</b>${upsText(ups)}`;
  } else if (roll < 0.75) {
    const lucky = shuffle([...S.players]).slice(0, Math.min(2, S.players.length));
    lucky.forEach(p => p.points += 1);
    html = `เจอยาเพิ่มพลัง! ${lucky.map(nm).join(' และ ')} ได้ <b>+1 แต้มสเตตัส</b>`;
  } else {
    healParty(0.5);
    html = 'เจอโพชั่นแดงกองโต! ทุกคนฟื้น <b>HP/SP 50%</b>';
  }
  await showModal({ icon: '🎁', title: 'หีบสมบัติ', html, buttons: [{ label: 'เยี่ยม!', cls: 'gold' }] });
  r.cleared = true;
  goMap();
}

const EVENTS = [
  { icon: '⛲', title: 'น้ำพุศักดิ์สิทธิ์', run() { healParty(1); return 'น้ำพุเรืองแสงวิบวับ... ทุกคนฟื้น <b>HP/SP เต็ม</b>!'; } },
  { icon: '🍻', title: 'โรงเตี๊ยมใต้ดิน', drink: true, run() { S.players.forEach(p => { p.glasses += 0.25; p.sp = derive(p).maxSp; }); return 'เจ้าของร้านเลี้ยง! <b>ทุกคนยก ¼ แก้ว</b> ชนแก้ว 🍻 แล้ว SP เต็ม'; } },
  { icon: '🗿', title: 'แท่นบูชาโบราณ', run() { const p = pick(S.players); p.points += 2; return `${nm(p)} ได้รับพรจากเทพ <b>+2 แต้มสเตตัส</b>`; } },
  { icon: '☠️', title: 'กับดักแก๊สพิษ', run() { S.players.forEach(p => { p.hp = Math.max(1, Math.round(p.hp - derive(p).maxHp * 0.25)); }); return 'ฟุ้ดดด! แก๊สพิษพ่นออกมา ทุกคนเสีย <b>HP 25%</b>'; } },
  { icon: '🎡', title: 'วงล้อโชคชะตา', drink: true, run() { const p = pick(S.players); p.glasses += 1; p.points += 3; return `วงล้อหยุดที่ ${nm(p)}! <b>ยก 1 แก้ว</b> แต่ได้ <b>+3 แต้มสเตตัส</b>`; } },
  { icon: '📜', title: 'คัมภีร์โบราณ', run() { const x = S.floor * 25; const ups = S.players.filter(p => gainExp(p, x)); return `ทุกคนอ่านคัมภีร์ ได้ <b>+${x} EXP</b>${upsText(ups)}`; } },
  { icon: '🎲', title: 'นักพนันปริศนา', drink: true, run() {
    const [a, b] = shuffle([...S.players]);
    if (!b) { a.glasses += 0.5; return `${nm(a)} แพ้พนัน <b>ยก ½ แก้ว</b>`; }
    a.glasses += 0.5; b.points += 1;
    return `ทอยเต๋าแข่งกัน! ${nm(a)} แพ้ <b>ยก ½ แก้ว</b> · ${nm(b)} ชนะ <b>+1 แต้มสเตตัส</b>`;
  } },
];

async function eventRoom(r) {
  const ev = pick(EVENTS);
  const html = ev.run();
  await showModal({ icon: ev.icon, title: ev.title, html, cls: ev.drink ? 'drink' : '', buttons: [{ label: ev.drink ? '🍺 ยกแล้ว!' : 'ไปต่อ', cls: 'gold' }] });
  r.cleared = true;
  goMap();
}

async function restRoom(r) {
  healParty(0.6);
  await showModal({ icon: '🔥', title: 'กองไฟพักผ่อน', html: 'ปาร์ตี้นั่งพักรอบกองไฟ ทุกคนฟื้น <b>HP/SP 60%</b>', buttons: [{ label: 'ออกเดินทางต่อ', cls: 'gold' }] });
  r.cleared = true;
  goMap();
}

async function nextFloor() {
  S.floor++;
  S.deepest = Math.max(S.deepest, S.floor);
  genFloor();
  goMap();
  await floorBanner();
}

function floorBanner() {
  const th = theme();
  return banner(`B${S.floor}F`, S.floor % 5 === 0 ? `${th.name} · ⚠️ ชั้นนี้มี MVP!` : th.name);
}

function banner(big, small) {
  const el = $('#banner');
  el.innerHTML = `<div class="bn-big">${big}</div><div class="bn-small">${small}</div>`;
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  return wait(1700);
}

// =====================================================================
// มอนสเตอร์
// =====================================================================
function monPool() {
  const tier = Math.min(4, 1 + Math.floor((S.floor - 1) / 3));
  return Object.keys(MONSTERS).filter(k => MONSTERS[k].tier && (MONSTERS[k].tier === tier || MONSTERS[k].tier === tier - 1));
}

function finalize(m) {
  m.maxHp = Math.round(m.maxHp); m.hp = m.maxHp;
  m.atk = Math.round(m.atk); m.matk = m.atk;
  m.def = Math.round(m.def); m.mdef = Math.round(m.def * 0.6);
  m.crit = 3 + Math.floor(m.lv / 4); m.flee = Math.min(25, 3 + Math.floor(m.lv * 0.4));
  m.exp = Math.round(m.exp);
  return m;
}

// ปาร์ตี้ใหญ่ → มอนเลือดเยอะขึ้นและได้เทิร์นถี่ขึ้น
const partyHp = () => 0.8 + S.players.length * 0.08;
const partySpd = () => 0.85 + S.players.length * 0.05;

function makeMon(key, lv, mod) {
  const t = MONSTERS[key];
  const m = {
    side: 'm', id: 'm' + (++uidSeq), key, name: t.name, sprite: t.sprite, colors: t.colors, lv,
    skills: [...(t.skills || [])], effects: [], ct: 0, dead: false,
    maxHp: t.hp * (1 + 0.25 * (lv - 1)) * partyHp(), atk: t.atk * 1.4 * (1 + 0.15 * (lv - 1)),
    def: t.def + lv * 0.6, spd: (t.spd + Math.floor(lv / 3)) * partySpd(), exp: 5 + lv * 3,
  };
  if (mod === 'elite' || mod === 'guard') {
    m.elite = true;
    m.maxHp *= mod === 'guard' ? 2.6 : 2.2; m.atk *= 1.3; m.def *= 1.2; m.exp *= mod === 'guard' ? 3 : 2.5;
    m.name = '★ ' + m.name;
    if (!m.skills.length) m.skills.push('smash');
  }
  return finalize(m);
}

function makeBoss(lv) {
  const t = bossOfFloor(), n = S.players.length;
  return finalize({
    side: 'm', id: 'm' + (++uidSeq), name: t.name, sprite: t.sprite, colors: t.colors, lv, boss: true,
    skills: [...t.skills], effects: [], ct: 0, dead: false,
    maxHp: t.hp * (1 + 0.25 * (lv - 1)) * (0.3 + n * 0.12), atk: t.atk * 1.4 * (1 + 0.15 * (lv - 1)),
    def: t.def + lv * 0.6, spd: (t.spd + Math.floor(lv / 3)) * partySpd(), exp: (5 + lv * 3) * 8,
  });
}

function genMonsters(room) {
  const n = S.players.length;
  const count = clamp(1 + Math.round(n * 0.35) + ri(-1, 1), 1, 6);
  const pool = monPool();
  const normal = k => Array.from({ length: k }, () => makeMon(pick(pool), ri(room.lvMin, room.lvMax - 1)));
  switch (room.type) {
    case 'battle': return Array.from({ length: count }, () => makeMon(pick(pool), ri(room.lvMin, room.lvMax)));
    case 'elite': return [makeMon(pick(pool), room.lvMax, 'elite'), ...normal(Math.max(0, count - 2))];
    case 'stairs': return [makeMon(pick(pool), room.lvMax, 'guard'), ...normal(Math.max(1, count - 2))];
    case 'boss': return [makeBoss(room.lvMax), ...normal(Math.max(0, count - 3))];
    case 'chest': return [makeMon('mimic', room.lvMax, 'elite'), ...normal(Math.max(0, count - 3))];
  }
  return [];
}

// =====================================================================
// การต่อสู้ (เทิร์นตาม SPD แบบ CTB)
// =====================================================================
const isP = u => u.side === 'p';
const st = u => isP(u) ? derive(u) : u;
const liveMons = () => B.mons.filter(m => !m.dead);
const allUnits = () => [...S.players, ...liveMons()];
const spdOf = u => Math.max(1, st(u).spd);
const unitById = id => allUnits().find(u => u.id === id) || (B && B.mons.find(m => m.id === id));
const unitNode = u => document.querySelector(`.unit[data-uid="${u.id}"]`);

const fxOf = (u, t) => u.effects.find(e => e.type === t);
function addEff(u, type, turns, val = 0) {
  const e = fxOf(u, type);
  if (e) { e.turns = Math.max(e.turns, turns); e.val = Math.max(e.val || 0, val); }
  else u.effects.push({ type, turns, val });
}
const atkMul = u => 1 + (fxOf(u, 'atkUp')?.val || 0);
const defMul = u => 1 + (fxOf(u, 'defUp')?.val || 0);

function nextActor() {
  const us = allUnits();
  let best = null, bt = Infinity;
  for (const u of us) { const t = (100 - u.ct) / spdOf(u); if (t < bt) { bt = t; best = u; } }
  bt = Math.max(0, bt);
  for (const u of us) u.ct += spdOf(u) * bt;
  best.ct -= 100;
  return best;
}

function previewOrder(k) {
  const us = allUnits().map(u => ({ u, ct: u.ct, s: spdOf(u) }));
  const out = [];
  while (out.length < k && us.length) {
    let best = null, bt = Infinity;
    for (const x of us) { const t = (100 - x.ct) / x.s; if (t < bt) { bt = t; best = x; } }
    bt = Math.max(0, bt);
    for (const x of us) x.ct += x.s * bt;
    best.ct -= 100;
    out.push(best.u);
  }
  return out;
}

async function startBattle(room) {
  const mons = genMonsters(room);
  B = { room, mons, dmg: {}, busy: false, pending: null, actor: null, done: null };
  S.players.forEach(p => { p.effects = []; p.ct = rnd(0, 30); });
  mons.forEach(m => { m.ct = rnd(0, 30); });
  S.screen = 'battle';
  renderBattle();
  log(`⚔️ เข้าสู่${ROOM_TYPES[room.type].name} เจอมอน ${mons.length} ตัว!`);
  const boss = mons.find(m => m.boss);
  if (boss) await banner('👑 MVP', `${boss.name} Lv${boss.lv} ปรากฏตัว!`);
  else if (room.type === 'stairs') await banner('⚠️ GUARDIAN', 'ผู้พิทักษ์บันไดขวางทางอยู่!');
  battleLoop();
}

async function battleLoop() {
  for (;;) {
    const u = nextActor();
    B.actor = u;
    B.pending = null;
    refreshAll();
    const skip = await startOfTurn(u);
    if (await afterAction()) return;
    if (skip) { await wait(350); continue; }
    if (isP(u)) await playerTurn(u); else await monsterTurn(u);
    if (await afterAction()) return;
  }
}

async function afterAction() {
  refreshAll();
  await resolveDrinks();
  if (!liveMons().length) { await victory(); return true; }
  return false;
}

function tick(u) {
  u.effects.forEach(e => e.turns--);
  u.effects = u.effects.filter(e => e.turns > 0);
}

async function startOfTurn(u) {
  u.effects = u.effects.filter(e => e.type !== 'defend' && e.type !== 'hide');
  if (fxOf(u, 'poison')) {
    const d = Math.max(3, Math.round(st(u).maxHp * 0.06));
    u.hp = Math.max(0, u.hp - d);
    popNum(u, d, 'poison'); fxAt(u, 'poison');
    log(`☠️ ${nm(u)} โดนพิษ ${d}`);
    refreshAll();
    await wait(450);
    if (!isP(u) && u.hp <= 0) { tick(u); await killMons([u], null); return true; }
  }
  const fr = fxOf(u, 'freeze');
  if (fr) {
    u.effects = u.effects.filter(e => e !== fr);
    tick(u);
    popNum(u, 'แข็งทื่อ!', 'miss');
    log(`🧊 ${nm(u)} ถูกแช่แข็ง ข้ามเทิร์น`);
    return true;
  }
  tick(u);
  return false;
}

// ---------- ตาผู้เล่น ----------
function playerTurn() {
  return new Promise(res => { B.done = res; renderAction(); });
}

function minSkillCost(p) {
  const costs = JOBS[p.job].skills.map(k => SKILLS[k]).filter(s => s.lv <= p.lv).map(s => s.sp);
  return costs.length ? Math.min(...costs) : 0;
}

function chooseAction(key) {
  const p = B && B.actor;
  if (!p || !isP(p) || B.busy || !B.done) return;
  if (key === 'cancel') { B.pending = null; clearTargets(); renderAction(); return; }
  if (key === 'defend') return runAction(() => doDefend(p));
  if (key === 'drink') return voluntaryDrink(p);
  const sk = key === 'attack' ? ATTACK : SKILLS[key];
  if (!sk || (sk.lv && sk.lv > p.lv) || sk.sp > p.sp) return;
  if (sk.target === 'enemy') {
    const ms = liveMons();
    if (ms.length === 1) return runAction(() => useSkill(p, key, ms[0]));
    B.pending = key; renderAction(); markTargets('enemy'); showFieldOnPhone();
  } else if (sk.target === 'ally') {
    B.pending = key; renderAction(); markTargets('ally'); showFieldOnPhone();
  } else {
    runAction(() => useSkill(p, key, null));
  }
}

// บนมือถือ เลื่อนให้เห็นสนามตอนเลือกเป้าหมาย
function showFieldOnPhone() {
  const f = $('#field');
  if (!f || innerWidth > 760) return;
  const r = f.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight * 0.75) f.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function onTargetClick(id) {
  if (!B || !B.pending || B.busy) return;
  const key = B.pending, sk = key === 'attack' ? ATTACK : SKILLS[key];
  const u = unitById(id);
  if (!u) return;
  if (sk.target === 'enemy' && (isP(u) || u.dead)) return;
  if (sk.target === 'ally' && !isP(u)) return;
  runAction(() => useSkill(B.actor, key, u));
}

async function runAction(fn) {
  B.busy = true; B.pending = null;
  clearTargets(); renderAction();
  await fn();
  B.busy = false;
  const d = B.done; B.done = null;
  if (d) d();
}

async function voluntaryDrink(p) {
  if (p.sp >= minSkillCost(p)) return;
  await showModal({ icon: '💧🍺', title: `${esc(p.name)} เติมมานา`, html: `ยก <b>¼ แก้ว</b> รับ <b>+10 SP</b>`, cls: 'drink', buttons: [{ label: '🍺 ยกแล้ว! (+10 SP)', cls: 'gold' }] });
  p.glasses += 0.25;
  p.sp = Math.min(derive(p).maxSp, p.sp + 10);
  popNum(p, '+10 SP', 'sp');
  log(`🍺 ${nm(p)} ยก ¼ แก้ว +10 SP`);
  refreshAll();
}

async function doDefend(p) {
  addEff(p, 'defend', 9);
  const d = derive(p), g = Math.round(d.maxSp * 0.1) + 5;
  p.sp = Math.min(d.maxSp, p.sp + g);
  fxAt(p, 'shield');
  popNum(p, `+${g} SP`, 'sp');
  log(`🛡️ ${nm(p)} ตั้งท่าป้องกัน +${g} SP`);
  refreshAll();
  await wait(450);
}

async function useSkill(u, key, target) {
  const sk = key === 'attack' ? ATTACK : SKILLS[key];
  if (sk.sp) u.sp = Math.max(0, u.sp - sk.sp);
  refreshAll();
  if (key !== 'attack') await callout(u, `${sk.icon} ${sk.name}!!`);
  if (sk.kind === 'phys' || sk.kind === 'magic') {
    const targets = sk.target === 'allEnemies' ? liveMons() : [target];
    log(`${nm(u)} ${key === 'attack' ? '⚔️ โจมตี' : `ใช้ ${sk.icon} ${sk.name} ใส่`} ${sk.target === 'allEnemies' ? 'มอนทุกตัว' : nm(target)}`);
    await attack(u, targets, sk);
  } else if (sk.kind === 'heal') {
    const targets = sk.target === 'party' ? S.players : [target];
    castAnim(u);
    log(`${nm(u)} ใช้ ${sk.icon} ${sk.name}${sk.target === 'ally' ? ' ให้ ' + nm(target) : ''}`);
    targets.forEach(t => {
      const amt = Math.round((derive(u).matk * 2.2 + u.lv * 3 + 20) * sk.power * rnd(0.95, 1.05));
      t.hp = Math.min(derive(t).maxHp, t.hp + amt);
      fxAt(t, 'heal'); popNum(t, '+' + amt, 'heal');
    });
  } else if (sk.kind === 'buff') {
    const targets = sk.target === 'party' ? S.players : [u];
    castAnim(u);
    log(`${nm(u)} ใช้ ${sk.icon} ${sk.name}`);
    targets.forEach(t => {
      sk.effects.forEach(([type, turns, val]) => addEff(t, type, turns, val));
      fxAt(t, sk.fx); popNum(t, sk.name, 'buff');
    });
  }
  refreshAll();
  await wait(350);
}

// ---------- ตามอนสเตอร์ ----------
function chooseTarget() {
  const vis = S.players.filter(p => !fxOf(p, 'hide'));
  const taunt = vis.filter(p => fxOf(p, 'taunt'));
  if (taunt.length) return pick(taunt);
  if (!vis.length) return null;
  // บางทีมอนก็รุมคนที่เลือดน้อยสุด
  if (Math.random() < 0.35) return vis.reduce((a, b) => (a.hp / derive(a).maxHp <= b.hp / derive(b).maxHp ? a : b));
  return pick(vis);
}

async function monsterTurn(m) {
  await wait(500);
  let key = 'basic';
  if (m.skills.length && Math.random() < (m.boss ? 0.5 : m.elite ? 0.4 : 0.28)) key = pick(m.skills);
  const sk = MON_SKILLS[key];
  const targets = sk.aoe ? S.players.filter(p => !fxOf(p, 'hide')) : [chooseTarget()].filter(Boolean);
  if (!targets.length) { popNum(m, '???', 'miss'); log(`${nm(m)} หาเป้าหมายไม่เจอ!`); await wait(400); return; }
  if (key !== 'basic') await callout(m, `${sk.name}!!`);
  log(`${nm(m)} ${key === 'basic' ? 'โจมตี' : `ใช้ ${sk.name} ใส่`} ${sk.aoe ? 'ทั้งปาร์ตี้' : nm(targets[0])}`);
  await attack(m, targets, sk);
}

// ---------- คำนวณดาเมจ ----------
function calcHit(att, tgt, sk) {
  const A = st(att), T = st(tgt);
  if (isP(tgt) && fxOf(tgt, 'hide')) return { miss: true };
  if (sk.kind === 'phys' && !sk.alwaysHit && Math.random() * 100 < T.flee) return { miss: true };
  const crit = sk.kind === 'phys' && (sk.alwaysCrit || Math.random() * 100 < A.crit);
  const power = (sk.kind === 'magic' ? A.matk : A.atk) * sk.mult * atkMul(att) * rnd(0.9, 1.1);
  const def = (sk.kind === 'magic' ? T.mdef : T.def) * defMul(tgt);
  let dmg = crit ? power * 1.4 : power - def;
  dmg = Math.max(1, dmg);
  if (fxOf(tgt, 'defend')) dmg /= 2;
  return { dmg: Math.round(dmg), crit };
}

async function attack(att, targets, sk) {
  lunge(att);
  await wait(200);
  targets.forEach(t => fxAt(t, sk.fx));
  if (sk.shake) shake();
  await wait(180);
  const hits = sk.hits || 1;
  for (let h = 0; h < hits; h++) {
    for (const t of targets) {
      if (!isP(t) && t.dead) continue;
      const r = calcHit(att, t, sk);
      if (r.miss) { popNum(t, 'Miss', 'miss'); continue; }
      t.hp = Math.max(0, t.hp - r.dmg);
      if (isP(att)) B.dmg[att.id] = (B.dmg[att.id] || 0) + r.dmg;
      popNum(t, r.crit ? `${r.dmg}!` : r.dmg, r.crit ? 'crit' : isP(t) ? 'hurt' : 'dmg');
      hitFlash(t);
      if (sk.poison && t.hp > 0) addEff(t, 'poison', sk.poison);
      if (sk.freeze && t.hp > 0 && Math.random() < sk.freeze) { addEff(t, 'freeze', 9); setTimeout(() => popNum(t, 'Frozen!', 'buff'), 300); }
      if (sk.drain && isP(t)) {
        const d = Math.round(sk.drain + att.lv * 1.2);
        t.sp = Math.max(0, t.sp - d);
        setTimeout(() => popNum(t, `-${d} SP`, 'sp'), 260);
      }
    }
    refreshAll();
    await wait(hits > 1 ? 280 : 420);
  }
  const dead = targets.filter(t => !isP(t) && !t.dead && t.hp <= 0);
  if (dead.length) await killMons(dead, att);
}

async function killMons(list, killer) {
  list.forEach(m => {
    m.dead = true;
    if (killer && isP(killer)) killer.kills++;
    const n = unitNode(m);
    if (n) n.classList.add('dying');
    log(`💀 ${nm(m)} ถูกกำจัด! (+${m.exp} EXP)`);
  });
  await wait(700);
  list.forEach(m => { const n = unitNode(m); if (n) n.remove(); });
  refreshAll();
}

// ---------- กฎดื่ม ----------
async function resolveDrinks() {
  const dead = S.players.filter(p => p.hp <= 0);
  if (dead.length) {
    dead.forEach(p => { p.deaths++; const n = unitNode(p); if (n) n.classList.add('ko'); });
    refreshAll();
    await wait(400);
    await showModal({
      icon: '💀🍺', cls: 'drink',
      title: dead.length > 1 ? `${dead.length} คนตาย!` : `${esc(dead[0].name)} ตาย!`,
      html: `${chipList(dead)}<p>ยก <b>1 แก้ว</b> ให้หมด แล้วฟื้นคืนชีพ HP/SP เต็ม</p>`,
      buttons: [{ label: '🍺 ยกหมดแล้ว!', cls: 'gold' }],
    });
    dead.forEach(p => {
      const d = derive(p);
      p.glasses += 1; p.hp = d.maxHp; p.sp = d.maxSp; p.effects = []; p.ct = 0;
      const n = unitNode(p); if (n) n.classList.remove('ko');
      fxAt(p, 'revive'); popNum(p, 'Resurrection!', 'heal');
      log(`😇 ${nm(p)} ยก 1 แก้ว ฟื้นคืนชีพ! (รวม ${fmtGlass(p.glasses)} แก้ว)`);
    });
    refreshAll();
    await wait(600);
  }
  // มานาหมด = SP ไม่พอใช้สกิลที่ถูกที่สุด (บังคับดื่มครั้งเดียว จนกว่า SP จะกลับมาพอใช้)
  S.players.forEach(p => { if (p.sp >= minSkillCost(p)) p.dry = false; });
  const dry = S.players.filter(p => !p.dry && p.sp < minSkillCost(p));
  if (dry.length) {
    await showModal({
      icon: '💧🍺', cls: 'drink',
      title: dry.length > 1 ? `${dry.length} คนมานาหมด!` : `${esc(dry[0].name)} มานาหมด!`,
      html: `${chipList(dry)}<p>ยก <b>¼ แก้ว</b> รับ <b>+10 SP</b></p>`,
      buttons: [{ label: '🍺 ยกแล้ว! (+10 SP)', cls: 'gold' }],
    });
    dry.forEach(p => {
      p.glasses += 0.25;
      p.dry = true;
      p.sp = Math.min(derive(p).maxSp, p.sp + 10);
      popNum(p, '+10 SP', 'sp');
      log(`💧 ${nm(p)} ยก ¼ แก้ว +10 SP (รวม ${fmtGlass(p.glasses)} แก้ว)`);
    });
    refreshAll();
    await wait(300);
  }
}

function chipList(ps) {
  return `<div class="chips">${ps.map(p => `<span class="pchip" style="--c:${p.color}">${chibi(p, { crop: 'head' })}${esc(p.name)}</span>`).join('')}</div>`;
}

// ---------- ชนะ ----------
async function victory() {
  const room = B.room;
  const exp = B.mons.reduce((a, m) => a + m.exp, 0);
  B.actor = null;
  await wait(300);
  const ups = [];
  S.players.forEach(p => { if (gainExp(p, exp)) ups.push(p); });
  S.players.forEach(p => { p.effects = []; });
  healParty(0.2);
  ups.forEach(p => { fxAt(p, 'lvup'); popNum(p, 'LEVEL UP!', 'lvup'); });
  refreshAll();
  if (ups.length) await wait(1400);

  const ranking = S.players.filter(p => B.dmg[p.id]).sort((a, b) => B.dmg[b.id] - B.dmg[a.id]).slice(0, 3);
  let extra = '';
  if (B.mons.some(m => m.boss) && ranking.length) {
    const mvp = ranking[0];
    mvp.points += 3;
    S.players.forEach(p => p.points += 1);
    extra = `<div class="mvp">👑 MVP: ${nm(mvp)} ได้ <b>+3 แต้ม</b> · ทุกคนได้ +1 แต้มสเตตัส</div>`;
  }
  const exit = isExit(room);
  await showModal({
    icon: '🏆', title: 'ชนะ!',
    html: `<div class="big-exp">+${exp} EXP ทุกคน</div>${upsText(ups)}${extra}
      ${ranking.length ? `<div class="rank"><small>ดาเมจสูงสุด</small>${ranking.map((p, i) => `<div>${['🥇', '🥈', '🥉'][i]} ${nm(p)} <b>${B.dmg[p.id]}</b></div>`).join('')}</div>` : ''}
      <p class="muted">ทุกคนฟื้น HP/SP 20%</p>`,
    buttons: [{ label: exit ? '⬇️ ลงบันไดชั้นถัดไป' : '🗺️ กลับไปเลือกห้อง', cls: 'gold' }],
  });
  room.cleared = true;
  B = null;
  if (exit) await nextFloor(); else goMap();
}

// =====================================================================
// แสดงผลการต่อสู้
// =====================================================================
function renderBattle() {
  const th = theme(), T = ROOM_TYPES[B.room.type];
  app().innerHTML = `
  <section class="screen battle" style="--bg1:${th.bg1};--bg2:${th.bg2};--tile:${th.tile};--glow:${th.glow}">
    <div class="topbar">
      <div class="floor-badge">B${S.floor}F</div>
      <div class="floor-info"><h2>${T.icon} ${T.name}</h2><p>${th.name}</p></div>
      <div class="top-btns"><button class="btn" id="btnSpeed">⏩ x${SPEED}</button><button class="btn" data-open="board">🍺</button></div>
    </div>
    <div class="timeline" id="timeline"></div>
    <div class="field" id="field">
      <div class="floor-plane"></div>
      <div class="side mon-side" id="monSide">${B.mons.map(unitHTML).join('')}</div>
      <div class="side party-side n${S.players.length}" id="partySide">${S.players.map(unitHTML).join('')}</div>
    </div>
    <div class="action" id="action"></div>
    <div class="party-cards compact" id="cards"></div>
    <div class="win log"><div class="win-title">Battle Log</div><div class="win-body" id="blog"></div></div>
  </section>`;
  refreshAll();
}

function unitHTML(u) {
  const P = isP(u);
  const anim = P ? 'bob' : (IDLE_ANIM[u.sprite] || 'bob');
  return `<div class="unit ${P ? 'pu' : 'mu'} ${u.boss ? 'boss' : ''} ${u.elite ? 'elite' : ''}" data-uid="${u.id}" style="--c:${P ? u.color : '#ff4b4b'}">
    <div class="u-ring"></div>
    <div class="u-body"><div class="u-sprite ${anim}" style="--d:${(-Math.random() * 2).toFixed(2)}s">${P ? chibi(u) : monSprite(u)}</div></div>
    <div class="u-label"><span class="u-name">${P ? esc(u.name) : `Lv${u.lv} ${esc(u.name)}`}</span><div class="u-hp"><i></i></div></div>
    <div class="u-eff"></div>
  </div>`;
}

function effIcons(u) {
  return u.effects.map(e => `<span title="${e.type}">${EFFECT_ICON[e.type] || ''}</span>`).join('');
}

function refreshAll() {
  if (!B || !$('#field')) return;
  // หน่วยในสนาม
  allUnits().forEach(u => {
    const n = unitNode(u); if (!n) return;
    const max = st(u).maxHp;
    n.querySelector('.u-hp i').style.width = clamp(u.hp / max * 100, 0, 100) + '%';
    n.querySelector('.u-eff').innerHTML = effIcons(u);
    n.classList.toggle('active', B.actor === u);
    n.classList.toggle('frozen', !!fxOf(u, 'freeze'));
    n.classList.toggle('hidden-fx', !!fxOf(u, 'hide'));
    n.classList.toggle('taunt', !!fxOf(u, 'taunt'));
  });
  $('#cards').innerHTML = S.players.map(p => playerCard(p, 'compact')).join('');
  renderTimeline();
  renderAction();
  if (B.pending) markTargets((B.pending === 'attack' ? ATTACK : SKILLS[B.pending]).target === 'ally' ? 'ally' : 'enemy');
}

function renderTimeline() {
  const el = $('#timeline'); if (!el || !B) return;
  const order = (B.actor ? [B.actor] : []).concat(previewOrder(B.actor ? 11 : 12));
  el.innerHTML = `<span class="tl-label">ลำดับเทิร์น<br><small>ตาม SPD</small></span>` + order.map((u, i) =>
    `<div class="tl-chip ${i === 0 && B.actor ? 'now' : ''} ${isP(u) ? 'p' : 'm'}" style="--c:${isP(u) ? u.color : '#ff4b4b'}" title="${esc(u.name)}">
      <div class="tl-face">${isP(u) ? chibi(u, { crop: 'head' }) : monSprite(u, { crop: 'head' })}</div>
      <span>${esc(u.name.replace('★ ', ''))}</span></div>`).join('');
}

function bar(kind, v, max, label) {
  return `<div class="bar ${kind}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i><span>${label || kind.toUpperCase()} ${Math.round(v)} / ${max}</span></div>`;
}

function playerCard(p, mode) {
  const d = derive(p), J = JOBS[p.job];
  const active = B && B.actor === p;
  return `<div class="pcard ${mode} ${active ? 'active' : ''} ${p.hp <= 0 ? 'ko' : ''}" data-pid="${p.id}" style="--c:${p.color}">
    <div class="pc-ava">${chibi(p, { crop: 'head' })}</div>
    <div class="pc-main">
      <div class="pc-top"><b class="pc-name">${esc(p.name)}</b><span class="pc-lv">Lv${p.lv}</span></div>
      <div class="pc-job">${J.icon} ${J.name} <span class="pc-eff">${effIcons(p)}</span></div>
      ${bar('hp', p.hp, d.maxHp)}${bar('sp', p.sp, d.maxSp)}
      ${mode === 'full' ? bar('exp', p.exp, expNeed(p.lv), 'EXP') : ''}
    </div>
    <div class="pc-side"><div class="pc-glass" title="ดื่มไปแล้ว">🍺${fmtGlass(p.glasses)}</div>${p.points ? `<div class="pc-pts" title="แต้มสเตตัสเหลือ">+${p.points}</div>` : ''}</div>
  </div>`;
}

function renderAction() {
  const el = $('#action'); if (!el || !B) return;
  const u = B.actor;
  if (!u) { el.innerHTML = ''; return; }
  if (!isP(u)) {
    el.style.setProperty('--c', '#ff4b4b');
    el.innerHTML = `<div class="ap-wait"><div class="ap-ava m">${monSprite(u, { crop: 'head' })}</div><div><b>ตาของ ${esc(u.name)}</b><small>มอนสเตอร์กำลังเคลื่อนไหว...</small></div></div>`;
    return;
  }
  const d = derive(u), J = JOBS[u.job], lock = B.busy || !B.done;
  const minCost = minSkillCost(u);
  const pend = B.pending ? (B.pending === 'attack' ? ATTACK : SKILLS[B.pending]) : null;
  const skBtn = (k, s) => {
    const locked = s.lv && s.lv > u.lv;
    const dis = lock || locked || s.sp > u.sp;
    return `<button class="skill ${locked ? 'locked' : ''} ${B.pending === k ? 'sel' : ''}" data-act="${k}" ${dis ? 'disabled' : ''}>
      <span class="s-ico">${s.icon}</span><span class="s-txt"><b>${s.name}</b><small><span class="cost">${locked ? `🔒 Lv${s.lv}` : s.sp ? `${s.sp} SP` : 'ฟรี'}</span><span class="desc"> · ${s.desc}</span></small></span></button>`;
  };
  el.style.setProperty('--c', u.color);
  el.innerHTML = `
    <div class="ap-head">
      <div class="ap-ava">${chibi(u, { crop: 'head' })}</div>
      <div class="ap-info"><div class="ap-name"><b>${esc(u.name)}</b><span class="tag">${J.icon} ${J.name} Lv${u.lv}</span><span class="pc-eff">${effIcons(u)}</span></div>
        ${bar('hp', u.hp, d.maxHp)}${bar('sp', u.sp, d.maxSp)}</div>
      <div class="ap-turn">YOUR TURN</div>
    </div>
    ${pend ? `<div class="ap-target">🎯 ${pend.target === 'ally' ? 'คลิกเลือกเพื่อนที่จะฮีล (ในสนามหรือการ์ด)' : 'คลิกเลือกมอนสเตอร์ที่จะโจมตี'} <button class="btn tiny" data-act="cancel">ยกเลิก</button></div>` : ''}
    <div class="ap-btns">
      ${skBtn('attack', ATTACK)}
      ${J.skills.map(k => skBtn(k, SKILLS[k])).join('')}
      <button class="skill" data-act="defend" ${lock ? 'disabled' : ''}><span class="s-ico">🛡️</span><span class="s-txt"><b>ป้องกัน</b><small><span class="cost">ฟรี</span><span class="desc"> · ลดดาเมจครึ่ง + ฟื้น SP</span></small></span></button>
      <button class="skill drink" data-act="drink" ${lock || u.sp >= minCost ? 'disabled' : ''}><span class="s-ico">🍺</span><span class="s-txt"><b>ยก ¼ แก้ว</b><small><span class="cost">+10 SP</span><span class="desc"> (ใช้ได้เมื่อ SP ไม่พอใช้สกิล)</span></small></span></button>
    </div>`;
}

function markTargets(kind) {
  clearTargets();
  if (kind === 'enemy') liveMons().forEach(m => unitNode(m)?.classList.add('targetable'));
  else S.players.forEach(p => { unitNode(p)?.classList.add('targetable'); $(`.pcard[data-pid="${p.id}"]`)?.classList.add('targetable'); });
}
function clearTargets() { $$('.targetable').forEach(n => n.classList.remove('targetable')); }

// ---------- อนิเมชั่น ----------
const FX = {
  slash: ['⚔️', '#ffffff'], impact: ['💥', '#ffb84d'], fire: ['🔥', '#ff6b3d'], ice: ['❄️', '#7ee3ff'],
  arrow: ['🏹', '#c8f07a'], heal: ['💚', '#3ddc84'], holy: ['✨', '#ffe56b'], buff: ['⬆️', '#ffd34d'],
  shield: ['🛡️', '#7ab8ff'], poison: ['☠️', '#b072ff'], smoke: ['💨', '#dddddd'], coin: ['🪙', '#ffd34d'],
  claw: ['💢', '#ff4b4b'], drain: ['🌀', '#4fa3ff'], revive: ['😇', '#fff6b0'], lvup: ['🌟', '#ffd34d'],
};

function fxAt(u, kind) {
  const n = unitNode(u); if (!n) return;
  const [emo, col] = FX[kind] || FX.impact;
  const f = document.createElement('div');
  f.className = `fx fx-${kind}`;
  f.innerHTML = `<i class="burst" style="--fc:${col}"></i><i class="ring" style="--fc:${col}"></i><b>${emo}</b>`;
  n.appendChild(f);
  setTimeout(() => f.remove(), 1100 / SPEED + 200);
}

function popNum(u, text, type) {
  const n = unitNode(u); if (!n) return;
  const d = document.createElement('div');
  d.className = `num ${type}`;
  d.style.setProperty('--x', `${Math.round(rnd(-16, 16))}px`);
  d.textContent = text;
  n.appendChild(d);
  setTimeout(() => d.remove(), (type === 'lvup' ? 2200 : 1300) / SPEED + 200);
}

function retrigger(node, cls, ms) {
  if (!node) return;
  node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls);
  setTimeout(() => node.classList.remove(cls), ms / SPEED + 50);
}
const lunge = u => retrigger(unitNode(u), isP(u) ? 'lunge-l' : 'lunge-r', 480);
const hitFlash = u => retrigger(unitNode(u)?.querySelector('.u-body'), 'hit', 380);
const castAnim = u => retrigger(unitNode(u), 'cast', 600);
const shake = () => retrigger($('#field'), 'shake', 520);

async function callout(u, text) {
  const n = unitNode(u); if (!n) return;
  const c = document.createElement('div');
  c.className = 'callout';
  c.textContent = text;
  n.appendChild(c);
  await wait(650);
  setTimeout(() => c.remove(), 400);
}

function log(html) {
  const el = $('#blog'); if (!el) return;
  const d = document.createElement('div');
  d.innerHTML = html;
  el.prepend(d);
  while (el.children.length > 60) el.lastChild.remove();
}

// =====================================================================
// โมดอล / หน้าต่าง
// =====================================================================
function showModal({ icon, title, html, buttons, cls }) {
  return new Promise(res => {
    const m = $('#modal');
    m.innerHTML = `<div class="mbox ${cls || ''}"><div class="m-icon">${icon || ''}</div><h2>${title}</h2><div class="m-body">${html || ''}</div>
      <div class="m-btns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-mi="${i}">${b.label}</button>`).join('')}</div></div>`;
    m.classList.add('show');
    m.querySelectorAll('[data-mi]').forEach(b => b.onclick = () => { m.classList.remove('show'); res(+b.dataset.mi); });
  });
}

function openPanel(html) {
  const p = $('#panel');
  p.innerHTML = `<div class="pbox">${html}</div>`;
  p.classList.add('show');
}
function closePanel() { $('#panel').classList.remove('show'); }

let sheetPid = null;
function openSheet(pid) {
  const p = S.players.find(x => x.id === pid); if (!p) return;
  sheetPid = pid;
  const d = derive(p), J = JOBS[p.job];
  openPanel(`<div class="sheet" style="--c:${p.color}">
    <button class="x" data-close>✕</button>
    <div class="sh-left">
      <div class="sh-ava"><div class="bob">${chibi(p)}</div></div>
      <h2>${esc(p.name)}</h2>
      <div class="tag">${J.icon} ${J.name} · ${J.en}</div>
      <div class="sh-lv">Base Lv. <b>${p.lv}</b></div>
      ${bar('hp', p.hp, d.maxHp)}${bar('sp', p.sp, d.maxSp)}${bar('exp', p.exp, expNeed(p.lv), 'EXP')}
      <div class="sh-rec"><div>🍺<b>${fmtGlass(p.glasses)}</b><small>แก้ว</small></div><div>💀<b>${p.deaths}</b><small>ตาย</small></div><div>⚔️<b>${p.kills}</b><small>คิล</small></div></div>
    </div>
    <div class="sh-right">
      <div class="win-title">สเตตัส <span class="pts">แต้มเหลือ <b>${p.points}</b></span></div>
      <div class="stat-list">${STATS.map(s => `<div class="stat-row"><b>${STAT_INFO[s].label}</b><span class="sv">${p.stats[s]}</span>
        <button class="plus" data-stat="${s}" ${p.points ? '' : 'disabled'} aria-label="เพิ่ม ${STAT_INFO[s].label}">+</button><small>${STAT_INFO[s].desc}</small></div>`).join('')}</div>
      <div class="derived">${[['HP', d.maxHp], ['SP', d.maxSp], ['ATK', d.atk], ['MATK', d.matk], ['DEF', d.def], ['MDEF', d.mdef], ['SPD', d.spd], ['CRIT', d.crit + '%'], ['FLEE', d.flee + '%']]
        .map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</div>
      <div class="win-title">สกิล</div>
      <div class="skill-list">${J.skills.map(k => { const s = SKILLS[k], lk = p.lv < s.lv;
        return `<div class="sk ${lk ? 'locked' : ''}"><span class="s-ico">${s.icon}</span><div><b>${s.name}</b> <small>${lk ? `🔒 ปลดล็อก Lv${s.lv}` : `${s.sp} SP`}</small><div class="sk-desc">${s.desc}</div></div></div>`; }).join('')}</div>
    </div>
  </div>`);
}

function addStat(s) {
  const p = S.players.find(x => x.id === sheetPid);
  if (!p || p.points <= 0) return;
  const before = derive(p);
  p.stats[s]++; p.points--;
  const after = derive(p);
  p.hp += after.maxHp - before.maxHp;
  p.sp += after.maxSp - before.maxSp;
  openSheet(p.id);
  if (S.screen === 'map') { renderMap(); save(); } else refreshAll();
}

function openBoard() {
  const ps = [...S.players].sort((a, b) => b.glasses - a.glasses || b.deaths - a.deaths);
  const total = S.players.reduce((a, p) => a + p.glasses, 0);
  openPanel(`<div class="board"><button class="x" data-close>✕</button>
    <h2>🍺 ตารางคนดื่ม</h2>
    <p class="muted">ลึกสุด B${S.deepest}F · ดื่มรวมทั้งปาร์ตี้ <b>${fmtGlass(total)}</b> แก้ว</p>
    <div class="board-list">${ps.map((p, i) => `<div class="brow" style="--c:${p.color}">
      <span class="rk">${['👑', '🥈', '🥉'][i] || i + 1}</span>
      <span class="b-ava">${chibi(p, { crop: 'head' })}</span>
      <span class="b-name"><b>${esc(p.name)}</b><small>${JOBS[p.job].icon} ${JOBS[p.job].name} Lv${p.lv}</small></span>
      <span class="b-num">🍺 <b>${fmtGlass(p.glasses)}</b></span>
      <span class="b-num">💀 ${p.deaths}</span>
      <span class="b-num">⚔️ ${p.kills}</span></div>`).join('')}</div></div>`);
}

function openMenu() {
  openPanel(`<div class="board menu"><button class="x" data-close>✕</button>
    <h2>☰ เมนู</h2>
    <p class="muted">เกมบันทึกอัตโนมัติทุกครั้งที่กลับมาหน้าแผนที่</p>
    ${document.fullscreenEnabled ? `<button class="btn" data-menu="full">⛶ ${document.fullscreenElement ? 'ออกจากเต็มจอ' : 'เล่นแบบเต็มจอ'}</button>` : ''}
    <button class="btn red" data-menu="new">🔁 เริ่มเกมใหม่ (ลบเซฟ)</button>
    <button class="btn" data-close>ปิด</button></div>`);
}

// =====================================================================
// อีเวนต์คลิกทั้งหมด
// =====================================================================
document.addEventListener('click', e => {
  const t = e.target;
  const c = sel => t.closest(sel);
  let n;

  // หน้าตั้งค่า
  if ((n = c('[data-size]'))) { partySize = +n.dataset.size; $$('[data-size]').forEach(b => b.classList.toggle('on', b === n)); renderSetupGrid(); return; }
  if ((n = c('.job-btn'))) { setupList[+n.dataset.i].job = n.dataset.job; renderSetupGrid(); return; }
  if ((n = c('[data-look]'))) {
    const s = setupList[+n.dataset.i];
    if (n.dataset.look === 'hair') s.hair = HAIR_COLORS[(HAIR_COLORS.indexOf(s.hair) + 1) % HAIR_COLORS.length];
    else s.hairStyle = (s.hairStyle + 1) % 4;
    renderSetupGrid(); return;
  }
  if (c('#btnStart')) { clearSave(); startGame(); return; }
  if (c('#btnContinue')) { continueGame(); return; }

  // หน้าต่าง
  if (c('[data-close]') || t.id === 'panel') { closePanel(); return; }
  if ((n = c('[data-stat]'))) { addStat(n.dataset.stat); return; }
  if (c('[data-menu="full"]')) {
    closePanel();
    if (document.fullscreenElement) document.exitFullscreen?.(); else document.documentElement.requestFullscreen?.().catch(() => {});
    return;
  }
  if ((n = c('[data-menu="new"]'))) {
    closePanel();
    showModal({ icon: '🔁', title: 'เริ่มเกมใหม่?', html: 'ความคืบหน้าและสถิติการดื่มจะหายทั้งหมด', buttons: [{ label: 'ยกเลิก' }, { label: 'เริ่มใหม่', cls: 'red' }] })
      .then(i => { if (i === 1) { clearSave(); B = null; renderSetup(); } });
    return;
  }
  if ((n = c('[data-open]'))) { n.dataset.open === 'board' ? openBoard() : openMenu(); return; }
  if (c('#btnSpeed')) { SPEED = SPEED === 1 ? 2 : SPEED === 2 ? 3 : 1; c('#btnSpeed').textContent = `⏩ x${SPEED}`; return; }

  // แผนที่
  if ((n = c('.door[data-room]'))) { enterRoom(+n.dataset.room); return; }

  // การต่อสู้
  if ((n = c('#action [data-act]'))) { chooseAction(n.dataset.act); return; }
  if (B && B.pending) {
    if ((n = c('.unit[data-uid]'))) { onTargetClick(n.dataset.uid); return; }
    if ((n = c('.pcard[data-pid]'))) { onTargetClick(n.dataset.pid); return; }
  }
  if ((n = c('.pcard[data-pid]')) && S) { openSheet(n.dataset.pid); return; }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.classList.contains('sc-name')) setupList[+t.dataset.i].name = t.value;
});

initSetup();
renderSetup();
