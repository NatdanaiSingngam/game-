'use strict';
// ===== เล่นออนไลน์: สร้างห้อง / เข้าห้อง ผ่าน Supabase Realtime =====
// หัวห้อง (host) รันเกมทั้งหมด แล้วส่งสถานะ + อนิเมชั่นให้ทุกเครื่อง
// เครื่องเพื่อน (client) ส่งแค่คำสั่งของตัวละครตัวเองกลับมาให้หัวห้อง

const SB_URL = 'https://xuvznvqbkwaqjvsdkjid.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1dnpudnFia3dhcWp2c2RramlkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTkyMzQsImV4cCI6MjEwNzczNTIzNH0.j7VH1Hm7nBg6Z7cFidxJAeTdZshcyQPl8F11M8pSUoc';
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_PARTY = 10;
const HOST_SAVE_KEY = 'mdb-online-host-v1';

const NET = {
  mode: 'local',      // local | host | client
  screen: 'setup',    // setup | lobby | game
  code: null, myId: null, myName: '', hostId: null,
  sb: null, ch: null, ready: false, queue: [],
  online: new Set(),
  devices: {}, order: [], started: false,
  myChars: [],
  out: [], statePos: -1, flushTimer: null,
  modal: null, modalSeq: 0,
  viewKey: null, gotHost: false, lastBuzz: null,
};

// ---------- storage ----------
function stGet(store, k) { try { return window[store].getItem(k); } catch (e) { return null; } }
function stSet(store, k, v) { try { window[store].setItem(k, v); } catch (e) { /* ignore */ } }
function stDel(store, k) { try { window[store].removeItem(k); } catch (e) { /* ignore */ } }

function devId() {
  let id = stGet('sessionStorage', 'mdb-dev');
  if (!id) { id = 'd' + Math.random().toString(36).slice(2, 10); stSet('sessionStorage', 'mdb-dev', id); }
  return id;
}
const isOnline = () => NET.mode !== 'local';
const isMine = p => NET.mode === 'local' || !p.owner || p.owner === NET.myId;
const devName = id => (NET.devices[id] && NET.devices[id].name) || '???';

// ---------- อนิเมชั่นที่ส่งไปทุกเครื่อง ----------
const VFX = {};
function V(name, fn) {
  VFX[name] = fn;
  return (...args) => {
    if (NET.mode === 'host') netPush({ t: 'fx', n: name, a: args.map(serArg) });
    return fn(...args);
  };
}
function serArg(a) {
  if (Array.isArray(a)) return a.map(serArg);
  if (a && typeof a === 'object' && a.id && a.side) return { $u: 1, id: a.id, side: a.side };
  return a;
}
function deArg(a) {
  if (Array.isArray(a)) return a.map(deArg);
  if (a && typeof a === 'object' && a.$u) return { id: String(a.id), side: a.side === 'p' ? 'p' : 'm' };
  return a;
}

function cleanHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = String(html == null ? '' : html);
  t.content.querySelectorAll('script,iframe,object,embed,link,meta,style,foreignObject,form,input').forEach(n => n.remove());
  t.content.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => {
    if (/^on/i.test(a.name) || /javascript:|url\s*\(/i.test(a.value) || a.name === 'href' || a.name === 'xlink:href') n.removeAttribute(a.name);
  }));
  return t.innerHTML;
}

// ---------- ส่ง / รับ ----------
function netPush(msg) { NET.out.push(msg); schedFlush(); }
function netSync() {
  if (NET.mode !== 'host' || !S || !NET.started) return;
  if (NET.statePos < 0) { NET.statePos = NET.out.length; NET.out.push(null); }
  schedFlush();
}
function schedFlush() { if (!NET.flushTimer) NET.flushTimer = setTimeout(netFlush, 45); }
function netFlush() {
  NET.flushTimer = null;
  if (NET.statePos >= 0) NET.out[NET.statePos] = { t: 'state', s: snapshot() };
  const l = NET.out.filter(Boolean);
  NET.out = []; NET.statePos = -1;
  if (l.length) netSend({ t: 'b', l });
}
function netSend(msg) {
  if (!NET.ch) return;
  msg.from = NET.myId;
  if (!NET.ready) { NET.queue.push(msg); return; }
  NET.ch.send({ type: 'broadcast', event: 'm', payload: msg });
}

function snapshot() {
  return {
    S: { floor: S.floor, deepest: S.deepest, players: S.players, rooms: S.rooms, need: S.need, screen: S.screen },
    B: B ? { bid: B.bid, roomId: B.room.id, mons: B.mons, dmg: B.dmg, actorId: B.actor ? B.actor.id : null, waiting: B.waiting || null, busy: !!B.busy } : null,
    speed: SPEED,
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
function cleanState(s) {
  s.S.players.forEach(p => {
    if (!JOBS[p.job]) p.job = 'swordsman';
    if (!HEX.test(p.color)) p.color = PLAYER_COLORS[0];
    if (!HEX.test(p.hair)) p.hair = HAIR_COLORS[0];
    p.effects = Array.isArray(p.effects) ? p.effects : [];
  });
  if (s.B) s.B.mons.forEach(m => {
    if (!MON_SPRITES[m.sprite]) m.sprite = 'slime';
    Object.keys(m.colors || {}).forEach(k => { if (!HEX.test(m.colors[k])) m.colors[k] = '#888888'; });
    m.effects = Array.isArray(m.effects) ? m.effects : [];
  });
  return s;
}

function applyState(raw) {
  const s = cleanState(raw);
  const prevPending = B && B.pending, prevWaiting = B && B.waiting;
  S = s.S;
  SPEED = s.speed || 1;
  B = s.B ? { ...s.B, room: S.rooms[s.B.roomId] || { type: 'battle', id: s.B.roomId }, actor: null, done: null, pending: null } : null;
  if (B) {
    B.actor = allUnits().find(u => u.id === s.B.actorId) || null;
    if (prevPending && B.waiting && B.waiting === prevWaiting) B.pending = prevPending;
  }
  NET.screen = 'game';
  const key = S.screen === 'battle' && B ? 'battle:' + B.bid : 'map:' + S.floor;
  if (key !== NET.viewKey) {
    NET.viewKey = key;
    if (S.screen === 'battle' && B) renderBattle(); else renderMap();
  } else if (S.screen === 'battle' && B) refreshAll();
  else if (!NET.doorBusy) renderMap();
  if (sheetPid && $('#panel.show .sheet')) openSheet(sheetPid);
  // สั่นเตือนเมื่อถึงตาเรา
  if (B && B.waiting && B.actor && isMine(B.actor)) {
    const k = B.bid + ':' + B.waiting + ':' + B.actor.ct;
    if (NET.lastBuzz !== k) { NET.lastBuzz = k; try { navigator.vibrate && navigator.vibrate([120, 60, 120]); } catch (e) { /* ignore */ } }
  }
}

const HOST_TYPES = ['b', 'lobby', 'bye'];
function onMsg(m) {
  if (!m || m.from === NET.myId) return;
  if (NET.mode === 'client') {
    if (!HOST_TYPES.includes(m.t)) return;
    if (NET.hostId && m.from !== NET.hostId) return;
    if (!NET.hostId) NET.hostId = m.from;
    NET.gotHost = true;
    if (m.t === 'b') return (m.l || []).forEach(clientMsg);
    clientMsg(m);
  } else if (NET.mode === 'host') {
    switch (m.t) {
      case 'hello': return hostHello(m);
      case 'chars': return hostChars(m);
      case 'act': return hostAct(m);
      case 'room': if (S && S.screen === 'map' && !B) enterRoom(m.id | 0); return;
      case 'stat': return hostStat(m);
      case 'modalAns': return hostModalAns(m);
    }
  }
}

function clientMsg(m) {
  if (!m) return;
  switch (m.t) {
    case 'state': return applyState(m.s);
    case 'fx': {
      const f = VFX[m.n]; if (!f) return;
      const args = (m.a || []).map(deArg);
      if (m.n === 'log' || m.n === 'banner') args.forEach((a, i) => { if (typeof a === 'string') args[i] = cleanHTML(a); });
      return f(...args);
    }
    case 'lobby':
      NET.devices = m.devices || {}; NET.order = m.order || []; NET.started = !!m.started;
      if (NET.screen === 'lobby') renderLobby();
      return;
    case 'modal': return clientModal(m);
    case 'modalClose': if (NET.modal === m.id) { NET.modal = null; closeModalUI(); } return;
    case 'bye': return leaveRoom('หัวห้องปิดห้องแล้ว');
  }
}

// ---------- เชื่อมต่อ ----------
function connect(code) {
  return new Promise((resolve, reject) => {
    if (!window.supabase) return reject(new Error('โหลดระบบออนไลน์ไม่สำเร็จ (เช็กอินเทอร์เน็ต)'));
    NET.sb = NET.sb || window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false }, realtime: { params: { eventsPerSecond: 40 } } });
    const ch = NET.sb.channel('mdb-room-' + code, { config: { broadcast: { self: false }, presence: { key: NET.myId } } });
    NET.ch = ch; NET.code = code; NET.ready = false;
    ch.on('broadcast', { event: 'm' }, ({ payload }) => onMsg(payload));
    ch.on('presence', { event: 'sync' }, onPresence);
    let settled = false;
    const timer = setTimeout(() => { if (!settled) { settled = true; reject(new Error('เชื่อมต่อนานเกินไป')); } }, 12000);
    ch.subscribe(async status => {
      if (status === 'SUBSCRIBED') {
        NET.ready = true; netStatus('');
        try { await ch.track({ id: NET.myId, name: NET.myName, host: NET.mode === 'host' }); } catch (e) { /* ignore */ }
        NET.queue.splice(0).forEach(msg => ch.send({ type: 'broadcast', event: 'm', payload: msg }));
        if (NET.mode === 'client') netSend({ t: 'hello', name: NET.myName, chars: NET.myChars });
        if (NET.mode === 'host') { hostBroadcastLobby(); netSync(); }
        if (!settled) { settled = true; clearTimeout(timer); resolve(); }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        NET.ready = false;
        if (NET.ch === ch) netStatus('⚠️ หลุดการเชื่อมต่อ กำลังต่อใหม่...');
        if (!settled) { settled = true; clearTimeout(timer); reject(new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ')); }
      }
    });
  });
}

function onPresence() {
  if (!NET.ch) return;
  const st = NET.ch.presenceState();
  NET.online = new Set();
  let hostSeen = NET.mode === 'host';
  Object.values(st).forEach(arr => arr.forEach(p => {
    NET.online.add(p.id);
    if (p.host && NET.mode === 'client') { hostSeen = true; if (!NET.hostId) NET.hostId = p.id; }
  }));
  if (NET.mode === 'client' && NET.gotHost) netStatus(hostSeen ? '' : '⚠️ หัวห้องหลุดการเชื่อมต่อ รอสักครู่...');
  if (NET.screen === 'lobby') renderLobby();
  else if (NET.screen === 'game' && S) {
    if (S.screen === 'battle' && B && $('#field')) refreshAll();
    else if (S.screen === 'map' && !roomBusy && !NET.doorBusy) renderMap();
  }
}

function netStatus(text) {
  const el = $('#netbar'); if (!el) return;
  el.textContent = text;
  el.classList.toggle('show', !!text);
}

let toastTimer = null;
function toast(text) {
  const el = $('#toast'); if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- หัวห้อง ----------
function genCode() { let c = ''; for (let i = 0; i < 5; i++) c += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return c; }
function newChar(name, i = 0) {
  return { cid: 'c' + Math.random().toString(36).slice(2, 8), name: name || 'ฮีโร่', job: Object.keys(JOBS)[i % 6], hair: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)], hairStyle: Math.floor(Math.random() * 4) };
}
function cleanChar(c) {
  return {
    cid: String(c && c.cid || Math.random()).slice(0, 20),
    name: String(c && c.name || 'ฮีโร่').slice(0, 14),
    job: JOBS[c && c.job] ? c.job : 'swordsman',
    hair: HAIR_COLORS.includes(c && c.hair) ? c.hair : HAIR_COLORS[0],
    hairStyle: ((c && c.hairStyle) | 0) % 4,
  };
}
function allChars() {
  const out = [];
  NET.order.forEach(id => (NET.devices[id] ? NET.devices[id].chars : []).forEach(c => out.push({ ...c, owner: id })));
  return out.slice(0, MAX_PARTY);
}

function hostBroadcastLobby() {
  if (NET.mode !== 'host') return;
  if (NET.devices[NET.myId]) NET.devices[NET.myId].chars = NET.myChars.map(cleanChar);
  netPush({ t: 'lobby', devices: NET.devices, order: NET.order, started: NET.started });
  if (NET.screen === 'lobby') renderLobby();
}

function hostHello(m) {
  const name = String(m.name || '???').slice(0, 14);
  if (!NET.devices[m.from]) {
    // เพื่อนรีโหลด/เปลี่ยนแท็บ: ชื่อตรงกับเครื่องที่ออฟไลน์อยู่ → โอนตัวละครคืนให้
    const old = NET.order.find(id => id !== NET.myId && id !== m.from && !NET.online.has(id) && NET.devices[id] && NET.devices[id].name === name);
    if (old && NET.started) {
      NET.devices[m.from] = NET.devices[old]; delete NET.devices[old];
      NET.order = NET.order.map(id => id === old ? m.from : id);
      S.players.forEach(p => { if (p.owner === old) p.owner = m.from; });
      toast(`🔄 ${name} กลับเข้าห้องแล้ว`);
    } else {
      const room = MAX_PARTY - allChars().length;
      NET.devices[m.from] = { name, chars: NET.started ? [] : (m.chars || []).slice(0, Math.max(0, room)).map(cleanChar) };
      NET.order.push(m.from);
      toast(`👋 ${name} เข้าห้องแล้ว`);
    }
  } else NET.devices[m.from].name = name;
  hostBroadcastLobby();
  if (NET.started) {
    netSync();
    if (NET.modal) netPush({ t: 'modal', ...NET.modal.msg });
  }
}

function hostChars(m) {
  if (NET.started || !NET.devices[m.from]) return;
  const others = allChars().filter(c => c.owner !== m.from).length;
  NET.devices[m.from].chars = (m.chars || []).slice(0, Math.max(0, MAX_PARTY - others)).map(cleanChar);
  hostBroadcastLobby();
}

function hostAct(m) {
  if (!B || !B.done || B.busy) return;
  const p = B.actor;
  if (!p || !isP(p) || p.id !== m.pid || p.owner !== m.from) return;
  execAction(p, m.key, m.target);
}

function hostStat(m) {
  const p = S && S.players.find(x => x.id === m.pid);
  if (p && p.owner === m.from && STATS.includes(m.s)) applyStat(p, m.s);
}

// โมดอลที่ทุกเครื่องเห็น (allow = เครื่องที่กดยืนยันได้, null = ทุกคน; หัวห้องกดได้เสมอ)
function netModal(opts) {
  const id = ++NET.modalSeq;
  const msg = { id, icon: opts.icon, title: opts.title, html: opts.html, cls: opts.cls, allow: opts.allow || null,
    buttons: opts.buttons.map(b => ({ label: b.label, cls: b.cls })) };
  return new Promise(res => {
    NET.modal = {
      id, msg,
      resolve: i => {
        if (!NET.modal || NET.modal.id !== id) return;
        NET.modal = null;
        closeModalUI();
        netPush({ t: 'modalClose', id });
        res(i);
      },
    };
    netPush({ t: 'modal', ...msg });
    renderModalUI(msg, true, i => NET.modal && NET.modal.resolve(i));
  });
}
function hostModalAns(m) {
  if (NET.modal && NET.modal.id === m.id && (!NET.modal.msg.allow || NET.modal.msg.allow.includes(m.from))) NET.modal.resolve(m.i | 0);
}
function clientModal(m) {
  NET.modal = m.id;
  const can = !m.allow || m.allow.includes(NET.myId);
  const okCls = c => (/^[a-z ]*$/.test(c || '') ? c : '');
  const msg = { ...m, html: cleanHTML(m.html), icon: cleanHTML(m.icon), title: cleanHTML(m.title), cls: okCls(m.cls),
    buttons: (m.buttons || []).map(b => ({ label: cleanHTML(b.label), cls: okCls(b.cls) })),
    note: can ? '' : `⏳ รอ ${[...new Set(m.allow)].map(devName).map(esc).join(', ')} กดยืนยัน` };
  renderModalUI(msg, can, i => { netSend({ t: 'modalAns', id: m.id, i }); $$('#modal [data-mi]').forEach(b => { b.disabled = true; }); });
}

// ---------- สร้าง / เข้า / ออกห้อง ----------
function readName() {
  const el = $('#onName');
  const name = (el ? el.value : NET.myName).trim().slice(0, 14);
  if (!name) { netMsg('ใส่ชื่อก่อนนะ'); el && el.focus(); return null; }
  stSet('localStorage', 'mdb-name', name);
  stSet('sessionStorage', 'mdb-myname', name);
  return name;
}
function rememberRoom(code, role) {
  stSet('sessionStorage', 'mdb-room', code);
  stSet('sessionStorage', 'mdb-role', role);
}

// รีโหลดหน้า/กลับมาจากล็อกจอ → เข้าห้องเดิมให้อัตโนมัติ
function autoRejoin() {
  const q = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
  if (!q || stGet('sessionStorage', 'mdb-room') !== q) return;
  const role = stGet('sessionStorage', 'mdb-role');
  if (role === 'host') { const hs = loadHostSave(); if (hs && hs.code === q) createRoom(hs); }
  else if (role === 'client') joinRoom();
}
function netMsg(t) { const el = $('#netMsg'); if (el) el.textContent = t; }
function roomUrl() { return location.origin + location.pathname + '?room=' + NET.code; }
function setUrlRoom(code) {
  try { history.replaceState(null, '', code ? '?room=' + code : location.pathname); } catch (e) { /* ignore */ }
}

function resetNet() {
  if (NET.ch) { try { NET.ch.unsubscribe(); } catch (e) { /* ignore */ } }
  clearTimeout(NET.flushTimer);
  Object.assign(NET, { mode: 'local', screen: 'setup', code: null, hostId: null, ch: null, ready: false, queue: [], online: new Set(),
    devices: {}, order: [], started: false, myChars: [], out: [], statePos: -1, flushTimer: null, modal: null, viewKey: null, gotHost: false });
  netStatus('');
}

async function createRoom(resume) {
  const name = readName(); if (!name) return;
  NET.myId = devId(); NET.myName = name;
  NET.mode = 'host'; NET.hostId = NET.myId;
  if (resume) {
    Object.assign(NET, { code: resume.code, devices: resume.devices, order: resume.order, started: true, myChars: [] });
    if (NET.devices[resume.hostId] && resume.hostId !== NET.myId) {
      NET.devices[NET.myId] = NET.devices[resume.hostId]; delete NET.devices[resume.hostId];
      NET.order = NET.order.map(id => id === resume.hostId ? NET.myId : id);
      resume.S.players.forEach(p => { if (p.owner === resume.hostId) p.owner = NET.myId; });
    }
  } else {
    NET.code = genCode();
    NET.devices = { [NET.myId]: { name, chars: [] } }; NET.order = [NET.myId]; NET.started = false;
    NET.myChars = [newChar(name)];
  }
  netMsg('กำลังสร้างห้อง...');
  try { await connect(NET.code); } catch (e) { resetNet(); netMsg('❌ ' + e.message); return; }
  setUrlRoom(NET.code);
  rememberRoom(NET.code, 'host');
  if (resume) {
    S = resume.S; uidSeq = resume.uidSeq || 0;
    S.players.forEach(p => { p.effects = []; p.ct = 0; });
    NET.screen = 'game';
    hostBroadcastLobby();
    goMap();
  } else renderLobby();
}

async function joinRoom() {
  const name = readName(); if (!name) return;
  const code = ($('#onCode').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length !== 5) { netMsg('รหัสห้องต้องมี 5 ตัว'); return; }
  NET.myId = devId(); NET.myName = name;
  NET.mode = 'client'; NET.myChars = [newChar(name)];
  netMsg('กำลังเข้าห้อง...');
  try { await connect(code); } catch (e) { resetNet(); netMsg('❌ ' + e.message); return; }
  setUrlRoom(code);
  rememberRoom(code, 'client');
  renderLobby();
  setTimeout(() => { if (NET.mode === 'client' && NET.code === code && !NET.gotHost) leaveRoom(`ไม่พบห้อง ${code} หรือหัวห้องออฟไลน์อยู่`); }, 8000);
}

function leaveRoom(msg) {
  if (NET.mode === 'host' && NET.ch) { netFlush(); netSend({ t: 'bye' }); }
  const ch = NET.ch;
  setTimeout(() => { try { ch && ch.unsubscribe(); } catch (e) { /* ignore */ } }, 300);
  NET.ch = null;
  resetNet();
  setUrlRoom(null);
  stDel('sessionStorage', 'mdb-room');
  closePanel(); closeModalUI();
  setupTab = 'online';
  renderSetup();
  if (msg) netMsg(msg);
}

function saveHost() {
  stSet('localStorage', HOST_SAVE_KEY, JSON.stringify({ code: NET.code, hostId: NET.myId, devices: NET.devices, order: NET.order,
    S: { floor: S.floor, deepest: S.deepest, players: S.players, rooms: S.rooms, need: S.need, screen: 'map' }, uidSeq }));
}
function loadHostSave() { try { const s = JSON.parse(stGet('localStorage', HOST_SAVE_KEY)); return s && s.S ? s : null; } catch (e) { return null; } }

function shareRoom() {
  const url = roomUrl();
  const text = `มาเล่น Monster Drink Battle กัน! รหัสห้อง ${NET.code}`;
  if (navigator.share) { navigator.share({ title: 'Monster Drink Battle', text, url }).catch(() => {}); return; }
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('📋 คัดลอกลิงก์ห้องแล้ว'), () => toast(url));
  else toast(url);
}

// ---------- หน้าเลือกออนไลน์ ----------
function onlineSetupHTML() {
  const name = esc(stGet('sessionStorage', 'mdb-myname') || stGet('localStorage', 'mdb-name') || '');
  const q = new URLSearchParams(location.search).get('room') || '';
  const hs = loadHostSave();
  return `
  <div class="win"><div class="win-title">เล่นออนไลน์ · ทุกคนใช้มือถือตัวเอง</div><div class="win-body online-box">
    <label class="fld"><span>ชื่อของคุณ</span><input id="onName" maxlength="14" value="${name}" placeholder="เช่น บอส" autocomplete="nickname"></label>
    ${hs ? `<button class="btn" data-net="resume">▶ เปิดห้อง ${esc(hs.code)} ต่อ (B${hs.S.floor | 0}F · ${hs.S.players.length} คน)</button>` : ''}
    <button class="btn gold big" data-net="create">🏠 สร้างห้องใหม่</button>
    <div class="or"><span>หรือเข้าห้องเพื่อน</span></div>
    <div class="join-row"><input id="onCode" maxlength="5" placeholder="รหัส 5 ตัว" value="${esc(q.toUpperCase().slice(0, 5))}" autocapitalize="characters" autocomplete="off"><button class="btn gold" data-net="join">เข้าห้อง</button></div>
    <p class="net-msg" id="netMsg"></p>
  </div></div>
  <div class="win rules"><div class="win-title">วิธีเล่นออนไลน์</div><div class="win-body"><ul>
    <li>คนหนึ่ง <b>สร้างห้อง</b> แล้วกด 🔗 แชร์ลิงก์/บอกรหัส 5 ตัวให้เพื่อน</li>
    <li>แต่ละเครื่องเลือกอาชีพตัวละครของตัวเอง (1 เครื่องเพิ่มได้หลายตัว รวมไม่เกิน 10)</li>
    <li>ถึงตาตัวละครของใคร มือถือคนนั้นจะสั่นและให้เลือกท่า · ใครตาย/มานาหมด คนนั้นกดยืนยันว่ายกแล้ว</li>
    <li>หัวห้องเป็นคนรันเกม ห้ามปิดแอป/ล็อกจอนานนะ (ถ้าหลุด กด "เปิดห้องต่อ" ได้)</li>
  </ul></div></div>`;
}

// ---------- ล็อบบี้ ----------
function renderLobby() {
  NET.screen = 'lobby';
  if (!$('#lobby')) {
    app().innerHTML = `
    <section class="screen lobby" id="lobby">
      <div class="topbar">
        <div class="floor-badge">ห้อง</div>
        <div class="floor-info"><h2 class="room-code">${esc(NET.code)}</h2><p id="lobbySub"></p></div>
        <div class="top-btns"><button class="btn" data-net="share">🔗 แชร์</button><button class="btn" data-net="leave">🚪</button></div>
      </div>
      <div class="win"><div class="win-title" id="devTitle">คนในห้อง</div><div class="win-body devices" id="lobbyDevices"></div></div>
      <div class="section-title">ตัวละครของฉัน <small>เครื่องเดียวเพิ่มได้หลายตัว (รวมทั้งห้องไม่เกิน ${MAX_PARTY})</small></div>
      <div class="setup-grid" id="myChars"></div>
      <div class="section-title" id="partyTitle">ปาร์ตี้ทั้งหมด</div>
      <div class="party-preview" id="partyPreview"></div>
      <div class="setup-actions" id="startArea"></div>
    </section>`;
  }
  const isHost = NET.mode === 'host';
  const chars = allChars();
  const colorOf = {}; chars.forEach((c, i) => { colorOf[c.owner + c.cid] = PLAYER_COLORS[i]; });
  $('#lobbySub').textContent = isHost ? 'คุณเป็นหัวห้อง · ส่งรหัสหรือลิงก์ให้เพื่อน' : (NET.gotHost ? 'รอหัวห้องเริ่มเกม' : 'กำลังเชื่อมต่อหัวห้อง...');
  const onlineCount = NET.order.filter(id => NET.online.has(id) || id === NET.myId).length;
  $('#devTitle').textContent = `คนในห้อง (ออนไลน์ ${onlineCount}/${NET.order.length})`;
  $('#lobbyDevices').innerHTML = NET.order.map(id => {
    const d = NET.devices[id]; if (!d) return '';
    const on = NET.online.has(id) || id === NET.myId;
    return `<span class="dev ${on ? 'on' : ''}"><i></i>${id === NET.order[0] ? '👑 ' : ''}${esc(d.name)}${id === NET.myId ? ' (คุณ)' : ''} <small>${d.chars.length} ตัว</small></span>`;
  }).join('') || '<span class="muted">กำลังโหลด...</span>';

  // การ์ดตัวละครของฉัน (ไม่วาดใหม่ระหว่างพิมพ์ชื่อ)
  if (!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#myChars'))) {
    const total = chars.length;
    $('#myChars').innerHTML = NET.myChars.map((e, i) => {
      const J = JOBS[e.job], col = colorOf[NET.myId + e.cid] || '#888888';
      return `<div class="setup-card" style="--c:${col}">
        <div class="sc-num">${col === '#888888' ? 'เต็ม' : 'P' + (Object.keys(colorOf).indexOf(NET.myId + e.cid) + 1)}</div>
        ${NET.myChars.length > 1 ? `<button class="sc-del" data-lc="del" data-i="${i}" aria-label="ลบตัวละคร">✕</button>` : ''}
        <div class="sc-ava"><div class="bob">${chibi(e)}</div></div>
        <input class="sc-name lc-name" data-i="${i}" value="${esc(e.name)}" maxlength="14" aria-label="ชื่อตัวละคร">
        <div class="sc-jobs">${Object.entries(JOBS).map(([k, j]) => `<button class="job-btn ${e.job === k ? 'on' : ''}" data-lc="job" data-i="${i}" data-job="${k}" title="${j.name}">${j.icon}</button>`).join('')}</div>
        <div class="sc-jobname"><b>${J.icon} ${J.name}</b><small>${J.desc}</small></div>
        <div class="sc-look"><button class="btn tiny" data-lc="hair" data-i="${i}">🎨 สีผม</button><button class="btn tiny" data-lc="style" data-i="${i}">💇 ทรงผม</button></div>
      </div>`;
    }).join('') + (total < MAX_PARTY ? `<button class="setup-card add-card" data-lc="add"><span>➕</span>เพิ่มตัวละคร<small>สำหรับเพื่อนที่ไม่มีมือถือ</small></button>` : '');
  }
  $('#partyTitle').textContent = `ปาร์ตี้ทั้งหมด ${chars.length}/${MAX_PARTY}`;
  $('#partyPreview').innerHTML = chars.map((c, i) => `<span class="pchip" style="--c:${PLAYER_COLORS[i]}">${chibi(c, { crop: 'head' })}<b>${esc(c.name)}</b><small>${JOBS[c.job].icon} · ${esc(devName(c.owner))}</small></span>`).join('') || '<span class="muted">ยังไม่มีตัวละคร</span>';
  $('#startArea').innerHTML = isHost
    ? `<button class="btn gold big" data-net="start" ${chars.length ? '' : 'disabled'}>⚔️ เริ่มเกม (${chars.length} คน)</button>`
    : `<div class="wait-host">⏳ รอหัวห้องกดเริ่มเกม...</div>`;
}

let charSendTimer = null;
function charsChanged(rerender = true) {
  if (rerender) renderLobby();
  clearTimeout(charSendTimer);
  charSendTimer = setTimeout(() => {
    if (NET.mode === 'client') netSend({ t: 'chars', chars: NET.myChars });
    else hostBroadcastLobby();
  }, 250);
}

function lobbyClick(n) {
  const i = +n.dataset.i, c = NET.myChars[i];
  switch (n.dataset.lc) {
    case 'add':
      if (allChars().length >= MAX_PARTY) return toast('ปาร์ตี้เต็ม 10 คนแล้ว');
      NET.myChars.push(newChar(`${NET.myName} ${NET.myChars.length + 1}`, NET.myChars.length));
      break;
    case 'del': NET.myChars.splice(i, 1); break;
    case 'job': c.job = n.dataset.job; break;
    case 'hair': c.hair = HAIR_COLORS[(HAIR_COLORS.indexOf(c.hair) + 1) % HAIR_COLORS.length]; break;
    case 'style': c.hairStyle = (c.hairStyle + 1) % 4; break;
  }
  charsChanged();
}

function hostStart() {
  const chars = allChars();
  if (!chars.length || NET.mode !== 'host') return;
  NET.started = true;
  S = { floor: 1, deepest: 1, players: chars.map((c, i) => Object.assign(makePlayer(i, c), { owner: c.owner })), rooms: [], need: 2 };
  NET.screen = 'game';
  hostBroadcastLobby();
  genFloor();
  goMap();
  floorBanner();
}

function netClick(n) {
  switch (n.dataset.net) {
    case 'create': return createRoom(null);
    case 'resume': { const hs = loadHostSave(); if (hs) createRoom(hs); return; }
    case 'join': return joinRoom();
    case 'share': return shareRoom();
    case 'start': return hostStart();
    case 'leave':
      closePanel();
      localModal({ icon: '🚪', title: NET.mode === 'host' ? 'ปิดห้อง?' : 'ออกจากห้อง?', html: NET.mode === 'host' ? 'ทุกคนจะหลุดออกจากเกม (เปิดห้องต่อทีหลังได้)' : 'กลับเข้ามาใหม่ได้ด้วยรหัสเดิม',
        buttons: [{ label: 'ยกเลิก' }, { label: 'ออก', cls: 'red' }] }).then(i => { if (i === 1) leaveRoom(); });
      return;
  }
}

function netBadge() {
  if (!isOnline()) return '';
  return `<button class="btn net-badge" data-net="share" title="แชร์ห้อง">${NET.mode === 'host' ? '👑' : '🌐'} ${esc(NET.code)}</button>`;
}
