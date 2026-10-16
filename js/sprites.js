// ===== สไปรต์ SVG สไตล์ chibi (วาดเอง) =====

const OUT = '#2a1e3a';
const SW = `stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"`;
const SW2 = `stroke="${OUT}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"`;

// ---------- ตัวละครผู้เล่น ----------
// p: { job, hair, hairStyle }, opt.crop = 'head' สำหรับไอคอน
function chibi(p, opt = {}) {
  const J = JOBS[p.job], o = J.look, h = p.hair, sk = SKIN;
  const hs = (p.hairStyle || 0) % 4;
  const robe = p.job === 'mage' || p.job === 'acolyte';
  let s = '';

  // เงา
  if (!opt.crop) s += `<ellipse cx="32" cy="76" rx="17" ry="4" fill="rgba(0,0,0,.35)"/>`;

  // ของด้านหลัง
  if (p.job === 'swordsman') s += `<path d="M21 48 L14 73 L50 73 L43 48 Z" fill="#c43c3c" ${SW}/>`;
  if (p.job === 'merchant') s += `<rect x="15" y="44" width="34" height="22" rx="6" fill="#8a5a2f" ${SW}/><rect x="15" y="50" width="34" height="3" fill="#6b4226"/>`;
  if (p.job === 'archer') s += `<path d="M44 44 L50 30 L54 32 L48 48 Z" fill="#8b5a2b" ${SW}/><path d="M50 30 L48 24 M52 31 L54 25 M54 32 L58 27" stroke="#fff" stroke-width="1.6"/>`;
  if (p.job === 'thief') s += `<path d="M20 50 Q10 62 16 74 Q24 66 28 52 Z" fill="${o.trim}" ${SW}/>`;

  // ผมด้านหลัง
  if (hs === 2) s += `<path d="M13 27 Q13 8 32 8 Q51 8 51 27 L53 54 Q46 58 42 51 L22 51 Q18 58 11 54 Z" fill="${h}" ${SW}/>`;
  else s += `<ellipse cx="32" cy="27" rx="19" ry="18" fill="${h}" ${SW}/>`;
  if (hs === 3) s += `<path d="M47 20 Q64 24 59 48 Q55 41 49 33 Z" fill="${h}" ${SW}/>`;

  // ขา
  if (!robe) {
    s += `<rect x="25" y="62" width="6" height="11" rx="2" fill="${o.pants}" ${SW}/><rect x="33" y="62" width="6" height="11" rx="2" fill="${o.pants}" ${SW}/>`;
  }
  s += `<ellipse cx="27.5" cy="74" rx="4.8" ry="2.6" fill="#4a2f22" ${SW}/><ellipse cx="36.5" cy="74" rx="4.8" ry="2.6" fill="#4a2f22" ${SW}/>`;

  // ลำตัว
  if (robe) {
    s += `<path d="M18 73 Q18 48 32 45 Q46 48 46 73 Z" fill="${o.main}" ${SW}/>`;
    s += `<path d="M32 46 L32 73" stroke="${o.trim}" stroke-width="3"/>`;
    s += `<path d="M25 46 Q32 53 39 46" fill="none" stroke="${o.trim}" stroke-width="2.5"/>`;
  } else {
    s += `<path d="M19 65 Q18 48 32 45 Q46 48 45 65 Z" fill="${o.main}" ${SW}/>`;
    s += `<rect x="19.5" y="58" width="25" height="3.5" fill="${o.trim}" ${SW}/>`;
    s += `<path d="M27 46 L32 52 L37 46" fill="none" stroke="${o.trim}" stroke-width="2"/>`;
  }
  if (p.job === 'swordsman') {
    s += `<ellipse cx="20" cy="49" rx="6" ry="4.2" fill="#c9d3e0" ${SW}/><ellipse cx="44" cy="49" rx="6" ry="4.2" fill="#c9d3e0" ${SW}/>`;
  }

  // แขน
  s += `<ellipse cx="18" cy="55" rx="4" ry="6.5" fill="${o.main}" ${SW}/><ellipse cx="46" cy="55" rx="4" ry="6.5" fill="${o.main}" ${SW}/>`;

  // หัว + หน้า
  s += `<circle cx="32" cy="28" r="17" fill="${sk}" ${SW}/>`;
  s += `<ellipse cx="25.5" cy="31" rx="2.7" ry="3.8" fill="${OUT}"/><ellipse cx="38.5" cy="31" rx="2.7" ry="3.8" fill="${OUT}"/>`;
  s += `<circle cx="26.5" cy="29.4" r="1.1" fill="#fff"/><circle cx="39.5" cy="29.4" r="1.1" fill="#fff"/>`;
  s += `<ellipse cx="21.5" cy="36" rx="3" ry="1.6" fill="#ff8fa3" opacity=".55"/><ellipse cx="42.5" cy="36" rx="3" ry="1.6" fill="#ff8fa3" opacity=".55"/>`;
  s += `<path d="M30 37.5 Q32 39.5 34 37.5" fill="none" stroke="${OUT}" stroke-width="1.4" stroke-linecap="round"/>`;

  // หน้าม้า
  const bangs = [
    'M14 30 Q12 9 32 9 Q52 9 50 30 L46 21 L42 27 L38 18 L33 25 L28 17 L24 26 L19 20 Z',
    'M14 32 Q12 9 32 9 Q52 9 50 32 Q48 21 40 19 Q32 25 24 19 Q16 21 14 32 Z',
    'M14 34 Q12 9 32 9 Q52 9 50 34 Q47 20 38 18 Q34 24 30 18 Q18 20 14 34 Z',
    'M14 30 Q14 9 34 9 Q52 10 50 28 Q40 13 22 24 Q18 26 14 30 Z',
  ];
  s += `<path d="${bangs[hs]}" fill="${h}" ${SW}/>`;

  // หมวก / เครื่องประดับหัว
  if (p.job === 'mage') {
    s += `<path d="M19 14 L38 -9 L45 14 Z" fill="${o.main}" ${SW}/><path d="M21 10 L44 10 L45 14 L19 14 Z" fill="${o.trim}"/>`;
    s += `<ellipse cx="32" cy="14" rx="22" ry="5" fill="${o.main}" ${SW}/>`;
  } else if (p.job === 'archer') {
    s += `<path d="M15 20 Q32 12 49 20" stroke="${o.trim}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
    s += `<path d="M46 17 Q60 3 57 -5 Q52 7 44 15 Z" fill="#fff" ${SW}/>`;
  } else if (p.job === 'acolyte') {
    s += `<path d="M16 19 Q32 1 48 19 Q32 13 16 19 Z" fill="${o.trim}" ${SW}/><circle cx="32" cy="7" r="2.5" fill="#ffd34d" ${SW}/>`;
  } else if (p.job === 'thief') {
    s += `<path d="M13 22 Q32 5 51 22 L51 25 Q32 16 13 25 Z" fill="${o.trim}" ${SW}/><path d="M50 22 L61 17 L59 27 Z" fill="${o.trim}" ${SW}/>`;
  } else if (p.job === 'merchant') {
    s += `<path d="M15 20 Q32 1 49 20 Z" fill="${o.trim}" ${SW}/><path d="M10 20 L40 20 Q32 25 10 23 Z" fill="${o.trim}" ${SW}/>`;
  } else if (p.job === 'swordsman') {
    s += `<path d="M15 21 Q32 13 49 21" stroke="#c9d3e0" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="32" cy="16" r="2.4" fill="#4fa3ff" ${SW}/>`;
  }

  // อาวุธ
  if (!opt.crop) {
    if (p.job === 'swordsman') s += `<g transform="rotate(-18 46 61)"><rect x="44" y="30" width="4.6" height="28" rx="1" fill="#e8eef7" ${SW}/><rect x="40" y="56.5" width="12.6" height="3.6" rx="1" fill="#d4a62a" ${SW}/><rect x="44.6" y="60" width="3.4" height="8" fill="#6b4226" ${SW}/></g>`;
    if (p.job === 'mage') s += `<line x1="47" y1="74" x2="50" y2="36" stroke="#7a4b2a" stroke-width="3.2" stroke-linecap="round"/><circle cx="50" cy="33" r="8" fill="#7ee3ff" opacity=".3"/><circle cx="50" cy="33" r="4.8" fill="#7ee3ff" ${SW}/>`;
    if (p.job === 'archer') s += `<path d="M15 38 Q3 57 15 76" fill="none" stroke="#8b5a2b" stroke-width="3.2" stroke-linecap="round"/><line x1="15" y1="38" x2="15" y2="76" stroke="#eee" stroke-width="1"/>`;
    if (p.job === 'acolyte') s += `<line x1="47" y1="72" x2="48" y2="40" stroke="#d9c27a" stroke-width="2.8" stroke-linecap="round"/><path d="M48 29 L50.5 34.5 L56 35 L52 39 L53 44.5 L48 42 L43 44.5 L44 39 L40 35 L45.5 34.5 Z" fill="#ffe56b" ${SW}/>`;
    if (p.job === 'thief') s += `<g transform="rotate(-35 46 61)"><path d="M44.4 58 L46.5 43 L48.6 58 Z" fill="#e8eef7" ${SW}/><rect x="42" y="57.5" width="9" height="2.6" fill="#555"/><rect x="45" y="60" width="3" height="5" fill="#3a2a2a"/></g>`;
    if (p.job === 'merchant') s += `<line x1="47" y1="72" x2="49" y2="38" stroke="#7a4b2a" stroke-width="3.2" stroke-linecap="round"/><path d="M49 37 Q62 34 61 47 Q55 44 49 47 Z" fill="#cfd6df" ${SW}/>`;
  }

  // มือ
  s += `<circle cx="18" cy="61" r="3.2" fill="${sk}" ${SW}/><circle cx="46" cy="61" r="3.2" fill="${sk}" ${SW}/>`;

  const vb = opt.crop === 'head' ? '9 -4 46 46' : '-2 -12 68 92';
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ---------- ตัวละครมองจากด้านหลัง (ใช้ในฉากต่อสู้) ----------
function chibiBack(p) {
  const J = JOBS[p.job], o = J.look, h = p.hair, sk = SKIN;
  const hs = (p.hairStyle || 0) % 4;
  const robe = p.job === 'mage' || p.job === 'acolyte';
  const dark = 'rgba(0,0,0,.18)';
  let s = `<ellipse cx="32" cy="76" rx="18" ry="4.5" fill="rgba(0,0,0,.35)"/>`;

  // อาวุธที่อยู่หลังลำตัว (ด้ามจับ)
  if (p.job === 'archer') s += `<path d="M49 38 Q61 57 49 76" fill="none" stroke="#8b5a2b" stroke-width="3.2" stroke-linecap="round"/><line x1="49" y1="38" x2="49" y2="76" stroke="#eee" stroke-width="1"/>`;
  if (p.job === 'mage') s += `<line x1="15" y1="74" x2="13" y2="36" stroke="#7a4b2a" stroke-width="3.2" stroke-linecap="round"/><circle cx="13" cy="33" r="8" fill="#7ee3ff" opacity=".3"/><circle cx="13" cy="33" r="4.8" fill="#7ee3ff" ${SW}/>`;
  if (p.job === 'acolyte') s += `<line x1="16" y1="72" x2="15" y2="40" stroke="#d9c27a" stroke-width="2.8" stroke-linecap="round"/><path d="M15 29 L17.5 34.5 L23 35 L19 39 L20 44.5 L15 42 L10 44.5 L11 39 L7 35 L12.5 34.5 Z" fill="#ffe56b" ${SW}/>`;
  if (p.job === 'merchant') s += `<line x1="17" y1="72" x2="15" y2="38" stroke="#7a4b2a" stroke-width="3.2" stroke-linecap="round"/><path d="M15 37 Q2 34 3 47 Q9 44 15 47 Z" fill="#cfd6df" ${SW}/>`;

  // ขา
  if (!robe) s += `<rect x="25" y="62" width="6" height="11" rx="2" fill="${o.pants}" ${SW}/><rect x="33" y="62" width="6" height="11" rx="2" fill="${o.pants}" ${SW}/>`;
  s += `<ellipse cx="27.5" cy="74" rx="4.8" ry="2.6" fill="#4a2f22" ${SW}/><ellipse cx="36.5" cy="74" rx="4.8" ry="2.6" fill="#4a2f22" ${SW}/>`;

  // ลำตัวด้านหลัง
  if (robe) s += `<path d="M18 73 Q18 48 32 45 Q46 48 46 73 Z" fill="${o.main}" ${SW}/><path d="M32 47 L32 73" stroke="${dark}" stroke-width="1.4"/>`;
  else s += `<path d="M19 65 Q18 48 32 45 Q46 48 45 65 Z" fill="${o.main}" ${SW}/><rect x="19.5" y="58" width="25" height="3.5" fill="${o.trim}" ${SW}/>`;
  s += `<ellipse cx="18" cy="55" rx="4" ry="6.5" fill="${o.main}" ${SW}/><ellipse cx="46" cy="55" rx="4" ry="6.5" fill="${o.main}" ${SW}/>`;

  // ของที่สะพายหลัง
  if (p.job === 'swordsman') s += `<ellipse cx="20" cy="49" rx="6" ry="4.2" fill="#c9d3e0" ${SW}/><ellipse cx="44" cy="49" rx="6" ry="4.2" fill="#c9d3e0" ${SW}/><path d="M21 47 Q32 51 43 47 L48 74 Q32 78 16 74 Z" fill="#c43c3c" ${SW}/><path d="M26 52 L24 73 M32 53 L32 75 M38 52 L40 73" stroke="${dark}" stroke-width="1.2"/>`;
  if (p.job === 'merchant') s += `<rect x="20" y="47" width="24" height="20" rx="5" fill="#8a5a2f" ${SW}/><rect x="20" y="53" width="24" height="3" fill="#6b4226"/><rect x="29" y="56" width="6" height="5" rx="1" fill="#e8c35a" ${SW}/>`;
  if (p.job === 'archer') s += `<g transform="rotate(-25 34 56)"><rect x="30" y="44" width="8" height="20" rx="3" fill="#8b5a2b" ${SW}/><path d="M31 44 L30 37 M34 44 L34 36 M37 44 L38 37" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></g>`;
  if (p.job === 'thief') s += `<path d="M22 47 Q32 52 42 47 L40 60 Q32 63 24 60 Z" fill="${o.trim}" ${SW}/>`;

  // หู + หัวด้านหลัง (ผมทั้งหัว)
  s += `<ellipse cx="15.3" cy="31" rx="2.6" ry="3.6" fill="${sk}" ${SW}/><ellipse cx="48.7" cy="31" rx="2.6" ry="3.6" fill="${sk}" ${SW}/>`;
  if (hs === 2) s += `<path d="M14 28 Q14 9 32 9 Q50 9 50 28 L51 56 Q32 61 13 56 Z" fill="${h}" ${SW}/>`;
  s += `<circle cx="32" cy="28" r="17" fill="${h}" ${SW}/>`;
  s += `<path d="M22 16 Q26 30 24 42 M32 12 Q34 28 32 44 M42 16 Q38 30 40 42" fill="none" stroke="${dark}" stroke-width="1.4" stroke-linecap="round"/>`;
  if (hs === 0) s += `<path d="M15 24 L11 15 L20 18 L22 9 L28 15 L32 6 L36 15 L42 9 L44 18 L53 15 L49 24 Z" fill="${h}" ${SW}/>`;
  if (hs === 1) s += `<path d="M15 34 Q18 44 24 41 Q28 46 32 42 Q36 46 40 41 Q46 44 49 34 Z" fill="${h}" ${SW}/>`;
  if (hs === 3) s += `<circle cx="32" cy="20" r="3" fill="${o.trim}" ${SW}/><path d="M29 22 Q24 38 31 56 Q38 40 35 22 Z" fill="${h}" ${SW}/>`;

  // หมวก / ผ้าคาด (ด้านหลัง)
  if (p.job === 'mage') s += `<path d="M19 14 L26 -9 L45 14 Z" fill="${o.main}" ${SW}/><path d="M21 10 L44 10 L45 14 L19 14 Z" fill="${o.trim}"/><ellipse cx="32" cy="14" rx="22" ry="5" fill="${o.main}" ${SW}/>`;
  if (p.job === 'archer') s += `<path d="M15 20 Q32 26 49 20" stroke="${o.trim}" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M18 17 Q4 3 7 -5 Q12 7 20 15 Z" fill="#fff" ${SW}/>`;
  if (p.job === 'acolyte') s += `<path d="M16 19 Q32 1 48 19 Q32 24 16 19 Z" fill="${o.trim}" ${SW}/>`;
  if (p.job === 'thief') s += `<path d="M13 22 Q32 5 51 22 L51 26 Q32 30 13 26 Z" fill="${o.trim}" ${SW}/><path d="M32 25 L25 40 L31 38 Z M32 25 L40 39 L34 38 Z" fill="${o.trim}" ${SW}/><circle cx="32" cy="25" r="2.6" fill="${o.trim}" ${SW}/>`;
  if (p.job === 'merchant') s += `<path d="M15 21 Q32 1 49 21 Q32 26 15 21 Z" fill="${o.trim}" ${SW}/>`;
  if (p.job === 'swordsman') s += `<path d="M15 21 Q32 28 49 21" stroke="#c9d3e0" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M32 27 L28 37 M32 27 L36 37" stroke="#c9d3e0" stroke-width="2.4" stroke-linecap="round"/>`;

  // อาวุธที่ยกขึ้นเหนือไหล่ + มือ
  if (p.job === 'swordsman') s += `<g transform="rotate(18 46 61)"><rect x="44" y="30" width="4.6" height="28" rx="1" fill="#e8eef7" ${SW}/><rect x="40" y="56.5" width="12.6" height="3.6" rx="1" fill="#d4a62a" ${SW}/><rect x="44.6" y="60" width="3.4" height="8" fill="#6b4226" ${SW}/></g>`;
  if (p.job === 'thief') s += `<g transform="rotate(35 46 61)"><path d="M44.4 58 L46.5 43 L48.6 58 Z" fill="#e8eef7" ${SW}/><rect x="42" y="57.5" width="9" height="2.6" fill="#555"/></g>`;
  s += `<circle cx="18" cy="61" r="3.2" fill="${sk}" ${SW}/><circle cx="46" cy="61" r="3.2" fill="${sk}" ${SW}/>`;

  return `<svg viewBox="-2 -12 68 92" xmlns="http://www.w3.org/2000/svg">${s}</svg>`;
}

// ---------- มอนสเตอร์ ----------
function crown(cx, y, w = 26) {
  const l = cx - w / 2, r = cx + w / 2;
  return `<path d="M${l} ${y} L${l + 2} ${y - 14} L${cx - w / 4} ${y - 6} L${cx} ${y - 18} L${cx + w / 4} ${y - 6} L${r - 2} ${y - 14} L${r} ${y} Z" fill="#ffd34d" ${SW2}/><circle cx="${cx}" cy="${y - 5}" r="2.6" fill="#ff4b6b"/>`;
}

const MON_SPRITES = {
  slime(c, b) {
    return `<ellipse cx="40" cy="72" rx="27" ry="5" fill="rgba(0,0,0,.35)"/>
    <path d="M11 68 Q7 34 40 22 Q73 34 69 68 Q40 77 11 68 Z" fill="${c.body}" ${SW2}/>
    <path d="M16 64 Q40 72 64 64" fill="none" stroke="${c.dark}" stroke-width="2" opacity=".6"/>
    <ellipse cx="27" cy="37" rx="8" ry="4" fill="#fff" opacity=".6" transform="rotate(-30 27 37)"/>
    <ellipse cx="32" cy="49" rx="3.2" ry="4.8" fill="${OUT}"/><ellipse cx="49" cy="49" rx="3.2" ry="4.8" fill="${OUT}"/>
    <circle cx="33" cy="47" r="1.3" fill="#fff"/><circle cx="50" cy="47" r="1.3" fill="#fff"/>
    <path d="M36 57 Q40.5 62 45 57" fill="${c.dark}" ${SW}/>
    ${b ? crown(40, 26, 30) : `<path d="M40 23 Q35 12 44 7 Q47 16 40 23 Z" fill="#6fd16f" ${SW}/>`}`;
  },
  mushroom(c, b) {
    return `<ellipse cx="40" cy="73" rx="20" ry="4" fill="rgba(0,0,0,.35)"/>
    <path d="M28 48 Q25 70 30 73 L50 73 Q55 70 52 48 Z" fill="#f6e7c8" ${SW2}/>
    <ellipse cx="35" cy="59" rx="2.4" ry="3.4" fill="${OUT}"/><ellipse cx="45" cy="59" rx="2.4" ry="3.4" fill="${OUT}"/>
    <path d="M36 66 Q40 63 44 66" fill="none" stroke="${OUT}" stroke-width="1.6"/>
    <path d="M9 50 Q9 16 40 14 Q71 16 71 50 Q40 57 9 50 Z" fill="${c.cap}" ${SW2}/>
    <circle cx="26" cy="32" r="5" fill="${c.spot}"/><circle cx="46" cy="24" r="4" fill="${c.spot}"/><circle cx="57" cy="39" r="4.5" fill="${c.spot}"/><circle cx="38" cy="42" r="3" fill="${c.spot}"/>
    ${b ? crown(40, 16) : ''}`;
  },
  bat(c, b) {
    const wing = `<path d="M34 40 Q18 18 2 28 Q10 33 8 42 Q17 39 19 48 Q26 42 34 48 Z" fill="${c.wing}" ${SW2}/>`;
    return `<ellipse cx="40" cy="74" rx="14" ry="3" fill="rgba(0,0,0,.25)"/>
    ${wing}<g transform="translate(80 0) scale(-1 1)">${wing}</g>
    <path d="M30 30 L31 18 L37 28 Z M50 30 L49 18 L43 28 Z" fill="${c.body}" ${SW}/>
    <ellipse cx="40" cy="42" rx="13" ry="14" fill="${c.body}" ${SW2}/>
    <ellipse cx="35" cy="39" rx="2.8" ry="3.4" fill="#ff4b4b"/><ellipse cx="45" cy="39" rx="2.8" ry="3.4" fill="#ff4b4b"/>
    <path d="M36 48 L37.5 52 L39 48 M41 48 L42.5 52 L44 48" fill="#fff" ${SW}/>
    ${b ? crown(40, 28) : ''}`;
  },
  wolf(c, b) {
    return `<ellipse cx="40" cy="74" rx="24" ry="4" fill="rgba(0,0,0,.35)"/>
    <path d="M60 58 Q74 50 70 38 Q66 50 58 52 Z" fill="${c.body}" ${SW}/>
    <ellipse cx="40" cy="59" rx="20" ry="14" fill="${c.body}" ${SW2}/>
    <ellipse cx="31" cy="72" rx="5" ry="3" fill="${c.light}" ${SW}/><ellipse cx="49" cy="72" rx="5" ry="3" fill="${c.light}" ${SW}/>
    <path d="M21 40 Q19 23 29 19 L31 7 L38 18 L42 18 L49 7 L51 19 Q61 23 59 40 Q57 53 40 55 Q23 53 21 40 Z" fill="${c.body}" ${SW2}/>
    <ellipse cx="40" cy="45" rx="9" ry="7" fill="${c.light}" ${SW}/>
    <ellipse cx="40" cy="40.5" rx="3.2" ry="2.2" fill="${OUT}"/>
    <path d="M28 31 L36 34 M52 31 L44 34" stroke="${OUT}" stroke-width="2"/>
    <ellipse cx="32" cy="35" rx="2.6" ry="2.2" fill="#ffd34d" ${SW}/><ellipse cx="48" cy="35" rx="2.6" ry="2.2" fill="#ffd34d" ${SW}/>
    <path d="M35 50 L36.5 54 L38 50 M42 50 L43.5 54 L45 50" fill="#fff" ${SW}/>
    ${b ? crown(40, 18) : ''}`;
  },
  skeleton(c, b) {
    return `<ellipse cx="40" cy="74" rx="18" ry="4" fill="rgba(0,0,0,.35)"/>
    <path d="M34 60 L31 72 M46 60 L49 72" stroke="${c.bone}" stroke-width="4" stroke-linecap="round"/>
    <path d="M30 46 Q40 42 50 46 L48 62 L32 62 Z" fill="${c.cloth}" ${SW2}/>
    <path d="M34 48 L46 48 M34 53 L46 53 M35 58 L45 58" stroke="${c.bone}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M30 47 L22 60 M50 47 L58 58" stroke="${c.bone}" stroke-width="4" stroke-linecap="round"/>
    <g transform="rotate(25 58 58)"><rect x="56" y="30" width="4.5" height="28" fill="#b8c0cc" ${SW}/><rect x="52" y="56" width="12.5" height="3.5" fill="#6b4226" ${SW}/></g>
    <path d="M26 30 Q26 12 40 12 Q54 12 54 30 Q54 38 48 40 L48 45 L32 45 L32 40 Q26 38 26 30 Z" fill="${c.bone}" ${SW2}/>
    <ellipse cx="34" cy="29" rx="4.5" ry="5" fill="${OUT}"/><ellipse cx="46" cy="29" rx="4.5" ry="5" fill="${OUT}"/>
    <circle cx="34" cy="30" r="1.8" fill="${c.eye}"/><circle cx="46" cy="30" r="1.8" fill="${c.eye}"/>
    <path d="M40 34 L38 38 L42 38 Z" fill="${OUT}"/><path d="M35 42 L35 45 M38.3 42 L38.3 45 M41.7 42 L41.7 45 M45 42 L45 45" stroke="${OUT}" stroke-width="1.3"/>
    ${b ? crown(40, 14) : ''}`;
  },
  ghost(c, b) {
    return `<ellipse cx="40" cy="76" rx="16" ry="3" fill="rgba(0,0,0,.2)"/>
    <path d="M15 68 Q13 20 40 15 Q67 20 65 68 L58 62 L52 70 L46 62 L40 70 L34 62 L28 70 L22 62 Z" fill="${c.body}" opacity=".9" ${SW2}/>
    <path d="M17 44 Q8 48 10 56 Q15 50 19 52 Z M63 44 Q72 48 70 56 Q65 50 61 52 Z" fill="${c.body}" ${SW}/>
    <ellipse cx="32" cy="38" rx="4.5" ry="6.5" fill="${OUT}"/><ellipse cx="48" cy="38" rx="4.5" ry="6.5" fill="${OUT}"/>
    <circle cx="33" cy="36" r="1.5" fill="#fff"/><circle cx="49" cy="36" r="1.5" fill="#fff"/>
    <ellipse cx="40" cy="51" rx="4" ry="5" fill="${OUT}"/>
    ${b ? crown(40, 18) : ''}`;
  },
  orc(c, b) {
    return `<ellipse cx="40" cy="75" rx="24" ry="4" fill="rgba(0,0,0,.35)"/>
    <path d="M17 76 Q16 50 40 47 Q64 50 63 76 Z" fill="${c.armor}" ${SW2}/>
    <path d="M24 56 L56 56" stroke="#e8c35a" stroke-width="3"/>
    <g transform="rotate(-20 64 60)"><rect x="61" y="28" width="7" height="32" rx="3" fill="#7a4b2a" ${SW}/><circle cx="64.5" cy="30" r="8" fill="#6b4226" ${SW}/></g>
    <circle cx="64" cy="62" r="4.5" fill="${c.skin}" ${SW}/><circle cx="16" cy="62" r="4.5" fill="${c.skin}" ${SW}/>
    <path d="M22 34 L12 28 L22 40 Z M58 34 L68 28 L58 40 Z" fill="${c.skin}" ${SW}/>
    <ellipse cx="40" cy="36" rx="18" ry="16" fill="${c.skin}" ${SW2}/>
    <path d="M21 30 Q21 13 40 13 Q59 13 59 30 Z" fill="#8a8f99" ${SW2}/>
    ${b ? crown(40, 16, 28) : `<path d="M24 22 L16 8 L30 18 Z M56 22 L64 8 L50 18 Z" fill="#efe8d4" ${SW}/>`}
    <path d="M28 33 L37 36 M52 33 L43 36" stroke="${OUT}" stroke-width="2.4"/>
    <circle cx="33" cy="38" r="2.4" fill="#ff4b4b"/><circle cx="47" cy="38" r="2.4" fill="#ff4b4b"/>
    <path d="M33 47 Q40 44 47 47" fill="none" stroke="${OUT}" stroke-width="1.8"/>
    <path d="M31 47 L33 40 L35 47 Z M45 47 L47 40 L49 47 Z" fill="#fff" ${SW}/>`;
  },
  golem(c, b) {
    return `<ellipse cx="40" cy="75" rx="28" ry="4" fill="rgba(0,0,0,.35)"/>
    <rect x="26" y="60" width="11" height="14" rx="3" fill="${c.body}" ${SW2}/><rect x="43" y="60" width="11" height="14" rx="3" fill="${c.body}" ${SW2}/>
    <rect x="18" y="34" width="44" height="30" rx="8" fill="${c.body}" ${SW2}/>
    <path d="M30 40 L35 48 L31 56 M50 38 L46 46" fill="none" stroke="${OUT}" stroke-width="1.4" opacity=".6"/>
    <circle cx="40" cy="49" r="4" fill="${c.glow}" opacity=".9"/>
    <rect x="6" y="36" width="13" height="26" rx="6" fill="${c.body}" ${SW2}/><rect x="61" y="36" width="13" height="26" rx="6" fill="${c.body}" ${SW2}/>
    <rect x="28" y="16" width="24" height="20" rx="5" fill="${c.body}" ${SW2}/>
    <rect x="32" y="24" width="5" height="3" fill="${c.glow}"/><rect x="43" y="24" width="5" height="3" fill="${c.glow}"/>
    ${b ? crown(40, 17) : ''}`;
  },
  demon(c, b) {
    const wing = `<path d="M30 40 Q14 18 2 24 Q8 34 6 44 Q16 40 18 50 Q24 44 30 50 Z" fill="${c.horn}" ${SW2}/>`;
    return `<ellipse cx="40" cy="75" rx="18" ry="4" fill="rgba(0,0,0,.35)"/>
    ${wing}<g transform="translate(80 0) scale(-1 1)">${wing}</g>
    <path d="M52 64 Q66 70 68 58 L72 60 L68 54 Q64 64 52 60 Z" fill="${c.body}" ${SW}/>
    <rect x="32" y="62" width="6" height="11" rx="2" fill="${c.body}" ${SW}/><rect x="42" y="62" width="6" height="11" rx="2" fill="${c.body}" ${SW}/>
    <ellipse cx="40" cy="55" rx="13" ry="11" fill="${c.body}" ${SW2}/>
    <circle cx="40" cy="34" r="15" fill="${c.body}" ${SW2}/>
    ${b ? crown(40, 21) : ''}
    <path d="M27 26 Q22 12 30 8 Q30 18 33 22 Z M53 26 Q58 12 50 8 Q50 18 47 22 Z" fill="${c.horn}" ${SW}/>
    <path d="M30 31 L37 34 M50 31 L43 34" stroke="${OUT}" stroke-width="2.2"/>
    <ellipse cx="34" cy="36" rx="2.8" ry="2.4" fill="#ffd34d" ${SW}/><ellipse cx="46" cy="36" rx="2.8" ry="2.4" fill="#ffd34d" ${SW}/>
    <path d="M32 42 Q40 50 48 42 Z" fill="${OUT}"/><path d="M34 43 L36 46 L38 43.6 M42 43.6 L44 46 L46 43" fill="#fff"/>`;
  },
  dragon(c, b) {
    const wing = `<path d="M32 44 Q20 14 2 16 Q10 26 6 34 Q16 32 14 42 Q24 38 26 50 Z" fill="${c.wing}" ${SW2}/>`;
    return `<ellipse cx="40" cy="75" rx="26" ry="4" fill="rgba(0,0,0,.35)"/>
    ${wing}<g transform="translate(80 0) scale(-1 1)">${wing}</g>
    <path d="M56 66 Q74 70 76 56 L79 60 L76 50 Q70 64 56 60 Z" fill="${c.body}" ${SW}/>
    <ellipse cx="40" cy="58" rx="18" ry="15" fill="${c.body}" ${SW2}/>
    <ellipse cx="40" cy="61" rx="10" ry="10" fill="${c.belly}" ${SW}/>
    <ellipse cx="29" cy="72" rx="6" ry="3.4" fill="${c.body}" ${SW}/><ellipse cx="51" cy="72" rx="6" ry="3.4" fill="${c.body}" ${SW}/>
    <path d="M26 30 Q24 14 40 13 Q56 14 54 30 Q56 44 40 46 Q24 44 26 30 Z" fill="${c.body}" ${SW2}/>
    ${b ? crown(40, 15) : ''}
    <path d="M28 18 L22 4 L33 14 Z M52 18 L58 4 L47 14 Z" fill="${c.belly}" ${SW}/>
    <ellipse cx="40" cy="38" rx="9" ry="6" fill="${c.belly}" ${SW}/>
    <circle cx="36.5" cy="37" r="1.2" fill="${OUT}"/><circle cx="43.5" cy="37" r="1.2" fill="${OUT}"/>
    <path d="M30 26 L37 29 M50 26 L43 29" stroke="${OUT}" stroke-width="2"/>
    <ellipse cx="33" cy="30" rx="2.6" ry="2.3" fill="#ffd34d" ${SW}/><ellipse cx="47" cy="30" rx="2.6" ry="2.3" fill="#ffd34d" ${SW}/>`;
  },
  mimic(c, b) {
    return `<ellipse cx="40" cy="74" rx="28" ry="4" fill="rgba(0,0,0,.35)"/>
    <path d="M14 42 L18 14 L62 14 L66 42 Z" fill="${c.box}" ${SW2}/>
    <path d="M18 42 L22 22 L58 22 L62 42 Z" fill="#5a1020"/>
    <path d="M30 58 Q40 46 50 58 Z" fill="#ff6b8a"/>
    <rect x="14" y="42" width="52" height="30" rx="3" fill="${c.box}" ${SW2}/>
    <path d="M18 42 L21 50 L24 42 L27 50 L30 42 L33 50 L36 42 L39 50 L42 42 L45 50 L48 42 L51 50 L54 42 L57 50 L60 42 Z" fill="#fff" ${SW}/>
    <path d="M21 22 L24 30 L27 22 L30 30 L33 22 L36 30 L39 22 L42 30 L45 22 L48 30 L51 22 L54 30 L57 22 Z" fill="#fff" ${SW}/>
    <rect x="14" y="58" width="52" height="4" fill="${c.band}" ${SW}/><rect x="36" y="56" width="8" height="10" rx="2" fill="${c.band}" ${SW}/>
    <ellipse cx="30" cy="9" rx="5" ry="5" fill="#fff" ${SW}/><ellipse cx="50" cy="9" rx="5" ry="5" fill="#fff" ${SW}/>
    <circle cx="31" cy="10" r="2.2" fill="${OUT}"/><circle cx="51" cy="10" r="2.2" fill="${OUT}"/>
    ${b ? crown(40, 4) : ''}`;
  },
};

const IDLE_ANIM = { slime: 'squish', bat: 'float', ghost: 'float', demon: 'float', dragon: 'bob', mimic: 'chomp' };

function monSprite(m, opt = {}) {
  const inner = MON_SPRITES[m.sprite](m.colors, !!m.boss);
  const vb = opt.crop === 'head' ? '8 4 64 58' : '-4 -6 88 86';
  return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
}
