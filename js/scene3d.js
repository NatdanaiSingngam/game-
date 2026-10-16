'use strict';
// ===== ฉากต่อสู้ 3D (Three.js) =====
// โมเดล chibi low-poly วาดทับ "จุดยึด" .unit ใน DOM ทุกเฟรม
// → ระบบจัดตำแหน่ง/กล้องสลับตัว/อนิเมชั่น CSS/เลขดาเมจ/คลิกเลือกเป้า ใช้ของเดิมทั้งหมด

const S3 = (() => {
  const T = window.THREE;
  const GFX_KEY = 'mdb-gfx';
  let renderer = null, scene, camera, ground, hemi, sun, field = null, raf = 0, failed = false;
  let platE = null, platP = null, deco = null, platTick = 0;
  const models = new Map();
  const geoCache = {};

  // ---------- ตั้งค่า ----------
  function wants3d() { try { return localStorage.getItem(GFX_KEY) !== '2d'; } catch (e) { return true; } }
  function setMode(mode) { try { localStorage.setItem(GFX_KEY, mode); } catch (e) { /* ignore */ } }
  // โหลด Three.js ไม่ได้ → ใช้ภาพ 2D ตามเดิม
  if (!T) return { mount: () => false, sync() {}, supported: () => false, canWebGL: () => false, wants3d, setMode, stop() {} };

  let webgl = null;
  function canWebGL() {
    if (failed) return false;
    if (webgl === null) { try { const c = document.createElement('canvas'); webgl = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { webgl = false; } }
    return webgl;
  }
  function supported() { return wants3d() && canWebGL(); }

  // ---------- วัสดุ / รูปทรง ----------
  const G = {
    get sph1() { return geoCache.sph1 || (geoCache.sph1 = new T.IcosahedronGeometry(1, 1)); },
    get sph2() { return geoCache.sph2 || (geoCache.sph2 = new T.IcosahedronGeometry(1, 2)); },
    get ico0() { return geoCache.ico0 || (geoCache.ico0 = new T.IcosahedronGeometry(1, 0)); },
    get cyl() { return geoCache.cyl || (geoCache.cyl = new T.CylinderGeometry(1, 1, 1, 8)); },
    get cone() { return geoCache.cone || (geoCache.cone = new T.ConeGeometry(1, 1, 8)); },
    get box() { return geoCache.box || (geoCache.box = new T.BoxGeometry(1, 1, 1)); },
    get oct() { return geoCache.oct || (geoCache.oct = new T.OctahedronGeometry(1, 0)); },
    get torso() { return geoCache.torso || (geoCache.torso = new T.CylinderGeometry(0.13, 0.19, 0.26, 8)); },
    get robe() { return geoCache.robe || (geoCache.robe = new T.CylinderGeometry(0.13, 0.26, 0.44, 8)); },
    get capTop() { return geoCache.capTop || (geoCache.capTop = new T.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.34)); },
    get hairBack() { return geoCache.hairBack || (geoCache.hairBack = new T.SphereGeometry(1, 10, 8, Math.PI, Math.PI, 0, Math.PI * 0.78)); },
    get hairBob() { return geoCache.hairBob || (geoCache.hairBob = new T.SphereGeometry(1, 10, 8, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.86)); },
    get dome() { return geoCache.dome || (geoCache.dome = new T.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)); },
    get bowArc() { return geoCache.bowArc || (geoCache.bowArc = new T.TorusGeometry(0.3, 0.016, 4, 14, Math.PI)); },
    get ring() { return geoCache.ring || (geoCache.ring = new T.TorusGeometry(1, 0.08, 4, 16)); },
    get wing() {
      if (geoCache.wing) return geoCache.wing;
      const s = new T.Shape();
      s.moveTo(0, 0); s.lineTo(0.55, 0.28); s.lineTo(0.5, 0.05); s.lineTo(0.38, 0.12); s.lineTo(0.33, -0.05); s.lineTo(0.2, 0.04); s.lineTo(0.12, -0.12); s.lineTo(0, -0.05);
      return (geoCache.wing = new T.ShapeGeometry(s));
    },
  };

  function mat(color, o = {}) {
    const m = new T.MeshStandardMaterial({
      color, flatShading: o.flat !== false, roughness: o.rough == null ? 0.72 : o.rough, metalness: o.metal || 0,
      emissive: o.emissive || 0x000000, emissiveIntensity: o.ei == null ? 1 : o.ei,
      transparent: !!o.op, opacity: o.op || 1, side: o.double ? T.DoubleSide : T.FrontSide,
    });
    m.userData.base = m.color.clone();
    m.userData.em = m.emissive.clone();
    m.userData.op = o.op || 1;
    m.userData.fixed = !!o.emissive;
    return m;
  }

  // สร้างชิ้นส่วน: part(geo, mat, [x,y,z], [sx,sy,sz], [rx,ry,rz])
  function part(parent, geo, m, p = [0, 0, 0], s = [1, 1, 1], r = [0, 0, 0], shadow = true) {
    const mesh = new T.Mesh(geo, m);
    mesh.position.set(p[0], p[1], p[2]);
    if (typeof s === 'number') mesh.scale.setScalar(s); else mesh.scale.set(s[0], s[1], s[2]);
    mesh.rotation.set(r[0], r[1], r[2]);
    mesh.castShadow = shadow;
    parent.add(mesh);
    return mesh;
  }

  // ---------- ตัวละคร (สูง ~1, หันหน้า +z) ----------
  function buildChar(p) {
    const J = JOBS[p.job], o = J.look;
    const root = new T.Group(), g = new T.Group();
    root.add(g);
    const mats = [];
    const M = (c, opt) => { const m = mat(c, opt); mats.push(m); return m; };
    const skin = M(SKIN || '#ffe2cc', { rough: 0.8 }), hair = M(p.hair, { rough: 0.55 }), main = M(o.main), trim = M(o.trim, { rough: 0.5 });
    const pants = M(o.pants), shoe = M('#5a3a2a'), ink = M('#2a1e3a', { rough: 0.3 }), white = M('#ffffff', { emissive: 0x666666 });
    const metal = M('#dfe6ef', { metal: 0.6, rough: 0.3 }), wood = M('#8a5a32'), gold = M('#e8c35a', { metal: 0.5, rough: 0.35 });
    const robe = p.job === 'mage' || p.job === 'acolyte';

    // ขา + รองเท้า
    if (!robe) { part(g, G.cyl, pants, [-0.075, 0.13, 0], [0.055, 0.15, 0.055]); part(g, G.cyl, pants, [0.075, 0.13, 0], [0.055, 0.15, 0.055]); }
    part(g, G.sph1, shoe, [-0.075, 0.04, 0.02], [0.075, 0.05, 0.1]); part(g, G.sph1, shoe, [0.075, 0.04, 0.02], [0.075, 0.05, 0.1]);
    // ลำตัว
    if (robe) {
      part(g, G.robe, main, [0, 0.25, 0]);
      part(g, G.box, trim, [0, 0.27, 0.19], [0.05, 0.4, 0.02], [-0.25, 0, 0]);
    } else {
      part(g, G.torso, main, [0, 0.33, 0]);
      part(g, G.cyl, trim, [0, 0.235, 0], [0.18, 0.035, 0.18]);
      part(g, G.box, gold, [0, 0.235, 0.17], [0.045, 0.045, 0.02]);
    }
    // แขน + มือ
    part(g, G.cyl, main, [-0.2, 0.34, 0], [0.05, 0.17, 0.05], [0, 0, -0.3]);
    part(g, G.cyl, main, [0.2, 0.34, 0], [0.05, 0.17, 0.05], [0, 0, 0.3]);
    part(g, G.sph1, skin, [-0.235, 0.245, 0.02], 0.05); part(g, G.sph1, skin, [0.235, 0.245, 0.02], 0.05);
    // หัว + หน้า
    part(g, G.sph2, skin, [0, 0.67, 0], [0.27, 0.25, 0.25]);
    part(g, G.sph1, ink, [-0.09, 0.65, 0.225], [0.038, 0.055, 0.025]); part(g, G.sph1, ink, [0.09, 0.65, 0.225], [0.038, 0.055, 0.025]);
    part(g, G.sph1, white, [-0.1, 0.672, 0.243], 0.013, [0, 0, 0], false); part(g, G.sph1, white, [0.08, 0.672, 0.243], 0.013, [0, 0, 0], false);
    part(g, G.sph1, M('#ff8fa3', { op: 0.55 }), [-0.155, 0.6, 0.19], [0.04, 0.02, 0.01], [0, -0.5, 0], false);
    part(g, G.sph1, M('#ff8fa3', { op: 0.55 }), [0.155, 0.6, 0.19], [0.04, 0.02, 0.01], [0, 0.5, 0], false);
    // ผม
    const hs = (p.hairStyle || 0) % 4;
    part(g, G.capTop, hair, [0, 0.67, 0], [0.29, 0.29, 0.28]);
    part(g, hs === 1 ? G.hairBob : G.hairBack, hair, [0, 0.67, -0.01], [0.29, 0.28, 0.28]);
    [[-0.13, 0.79, 0.18], [0, 0.81, 0.21], [0.13, 0.79, 0.18]].forEach(([x, y, z]) => part(g, G.sph1, hair, [x, y, z], [0.1, 0.07, 0.06]));
    if (hs === 0) [[-0.16, 0.86, -0.05, 0.6], [-0.06, 0.93, -0.08, 0.2], [0.06, 0.93, -0.08, -0.2], [0.16, 0.86, -0.05, -0.6], [0, 0.88, -0.2, 0]].forEach(([x, y, z, rz]) => part(g, G.cone, hair, [x, y, z], [0.06, 0.16, 0.06], [-0.4, 0, rz]));
    if (hs === 2) part(g, G.cyl, hair, [0, 0.45, -0.12], [0.22, 0.38, 0.12]);
    if (hs === 3) { part(g, G.sph1, trim, [0, 0.78, -0.27], 0.05); part(g, G.cone, hair, [0, 0.6, -0.33], [0.075, 0.32, 0.075], [Math.PI + 0.3, 0, 0]); }
    // ของประจำอาชีพ
    jobGear(g, p.job, { M, o, main, trim, hair, metal, wood, gold, skin, white });

    root.userData.mats = mats;
    return root;
  }

  function jobGear(g, job, k) {
    const { M, o, trim, metal, wood, gold } = k;
    const right = new T.Group(); right.position.set(0.235, 0.245, 0.03); g.add(right);
    const left = new T.Group(); left.position.set(-0.235, 0.245, 0.03); g.add(left);
    switch (job) {
      case 'swordsman': {
        part(g, G.box, M('#c43c3c', { double: true }), [0, 0.28, -0.17], [0.34, 0.44, 0.02], [0.15, 0, 0]);
        part(g, G.sph1, metal, [-0.19, 0.45, 0], [0.09, 0.06, 0.09]); part(g, G.sph1, metal, [0.19, 0.45, 0], [0.09, 0.06, 0.09]);
        part(g, G.ring, metal, [0, 0.77, 0], [0.275, 0.275, 0.4], [Math.PI / 2, 0, 0]);
        part(g, G.sph1, M('#4fa3ff', { emissive: 0x1a4a8a }), [0, 0.8, 0.27], 0.03);
        const sw = new T.Group(); sw.rotation.z = -0.35; right.add(sw);
        part(sw, G.box, metal, [0, 0.22, 0], [0.04, 0.38, 0.014]);
        part(sw, G.box, gold, [0, 0.03, 0], [0.13, 0.025, 0.035]);
        part(sw, G.cyl, M('#6b4226'), [0, -0.03, 0], [0.018, 0.07, 0.018]);
        break;
      }
      case 'mage': {
        part(g, G.cyl, k.main, [0, 0.86, 0], [0.38, 0.02, 0.38]);
        part(g, G.cyl, trim, [0, 0.9, 0], [0.21, 0.045, 0.21]);
        part(g, G.cone, k.main, [0, 1.08, -0.04], [0.2, 0.42, 0.2], [-0.25, 0, 0]);
        part(right, G.cyl, wood, [0, 0.08, 0], [0.018, 0.62, 0.018]);
        part(right, G.sph2, M('#7ee3ff', { emissive: 0x2aa8c8, rough: 0.2 }), [0, 0.42, 0], 0.065);
        break;
      }
      case 'archer': {
        part(g, G.ring, trim, [0, 0.76, 0], [0.275, 0.275, 0.35], [Math.PI / 2, 0, 0]);
        part(g, G.cone, M('#ffffff'), [0.21, 0.9, -0.04], [0.035, 0.22, 0.015], [0, 0, -0.55]);
        const q = new T.Group(); q.position.set(0.07, 0.38, -0.17); q.rotation.z = 0.4; g.add(q);
        part(q, G.cyl, M('#8b5a2b'), [0, 0, 0], [0.06, 0.26, 0.06]);
        [-0.03, 0, 0.03].forEach(x => part(q, G.cone, M('#ffffff'), [x, 0.17, 0], [0.02, 0.07, 0.008], [0, 0, 0], false));
        part(left, G.bowArc, wood, [0, 0.1, 0], 1, [0, Math.PI / 2, -Math.PI / 2]);
        part(left, G.cyl, M('#eeeeee'), [0, 0.1, 0], [0.004, 0.6, 0.004], [0, 0, 0], false);
        break;
      }
      case 'acolyte': {
        part(g, G.capTop, trim, [0, 0.69, 0], [0.31, 0.3, 0.3]);
        part(g, G.sph1, gold, [0, 0.97, 0], 0.035);
        part(right, G.cyl, gold, [0, 0.1, 0], [0.014, 0.5, 0.014]);
        part(right, G.oct, M('#ffe56b', { emissive: 0xc9a227, rough: 0.3 }), [0, 0.4, 0], [0.07, 0.07, 0.03]);
        break;
      }
      case 'thief': {
        part(g, G.capTop, trim, [0, 0.69, 0], [0.31, 0.29, 0.3]);
        part(g, G.cone, trim, [0.05, 0.66, -0.29], [0.04, 0.16, 0.015], [Math.PI - 0.3, 0, -0.3]);
        part(g, G.cone, trim, [-0.05, 0.66, -0.29], [0.04, 0.16, 0.015], [Math.PI - 0.3, 0, 0.3]);
        part(g, G.box, trim, [0, 0.42, -0.16], [0.24, 0.14, 0.02], [0.1, 0, 0]);
        const d = new T.Group(); d.rotation.z = -0.6; right.add(d);
        part(d, G.cone, metal, [0, 0.12, 0], [0.025, 0.15, 0.012]);
        part(d, G.box, M('#555a66'), [0, 0.04, 0], [0.08, 0.018, 0.025]);
        break;
      }
      case 'merchant': {
        part(g, G.capTop, trim, [0, 0.7, 0], [0.3, 0.3, 0.29]);
        part(g, G.box, trim, [0, 0.79, 0.24], [0.22, 0.02, 0.1], [0.2, 0, 0]);
        part(g, G.box, M('#8a5a2f'), [0, 0.34, -0.2], [0.3, 0.24, 0.14]);
        part(g, G.box, gold, [0, 0.33, -0.27], [0.06, 0.05, 0.01]);
        part(right, G.cyl, wood, [0, 0.12, 0], [0.018, 0.48, 0.018]);
        part(right, G.box, metal, [0.06, 0.32, 0], [0.12, 0.11, 0.015]);
        break;
      }
    }
  }

  // ---------- มอนสเตอร์ (สูง ~1, หันหน้า +z) ----------
  function eyes(g, M, y, z, sx, s = 1, color = '#2a1e3a', glowHex = 0) {
    const e = M(color, glowHex ? { emissive: glowHex } : { rough: 0.3 }), w = M('#ffffff', { emissive: 0x777777 });
    [-sx, sx].forEach(x => {
      part(g, G.sph1, e, [x, y, z], [0.05 * s, 0.07 * s, 0.03 * s], [0, 0, 0], false);
      if (!glowHex) part(g, G.sph1, w, [x - 0.015 * s, y + 0.025 * s, z + 0.02 * s], 0.017 * s, [0, 0, 0], false);
    });
  }

  function crown3d(g, M, y) {
    const gold = M('#ffd34d', { metal: 0.6, rough: 0.3, emissive: 0x3a2a00 });
    part(g, G.cyl, gold, [0, y, 0], [0.17, 0.07, 0.17]);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; part(g, G.cone, gold, [Math.sin(a) * 0.15, y + 0.09, Math.cos(a) * 0.15], [0.04, 0.12, 0.04]); }
    part(g, G.oct, M('#ff4b6b', { emissive: 0x5a0010 }), [0, y + 0.01, 0.17], 0.035);
  }

  function buildMon(m) {
    const c = m.colors || {};
    const root = new T.Group(), g = new T.Group(); root.add(g);
    const mats = [];
    const M = (col, opt) => { const x = mat(col, opt); mats.push(x); return x; };
    const ink = '#2a1e3a';
    let top = 1;
    switch (m.sprite) {
      case 'slime': {
        part(g, G.sph2, M(c.body, { rough: 0.25, op: 0.93 }), [0, 0.38, 0], [0.5, 0.4, 0.47]);
        part(g, G.sph1, M('#ffffff', { op: 0.6, emissive: 0x999999 }), [-0.2, 0.62, 0.3], [0.12, 0.06, 0.05], [0, 0, 0.5], false);
        eyes(g, M, 0.45, 0.42, 0.13, 1.1);
        part(g, G.sph1, M(c.dark || ink), [0, 0.32, 0.45], [0.06, 0.035, 0.02], [0, 0, 0], false);
        if (!m.boss) part(g, G.cone, M('#6fd16f'), [0.02, 0.84, 0], [0.06, 0.16, 0.025], [0, 0, -0.3]);
        top = 0.8; break;
      }
      case 'mushroom': {
        part(g, G.cyl, M('#f6e7c8'), [0, 0.22, 0], [0.2, 0.44, 0.2]);
        eyes(g, M, 0.27, 0.19, 0.08, 0.8);
        part(g, G.cyl, M(dk(c.cap, 0.4)), [0, 0.43, 0], [0.48, 0.03, 0.48]);
        part(g, G.dome, M(c.cap, { rough: 0.45 }), [0, 0.43, 0], [0.5, 0.38, 0.5]);
        [[0.18, 0.72, 0.2], [-0.22, 0.65, 0.22], [0, 0.8, -0.1], [0.3, 0.55, -0.15], [-0.15, 0.62, -0.3], [0.05, 0.6, 0.38]].forEach(([x, y, z]) => part(g, G.sph1, M(c.spot || '#fff'), [x, y, z], 0.065, [0, 0, 0], false));
        top = 0.82; break;
      }
      case 'bat': {
        const body = M(c.body), wingM = M(c.wing, { double: true });
        part(g, G.sph2, body, [0, 0.55, 0], [0.2, 0.22, 0.19]);
        part(g, G.cone, body, [-0.1, 0.78, 0], [0.06, 0.14, 0.05], [0, 0, 0.3]); part(g, G.cone, body, [0.1, 0.78, 0], [0.06, 0.14, 0.05], [0, 0, -0.3]);
        part(g, G.wing, wingM, [0.12, 0.6, -0.02], 1, [0, -0.25, 0]);
        part(g, G.wing, wingM, [-0.12, 0.6, -0.02], [-1, 1, 1], [0, 0.25, 0]);
        eyes(g, M, 0.6, 0.17, 0.07, 0.8, '#ff4b4b', 0xcc0000);
        part(g, G.cone, M('#ffffff'), [-0.04, 0.47, 0.17], [0.015, 0.04, 0.01], [Math.PI, 0, 0], false); part(g, G.cone, M('#ffffff'), [0.04, 0.47, 0.17], [0.015, 0.04, 0.01], [Math.PI, 0, 0], false);
        top = 0.9; break;
      }
      case 'wolf': {
        const fur = M(c.body), light = M(c.light);
        part(g, G.sph2, fur, [0, 0.33, -0.1], [0.28, 0.22, 0.36]);
        [[-0.13, 0.12, 0.08], [0.13, 0.12, 0.08], [-0.13, 0.12, -0.25], [0.13, 0.12, -0.25]].forEach(p => part(g, G.cyl, fur, p, [0.05, 0.2, 0.05]));
        part(g, G.cone, fur, [0, 0.42, -0.48], [0.07, 0.3, 0.07], [-1.1, 0, 0]);
        part(g, G.sph2, fur, [0, 0.6, 0.18], [0.22, 0.2, 0.2]);
        part(g, G.sph1, light, [0, 0.54, 0.36], [0.1, 0.08, 0.12]);
        part(g, G.sph1, M('#2a2230', { rough: 0.3 }), [0, 0.58, 0.47], 0.035);
        part(g, G.cone, fur, [-0.12, 0.8, 0.16], [0.06, 0.15, 0.04], [0, 0, 0.3]); part(g, G.cone, fur, [0.12, 0.8, 0.16], [0.06, 0.15, 0.04], [0, 0, -0.3]);
        eyes(g, M, 0.65, 0.35, 0.085, 0.75, '#ffd34d', 0x8a6a00);
        top = 0.88; break;
      }
      case 'skeleton': {
        const bone = M(c.bone), cloth = M(c.cloth);
        part(g, G.cyl, bone, [-0.08, 0.13, 0], [0.025, 0.26, 0.025]); part(g, G.cyl, bone, [0.08, 0.13, 0], [0.025, 0.26, 0.025]);
        part(g, G.cyl, cloth, [0, 0.3, 0], [0.16, 0.14, 0.13]);
        part(g, G.cyl, bone, [0, 0.46, 0], [0.025, 0.25, 0.025]);
        [0.4, 0.46, 0.52].forEach((y, i) => part(g, G.box, bone, [0, y, 0.02], [0.24 - i * 0.02, 0.025, 0.12]));
        part(g, G.cyl, bone, [-0.17, 0.45, 0], [0.02, 0.24, 0.02], [0, 0, -0.4]); part(g, G.cyl, bone, [0.17, 0.45, 0], [0.02, 0.24, 0.02], [0, 0, 0.4]);
        part(g, G.sph2, bone, [0, 0.76, 0], [0.19, 0.18, 0.18]);
        part(g, G.box, bone, [0, 0.62, 0.06], [0.14, 0.05, 0.1]);
        part(g, G.sph1, M(ink), [-0.07, 0.77, 0.14], [0.05, 0.055, 0.04]); part(g, G.sph1, M(ink), [0.07, 0.77, 0.14], [0.05, 0.055, 0.04]);
        eyes(g, M, 0.77, 0.17, 0.07, 0.5, c.eye || '#ff4b4b', 0xaa2020);
        const sw = new T.Group(); sw.position.set(0.25, 0.33, 0.05); sw.rotation.z = -0.5; g.add(sw);
        part(sw, G.box, M('#c7cfdb', { metal: 0.6, rough: 0.3 }), [0, 0.18, 0], [0.04, 0.32, 0.014]);
        part(sw, G.box, M('#6b4226'), [0, 0.02, 0], [0.12, 0.025, 0.03]);
        top = 0.95; break;
      }
      case 'ghost': {
        const b = M(c.body, { op: 0.85, emissive: 0x223355, rough: 0.4 });
        part(g, G.sph2, b, [0, 0.6, 0], [0.34, 0.36, 0.32]);
        part(g, G.cone, b, [0, 0.28, -0.02], [0.33, 0.45, 0.3], [Math.PI, 0, 0]);
        part(g, G.sph1, b, [-0.33, 0.5, 0.05], [0.08, 0.06, 0.06]); part(g, G.sph1, b, [0.33, 0.5, 0.05], [0.08, 0.06, 0.06]);
        eyes(g, M, 0.66, 0.3, 0.11, 1.2);
        part(g, G.sph1, M(ink), [0, 0.5, 0.31], [0.05, 0.065, 0.03], [0, 0, 0], false);
        top = 0.96; break;
      }
      case 'orc': {
        const skin = M(c.skin), armor = M(c.armor), metal = M('#8a8f99', { metal: 0.6, rough: 0.35 });
        part(g, G.cyl, armor, [-0.1, 0.12, 0], [0.07, 0.24, 0.07]); part(g, G.cyl, armor, [0.1, 0.12, 0], [0.07, 0.24, 0.07]);
        part(g, G.torso, armor, [0, 0.4, 0], [2, 1.5, 1.7]);
        part(g, G.cyl, M('#e8c35a', { metal: 0.5, rough: 0.35 }), [0, 0.27, 0], [0.37, 0.04, 0.32]);
        part(g, G.sph1, skin, [-0.36, 0.38, 0.05], 0.08); part(g, G.sph1, skin, [0.36, 0.38, 0.05], 0.08);
        part(g, G.sph2, skin, [0, 0.72, 0.02], [0.25, 0.23, 0.23]);
        part(g, G.dome, metal, [0, 0.76, 0], [0.27, 0.22, 0.26]);
        if (!m.boss) { part(g, G.cone, M('#efe8d4'), [-0.2, 0.92, 0], [0.04, 0.16, 0.04], [0, 0, 0.6]); part(g, G.cone, M('#efe8d4'), [0.2, 0.92, 0], [0.04, 0.16, 0.04], [0, 0, -0.6]); }
        part(g, G.cone, skin, [-0.27, 0.72, 0], [0.05, 0.12, 0.03], [0, 0, 1.3]); part(g, G.cone, skin, [0.27, 0.72, 0], [0.05, 0.12, 0.03], [0, 0, -1.3]);
        eyes(g, M, 0.72, 0.21, 0.08, 0.7, '#ff4b4b', 0xaa1010);
        part(g, G.cone, M('#fffaf0'), [-0.07, 0.65, 0.2], [0.025, 0.07, 0.025]); part(g, G.cone, M('#fffaf0'), [0.07, 0.65, 0.2], [0.025, 0.07, 0.025]);
        const club = new T.Group(); club.position.set(0.4, 0.38, 0.05); club.rotation.z = -0.4; g.add(club);
        part(club, G.cyl, M('#7a4b2a'), [0, 0.15, 0], [0.04, 0.34, 0.04]);
        part(club, G.sph1, M('#6b4226'), [0, 0.35, 0], 0.1);
        top = 0.98; break;
      }
      case 'golem': {
        const rock = M(c.body, { rough: 0.95 }), glowC = new T.Color(c.glow || '#7ee3ff');
        part(g, G.box, rock, [-0.12, 0.12, 0], [0.14, 0.24, 0.16]); part(g, G.box, rock, [0.12, 0.12, 0], [0.14, 0.24, 0.16]);
        part(g, G.ico0, rock, [0, 0.45, 0], [0.42, 0.3, 0.3]);
        part(g, G.ico0, rock, [-0.43, 0.42, 0.04], [0.14, 0.22, 0.14]); part(g, G.ico0, rock, [0.43, 0.42, 0.04], [0.14, 0.22, 0.14]);
        part(g, G.box, rock, [0, 0.82, 0.02], [0.24, 0.2, 0.22]);
        const gm = M(c.glow || '#7ee3ff', { emissive: glowC.getHex(), rough: 0.3 });
        part(g, G.box, gm, [-0.06, 0.83, 0.13], [0.05, 0.03, 0.01], [0, 0, 0], false); part(g, G.box, gm, [0.06, 0.83, 0.13], [0.05, 0.03, 0.01], [0, 0, 0], false);
        part(g, G.oct, gm, [0, 0.45, 0.27], 0.06, [0, 0, 0], false);
        part(g, G.sph1, M('#6fae4a'), [0.2, 0.62, 0.15], [0.07, 0.03, 0.05], [0, 0, 0], false);
        top = 0.94; break;
      }
      case 'demon': {
        const b = M(c.body), horn = M(c.horn || '#2a1e3a', { double: true });
        part(g, G.cyl, b, [-0.07, 0.12, 0], [0.045, 0.22, 0.045]); part(g, G.cyl, b, [0.07, 0.12, 0], [0.045, 0.22, 0.045]);
        part(g, G.sph2, b, [0, 0.36, 0], [0.2, 0.2, 0.18]);
        part(g, G.sph2, b, [0, 0.68, 0], [0.22, 0.21, 0.2]);
        part(g, G.cone, horn, [-0.13, 0.9, 0], [0.05, 0.16, 0.05], [0, 0, 0.4]); part(g, G.cone, horn, [0.13, 0.9, 0], [0.05, 0.16, 0.05], [0, 0, -0.4]);
        part(g, G.wing, horn, [0.12, 0.45, -0.12], 1, [0, -0.5, 0.2]); part(g, G.wing, horn, [-0.12, 0.45, -0.12], [-1, 1, 1], [0, 0.5, -0.2]);
        part(g, G.cone, b, [0, 0.25, -0.28], [0.03, 0.3, 0.03], [-1.2, 0, 0]);
        eyes(g, M, 0.71, 0.18, 0.08, 0.7, '#ffd34d', 0x8a6a00);
        part(g, G.box, M(ink), [0, 0.6, 0.19], [0.1, 0.025, 0.02], [0, 0, 0], false);
        top = 0.95; break;
      }
      case 'dragon': {
        const b = M(c.body), belly = M(c.belly), wingM = M(c.wing, { double: true });
        part(g, G.sph2, b, [0, 0.36, -0.05], [0.32, 0.28, 0.36]);
        part(g, G.sph2, belly, [0, 0.36, 0.14], [0.2, 0.22, 0.18]);
        [[-0.15, 0.1, 0.12], [0.15, 0.1, 0.12], [-0.15, 0.1, -0.2], [0.15, 0.1, -0.2]].forEach(p => part(g, G.cyl, b, p, [0.07, 0.2, 0.07]));
        part(g, G.cone, b, [0, 0.3, -0.55], [0.1, 0.45, 0.1], [-1.3, 0, 0]);
        part(g, G.cyl, b, [0, 0.62, 0.12], [0.1, 0.25, 0.1], [0.4, 0, 0]);
        part(g, G.sph2, b, [0, 0.8, 0.2], [0.2, 0.16, 0.22]);
        part(g, G.sph1, belly, [0, 0.76, 0.36], [0.1, 0.07, 0.09]);
        part(g, G.cone, belly, [-0.1, 0.96, 0.15], [0.035, 0.14, 0.035], [-0.4, 0, 0.3]); part(g, G.cone, belly, [0.1, 0.96, 0.15], [0.035, 0.14, 0.035], [-0.4, 0, -0.3]);
        part(g, G.wing, wingM, [0.18, 0.5, -0.1], 1.25, [0, -0.6, 0.3]); part(g, G.wing, wingM, [-0.18, 0.5, -0.1], [-1.25, 1.25, 1.25], [0, 0.6, -0.3]);
        eyes(g, M, 0.84, 0.36, 0.08, 0.6, '#ffd34d', 0x8a6a00);
        top = 1.0; break;
      }
      case 'mimic': {
        const wood = M(c.box), band = M(c.band || '#e8c35a', { metal: 0.5, rough: 0.35 }), white = M('#fffaf0');
        part(g, G.box, wood, [0, 0.17, 0], [0.6, 0.34, 0.42]);
        part(g, G.box, M('#3a0a14'), [0, 0.34, 0.02], [0.54, 0.02, 0.36], [0, 0, 0], false);
        part(g, G.box, band, [0, 0.12, 0.215], [0.62, 0.04, 0.01]); part(g, G.box, band, [0, 0.2, 0.215], [0.08, 0.1, 0.01]);
        const lid = new T.Group(); lid.position.set(0, 0.34, -0.21); lid.rotation.x = -0.95; g.add(lid);
        part(lid, G.box, wood, [0, 0.04, 0.21], [0.6, 0.08, 0.42]);
        for (let i = 0; i < 6; i++) { part(g, G.cone, white, [-0.24 + i * 0.096, 0.38, 0.19], [0.03, 0.07, 0.02], [0, 0, 0], false); part(lid, G.cone, white, [-0.24 + i * 0.096, -0.02, 0.4], [0.03, 0.07, 0.02], [Math.PI, 0, 0], false); }
        part(g, G.sph1, M('#ff6b8a', { rough: 0.4 }), [0, 0.37, 0.05], [0.14, 0.04, 0.16], [0, 0, 0], false);
        [[-0.13, 0.6], [0.13, 0.6]].forEach(([x, y]) => { part(g, G.sph1, white, [x, y, 0.02], 0.07); part(g, G.sph1, M(ink), [x, y, 0.08], 0.03, [0, 0, 0], false); });
        top = 0.7; break;
      }
      default: part(g, G.sph2, M('#ff9cc4'), [0, 0.4, 0], [0.45, 0.4, 0.45]);
    }
    if (m.boss) crown3d(g, M, top + 0.04);
    if (m.elite) mats.forEach(x => { if (!x.userData.fixed) { x.emissive.set(0x2a1050); x.userData.em = x.emissive.clone(); } });
    root.userData.mats = mats;
    return root;
  }

  // ---------- เวที ----------
  function platform(color, color2, ringColor) {
    const grp = new T.Group();
    const top = new T.Mesh(new T.CylinderGeometry(1, 1.06, 0.16, 28), mat(color, { rough: 0.9 }));
    top.position.y = -0.08; top.receiveShadow = true; grp.add(top);
    const rim = new T.Mesh(new T.CylinderGeometry(1.07, 1.12, 0.1, 28), mat(color2, { rough: 0.95 }));
    rim.position.y = -0.17; rim.receiveShadow = true; grp.add(rim);
    // หญ้า/หินรอบขอบ
    for (let i = 0; i < 14; i++) {
      const a = i / 14 * Math.PI * 2 + (i % 2) * 0.2;
      const r = 0.92 + (i % 3) * 0.05;
      const tuft = new T.Mesh(i % 3 ? G.cone : G.ico0, mat(i % 3 ? ringColor : color2, { rough: 0.9 }));
      tuft.position.set(Math.cos(a) * r, i % 3 ? 0.04 : 0.02, Math.sin(a) * r);
      if (i % 3) tuft.scale.set(0.035, 0.1, 0.035); else tuft.scale.setScalar(0.05);
      tuft.castShadow = true; grp.add(tuft);
    }
    return grp;
  }

  function applyTheme(th) {
    if (platE) scene.remove(platE);
    if (platP) scene.remove(platP);
    platE = platform(th.plat, th.plat2, th.hill);
    platP = platform(th.plat, th.plat2, th.hill);
    scene.add(platE, platP);
    hemi.color.set(th.sky2); hemi.groundColor.set(th.g2);
    const warm = th.name === 'ปล่องลาวา';
    sun.color.set(warm ? '#ffc08a' : '#ffffff');
    sun.intensity = warm ? 1.05 : 0.95;
  }

  // ---------- ตั้งค่าเรนเดอร์ ----------
  function ensure() {
    if (renderer) return true;
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' }); }
    catch (e) { failed = true; return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.domElement.className = 'sc-3d';
    scene = new T.Scene();
    camera = new T.PerspectiveCamera(40, 16 / 9, 0.1, 400);
    camera.position.set(0, 4, 0);
    camera.rotation.x = -0.25;
    camera.updateMatrixWorld();
    hemi = new T.HemisphereLight(0xffffff, 0x445566, 0.75);
    scene.add(hemi, new T.AmbientLight(0xffffff, 0.18));
    sun = new T.DirectionalLight(0xffffff, 0.95);
    sun.position.set(-9, 18, -4);
    sun.target.position.set(0, 0, -14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 90 });
    sun.shadow.bias = -0.0015;
    scene.add(sun, sun.target);
    ground = new T.Mesh(new T.PlaneGeometry(400, 400), new T.ShadowMaterial({ opacity: 0.22 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    return true;
  }

  const ray = new T.Raycaster(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0);
  const nd = new T.Vector2(), hit = new T.Vector3(), pa = new T.Vector3(), pb = new T.Vector3();
  let W = 1, H = 1;

  function toWorld(px, py, out) {
    nd.set(px / W * 2 - 1, -(py / H) * 2 + 1);
    ray.setFromCamera(nd, camera);
    return ray.ray.intersectPlane(plane, out);
  }
  // ความสูง 1 หน่วยโลก ที่ตำแหน่ง P กินกี่พิกเซลบนจอ
  function pxPerUnit(P) {
    pa.copy(P).project(camera); pb.set(P.x, P.y + 1, P.z).project(camera);
    return Math.max(1e-3, (pb.y - pa.y) * H / 2);
  }

  function sizeCheck() {
    const w = field.clientWidth, h = field.clientHeight;
    if (!w || !h) return false;
    if (w !== W || h !== H) {
      W = w; H = h;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      platTick = 0;
    }
    return true;
  }

  // วางแท่นให้ตรงกับวงรีของฉาก 2D (.sc-plat)
  function placePlatform(mesh, el, fr) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2 - fr.left, cy = r.top + r.height / 2 - fr.top;
    const c = toWorld(cx, cy, new T.Vector3()), e = toWorld(r.left - fr.left + r.width * 0.02, cy, new T.Vector3());
    if (!c || !e) return false;
    mesh.position.copy(c);
    mesh.scale.setScalar(Math.max(0.5, c.distanceTo(e)));
    return true;
  }

  // ---------- ซิงก์โมเดลกับจุดยึด DOM ----------
  function sync(units) {
    if (!renderer || !field) return;
    units.forEach(u => {
      if (models.has(u.id)) return;
      const root = u.side === 'p' ? buildChar(u) : buildMon(u);
      root.rotation.order = 'YXZ';
      root.visible = false;
      scene.add(root);
      models.set(u.id, {
        root, side: u.side, node: null, key: '', deadAt: 0, scale: 1, phase: Math.random() * 6,
        footFrac: u.side === 'p' ? 0.955 : 0.93, hFrac: u.side === 'p' ? 0.74 : 0.7,
      });
    });
  }

  function removeModel(id, m) {
    scene.remove(m.root);
    m.root.traverse(o => { if (o.isMesh) o.material.dispose(); });
    models.delete(id);
  }

  function clearModels() { [...models.entries()].forEach(([id, m]) => removeModel(id, m)); }

  const ICE = new T.Color('#9fe3ff'), GREY = new T.Color('#777777'), RED = new T.Color('#ff2a2a');

  function applyState(m, st) {
    if (st === m.key) return;
    m.key = st;
    const hitOn = st.includes('h'), frozen = st.includes('f'), hidden = st.includes('x'), ko = st.includes('k');
    m.root.userData.mats.forEach(x => {
      x.color.copy(x.userData.base);
      if (frozen) x.color.lerp(ICE, 0.55);
      if (ko) x.color.lerp(GREY, 0.65);
      if (hitOn) { x.emissive.copy(RED); x.emissiveIntensity = 0.8; } else { x.emissive.copy(x.userData.em); x.emissiveIntensity = 1; }
      const op = (hidden ? 0.35 : 1) * x.userData.op;
      x.transparent = op < 1; x.opacity = op;
    });
  }

  function frame(t) {
    raf = requestAnimationFrame(frame);
    step(t);
  }

  // งานของ 1 เฟรม (แยกออกมาเพื่อเรียกเองได้ตอนทดสอบ)
  function step(t = performance.now()) {
    if (!field || !field.isConnected) { stop(); return; }
    if (!sizeCheck()) return;
    const fr = field.getBoundingClientRect();
    if (platTick-- <= 0) {
      const e = field.querySelector('.sc-plat.e'), p = field.querySelector('.sc-plat.p');
      const ok = (e ? placePlatform(platE, e, fr) : false) & (p ? placePlatform(platP, p, fr) : false);
      platTick = ok ? 20 : 0;
    }
    const look = platE ? platE.position : null;
    for (const [id, m] of models) {
      if (!m.node || !m.node.isConnected) m.node = field.querySelector(`.unit[data-uid="${id}"]`);
      if (!m.node) { removeModel(id, m); continue; }
      const n = m.node, cl = n.classList;
      const ko = cl.contains('ko'), dying = cl.contains('dying');
      const sprite = n.querySelector('.u-sprite');
      const r = (ko || dying ? n : sprite || n).getBoundingClientRect();
      if (!r.width || !r.height) { m.root.visible = false; continue; }
      const footY = ko ? r.bottom - fr.top - r.height * 0.05 : r.top - fr.top + r.height * m.footFrac;
      const P = toWorld(r.left - fr.left + r.width / 2, footY, hit);
      if (!P) { m.root.visible = false; continue; }
      if (!ko && !dying) m.scale = (r.height * m.hFrac) / pxPerUnit(P);
      m.root.position.copy(P);
      m.root.scale.setScalar(m.scale);
      m.root.visible = true;
      // หันหน้า: ฝั่งเราหันหาแท่นมอน, มอนหันหากล้อง
      const tx = m.side === 'p' ? (look ? look.x : 0) : camera.position.x;
      const tz = m.side === 'p' ? (look ? look.z : -20) : camera.position.z;
      const sway = Math.sin(t / 900 + m.phase) * 0.05;
      m.root.rotation.y = Math.atan2(tx - P.x, tz - P.z) + sway;
      m.root.rotation.x = ko ? -1.35 : 0;
      if (dying) {
        if (!m.deadAt) m.deadAt = t;
        const k = Math.min(1, (t - m.deadAt) / 650);
        m.root.userData.mats.forEach(x => { x.transparent = true; x.opacity = (1 - k) * x.userData.op; });
        m.root.rotation.z = k * 0.6;
        m.key = 'dying';
        continue;
      }
      applyState(m, (n.querySelector('.u-body.hit') ? 'h' : '') + (cl.contains('frozen') ? 'f' : '') + (cl.contains('hidden-fx') ? 'x' : '') + (ko ? 'k' : ''));
    }
    renderer.render(scene, camera);
  }

  function start() { if (!raf) raf = requestAnimationFrame(frame); }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  // ติดตั้งลงฉาก (เรียกทุกครั้งที่ renderBattle สร้างฉากใหม่)
  function mount(el, th) {
    if (!el || !supported() || !ensure()) return false;
    field = el;
    el.classList.add('three');
    const stage = el.querySelector('.stage');
    el.insertBefore(renderer.domElement, stage);
    clearModels();
    applyTheme(th);
    W = H = 0; platTick = 0;
    sizeCheck();
    start();
    return true;
  }

  // สำหรับตรวจสอบ: ตำแหน่งแท่น/กล้อง/โมเดล
  function debug(only) {
    const r = v => v && [+v.x.toFixed(2), +v.y.toFixed(2), +v.z.toFixed(2)];
    return { cam: r(camera && camera.position), platE: r(platE && platE.position), platP: r(platP && platP.position),
      models: [...models].filter(([id]) => !only || id === only).slice(0, 6).map(([id, m]) => ({ id, pos: r(m.root.position), rotY: +m.root.rotation.y.toFixed(2), s: +m.scale.toFixed(2), ppu: m.root.position && +pxPerUnit(m.root.position).toFixed(1), vis: m.root.visible })) };
  }

  return { mount, sync, supported, canWebGL, wants3d, setMode, stop, debug, step };
})();
