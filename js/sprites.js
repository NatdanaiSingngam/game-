// ===== สไปรต์ SVG สไตล์ chibi แบบลงแสงเงา (วาดเอง) =====
// ทุกชิ้นส่วน = สีพื้น + เส้นขอบสีเข้มของตัวเอง + เงาไล่โทน (แสงมาจากซ้ายบน)

const INK = '#2a1e3a';

// ---------- สี ----------
function hex2rgb(h) { const n = parseInt(String(h).slice(1, 7), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(a, b, t) {
  const A = hex2rgb(a), B = hex2rgb(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const dk = (c, t = 0.45) => mix(c, '#1a1028', t);
const lt = (c, t = 0.35) => mix(c, '#ffffff', t);

// ---------- gradient กลาง (ใช้ร่วมทุกสไปรต์) ----------
(function injectDefs() {
  if (document.getElementById('mdbDefs')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.id = 'mdbDefs';
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = `<defs>
    <radialGradient id="mdbShade" cx=".36" cy=".3" r=".85" fx=".3" fy=".22"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#1a0f2e" stop-opacity=".42"/></radialGradient>
    <radialGradient id="mdbShadeSoft" cx=".38" cy=".32" r=".85" fx=".32" fy=".25"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#7a3b2e" stop-opacity=".28"/></radialGradient>
    <radialGradient id="mdbHi" cx=".32" cy=".24" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <linearGradient id="mdbGloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="mdbBlush"><stop offset="0" stop-color="#ff6f91" stop-opacity=".6"/><stop offset="1" stop-color="#ff6f91" stop-opacity="0"/></radialGradient>
    <linearGradient id="mdbIris" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".6"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity=".35"/></linearGradient>
    <radialGradient id="mdbGlow"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="#fff" stop-opacity=".45"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <radialGradient id="mdbGround"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset=".7" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <linearGradient id="mdbMetal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>
  </defs>`;
  document.body.prepend(svg);
})();

// ชิ้นส่วนลงเงา: สีพื้น + ขอบ + เงา (+ ไฮไลต์)
function sh(tag, geo, fill, o = {}) {
  const sw = o.sw == null ? 1.3 : o.sw;
  let s = `<${tag} ${geo} fill="${fill}" stroke="${o.stroke || dk(fill)}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"${o.op ? ` opacity="${o.op}"` : ''}/>`;
  if (o.shade !== false) s += `<${tag} ${geo} fill="url(#${o.soft ? 'mdbShadeSoft' : 'mdbShade'})"/>`;
  if (o.hi) s += `<${tag} ${geo} fill="url(#mdbHi)"/>`;
  if (o.metal) s += `<${tag} ${geo} fill="url(#mdbMetal)"/>`;
  return s;
}
const line = (d, color, w = 1.2, op = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${op < 1 ? ` opacity="${op}"` : ''}/>`;
const shadow = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#mdbGround)"/>`;
const glow = (cx, cy, r, color, op = 0.6) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${op * 0.35}"/><circle cx="${cx}" cy="${cy}" r="${r * 0.7}" fill="url(#mdbGlow)" opacity="${op}"/>`;

const SKIN_C = typeof SKIN !== 'undefined' ? SKIN : '#ffe2cc';
const EYES = ['#3f7ad9', '#2f9a6a', '#a0522d', '#8a4fd1', '#d9466d', '#2aa3a8'];
function eyeColor(p) {
  let h = 0;
  for (const ch of String(p.hair || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return EYES[(h + (p.hairStyle || 0)) % EYES.length];
}

// ---------- ชิ้นส่วนตัวละคร ----------
function animeEye(cx, cy, iris, flip) {
  // เส้นขนตาโค้งสมมาตร + ปลายงอนออกด้านนอก (ไม่ให้ดูหน้าบึ้ง)
  const out = flip ? 1 : -1;
  const lash = `M${cx - 3.4} ${cy - 2.6} Q${cx} ${cy - 6} ${cx + 3.4} ${cy - 2.6} M${cx + 3.4 * out} ${cy - 2.6} L${cx + 4.7 * out} ${cy - 3.8}`;
  return `<ellipse cx="${cx}" cy="${cy}" rx="3.2" ry="4.3" fill="${INK}"/>
    <ellipse cx="${cx}" cy="${cy + 0.5}" rx="2.55" ry="3.5" fill="${iris}"/>
    <ellipse cx="${cx}" cy="${cy + 0.5}" rx="2.55" ry="3.5" fill="url(#mdbIris)"/>
    <ellipse cx="${cx}" cy="${cy + 0.9}" rx="1.1" ry="1.6" fill="${INK}" opacity=".8"/>
    <circle cx="${cx - 1}" cy="${cy - 1.6}" r="1.25" fill="#fff"/><circle cx="${cx + 1.1}" cy="${cy + 2}" r=".6" fill="#fff" opacity=".85"/>
    ${line(lash, INK, 1.4)}`;
}

const BANGS = [
  'M14 30 Q12 9 32 9 Q52 9 50 30 L46 21 L42 27 L38 18 L33 25 L28 17 L24 26 L19 20 Z',
  'M14 32 Q12 9 32 9 Q52 9 50 32 Q48 21 40 19 Q32 25 24 19 Q16 21 14 32 Z',
  'M14 34 Q12 9 32 9 Q52 9 50 34 Q47 20 38 18 Q34 24 30 18 Q18 20 14 34 Z',
  'M14 30 Q14 9 34 9 Q52 10 50 28 Q40 13 22 24 Q18 26 14 30 Z',
];

function hatFront(job, o) {
  switch (job) {
    case 'mage': return sh('path', 'd="M19 14 L38 -9 L45 14 Z"', o.main) + `<path d="M21 10 L44 10 L45 14 L19 14 Z" fill="${o.trim}"/>` + sh('ellipse', 'cx="32" cy="14" rx="22" ry="5"', o.main) + `<circle cx="38" cy="-8" r="1.8" fill="${o.trim}"/>`;
    case 'archer': return line('M15 20 Q32 12 49 20', o.trim, 3.6) + line('M15 20 Q32 12 49 20', lt(o.trim, 0.4), 1.2, 0.8) + sh('path', 'd="M46 17 Q60 3 57 -5 Q52 7 44 15 Z"', '#ffffff', { hi: true }) + line('M47 15 Q54 6 56 -2', '#d8d8e8', 0.8);
    case 'acolyte': return sh('path', 'd="M16 19 Q32 1 48 19 Q32 13 16 19 Z"', o.trim, { hi: true }) + sh('circle', 'cx="32" cy="7" r="2.6"', '#ffd34d', { hi: true });
    case 'thief': return sh('path', 'd="M13 22 Q32 5 51 22 L51 25 Q32 16 13 25 Z"', o.trim) + sh('path', 'd="M50 22 L61 17 L59 27 Z"', o.trim);
    case 'merchant': return sh('path', 'd="M15 20 Q32 1 49 20 Z"', o.trim, { hi: true }) + sh('path', 'd="M10 20 L40 20 Q32 25 10 23 Z"', dk(o.trim, 0.15));
    case 'swordsman': return line('M15 21 Q32 13 49 21', '#9aa6b8', 4) + line('M15 21 Q32 13 49 21', '#e8eef7', 1.6) + sh('circle', 'cx="32" cy="16" r="2.6"', '#4fa3ff', { hi: true });
  }
  return '';
}

function weaponFront(job) {
  switch (job) {
    case 'swordsman': return `<g transform="rotate(-18 46 61)">${sh('path', 'd="M44 58 L44 32 L46.3 28 L48.6 32 L48.6 58 Z"', '#e8eef7', { metal: true, shade: false, stroke: '#7d8796' })}${line('M46.3 31 L46.3 56', '#b8c2d0', 0.8)}${sh('rect', 'x="40" y="56.5" width="12.6" height="3.6" rx="1.2"', '#d4a62a', { hi: true })}${sh('rect', 'x="44.6" y="60" width="3.4" height="8" rx="1"', '#6b4226')}</g>`;
    case 'mage': return line('M47 74 L50 36', dk('#8a5a32', 0.4), 3.8) + line('M47 74 L50 36', '#8a5a32', 2.4) + glow(50, 33, 9, '#7ee3ff', 0.7) + sh('circle', 'cx="50" cy="33" r="4.8"', '#7ee3ff', { hi: true });
    case 'archer': return line('M15 38 Q3 57 15 76', dk('#8b5a2b', 0.4), 4) + line('M15 38 Q3 57 15 76', '#a8743f', 2.4) + line('M15 38 L15 76', '#f2f2f2', 0.9);
    case 'acolyte': return line('M47 72 L48 40', '#a88a3a', 3.4) + line('M47 72 L48 40', '#e8d27a', 1.8) + glow(48, 36.5, 8, '#ffe56b', 0.6) + sh('path', 'd="M48 29 L50.5 34.5 L56 35 L52 39 L53 44.5 L48 42 L43 44.5 L44 39 L40 35 L45.5 34.5 Z"', '#ffe56b', { hi: true });
    case 'thief': return `<g transform="rotate(-35 46 61)">${sh('path', 'd="M44.4 58 L46.5 43 L48.6 58 Z"', '#e8eef7', { metal: true, shade: false, stroke: '#7d8796' })}${sh('rect', 'x="42" y="57.5" width="9" height="2.6" rx="1"', '#555a66')}${sh('rect', 'x="45" y="60" width="3" height="5" rx="1"', '#3a2a2a')}</g>`;
    case 'merchant': return line('M47 72 L49 38', dk('#8a5a32', 0.4), 3.8) + line('M47 72 L49 38', '#8a5a32', 2.4) + sh('path', 'd="M49 37 Q62 34 61 47 Q55 44 49 47 Z"', '#cfd6df', { metal: true, shade: false, stroke: '#7d8796' });
  }
  return '';
}

function bodyFront(p, o, robe) {
  let s = '';
  if (!robe) s += sh('rect', 'x="25" y="62" width="6" height="11" rx="2.5"', o.pants) + sh('rect', 'x="33" y="62" width="6" height="11" rx="2.5"', o.pants);
  s += sh('ellipse', 'cx="27.5" cy="74" rx="4.9" ry="2.7"', '#5a3a2a', { hi: true }) + sh('ellipse', 'cx="36.5" cy="74" rx="4.9" ry="2.7"', '#5a3a2a', { hi: true });
  if (robe) {
    s += sh('path', 'd="M18 73 Q18 48 32 45 Q46 48 46 73 Z"', o.main);
    s += line('M32 47 L32 73', o.trim, 3) + line('M25 46 Q32 53 39 46', o.trim, 2.5);
    s += line('M24 54 Q22 63 23 72', dk(o.main, 0.2), 1, 0.5) + line('M40 54 Q42 63 41 72', dk(o.main, 0.2), 1, 0.5);
  } else {
    s += sh('path', 'd="M19 65 Q18 48 32 45 Q46 48 45 65 Z"', o.main);
    s += sh('rect', 'x="19.5" y="58" width="25" height="3.6" rx="1"', o.trim, { hi: true }) + sh('rect', 'x="30" y="57.6" width="4.4" height="4.4" rx="1"', '#e8c35a', { hi: true });
    s += line('M27 46 L32 52 L37 46', o.trim, 2) + line('M24 51 Q23 55 24 57', dk(o.main, 0.2), 1, 0.5);
  }
  if (p.job === 'swordsman') s += sh('ellipse', 'cx="20" cy="49" rx="6.2" ry="4.4"', '#c9d3e0', { hi: true }) + sh('ellipse', 'cx="44" cy="49" rx="6.2" ry="4.4"', '#c9d3e0', { hi: true });
  s += sh('ellipse', 'cx="18" cy="55" rx="4.2" ry="6.6"', o.main) + sh('ellipse', 'cx="46" cy="55" rx="4.2" ry="6.6"', o.main);
  return s;
}

// ---------- ตัวละครหน้าตรง ----------
// p: { job, hair, hairStyle }, opt.crop = 'head' สำหรับไอคอน
function chibi(p, opt = {}) {
  const J = JOBS[p.job], o = J.look, h = p.hair, sk = SKIN_C;
  const hs = (p.hairStyle || 0) % 4;
  const robe = p.job === 'mage' || p.job === 'acolyte';
  const eye = eyeColor(p);
  let s = '';
  if (!opt.crop) s += shadow(32, 76, 19, 4.6);

  // ของด้านหลัง
  if (p.job === 'swordsman') s += sh('path', 'd="M21 48 L14 73 L50 73 L43 48 Z"', '#c43c3c') + line('M24 52 L20 72 M40 52 L44 72', dk('#c43c3c', 0.3), 1, 0.6);
  if (p.job === 'merchant') s += sh('rect', 'x="15" y="44" width="34" height="22" rx="6"', '#8a5a2f') + `<rect x="15" y="50" width="34" height="3" fill="#6b4226"/>`;
  if (p.job === 'archer') s += sh('path', 'd="M44 44 L50 30 L54 32 L48 48 Z"', '#8b5a2b') + line('M50 30 L48 24 M52 31 L54 25 M54 32 L58 27', '#ffffff', 1.6);
  if (p.job === 'thief') s += sh('path', 'd="M20 50 Q10 62 16 74 Q24 66 28 52 Z"', o.trim);

  // ผมด้านหลัง
  if (hs === 2) s += sh('path', 'd="M13 27 Q13 8 32 8 Q51 8 51 27 L53 54 Q46 58 42 51 L22 51 Q18 58 11 54 Z"', h);
  else s += sh('ellipse', 'cx="32" cy="27" rx="19" ry="18"', h);
  if (hs === 3) s += sh('path', 'd="M47 20 Q64 24 59 48 Q55 41 49 33 Z"', h) + line('M52 26 Q58 32 57 42', lt(h, 0.4), 1, 0.6);

  if (!opt.crop) s += bodyFront(p, o, robe);
  else s += sh('path', 'd="M19 65 Q18 48 32 45 Q46 48 45 65 Z"', o.main);

  // หัว + หน้า
  s += `<ellipse cx="32" cy="45" rx="7" ry="2.4" fill="#000" opacity=".15"/>`;
  s += sh('circle', 'cx="32" cy="28" r="17"', sk, { soft: true, stroke: '#c98f6e' });
  s += `<ellipse cx="21" cy="35.6" rx="4.4" ry="2.8" fill="url(#mdbBlush)"/><ellipse cx="43" cy="35.6" rx="4.4" ry="2.8" fill="url(#mdbBlush)"/>`;
  s += animeEye(25.5, 31.4, eye, false) + animeEye(38.5, 31.4, eye, true);
  s += `<circle cx="32" cy="35" r=".55" fill="#d99a7c"/>`;
  s += line('M29.8 38 Q32 40.2 34.2 38', '#8a3f3f', 1.3);

  // หน้าม้า + เงาผม
  s += sh('path', `d="${BANGS[hs]}"`, h);
  s += line('M18 19 Q25 13.5 32 13 Q39 13.5 46 19', '#ffffff', 2, 0.45);
  s += line('M24 12 Q22 18 24 24 M40 12 Q42 18 40 24', dk(h, 0.25), 1, 0.5);

  s += hatFront(p.job, o);
  if (!opt.crop) s += weaponFront(p.job);
  if (!opt.crop) s += sh('circle', 'cx="18" cy="61" r="3.3"', sk, { soft: true, stroke: '#c98f6e' }) + sh('circle', 'cx="46" cy="61" r="3.3"', sk, { soft: true, stroke: '#c98f6e' });

  const vb = opt.crop === 'head' ? '9 -4 46 46' : '-2 -12 68 92';
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ---------- ตัวละครมองจากด้านหลัง (ฉากต่อสู้) ----------
function chibiBack(p) {
  const J = JOBS[p.job], o = J.look, h = p.hair, sk = SKIN_C;
  const hs = (p.hairStyle || 0) % 4;
  const robe = p.job === 'mage' || p.job === 'acolyte';
  let s = shadow(32, 76, 19, 4.6);

  // อาวุธที่ถือข้างตัว (อยู่หลังลำตัว)
  if (p.job === 'archer') s += line('M49 38 Q61 57 49 76', dk('#8b5a2b', 0.4), 4) + line('M49 38 Q61 57 49 76', '#a8743f', 2.4) + line('M49 38 L49 76', '#f2f2f2', 0.9);
  if (p.job === 'mage') s += line('M15 74 L13 36', dk('#8a5a32', 0.4), 3.8) + line('M15 74 L13 36', '#8a5a32', 2.4) + glow(13, 33, 9, '#7ee3ff', 0.7) + sh('circle', 'cx="13" cy="33" r="4.8"', '#7ee3ff', { hi: true });
  if (p.job === 'acolyte') s += line('M16 72 L15 40', '#a88a3a', 3.4) + line('M16 72 L15 40', '#e8d27a', 1.8) + glow(15, 36.5, 8, '#ffe56b', 0.6) + sh('path', 'd="M15 29 L17.5 34.5 L23 35 L19 39 L20 44.5 L15 42 L10 44.5 L11 39 L7 35 L12.5 34.5 Z"', '#ffe56b', { hi: true });
  if (p.job === 'merchant') s += line('M17 72 L15 38', dk('#8a5a32', 0.4), 3.8) + line('M17 72 L15 38', '#8a5a32', 2.4) + sh('path', 'd="M15 37 Q2 34 3 47 Q9 44 15 47 Z"', '#cfd6df', { metal: true, shade: false, stroke: '#7d8796' });

  // ขา + ลำตัว
  if (!robe) s += sh('rect', 'x="25" y="62" width="6" height="11" rx="2.5"', o.pants) + sh('rect', 'x="33" y="62" width="6" height="11" rx="2.5"', o.pants);
  s += sh('ellipse', 'cx="27.5" cy="74" rx="4.9" ry="2.7"', '#5a3a2a', { hi: true }) + sh('ellipse', 'cx="36.5" cy="74" rx="4.9" ry="2.7"', '#5a3a2a', { hi: true });
  if (robe) s += sh('path', 'd="M18 73 Q18 48 32 45 Q46 48 46 73 Z"', o.main) + line('M32 48 L32 73', dk(o.main, 0.2), 1.2, 0.6) + line('M24 54 Q22 63 23 72 M40 54 Q42 63 41 72', dk(o.main, 0.2), 1, 0.5);
  else s += sh('path', 'd="M19 65 Q18 48 32 45 Q46 48 45 65 Z"', o.main) + sh('rect', 'x="19.5" y="58" width="25" height="3.6" rx="1"', o.trim, { hi: true });
  s += sh('ellipse', 'cx="18" cy="55" rx="4.2" ry="6.6"', o.main) + sh('ellipse', 'cx="46" cy="55" rx="4.2" ry="6.6"', o.main);

  // ของที่สะพายหลัง
  if (p.job === 'swordsman') {
    s += sh('ellipse', 'cx="20" cy="49" rx="6.2" ry="4.4"', '#c9d3e0', { hi: true }) + sh('ellipse', 'cx="44" cy="49" rx="6.2" ry="4.4"', '#c9d3e0', { hi: true });
    s += sh('path', 'd="M21 47 Q32 51 43 47 L48 74 Q32 78 16 74 Z"', '#c43c3c') + line('M26 52 L24 73 M32 53 L32 75 M38 52 L40 73', dk('#c43c3c', 0.3), 1.1, 0.6);
  }
  if (p.job === 'merchant') s += sh('rect', 'x="20" y="47" width="24" height="20" rx="5"', '#8a5a2f') + `<rect x="20" y="53" width="24" height="3" fill="#6b4226"/>` + sh('rect', 'x="29" y="56" width="6" height="5" rx="1"', '#e8c35a', { hi: true });
  if (p.job === 'archer') s += `<g transform="rotate(-25 34 56)">${sh('rect', 'x="30" y="44" width="8" height="20" rx="3"', '#8b5a2b')}${line('M31 44 L30 37 M34 44 L34 36 M37 44 L38 37', '#ffffff', 1.8)}</g>`;
  if (p.job === 'thief') s += sh('path', 'd="M22 47 Q32 52 42 47 L40 60 Q32 63 24 60 Z"', o.trim);

  // หัวด้านหลัง
  s += sh('ellipse', 'cx="15.3" cy="31" rx="2.6" ry="3.6"', sk, { soft: true, stroke: '#c98f6e' }) + sh('ellipse', 'cx="48.7" cy="31" rx="2.6" ry="3.6"', sk, { soft: true, stroke: '#c98f6e' });
  if (hs === 2) s += sh('path', 'd="M14 28 Q14 9 32 9 Q50 9 50 28 L51 56 Q32 61 13 56 Z"', h);
  s += sh('circle', 'cx="32" cy="28" r="17"', h);
  s += line('M22 16 Q26 30 24 42 M32 12 Q34 28 32 44 M42 16 Q38 30 40 42', dk(h, 0.3), 1.2, 0.55);
  s += line('M19 21 Q26 14 33 13.5', '#ffffff', 2.2, 0.45);
  if (hs === 0) s += sh('path', 'd="M15 24 L11 15 L20 18 L22 9 L28 15 L32 6 L36 15 L42 9 L44 18 L53 15 L49 24 Z"', h);
  if (hs === 1) s += sh('path', 'd="M15 34 Q18 44 24 41 Q28 46 32 42 Q36 46 40 41 Q46 44 49 34 Z"', h);
  if (hs === 3) s += sh('circle', 'cx="32" cy="20" r="3"', o.trim, { hi: true }) + sh('path', 'd="M29 22 Q24 38 31 56 Q38 40 35 22 Z"', h) + line('M31 26 Q29 38 31 50', lt(h, 0.4), 1, 0.6);

  // หมวก / ผ้าคาด (ด้านหลัง)
  if (p.job === 'mage') s += sh('path', 'd="M19 14 L26 -9 L45 14 Z"', o.main) + `<path d="M21 10 L44 10 L45 14 L19 14 Z" fill="${o.trim}"/>` + sh('ellipse', 'cx="32" cy="14" rx="22" ry="5"', o.main);
  if (p.job === 'archer') s += line('M15 20 Q32 26 49 20', o.trim, 3.6) + sh('path', 'd="M18 17 Q4 3 7 -5 Q12 7 20 15 Z"', '#ffffff', { hi: true });
  if (p.job === 'acolyte') s += sh('path', 'd="M16 19 Q32 1 48 19 Q32 24 16 19 Z"', o.trim, { hi: true });
  if (p.job === 'thief') s += sh('path', 'd="M13 22 Q32 5 51 22 L51 26 Q32 30 13 26 Z"', o.trim) + sh('path', 'd="M32 25 L25 40 L31 38 Z M32 25 L40 39 L34 38 Z"', o.trim) + sh('circle', 'cx="32" cy="25" r="2.6"', o.trim);
  if (p.job === 'merchant') s += sh('path', 'd="M15 21 Q32 1 49 21 Q32 26 15 21 Z"', o.trim, { hi: true });
  if (p.job === 'swordsman') s += line('M15 21 Q32 28 49 21', '#9aa6b8', 4) + line('M15 21 Q32 28 49 21', '#e8eef7', 1.6) + line('M32 27 L28 37 M32 27 L36 37', '#c9d3e0', 2.4);

  // อาวุธที่ยกขึ้น + มือ
  if (p.job === 'swordsman') s += `<g transform="rotate(18 46 61)">${sh('path', 'd="M44 58 L44 32 L46.3 28 L48.6 32 L48.6 58 Z"', '#e8eef7', { metal: true, shade: false, stroke: '#7d8796' })}${sh('rect', 'x="40" y="56.5" width="12.6" height="3.6" rx="1.2"', '#d4a62a', { hi: true })}${sh('rect', 'x="44.6" y="60" width="3.4" height="8" rx="1"', '#6b4226')}</g>`;
  if (p.job === 'thief') s += `<g transform="rotate(35 46 61)">${sh('path', 'd="M44.4 58 L46.5 43 L48.6 58 Z"', '#e8eef7', { metal: true, shade: false, stroke: '#7d8796' })}${sh('rect', 'x="42" y="57.5" width="9" height="2.6" rx="1"', '#555a66')}</g>`;
  s += sh('circle', 'cx="18" cy="61" r="3.3"', sk, { soft: true, stroke: '#c98f6e' }) + sh('circle', 'cx="46" cy="61" r="3.3"', sk, { soft: true, stroke: '#c98f6e' });

  return `<svg viewBox="-2 -12 68 92" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ---------- มอนสเตอร์ ----------
function crown(cx, y, w = 26) {
  const l = cx - w / 2, r = cx + w / 2;
  return sh('path', `d="M${l} ${y} L${l + 2} ${y - 14} L${cx - w / 4} ${y - 6} L${cx} ${y - 18} L${cx + w / 4} ${y - 6} L${r - 2} ${y - 14} L${r} ${y} Z"`, '#ffd34d', { hi: true, sw: 1.6 })
    + sh('circle', `cx="${cx}" cy="${y - 5}" r="2.8"`, '#ff4b6b', { hi: true, sw: 1 })
    + `<circle cx="${l + 2}" cy="${y - 14}" r="1.6" fill="#fff6c8"/><circle cx="${r - 2}" cy="${y - 14}" r="1.6" fill="#fff6c8"/><circle cx="${cx}" cy="${y - 18}" r="1.8" fill="#fff6c8"/>`;
}
const mEye = (cx, cy, rx, ry, color = INK) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${color}"/><circle cx="${cx - rx * 0.35}" cy="${cy - ry * 0.4}" r="${Math.min(rx, ry) * 0.45}" fill="#fff"/><circle cx="${cx + rx * 0.3}" cy="${cy + ry * 0.35}" r="${Math.min(rx, ry) * 0.2}" fill="#fff" opacity=".8"/>`;
const glowEye = (cx, cy, r, color) => glow(cx, cy, r * 2.4, color, 0.8) + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/><circle cx="${cx - r * 0.3}" cy="${cy - r * 0.3}" r="${r * 0.35}" fill="#fff"/>`;

const MON_SPRITES = {
  slime(c, b) {
    return `${shadow(40, 72, 29, 5.5)}
    ${sh('path', 'd="M11 68 Q7 34 40 22 Q73 34 69 68 Q40 77 11 68 Z"', c.body, { sw: 1.7 })}
    ${line('M16 63 Q40 71 64 63', lt(c.body, 0.45), 2, 0.7)}
    <ellipse cx="28" cy="36" rx="9" ry="5" fill="url(#mdbGloss)" transform="rotate(-30 28 36)"/>
    <circle cx="20" cy="46" r="2" fill="#fff" opacity=".7"/>
    <ellipse cx="25" cy="56" rx="5" ry="3" fill="url(#mdbBlush)"/><ellipse cx="56" cy="56" rx="5" ry="3" fill="url(#mdbBlush)"/>
    ${mEye(32, 49, 3.4, 5)}${mEye(49, 49, 3.4, 5)}
    ${sh('path', 'd="M36 57 Q40.5 63 45 57 Z"', c.dark, { sw: 1.1, shade: false })}
    ${b ? crown(40, 26, 30) : sh('path', 'd="M40 23 Q35 12 44 7 Q47 16 40 23 Z"', '#6fd16f', { hi: true, sw: 1.1 }) + line('M40 22 Q41 15 43 10', '#3f9a3f', 0.8)}`;
  },
  mushroom(c, b) {
    return `${shadow(40, 73, 22, 4.5)}
    ${sh('path', 'd="M28 48 Q25 70 30 73 L50 73 Q55 70 52 48 Z"', '#f6e7c8', { soft: true })}
    <ellipse cx="34" cy="64" rx="3.4" ry="2" fill="url(#mdbBlush)"/><ellipse cx="46" cy="64" rx="3.4" ry="2" fill="url(#mdbBlush)"/>
    ${mEye(35, 59, 2.4, 3.4)}${mEye(45, 59, 2.4, 3.4)}
    ${line('M37 66 Q40 63.5 43 66', INK, 1.4)}
    <ellipse cx="40" cy="50" rx="27" ry="5" fill="${dk(c.cap, 0.5)}" opacity=".5"/>
    ${sh('path', 'd="M9 50 Q9 16 40 14 Q71 16 71 50 Q40 57 9 50 Z"', c.cap, { hi: true, sw: 1.6 })}
    ${['26 32 5', '46 24 4', '57 39 4.5', '38 42 3', '17 43 2.6'].map(v => { const [x, y, r] = v.split(' '); return sh('circle', `cx="${x}" cy="${y}" r="${r}"`, c.spot, { sw: 0.8 }); }).join('')}
    ${b ? crown(40, 16) : ''}`;
  },
  bat(c, b) {
    const wing = `${sh('path', 'd="M34 40 Q18 18 2 28 Q10 33 8 42 Q17 39 19 48 Q26 42 34 48 Z"', c.wing, { sw: 1.5 })}${line('M30 40 Q20 28 6 29 M28 43 Q18 38 10 41', lt(c.wing, 0.25), 0.9, 0.7)}`;
    return `${shadow(40, 75, 15, 3)}
    ${wing}<g transform="translate(80 0) scale(-1 1)">${wing}</g>
    ${sh('path', 'd="M30 30 L31 17 L37 28 Z M50 30 L49 17 L43 28 Z"', c.body)}
    ${sh('ellipse', 'cx="40" cy="42" rx="13" ry="14"', c.body, { hi: true, sw: 1.5 })}
    <ellipse cx="40" cy="48" rx="7" ry="6" fill="${lt(c.body, 0.25)}" opacity=".6"/>
    ${glowEye(35, 39, 2.6, '#ff4b4b')}${glowEye(45, 39, 2.6, '#ff4b4b')}
    <path d="M36 48 L37.5 52.5 L39 48 M41 48 L42.5 52.5 L44 48" fill="#fff" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
    ${b ? crown(40, 28) : ''}`;
  },
  wolf(c, b) {
    return `${shadow(40, 74, 26, 4.5)}
    ${sh('path', 'd="M60 58 Q76 50 71 36 Q66 50 58 52 Z"', c.body)}
    ${sh('ellipse', 'cx="40" cy="59" rx="20" ry="14"', c.body, { sw: 1.5 })}
    ${sh('ellipse', 'cx="31" cy="72" rx="5.2" ry="3"', c.light, { hi: true })}${sh('ellipse', 'cx="49" cy="72" rx="5.2" ry="3"', c.light, { hi: true })}
    ${sh('path', 'd="M21 40 Q19 23 29 19 L31 7 L38 18 L42 18 L49 7 L51 19 Q61 23 59 40 Q57 53 40 55 Q23 53 21 40 Z"', c.body, { hi: true, sw: 1.6 })}
    <path d="M30 10 L32 17 L35 17 Z M50 10 L48 17 L45 17 Z" fill="${lt(c.light, 0.1)}" opacity=".8"/>
    ${sh('ellipse', 'cx="40" cy="45" rx="9.5" ry="7.5"', c.light, { soft: true })}
    ${sh('ellipse', 'cx="40" cy="40.5" rx="3.4" ry="2.3"', '#2a2230', { hi: true, sw: .8 })}
    ${line('M28 30.5 L36 33.5 M52 30.5 L44 33.5', INK, 2.2)}
    <ellipse cx="32" cy="35" rx="2.8" ry="2.3" fill="#ffd34d" stroke="${INK}" stroke-width=".9"/><ellipse cx="32" cy="35" rx=".8" ry="2" fill="${INK}"/>
    <ellipse cx="48" cy="35" rx="2.8" ry="2.3" fill="#ffd34d" stroke="${INK}" stroke-width=".9"/><ellipse cx="48" cy="35" rx=".8" ry="2" fill="${INK}"/>
    <path d="M35 50 L36.5 54 L38 50 M42 50 L43.5 54 L45 50" fill="#fff" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
    ${b ? crown(40, 18) : ''}`;
  },
  skeleton(c, b) {
    const bone = (d, w) => line(d, dk(c.bone, 0.45), w + 1.6) + line(d, c.bone, w);
    return `${shadow(40, 74, 20, 4)}
    ${bone('M34 60 L31 72 M46 60 L49 72', 3.6)}
    ${sh('path', 'd="M30 46 Q40 42 50 46 L48 62 L32 62 Z"', c.cloth, { sw: 1.4 })}
    ${line('M34 48 L46 48 M34 53 L46 53 M35 58 L45 58', c.bone, 2.4)}
    ${bone('M30 47 L22 60 M50 47 L58 58', 3.4)}
    <g transform="rotate(25 58 58)">${sh('path', 'd="M56 58 L56 32 L58.3 28 L60.6 32 L60.6 58 Z"', '#c7cfdb', { metal: true, shade: false, stroke: '#6d7684' })}${sh('rect', 'x="52" y="56" width="12.5" height="3.6" rx="1"', '#6b4226')}</g>
    ${sh('path', 'd="M26 30 Q26 12 40 12 Q54 12 54 30 Q54 38 48 40 L48 45 L32 45 L32 40 Q26 38 26 30 Z"', c.bone, { hi: true, sw: 1.6 })}
    <ellipse cx="34" cy="29" rx="4.6" ry="5.2" fill="${INK}"/><ellipse cx="46" cy="29" rx="4.6" ry="5.2" fill="${INK}"/>
    ${glowEye(34, 30, 1.8, c.eye)}${glowEye(46, 30, 1.8, c.eye)}
    <path d="M40 34 L38 38 L42 38 Z" fill="${INK}"/>${line('M35 42 L35 45 M38.3 42 L38.3 45 M41.7 42 L41.7 45 M45 42 L45 45', INK, 1.2)}
    ${b ? crown(40, 14) : ''}`;
  },
  ghost(c, b) {
    return `${shadow(40, 77, 16, 3)}
    <ellipse cx="40" cy="44" rx="34" ry="34" fill="url(#mdbGlow)" opacity=".35"/>
    ${sh('path', 'd="M15 68 Q13 20 40 15 Q67 20 65 68 L58 62 L52 70 L46 62 L40 70 L34 62 L28 70 L22 62 Z"', c.body, { hi: true, op: 0.92, sw: 1.5 })}
    ${sh('path', 'd="M17 44 Q8 48 10 56 Q15 50 19 52 Z M63 44 Q72 48 70 56 Q65 50 61 52 Z"', c.body, { op: 0.92 })}
    <ellipse cx="27" cy="46" rx="4.5" ry="2.6" fill="url(#mdbBlush)"/><ellipse cx="53" cy="46" rx="4.5" ry="2.6" fill="url(#mdbBlush)"/>
    ${mEye(32, 38, 4.6, 6.6)}${mEye(48, 38, 4.6, 6.6)}
    ${sh('ellipse', 'cx="40" cy="51" rx="4" ry="5"', INK, { shade: false, sw: .8 })}
    ${b ? crown(40, 18) : ''}`;
  },
  orc(c, b) {
    return `${shadow(40, 75, 26, 4.5)}
    ${sh('path', 'd="M17 76 Q16 50 40 47 Q64 50 63 76 Z"', c.armor, { sw: 1.6 })}
    ${line('M24 56 L56 56', '#e8c35a', 3)}${line('M24 56 L56 56', '#fff4c0', 1, 0.6)}
    <g transform="rotate(-20 64 60)">${sh('rect', 'x="61" y="28" width="7" height="32" rx="3"', '#7a4b2a')}${sh('circle', 'cx="64.5" cy="30" r="8"', '#6b4226', { hi: true })}${line('M60 26 L57 23 M69 27 L72 24 M64.5 22 L64.5 18', '#cfd6df', 1.8)}</g>
    ${sh('circle', 'cx="64" cy="62" r="4.6"', c.skin, { hi: true })}${sh('circle', 'cx="16" cy="62" r="4.6"', c.skin, { hi: true })}
    ${sh('path', 'd="M22 34 L11 27 L22 40 Z M58 34 L69 27 L58 40 Z"', c.skin)}
    ${sh('ellipse', 'cx="40" cy="36" rx="18" ry="16"', c.skin, { hi: true, sw: 1.6 })}
    ${sh('path', 'd="M21 30 Q21 13 40 13 Q59 13 59 30 Z"', '#8a8f99', { metal: true, sw: 1.6 })}
    ${b ? crown(40, 16, 28) : sh('path', 'd="M24 22 L16 8 L30 18 Z M56 22 L64 8 L50 18 Z"', '#efe8d4', { hi: true })}
    ${line('M28 33 L37 36 M52 33 L43 36', INK, 2.4)}
    ${glowEye(33, 38, 2.2, '#ff4b4b')}${glowEye(47, 38, 2.2, '#ff4b4b')}
    ${line('M33 47 Q40 44 47 47', INK, 1.8)}
    ${sh('path', 'd="M31 47 L33 40 L35 47 Z M45 47 L47 40 L49 47 Z"', '#fffaf0', { sw: .9 })}`;
  },
  golem(c, b) {
    return `${shadow(40, 75, 30, 5)}
    ${sh('rect', 'x="26" y="60" width="11" height="14" rx="3"', c.body, { sw: 1.6 })}${sh('rect', 'x="43" y="60" width="11" height="14" rx="3"', c.body, { sw: 1.6 })}
    ${sh('rect', 'x="18" y="34" width="44" height="30" rx="8"', c.body, { hi: true, sw: 1.7 })}
    ${line('M30 40 L35 48 L31 56 M50 38 L46 46 M55 52 L51 58', dk(c.body, 0.5), 1.2, 0.7)}
    <circle cx="27" cy="58" r="2" fill="#7fae5a" opacity=".7"/><circle cx="56" cy="40" r="2.4" fill="#7fae5a" opacity=".7"/>
    ${glowEye(40, 49, 3.8, c.glow)}
    ${sh('rect', 'x="6" y="36" width="13" height="26" rx="6"', c.body, { sw: 1.6 })}${sh('rect', 'x="61" y="36" width="13" height="26" rx="6"', c.body, { sw: 1.6 })}
    ${sh('rect', 'x="28" y="16" width="24" height="20" rx="5"', c.body, { hi: true, sw: 1.6 })}
    ${glow(34.5, 25.5, 4, c.glow, 0.7)}${glow(45.5, 25.5, 4, c.glow, 0.7)}
    <rect x="32" y="24" width="5" height="3" rx="1" fill="${c.glow}"/><rect x="43" y="24" width="5" height="3" rx="1" fill="${c.glow}"/>
    ${b ? crown(40, 17) : ''}`;
  },
  demon(c, b) {
    const wing = `${sh('path', 'd="M30 40 Q14 18 2 24 Q8 34 6 44 Q16 40 18 50 Q24 44 30 50 Z"', c.horn, { sw: 1.5 })}${line('M27 40 Q16 28 6 27 M26 44 Q17 40 9 43', lt(c.horn, 0.3), 0.9, 0.7)}`;
    return `${shadow(40, 75, 20, 4)}
    ${wing}<g transform="translate(80 0) scale(-1 1)">${wing}</g>
    ${sh('path', 'd="M52 64 Q66 70 68 58 L72 60 L68 54 Q64 64 52 60 Z"', c.body)}
    ${sh('rect', 'x="32" y="62" width="6" height="11" rx="2"', c.body)}${sh('rect', 'x="42" y="62" width="6" height="11" rx="2"', c.body)}
    ${sh('ellipse', 'cx="40" cy="55" rx="13" ry="11"', c.body, { sw: 1.5 })}
    ${sh('circle', 'cx="40" cy="34" r="15"', c.body, { hi: true, sw: 1.6 })}
    ${b ? crown(40, 21) : ''}
    ${sh('path', 'd="M27 26 Q22 12 30 8 Q30 18 33 22 Z M53 26 Q58 12 50 8 Q50 18 47 22 Z"', c.horn, { hi: true })}
    ${line('M30 31 L37 34 M50 31 L43 34', INK, 2.2)}
    ${glowEye(34, 36, 2.4, '#ffd34d')}${glowEye(46, 36, 2.4, '#ffd34d')}
    <path d="M32 42 Q40 50 48 42 Z" fill="${INK}"/><path d="M34 43 L36 46 L38 43.6 M42 43.6 L44 46 L46 43" fill="#fff"/>`;
  },
  dragon(c, b) {
    const wing = `${sh('path', 'd="M32 44 Q20 14 2 16 Q10 26 6 34 Q16 32 14 42 Q24 38 26 50 Z"', c.wing, { sw: 1.5 })}${line('M28 42 Q18 24 6 18 M27 45 Q17 34 9 33', lt(c.wing, 0.3), 0.9, 0.7)}`;
    return `${shadow(40, 75, 28, 4.5)}
    ${wing}<g transform="translate(80 0) scale(-1 1)">${wing}</g>
    ${sh('path', 'd="M56 66 Q74 70 76 56 L79 60 L76 50 Q70 64 56 60 Z"', c.body)}
    ${sh('ellipse', 'cx="40" cy="58" rx="18" ry="15"', c.body, { sw: 1.6 })}
    ${sh('ellipse', 'cx="40" cy="61" rx="10" ry="10"', c.belly, { soft: true })}${line('M33 56 L47 56 M32 61 L48 61 M33 66 L47 66', dk(c.belly, 0.25), 1, 0.6)}
    ${sh('ellipse', 'cx="29" cy="72" rx="6" ry="3.4"', c.body, { hi: true })}${sh('ellipse', 'cx="51" cy="72" rx="6" ry="3.4"', c.body, { hi: true })}
    ${sh('path', 'd="M26 30 Q24 14 40 13 Q56 14 54 30 Q56 44 40 46 Q24 44 26 30 Z"', c.body, { hi: true, sw: 1.6 })}
    ${b ? crown(40, 15) : ''}
    ${sh('path', 'd="M28 18 L22 4 L33 14 Z M52 18 L58 4 L47 14 Z"', c.belly, { hi: true })}
    ${sh('ellipse', 'cx="40" cy="38" rx="9" ry="6"', c.belly, { soft: true })}
    <circle cx="36.5" cy="37" r="1.2" fill="${INK}"/><circle cx="43.5" cy="37" r="1.2" fill="${INK}"/>
    ${line('M30 26 L37 29 M50 26 L43 29', INK, 2)}
    ${glowEye(33, 30, 2.4, '#ffd34d')}${glowEye(47, 30, 2.4, '#ffd34d')}
    <circle cx="35" cy="45" r="2" fill="#ccc" opacity=".4"/><circle cx="33" cy="48" r="1.4" fill="#ccc" opacity=".3"/>`;
  },
  mimic(c, b) {
    return `${shadow(40, 74, 30, 5)}
    ${sh('path', 'd="M14 42 L18 14 L62 14 L66 42 Z"', c.box, { hi: true, sw: 1.6 })}
    <path d="M18 42 L22 22 L58 22 L62 42 Z" fill="#5a1020"/><path d="M22 40 L25 26 L55 26 L58 40 Z" fill="#000" opacity=".3"/>
    ${sh('path', 'd="M30 58 Q40 44 50 58 Z"', '#ff6b8a', { hi: true, sw: 1 })}
    ${sh('rect', 'x="14" y="42" width="52" height="30" rx="3"', c.box, { sw: 1.6 })}
    ${line('M18 50 L62 50 M18 66 L62 66', dk(c.box, 0.3), 1, 0.5)}
    <path d="M18 42 L21 50 L24 42 L27 50 L30 42 L33 50 L36 42 L39 50 L42 42 L45 50 L48 42 L51 50 L54 42 L57 50 L60 42 Z" fill="#fffaf0" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
    <path d="M21 22 L24 30 L27 22 L30 30 L33 22 L36 30 L39 22 L42 30 L45 22 L48 30 L51 22 L54 30 L57 22 Z" fill="#fffaf0" stroke="${INK}" stroke-width=".9" stroke-linejoin="round"/>
    ${sh('rect', 'x="14" y="58" width="52" height="4" rx="1"', c.band, { hi: true, sw: 1 })}${sh('rect', 'x="36" y="56" width="8" height="10" rx="2"', c.band, { hi: true, sw: 1 })}
    ${sh('ellipse', 'cx="30" cy="9" rx="5.4" ry="5.4"', '#ffffff', { sw: 1.2 })}${sh('ellipse', 'cx="50" cy="9" rx="5.4" ry="5.4"', '#ffffff', { sw: 1.2 })}
    ${mEye(31, 10, 2.4, 2.6)}${mEye(51, 10, 2.4, 2.6)}
    ${b ? crown(40, 4) : ''}`;
  },
};

const IDLE_ANIM = { slime: 'squish', bat: 'float', ghost: 'float', demon: 'float', dragon: 'bob', mimic: 'chomp' };

function monSprite(m, opt = {}) {
  const draw = MON_SPRITES[m.sprite] || MON_SPRITES.slime;
  const vb = opt.crop === 'head' ? '8 4 64 58' : '-4 -6 88 86';
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${draw(m.colors, !!m.boss)}</svg>`;
}
