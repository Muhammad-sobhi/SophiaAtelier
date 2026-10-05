// Three.js scene for the shop game. Imperative on purpose: React owns the HUD and the real
// stage modals; this module owns the 3D shop, the characters and their animations.
//
// sync(entries, events) is the only way data comes in. Each entry says where a bride is:
//   { id, name, look, dress, actor: 'queue'|'fitting'|'home'|'returnDoor'|null,
//     key: bool, mannequin: bool, order, keyTag, vitTag, chip }
// `events` ({ [id]: { type } }) plays the transition for brides that just moved.
import * as THREE from 'three';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const easeOutBack = (k) => { const c = 1.70158; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const lerpAng = (a, b, t) => { const d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const FONT = '"IBM Plex Sans Arabic", "Inter", system-ui, sans-serif';
const DISPLAY = '"Lalezar", "IBM Plex Sans Arabic", system-ui, sans-serif';
const SCRIPT = '"Parisienne", cursive';

const LANE = 6.05;
const ENTER = [[-3.5, LANE], [-3.5, 4.6], [-3.5, 3.1]];
const HOUSES = [-14, -9.5, -4.8, 0, 4.8, 9.5, 14];
const CAPS = { queue: 9, fitting: 5, returnDoor: 7, homePerHouse: 3, keys: 24, mannequins: 5 };
const visitSlot = (i) => [-4.4 - i * 1.0, 5.25];
const fittingSlot = (i) => [5.8 - i * 0.95, -2.25];
const cashSlot = (i) => [3.95 - i * 0.95, 0.4];
const retSlot = (i) => [5.3 + i * 1.0, 5.25];
const VIT_X = [-2.5, -1.25, 0, 1.25, 2.5];

export const VIEWS = {
  shop: { t: V(0, 0.2, 0.6), r: 20, th: 0, ph: 0.82 },
  cabinet: { t: V(-6.5, 1.5, -1.2), r: 5.4, th: 1.25, ph: 1.22 },
  vitrine: { t: V(0, 1.1, -4.0), r: 7.2, th: 0.04, ph: 1.12 },
  cashier: { t: V(4.2, 1, 0.4), r: 6.8, th: -0.85, ph: 1.08 },
  fitting: { t: V(5.6, 1.1, -3.0), r: 7.5, th: -0.6, ph: 1.0 },
  returns: { t: V(5.4, 0.8, 5), r: 8, th: 0.35, ph: 1.0 },
  street: { t: V(0, 0.6, 8.6), r: 19, th: 0, ph: 0.62 },
};

const PROF = {
  ball: [[0.01, 0], [0.74, 0.02], [0.68, 0.22], [0.52, 0.55], [0.3, 0.88], [0.18, 1.02], [0.19, 1.18], [0.21, 1.32], [0.16, 1.42], [0.06, 1.47], [0.01, 1.48]],
  aline: [[0.01, 0], [0.56, 0.02], [0.49, 0.35], [0.33, 0.75], [0.18, 1.02], [0.19, 1.18], [0.21, 1.32], [0.16, 1.42], [0.06, 1.47], [0.01, 1.48]],
  mermaid: [[0.01, 0], [0.62, 0.02], [0.44, 0.12], [0.23, 0.42], [0.21, 0.72], [0.17, 1.0], [0.19, 1.18], [0.21, 1.32], [0.16, 1.42], [0.06, 1.47], [0.01, 1.48]],
  boho: [[0.01, 0], [0.52, 0.02], [0.47, 0.3], [0.35, 0.7], [0.2, 0.98], [0.18, 1.06], [0.2, 1.2], [0.21, 1.32], [0.16, 1.42], [0.06, 1.47], [0.01, 1.48]],
  casual: [[0.01, 0.3], [0.33, 0.32], [0.31, 0.5], [0.25, 0.82], [0.18, 1.02], [0.19, 1.18], [0.21, 1.32], [0.16, 1.42], [0.06, 1.47], [0.01, 1.48]],
};

function rr(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }

export function createShopWorld({ canvas, chipLayer, floatLayer, onPick, onZone }) {
  const disposables = [];
  const track = (o) => { disposables.push(o); return o; };

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

  function canvasTex(w, h, draw, rep) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'); draw(x, w, h);
    const t = track(new THREE.CanvasTexture(c));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
    t.userData = { c, x };
    return t;
  }

  scene.background = canvasTex(4, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#8cc4ea'); g.addColorStop(0.55, '#cfe3f2'); g.addColorStop(1, '#fbe1d6'); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  scene.fog = new THREE.Fog('#f2dcd8', 38, 80);
  scene.add(new THREE.HemisphereLight('#fff3f5', '#8a6672', 2.3));
  const sun = new THREE.DirectionalLight('#fff1de', 2.4);
  sun.position.set(9, 18, 13); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 60 });
  sun.shadow.bias = -0.0006; scene.add(sun);
  const warm = new THREE.PointLight('#ffd9b0', 1.2, 16, 0); warm.position.set(0, 3.2, -0.5); scene.add(warm);

  const matCache = {};
  function M(c, p = {}) { const k = c + JSON.stringify(p); if (matCache[k]) return matCache[k]; return (matCache[k] = track(new THREE.MeshStandardMaterial({ color: c, roughness: 0.82, metalness: 0, ...p }))); }
  function mesh(g, m, x = 0, y = 0, z = 0, par = scene, cast = true) { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = cast; o.receiveShadow = true; par.add(o); return o; }
  const box = (w, h, d, m, x, y, z, par, cast) => mesh(new THREE.BoxGeometry(w, h, d), m, x, y, z, par, cast);
  const cyl = (rt, rb, h, m, x, y, z, par, seg = 24) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m, x, y, z, par);
  const sph = (r, m, x, y, z, par, seg = 20) => mesh(new THREE.SphereGeometry(r, seg, Math.max(8, (seg * 0.7) | 0)), m, x, y, z, par);
  const GOLD = M('#d9a83e', { metalness: 0.75, roughness: 0.3 });
  const BRASS = M('#c99a3a', { metalness: 0.8, roughness: 0.35 });
  const WOOD = M('#8a5a3c', { roughness: 0.65 });
  const WOOD_D = M('#5e3a27', { roughness: 0.6 });
  const WHITE = M('#fbf6f2');
  const GLASS = track(new THREE.MeshStandardMaterial({ color: '#dff1f7', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }));
  const INVISIBLE = track(new THREE.MeshBasicMaterial({ visible: false }));

  const floorTex = canvasTex(512, 512, (x, w) => { const n = 4, s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? '#efe2dc' : '#fbf5f1'; x.fillRect(i * s, j * s, s, s); } x.strokeStyle = 'rgba(160,130,130,.18)'; x.lineWidth = 1.2; for (let k = 0; k < 14; k++) { x.beginPath(); let px = Math.random() * w, py = Math.random() * w; x.moveTo(px, py); for (let q = 0; q < 5; q++) { px += rand(-40, 40); py += rand(-40, 40); x.lineTo(px, py); } x.stroke(); } x.strokeStyle = 'rgba(201,154,58,.35)'; x.lineWidth = 2; for (let i = 0; i <= n; i++) { x.beginPath(); x.moveTo(i * s, 0); x.lineTo(i * s, w); x.stroke(); x.beginPath(); x.moveTo(0, i * s); x.lineTo(w, i * s); x.stroke(); } }, [3.5, 2.25]);
  const wallTex = canvasTex(256, 256, (x, w) => { x.fillStyle = '#f5d5db'; x.fillRect(0, 0, w, w); x.fillStyle = '#efc4cd'; for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const cx = i * 128 + 64, cy = j * 128 + 64; x.beginPath(); x.ellipse(cx, cy, 18, 34, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(cx, cy, 34, 10, 0, 0, 7); x.fill(); } }, [10, 3]);
  const laceTex = canvasTex(256, 256, (x, w) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, w); x.strokeStyle = '#e3dbd8'; x.lineWidth = 2; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const cx = i * 64 + 32 + (j % 2) * 32, cy = j * 64 + 32; for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; x.beginPath(); x.arc(cx + Math.cos(a) * 8, cy + Math.sin(a) * 8, 6, 0, 7); x.stroke(); } } }, [10, 5]);
  const awnTex = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#fff6f2' : '#e0577c'; x.fillRect(i * 32, 0, 32, h); } }, [3, 1]);
  const rugTex = canvasTex(512, 512, (x, w) => { const c = w / 2; const g = x.createRadialGradient(c, c, 10, c, c, c); g.addColorStop(0, '#c8607f'); g.addColorStop(0.7, '#a2405f'); g.addColorStop(0.72, '#e9b949'); g.addColorStop(0.76, '#a2405f'); g.addColorStop(1, '#8a3350'); x.fillStyle = g; x.beginPath(); x.arc(c, c, c, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,224,143,.6)'; x.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; x.beginPath(); x.ellipse(c + Math.cos(a) * 120, c + Math.sin(a) * 120, 30, 12, a, 0, 7); x.stroke(); } });

  function plaque(text, w = 2, h = 0.42, bg = '#26142c', fg = '#ffe08f', font = DISPLAY) {
    const t = canvasTex(512, Math.round((512 * h) / w), (x, W, H) => { rr(x, 4, 4, W - 8, H - 8, 22); x.fillStyle = bg; x.fill(); x.lineWidth = 6; x.strokeStyle = '#e9b949'; x.stroke(); x.fillStyle = fg; x.font = `${Math.round(H * 0.52)}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(text, W / 2, H / 2 + 4); });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), track(new THREE.MeshBasicMaterial({ map: t, transparent: true })));
  }

  // ---------------- world ----------------
  const pickables = [];
  const zoneHit = (o, zone) => { o.userData.zone = zone; pickables.push(o); return o; };
  const trees = [], lampMats = [], doors = [], cars = [];
  const walls = {};
  const laundryPos = V(6.3, 0.6, 2.3);

  mesh(new THREE.PlaneGeometry(140, 140), M('#a9d08f'), 0, -0.02, 0, scene, false).rotation.x = -Math.PI / 2;
  box(60, 0.12, 2.6, M('#eadfd2'), 0, 0.06, 5.3, scene, false);
  box(60, 0.14, 0.18, M('#d2c3b4'), 0, 0.07, 6.62, scene, false);
  box(60, 0.04, 3.6, M('#5c5461'), 0, 0.02, 8.4, scene, false);
  for (let i = -28; i < 29; i += 2.4) if (Math.abs(i) >= 1.8) box(1.2, 0.01, 0.1, M('#f7efe2'), i, 0.045, 8.4, scene, false);
  for (let i = 0; i < 7; i++) box(0.34, 0.01, 3.2, M('#f7f2ea'), -1.05 + i * 0.35, 0.045, 8.4, scene, false);
  box(60, 0.14, 0.18, M('#d2c3b4'), 0, 0.07, 10.25, scene, false);
  box(60, 0.12, 1.6, M('#eadfd2'), 0, 0.06, 11.1, scene, false);
  const HC = ['#f4d6a8', '#cfe1f1', '#f7c9c9', '#d8ecd2', '#e8d5f2', '#f9e2b9', '#cfe7e6'];
  HOUSES.forEach((hx, i) => {
    const g = new THREE.Group(); g.position.set(hx, 0, 13.6); scene.add(g);
    box(2.8, 2, 2.2, M(HC[i % HC.length]), 0, 1, 0, g);
    const roof = mesh(new THREE.ConeGeometry(2.25, 1.2, 4), M(['#c0566e', '#7a5aa8', '#3f7a8c', '#b9772e'][i % 4]), 0, 2.6, 0, g); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.82);
    box(0.62, 1.1, 0.06, WOOD_D, 0, 0.55, 1.11, g);
    [-0.9, 0.9].forEach((wx) => { box(0.55, 0.5, 0.05, M('#fff1b8', { emissive: '#ffd36b', emissiveIntensity: 0.25 }), wx, 1.25, 1.11, g); box(0.65, 0.06, 0.08, WHITE, wx, 0.98, 1.13, g); });
    box(0.8, 0.04, 1.2, M('#e0d3c4'), 0, 0.03, 1.7, g, false);
  });
  [[-11.5, 5.9], [11.5, 5.9], [-8, 11.1], [-2.8, 11.1], [2.8, 11.1], [8, 11.1], [-15, 11.1], [15, 11.1]].forEach(([x, z], i) => {
    const t = new THREE.Group(); t.position.set(x, 0, z); scene.add(t); cyl(0.09, 0.13, 1.3, WOOD, 0, 0.65, 0, t, 8);
    const fm = M(['#7cb26a', '#8cc274', '#6aa35d'][i % 3]); sph(0.75, fm, 0, 1.75, 0, t, 12); sph(0.55, fm, 0.35, 2.25, 0.1, t, 12); sph(0.5, fm, -0.35, 2.1, -0.15, t, 12); trees.push(t);
  });
  [[-7.6, 6.3], [7.6, 6.3], [-12, 10.6], [12, 10.6]].forEach(([x, z]) => { cyl(0.05, 0.07, 3, M('#3b2b40'), x, 1.5, z, scene, 8); const l = sph(0.17, M('#fff4d0', { emissive: '#ffd98a', emissiveIntensity: 0.6 }), x, 3.05, z, scene, 12); lampMats.push(l.material); });

  // shop shell
  mesh(new THREE.PlaneGeometry(14, 9), track(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.05 })), 0, 0.012, -0.5, scene, false).rotation.x = -Math.PI / 2;
  box(14.5, 3.5, 0.25, track(new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9 })), 0, 1.75, -5.12);
  walls.L = box(0.25, 3.5, 9.3, track(new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, transparent: true })), -7.12, 1.75, -0.5);
  walls.R = box(0.25, 3.5, 9.3, track(new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.9, transparent: true })), 7.12, 1.75, -0.5);
  [[0, -4.98, 14, 0], [-6.98, -0.5, 9, 1], [6.98, -0.5, 9, 1]].forEach(([x, z, l, side]) => { const w = side ? 0.06 : l, d = side ? l : 0.06; box(w, 1, d, WHITE, x, 0.5, z, scene, false); box(w + 0.02, 0.06, d + 0.02, GOLD, x, 1.02, z, scene, false); box(w + 0.04, 0.12, d + 0.04, GOLD, x, 3.46, z, scene, false); });
  const plum = M('#3a1f43', { roughness: 0.5 });
  const segs = [[-7.25, -4.3], [-2.7, 3.7], [5.3, 7.25]];
  segs.forEach(([a, b]) => { const w = b - a, cx = (a + b) / 2; box(w, 0.5, 0.3, plum, cx, 0.25, 4); mesh(new THREE.BoxGeometry(w, 2.3, 0.04), GLASS, cx, 1.65, 4, scene, false); for (let x = a; x <= b + 0.01; x += w / Math.max(1, Math.round(w / 1.6))) box(0.07, 2.3, 0.12, GOLD, x, 1.65, 4, scene, false); box(w, 0.08, 0.14, GOLD, cx, 0.52, 4, scene, false); });
  box(14.5, 0.7, 0.35, plum, 0, 3.15, 4); box(14.5, 0.05, 0.4, GOLD, 0, 2.8, 4, scene, false); box(14.5, 0.05, 0.4, GOLD, 0, 3.5, 4, scene, false);
  [[-4.3, -2.7], [3.7, 5.3]].forEach(([a, b]) => { box(0.1, 2.8, 0.3, GOLD, a, 1.4, 4); box(0.1, 2.8, 0.3, GOLD, b, 1.4, 4); });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 0.62), track(new THREE.MeshBasicMaterial({ transparent: true, map: canvasTex(1024, 138, (x, W, H) => { x.fillStyle = '#3a1f43'; x.fillRect(0, 0, W, H); x.fillStyle = '#ffe08f'; x.shadowColor = '#ffcf5c'; x.shadowBlur = 18; x.font = `96px ${SCRIPT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Sophia Dresses', W / 2, H / 2 + 6); }) })));
  sign.position.set(0.5, 3.15, 4.19); scene.add(sign);
  segs.forEach(([a, b]) => { const w = b - a - 0.2; const t = awnTex.clone(); t.repeat.set(w / 1.2, 1); t.needsUpdate = true; track(t); const aw = mesh(new THREE.PlaneGeometry(w, 1), track(new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.9 })), (a + b) / 2, 2.6, 4.45); aw.rotation.x = -1.0; });
  function makeDoor(hx, w, dir, cx) {
    const piv = new THREE.Group(); piv.position.set(hx, 0, 4); scene.add(piv);
    const leaf = new THREE.Group(); leaf.position.x = (dir * w) / 2; piv.add(leaf);
    mesh(new THREE.BoxGeometry(w - 0.06, 2.3, 0.04), GLASS, 0, 1.2, 0, leaf, false);
    box(w, 0.08, 0.07, GOLD, 0, 0.06, 0, leaf, false); box(w, 0.08, 0.07, GOLD, 0, 2.36, 0, leaf, false); box(0.06, 2.3, 0.07, GOLD, -w / 2 + 0.03, 1.2, 0, leaf, false); box(0.06, 2.3, 0.07, GOLD, w / 2 - 0.03, 1.2, 0, leaf, false);
    cyl(0.02, 0.02, 0.5, BRASS, dir * (w / 2 - 0.15), 1.15, 0.06, leaf, 8);
    return { piv, dir, x: cx, ang: 0 };
  }
  doors.push(makeDoor(-4.3, 0.8, 1, -3.5), makeDoor(-2.7, 0.8, -1, -3.5), makeDoor(5.3, 1.6, -1, 4.5));
  const pIn = plaque('الدخول', 1.3, 0.34); pIn.position.set(-3.5, 2.62, 4.2); scene.add(pIn);
  const pRet = plaque('باب الإرجاع', 1.5, 0.34, '#f39a4c', '#26142c'); pRet.position.set(4.5, 2.62, 4.2); scene.add(pRet);
  zoneHit(mesh(new THREE.BoxGeometry(1.6, 2.4, 0.6), INVISIBLE, 4.5, 1.2, 4, scene, false), 'returns');
  box(1.4, 0.02, 0.8, M('#c8607f'), -3.5, 0.07, 4.9, scene, false);
  box(1.4, 0.02, 0.8, M('#f39a4c'), 4.5, 0.07, 4.9, scene, false);
  mesh(new THREE.CircleGeometry(1.9, 48), track(new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1 })), -0.6, 0.02, 0.6, scene, false).rotation.x = -Math.PI / 2;
  const sofa = new THREE.Group(); sofa.position.set(-5.9, 0, 2.1); sofa.rotation.y = Math.PI / 2; scene.add(sofa);
  const vel = M('#c24f74', { roughness: 0.95 });
  box(2, 0.42, 0.8, vel, 0, 0.35, 0, sofa); box(2, 0.7, 0.2, vel, 0, 0.75, -0.32, sofa); box(0.2, 0.55, 0.8, vel, -1, 0.5, 0, sofa); box(0.2, 0.55, 0.8, vel, 1, 0.5, 0, sofa);
  cyl(0.4, 0.4, 0.05, M('#ffffff'), -4.7, 0.55, 2.1); cyl(0.04, 0.04, 0.52, GOLD, -4.7, 0.27, 2.1, scene, 8);
  cyl(0.07, 0.05, 0.22, M('#9fd0e0'), -4.7, 0.68, 2.1, scene, 12);
  [0, 1, 2, 3, 4].forEach((i) => sph(0.06, M(['#ff9fb6', '#ffd36b', '#ffffff'][i % 3]), -4.7 + Math.cos(i) * 0.08, 0.84 + (i % 2) * 0.05, 2.1 + Math.sin(i) * 0.08, scene, 8));
  [[-6.5, 3.4], [6.55, 3.4], [-6.5, -4.5]].forEach(([x, z]) => { cyl(0.25, 0.18, 0.45, M('#f6efe8'), x, 0.22, z, scene, 12); const pm = M('#5f9e5a'); sph(0.38, pm, x, 0.75, z, scene, 10); sph(0.28, pm, x + 0.15, 1.05, z - 0.05, scene, 10); sph(0.24, pm, x - 0.12, 1.1, z + 0.1, scene, 10); });
  cyl(0.38, 0.3, 0.6, M('#c9a06a', { roughness: 1 }), 6.3, 0.3, 2.3, scene, 16);
  for (let i = 0; i < 4; i++) box(0.79, 0.02, 0.79, M('#a37b47'), 6.3, 0.1 + i * 0.15, 2.3, scene, false);
  const pL = plaque('غسيل', 0.7, 0.22, '#fff8f3', '#26142c', FONT); pL.position.set(6.3, 0.72, 2.72); scene.add(pL);

  // cabinet
  const cab = { open: 0, openUntil: 0 };
  const hookPos = (i) => { const col = i % 6, row = Math.floor(i / 6) % 4; return V(-6.62, [2.3, 1.74, 1.18, 0.62][row], -1.2 + (col - 2.5) * 0.52); };
  {
    const g = new THREE.Group(); scene.add(g);
    box(0.12, 2.8, 3.3, M('#4a2350', { roughness: 1 }), -6.92, 1.55, -1.2, g);
    box(0.6, 0.16, 3.5, WOOD, -6.72, 0.08, -1.2, g); box(0.66, 0.2, 3.56, WOOD, -6.72, 3.0, -1.2, g); box(0.7, 0.08, 3.62, GOLD, -6.72, 3.12, -1.2, g);
    box(0.6, 2.9, 0.12, WOOD, -6.72, 1.55, -2.9, g); box(0.6, 2.9, 0.12, WOOD, -6.72, 1.55, 0.5, g);
    [2.55, 1.99, 1.43, 0.87].forEach((y) => box(0.05, 0.05, 3.1, BRASS, -6.66, y, -1.2, g, false));
    for (let i = 0; i < 24; i++) { const p = hookPos(i); const h = cyl(0.018, 0.018, 0.12, BRASS, -6.6, p.y + 0.24, p.z, g, 6); h.rotation.z = Math.PI / 2; }
    cab.doors = [-2.86, 0.46].map((pz, i) => {
      const piv = new THREE.Group(); piv.position.set(-6.4, 0, pz); g.add(piv); const dir = i ? -1 : 1;
      const leaf = new THREE.Group(); leaf.position.z = dir * 0.83; piv.add(leaf);
      mesh(new THREE.BoxGeometry(0.03, 2.6, 1.56), GLASS, 0, 1.55, 0, leaf, false);
      box(0.06, 0.08, 1.66, WOOD_D, 0, 0.27, 0, leaf, false); box(0.06, 0.08, 1.66, WOOD_D, 0, 2.83, 0, leaf, false); box(0.06, 2.6, 0.08, WOOD_D, 0, 1.55, -0.79, leaf, false); box(0.06, 2.6, 0.08, WOOD_D, 0, 1.55, 0.79, leaf, false);
      sph(0.04, BRASS, 0.06, 1.5, -dir * 0.68, leaf, 8);
      return { piv, dir };
    });
    const p = plaque('دولاب المفاتيح', 2, 0.4); p.position.set(-6.36, 3.0, -1.2); p.rotation.y = Math.PI / 2; g.add(p);
    zoneHit(mesh(new THREE.BoxGeometry(0.7, 3, 3.4), INVISIBLE, -6.6, 1.5, -1.2, g, false), 'cabinet');
  }

  // vitrine
  const spots = [];
  {
    box(6.6, 0.26, 1.35, M('#fff6f2', { roughness: 0.4 }), 0, 0.13, -4.35); box(6.62, 0.04, 1.37, GOLD, 0, 0.27, -4.35, scene, false);
    box(6.6, 0.05, 0.03, M('#ffffff', { emissive: '#ffd9a8', emissiveIntensity: 1 }), 0, 0.2, -3.67, scene, false);
    const sh = new THREE.Shape(); sh.moveTo(-3.3, 0); sh.lineTo(-3.3, 2.4); sh.quadraticCurveTo(-3.3, 3.3, 0, 3.3); sh.quadraticCurveTo(3.3, 3.3, 3.3, 2.4); sh.lineTo(3.3, 0); sh.lineTo(-3.3, 0);
    mesh(new THREE.ShapeGeometry(sh, 24), M('#e7a7b6', { roughness: 0.9 }), 0, 0.1, -4.96, scene, false);
    mesh(new THREE.BoxGeometry(6.6, 0.9, 0.04), GLASS, 0, 0.72, -3.66, scene, false); box(6.62, 0.05, 0.07, GOLD, 0, 1.17, -3.66, scene, false);
    const p = plaque('الفاترينة', 1.6, 0.4); p.position.set(0, 3.05, -4.9); scene.add(p);
    VIT_X.forEach((x) => { const s = new THREE.SpotLight('#fff1dc', 0, 7, 0.42, 0.6, 0); s.position.set(x, 3.4, -3.2); s.target.position.set(x, 0.3, -4.35); scene.add(s, s.target); cyl(0.06, 0.09, 0.16, GOLD, x, 3.4, -3.2, scene, 10); spots.push(s); });
    zoneHit(mesh(new THREE.BoxGeometry(6.6, 3.2, 1.4), INVISIBLE, 0, 1.6, -4.35, scene, false), 'vitrine');
  }

  // cashier
  const till = { pos: V(4.95, 1.4, -0.05) };
  {
    const g = new THREE.Group(); g.position.set(4.95, 0, 0.4); scene.add(g);
    box(0.95, 1.02, 2.3, M('#f6dfe4', { roughness: 0.6 }), 0, 0.51, 0, g); box(1.05, 0.07, 2.42, M('#fbf7f4', { roughness: 0.25, metalness: 0.05 }), 0, 1.06, 0, g);
    box(0.02, 0.7, 2, M('#e9b949', { metalness: 0.6, roughness: 0.3 }), -0.48, 0.52, 0, g, false);
    const reg = new THREE.Group(); reg.position.set(0, 1.1, -0.45); g.add(reg);
    box(0.5, 0.16, 0.42, M('#3a1f43'), 0, 0.08, 0, reg);
    till.drawer = box(0.4, 0.08, 0.36, M('#4f2e58'), 0, 0.04, 0, reg);
    till.tex = canvasTex(256, 128, (x, W, H) => drawTill(x, W, H, 'أهلاً'));
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.18), track(new THREE.MeshBasicMaterial({ map: till.tex }))); scr.position.set(-0.02, 0.42, 0); scr.rotation.y = -Math.PI / 2; reg.add(scr);
    box(0.04, 0.22, 0.4, M('#3a1f43'), 0, 0.42, 0, reg, false);
    cyl(0.08, 0.06, 0.2, M('#ffffff'), 0, 1.2, 0.75, g, 12); sph(0.12, M('#ff9fb6'), 0, 1.38, 0.75, g, 10);
    const p = plaque('الكاشير', 1.1, 0.32); p.position.set(5.4, 2.4, 0.4); p.rotation.y = -Math.PI / 2; scene.add(p);
    zoneHit(mesh(new THREE.BoxGeometry(1, 1.2, 2.4), INVISIBLE, 4.95, 0.6, 0.4, scene, false), 'cashier');
  }
  function drawTill(x, W, H, t) { x.fillStyle = '#163a2e'; x.fillRect(0, 0, W, H); x.fillStyle = '#8ff0bf'; x.font = `600 40px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.direction = 'rtl'; x.fillText(t, W / 2, H / 2 + 4); }

  // fitting room
  const fit = { k: 0.18 };
  {
    box(0.12, 2.7, 2.1, M('#f1e4ea'), 4.62, 1.35, -3.95); box(0.16, 0.08, 2.14, GOLD, 4.62, 2.72, -3.95, scene, false);
    const rod = cyl(0.025, 0.025, 2.4, GOLD, 5.8, 2.6, -2.92, scene, 8); rod.rotation.z = Math.PI / 2;
    const W = 2.32, H = 2.45; const g = new THREE.PlaneGeometry(W, H, 48, 1); const pa = g.attributes.position;
    for (let i = 0; i < pa.count; i++) pa.setZ(i, Math.sin(pa.getX(i) * 26) * 0.04);
    g.computeVertexNormals(); g.translate(-W / 2, 0, 0);
    fit.curtain = mesh(g, track(new THREE.MeshStandardMaterial({ color: '#b43e66', roughness: 0.9, side: THREE.DoubleSide })), 6.96, 1.36, -2.92);
    fit.curtain.scale.x = 0.18;
    box(0.06, 1.7, 0.8, GOLD, 6.93, 1.3, -4.0, scene, false);
    mesh(new THREE.BoxGeometry(0.02, 1.6, 0.7), track(new THREE.MeshStandardMaterial({ color: '#e6f4fa', roughness: 0.05, metalness: 0.6 })), 6.9, 1.3, -4.0, scene, false);
    cyl(0.28, 0.28, 0.38, M('#e9b949', { roughness: 0.6 }), 5.2, 0.19, -4.5, scene, 16);
    const p = plaque('البروفة', 1.1, 0.32); p.position.set(5.8, 2.88, -2.9); scene.add(p);
    zoneHit(mesh(new THREE.BoxGeometry(2.4, 2.6, 2.2), INVISIBLE, 5.8, 1.3, -3.95, scene, false), 'fitting');
  }

  function makeCar(i) {
    const g = new THREE.Group(); const col = ['#e0577c', '#6c8fd6', '#f2c14e', '#59cf9c'][i % 4];
    box(1.7, 0.42, 0.8, M(col, { roughness: 0.4, metalness: 0.2 }), 0, 0.38, 0, g); box(0.95, 0.35, 0.72, M(col, { roughness: 0.4 }), -0.1, 0.75, 0, g);
    mesh(new THREE.BoxGeometry(0.96, 0.28, 0.74), M('#bfe3f2', { roughness: 0.1, metalness: 0.3 }), -0.1, 0.76, 0, g, false);
    const wheels = [[-0.55, 0.38], [0.55, 0.38], [-0.55, -0.38], [0.55, -0.38]].map(([x, z]) => { const w = cyl(0.16, 0.16, 0.1, M('#2a2230'), x, 0.17, z, g, 14); w.rotation.x = Math.PI / 2; return w; });
    scene.add(g); const lane = i % 2;
    const c = { g, wheels, dir: lane ? -1 : 1, z: lane ? 9.3 : 7.5, x: lane ? 30 : -30, wait: rand(0, 6), speed: rand(4.5, 6.5), v: 0 };
    g.rotation.y = c.dir > 0 ? 0 : Math.PI; g.position.set(c.x, 0, c.z); return c;
  }
  for (let i = 0; i < 3; i++) cars.push(makeCar(i));

  // ---------------- dresses & characters ----------------
  const geoCache = {};
  function latheGeo(style) {
    if (geoCache[style]) return geoCache[style];
    const c = new THREE.SplineCurve(PROF[style].map((p) => new THREE.Vector2(p[0], p[1])));
    const g = new THREE.LatheGeometry(c.getPoints(56).map((p) => new THREE.Vector2(Math.max(0.005, p.x), p.y)), 48);
    g.computeVertexNormals(); return (geoCache[style] = track(g));
  }
  function makeDress(d) {
    const look = d || { color: '#f7f0e4', trim: '#d9b56a', style: 'aline' };
    const g = new THREE.Group();
    mesh(latheGeo(look.style), M(look.color, { map: laceTex, roughness: 0.62, emissive: look.color, emissiveIntensity: 0.05 }), 0, 0, 0, g);
    const belt = mesh(new THREE.TorusGeometry(0.185, 0.022, 8, 32), M(look.trim, { metalness: 0.4, roughness: 0.35 }), 0, 1.02, 0, g); belt.rotation.x = Math.PI / 2;
    if (look.style === 'ball') for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, y = rand(0.08, 0.8), r = PROF.ball[2][0] * (1 - y / 1.1) + 0.02; sph(0.012, M('#ffffff', { emissive: '#fff6d8', emissiveIntensity: 0.9 }), Math.cos(a) * r, y, Math.sin(a) * r, g, 6); }
    const neck = mesh(new THREE.TorusGeometry(0.1, 0.015, 6, 20), M(look.trim, { metalness: 0.4 }), 0, 1.43, 0, g); neck.rotation.x = Math.PI / 2;
    return g;
  }

  function makePerson(lk, staff) {
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const skin = M(lk.skin), hair = M(lk.hair, { roughness: 0.55, side: THREE.DoubleSide }), outfit = M(lk.outfit, { roughness: 0.7 });
    const dress = mesh(latheGeo('casual'), outfit, 0, 0, 0, body);
    const belt = mesh(new THREE.TorusGeometry(0.18, 0.02, 6, 24), M(staff ? '#e9b949' : '#ffffff'), 0, 1.02, 0, body); belt.rotation.x = Math.PI / 2;
    const legs = [-1, 1].map((s) => { const l = new THREE.Group(); l.position.set(s * 0.09, 0.36, 0); body.add(l); cyl(0.045, 0.04, 0.3, skin, 0, -0.15, 0, l, 8); const shoe = sph(0.07, M(staff ? '#26142c' : '#fff2f5'), 0, -0.3, 0.03, l, 10); shoe.scale.set(1, 0.6, 1.5); return l; });
    cyl(0.06, 0.065, 0.12, skin, 0, 1.5, 0, body, 10);
    const head = new THREE.Group(); head.position.y = 1.68; body.add(head);
    sph(0.21, skin, 0, 0, 0, head, 24);
    const cap = mesh(new THREE.SphereGeometry(0.225, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.58), hair, 0, 0.01, -0.01, head); cap.rotation.x = -0.42;
    if (lk.bun) sph(0.1, hair, 0, 0.17, -0.14, head, 14);
    else { const back = mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.42, 16, 1, true, Math.PI * 0.5, Math.PI), hair, 0, -0.16, -0.04, head); back.rotation.y = Math.PI; }
    [-1, 1].forEach((s) => { sph(0.03, M('#2a1631'), s * 0.075, 0.02, 0.18, head, 10); sph(0.009, M('#ffffff'), s * 0.075 + 0.01, 0.035, 0.205, head, 6); const ch = sph(0.032, M('#f59fb0'), s * 0.12, -0.05, 0.16, head, 8); ch.scale.set(1, 0.6, 0.4); });
    const mouth = mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 12, Math.PI), M('#b23a5a'), 0, -0.075, 0.19, head); mouth.rotation.z = Math.PI;
    const arms = [-1, 1].map((s) => { const p = new THREE.Group(); p.position.set(s * 0.21, 1.38, 0); body.add(p); cyl(0.06, 0.05, 0.18, outfit, 0, -0.08, 0, p, 10); cyl(0.04, 0.035, 0.36, skin, 0, -0.32, 0, p, 8); sph(0.05, skin, 0, -0.52, 0, p, 10); p.rotation.z = s * 0.12; return p; });
    const carry = new THREE.Group(); carry.position.set(0, 0.95, 0.42); body.add(carry);
    const veil = mesh(new THREE.ConeGeometry(0.42, 1.25, 24, 1, true), M('#ffffff', { transparent: true, opacity: 0.42, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false }), 0, -0.5, -0.12, head, false); veil.visible = false;
    const tiara = mesh(new THREE.TorusGeometry(0.17, 0.018, 6, 20, Math.PI), GOLD, 0, 0.14, 0.04, head, false); tiara.rotation.x = -0.5; tiara.visible = false;
    const hit = mesh(new THREE.CylinderGeometry(0.42, 0.42, 2.1, 10), INVISIBLE, 0, 1.05, 0, root, false);
    return { root, body, head, dress, arms, legs, carry, veil, tiara, hit, walkW: 0, phase: 0, yaw: 0, goalYaw: null, path: [], speed: 2.3, act: null, seed: Math.random() * 10, carrying: null, gown: null };
  }
  function setCarry(a, kind, dressLook) {
    while (a.carry.children.length) a.carry.remove(a.carry.children[0]);
    a.carrying = kind;
    if (kind === 'dress') { const d = makeDress(dressLook); d.scale.setScalar(0.5); d.position.set(0, -0.62, 0.05); a.carry.add(d); mesh(new THREE.TorusGeometry(0.06, 0.01, 6, 12, Math.PI), GOLD, 0, 0.14, 0.05, a.carry, false); }
    if (kind === 'bag') { box(0.5, 0.85, 0.14, M('#f4f0f3', { roughness: 0.9 }), 0, -0.3, 0.06, a.carry); box(0.3, 0.5, 0.02, M(dressLook?.color || '#ffffff'), 0, -0.3, 0.14, a.carry, false); box(0.52, 0.06, 0.16, M('#e0577c'), 0, -0.05, 0.06, a.carry, false); mesh(new THREE.TorusGeometry(0.06, 0.01, 6, 12, Math.PI), GOLD, 0, 0.17, 0.06, a.carry, false); }
  }
  function setGown(a, on, dressLook) {
    a.dress.visible = !on; a.veil.visible = on; a.tiara.visible = on; a.legs.forEach((l) => (l.visible = !on));
    if (on) { a.gown = makeDress(dressLook); a.body.add(a.gown); } else if (a.gown) { a.body.remove(a.gown); a.gown = null; }
  }

  // ---------------- state ----------------
  const entries = new Map();     // id -> latest entry
  const actors = new Map();      // id -> actor
  const keys = new Map();        // id -> key object
  const mans = new Map();        // id -> mannequin
  const scripted = new Set();    // ids whose transition is playing
  const tweens = [];
  const parts = [];
  const floaters = [];
  let selected = null;
  let follow = null;
  let muted = false;
  let disposed = false;

  const tween = (d, fn, done, ease = easeInOut) => tweens.push({ t: 0, d, fn, done, ease });
  const wait = (d, fn) => tween(d, () => {}, fn);
  const sleep = (d) => new Promise((r) => wait(d, r));
  function flyArc(obj, from, to, h, d, done, spin = 0, s0, s1) { tween(d, (k) => { obj.position.lerpVectors(from, to, k); obj.position.y += Math.sin(k * Math.PI) * h; if (spin) obj.rotation.y = k * spin; if (s0 != null) obj.scale.setScalar(s0 + (s1 - s0) * k); }, done); }

  // sound
  let AC = null;
  function tone(f, t0, d, type = 'sine', v = 0.07) { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(v, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d); o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + d + 0.05); }
  function sfx(n) {
    if (muted) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)(); const t = AC.currentTime;
      if (n === 'step') { tone(660, t, 0.12); tone(990, t + 0.08, 0.18); }
      if (n === 'coin') { tone(1568, t, 0.08, 'square', 0.025); tone(2093, t + 0.05, 0.12, 'square', 0.02); }
      if (n === 'level') [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, t + i * 0.09, 0.35, 'triangle', 0.08));
      if (n === 'pop') tone(520, t, 0.08, 'sine', 0.05);
      if (n === 'whoosh') { tone(300, t, 0.25, 'sawtooth', 0.015); tone(600, t + 0.05, 0.2, 'sine', 0.03); }
    } catch { /* audio is optional */ }
  }

  // particles
  function spriteTex(kind) { return canvasTex(64, 64, (x) => { x.translate(32, 32); if (kind === 'star') { x.fillStyle = '#fff3c4'; x.shadowColor = '#ffd36b'; x.shadowBlur = 14; x.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? 7 : 28, a = (i / 8) * Math.PI * 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.fill(); } else { x.fillStyle = '#ff6f97'; x.beginPath(); x.moveTo(0, 20); x.bezierCurveTo(-30, -2, -14, -26, 0, -10); x.bezierCurveTo(14, -26, 30, -2, 0, 20); x.fill(); } }); }
  const STAR = spriteTex('star'), HEART = spriteTex('heart');
  function sparkles(pos, n = 16, spread = 0.8, tex = STAR, up = 1.2) { for (let i = 0; i < n; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.position.copy(pos).add(V(rand(-spread, spread) * 0.5, rand(-0.2, 0.4), rand(-spread, spread) * 0.5)); const s = rand(0.12, 0.28); sp.scale.setScalar(s); scene.add(sp); parts.push({ o: sp, v: V(rand(-0.6, 0.6), rand(0.4, 1.4) * up, rand(-0.6, 0.6)), life: rand(0.8, 1.4), age: 0, s, g: -0.6, kind: 'spr' }); } }
  const CONF = ['#e0577c', '#e9b949', '#59cf9c', '#86c3ea', '#b79be8', '#ffffff', '#f39a4c'];
  const confGeo = track(new THREE.PlaneGeometry(0.07, 0.13));
  function confetti(pos, n = 110) { for (let i = 0; i < n; i++) { const m = new THREE.Mesh(confGeo, new THREE.MeshBasicMaterial({ color: pick(CONF), side: THREE.DoubleSide, transparent: true })); m.position.copy(pos); scene.add(m); const a = rand(0, Math.PI * 2), sp = rand(1.5, 4.2); parts.push({ o: m, v: V(Math.cos(a) * sp * 0.6, rand(3.5, 7), Math.sin(a) * sp * 0.6), r: V(rand(-9, 9), rand(-9, 9), rand(-9, 9)), life: rand(2.4, 3.6), age: 0, g: -7, kind: 'conf' }); } }
  function ringBurst(pos, color = '#e9b949') { const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 40), new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.copy(pos); m.position.y = 0.05; scene.add(m); tween(0.9, (k) => { m.scale.setScalar(1 + k * 3); m.material.opacity = 1 - k; }, () => { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }); }
  const coinGeo = track(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 16));
  function coins(from, to, n = 6) { return new Promise((res) => { for (let i = 0; i < n; i++) { const c = new THREE.Mesh(coinGeo, GOLD); c.rotation.x = Math.PI / 2; scene.add(c); c.position.copy(from); wait(i * 0.09, () => flyArc(c, from.clone().add(V(rand(-0.15, 0.15), 0, rand(-0.15, 0.15))), to, 1.4, 0.8, () => { scene.remove(c); sfx('coin'); if (i === n - 1) res(); }, Math.PI * 6)); } }); }
  function updParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.age += dt; const k = p.age / p.life;
      if (p.kind === 'conf') { p.v.y += p.g * dt; p.v.multiplyScalar(1 - dt * 1.2); p.o.position.addScaledVector(p.v, dt); if (p.o.position.y < 0.02) { p.o.position.y = 0.02; p.v.set(0, 0, 0); p.r.set(0, 0, 0); p.o.rotation.set(-Math.PI / 2, 0, p.o.rotation.z); } p.o.rotation.x += p.r.x * dt; p.o.rotation.y += p.r.y * dt; p.o.rotation.z += p.r.z * dt; p.o.material.opacity = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1; }
      else { p.v.y += p.g * dt; p.o.position.addScaledVector(p.v, dt); p.o.material.opacity = 1 - k; p.o.scale.setScalar(p.s * (1 + Math.sin(k * Math.PI) * 0.6)); }
      if (k >= 1) { scene.remove(p.o); p.o.material.dispose(); parts.splice(i, 1); }
    }
  }
  function floatText(pos, text, cls = '') { const el = document.createElement('div'); el.className = 'sg-flt ' + cls; el.textContent = text; floatLayer.appendChild(el); const f = { el, pos: pos.clone() }; floaters.push(f); setTimeout(() => { el.remove(); const i = floaters.indexOf(f); if (i > -1) floaters.splice(i, 1); }, 1900); }

  // ---------------- keys ----------------
  function drawKeyTag(x, W, H, e) {
    const t = e.keyTag || {}; x.clearRect(0, 0, W, H);
    const shape = () => { x.beginPath(); x.moveTo(40, 4); x.lineTo(W - 6, 4); x.quadraticCurveTo(W - 2, 4, W - 2, 14); x.lineTo(W - 2, H - 14); x.quadraticCurveTo(W - 2, H - 4, W - 12, H - 4); x.lineTo(40, H - 4); x.lineTo(4, H / 2); x.closePath(); };
    x.save(); shape(); x.fillStyle = '#fffaf3'; x.fill(); x.clip(); x.fillStyle = t.color || '#b79be8'; x.fillRect(W - 30, 0, 30, H); x.restore();
    x.lineWidth = 4; x.strokeStyle = '#c99a3a'; shape(); x.stroke();
    x.fillStyle = '#26142c'; x.beginPath(); x.arc(30, H / 2, 9, 0, 7); x.fill();
    x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#26142c'; x.font = `600 60px ${FONT}`; x.fillText(e.name, W / 2 + 4, H * 0.42, W - 80);
    x.font = `500 30px ${FONT}`; x.fillStyle = '#6f5a74'; x.fillText(t.line2 || '', W / 2 + 4, H * 0.66, W - 80);
    x.font = `700 27px ${FONT}`; x.fillStyle = t.ink || '#6b4bb8'; x.fillText(t.line3 || '', W / 2 + 4, H * 0.88, W - 80);
  }
  function freeHook() { const used = new Set([...keys.values()].map((k) => k.slot)); for (let i = 0; i < CAPS.keys; i++) if (!used.has(i)) return i; return -1; }
  function makeKey(e, slot) {
    const g = new THREE.Group(); const hp = hookPos(slot); g.position.set(hp.x, hp.y + 0.24, hp.z); scene.add(g);
    const ring = mesh(new THREE.TorusGeometry(0.055, 0.014, 8, 20), BRASS, 0, -0.07, 0, g); ring.rotation.y = Math.PI / 2;
    cyl(0.013, 0.013, 0.2, BRASS, 0, -0.22, 0, g, 8); box(0.02, 0.05, 0.05, BRASS, 0, -0.3, 0.035, g);
    const tex = canvasTex(360, 234, (x, W, H) => drawKeyTag(x, W, H, e));
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.27), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.8, side: THREE.DoubleSide })); tag.position.set(0.03, -0.34, 0); tag.rotation.y = Math.PI / 2; tag.castShadow = true; g.add(tag);
    tag.userData.brideId = e.id; pickables.push(tag);
    const k = { g, tag, tex, slot, seed: Math.random() * 6, sig: JSON.stringify([e.name, e.keyTag]) }; keys.set(e.id, k); return k;
  }
  function dropKey(id, anim = true) {
    const k = keys.get(id); if (!k) return; keys.delete(id);
    const i = pickables.indexOf(k.tag); if (i > -1) pickables.splice(i, 1);
    const kill = () => { scene.remove(k.g); k.tex.dispose(); k.tag.geometry.dispose(); k.tag.material.dispose(); };
    if (!anim) return kill();
    tween(0.6, (q) => k.g.scale.setScalar(1 - q * 0.99), kill);
  }

  // ---------------- mannequins ----------------
  function drawVitTag(x, W, H, e) {
    const t = e.vitTag || {}; x.clearRect(0, 0, W, H); rr(x, 4, 4, W - 8, H - 8, 24); x.fillStyle = '#26142c'; x.fill(); x.lineWidth = 5; x.strokeStyle = '#e9b949'; x.stroke();
    x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#ffe08f'; x.font = `52px ${DISPLAY}`; x.fillText(e.name, W / 2, H * 0.45, W - 30);
    x.font = `600 28px ${FONT}`; x.fillStyle = t.hot ? '#ff9db5' : '#e9d6ea'; x.fillText(t.line2 || '', W / 2, H * 0.8, W - 30);
  }
  function freeVitSlot() { const used = new Set([...mans.values()].map((m) => m.slot)); for (let i = 0; i < CAPS.mannequins; i++) if (!used.has(i)) return i; return -1; }
  function makeMannequin(e, slot, anim) {
    const g = new THREE.Group(); g.position.set(VIT_X[slot], 0.27, -4.35); scene.add(g);
    cyl(0.22, 0.26, 0.05, GOLD, 0, 0.03, 0, g, 24); cyl(0.025, 0.025, 0.1, GOLD, 0, 0.08, 0, g, 8);
    const d = makeDress(e.dress); g.add(d); d.traverse((o) => { if (o.isMesh) { o.userData.brideId = e.id; pickables.push(o); } });
    sph(0.08, M('#f3e6da'), 0, 1.55, 0, g, 12); cyl(0.04, 0.05, 0.12, M('#f3e6da'), 0, 1.49, 0, g, 8);
    const tex = canvasTex(400, 170, (x, W, H) => drawVitTag(x, W, H, e));
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.38), new THREE.MeshBasicMaterial({ map: tex, transparent: true })); tag.position.set(0, 0.39, 0.73); tag.rotation.x = -0.25; g.add(tag); tag.userData.brideId = e.id; pickables.push(tag);
    const m = { g, dress: d, tex, tag, slot, sig: JSON.stringify([e.name, e.vitTag]) }; mans.set(e.id, m);
    if (anim) { g.scale.set(1, 0.001, 1); tween(1.1, (k) => g.scale.set(1, Math.max(0.001, k), 1), null, easeOutBack); spots[slot].intensity = 9; tween(1.6, (k) => (spots[slot].intensity = 9 - k * 6.5)); sparkles(V(VIT_X[slot], 1.2, -4.35), 24, 1.2); }
    else spots[slot].intensity = 2.5;
    return m;
  }
  function dropMannequin(id, anim = true) {
    const m = mans.get(id); if (!m) return; mans.delete(id);
    m.g.traverse((o) => { const i = pickables.indexOf(o); if (i > -1) pickables.splice(i, 1); });
    spots[m.slot].intensity = 0;
    const kill = () => scene.remove(m.g);
    if (!anim) return kill();
    tween(0.6, (k) => m.g.scale.set(1, Math.max(0.001, 1 - k), 1), kill);
  }

  // ---------------- actors ----------------
  function chipHtml(e) { const c = e.chip || {}; return `<span class="sg-chip-d">${esc(c.badge ?? '')}</span>${esc(e.name)} <small>${esc(c.sub ?? '')}</small>`; }
  function updChip(a) {
    const e = entries.get(a.id); if (!e) return;
    const html = chipHtml(e);
    if (a.chipHtml !== html) { a.chip.innerHTML = html; a.chipHtml = html; a.chipW = 0; }
    a.chip.style.setProperty('--c', e.chip?.late ? '#e5484d' : e.chip?.color || '#e9b949');
    a.chip.classList.toggle('late', Boolean(e.chip?.late));
    a.chip.classList.toggle('sel', selected === a.id);
  }
  function spawnActor(e, x, z, yaw = 0) {
    const old = actors.get(e.id); if (old) removeActor(old);
    const a = makePerson(e.look); a.id = e.id; a.root.position.set(x, 0, z); a.yaw = a.goalYaw = yaw; scene.add(a.root);
    a.hit.userData.brideId = e.id; pickables.push(a.hit); actors.set(e.id, a);
    const el = document.createElement('button'); el.type = 'button'; el.className = 'sg-chip'; el.onclick = () => onPick?.(e.id); chipLayer.appendChild(el); a.chip = el; updChip(a);
    return a;
  }
  function removeActor(a) { scene.remove(a.root); const i = pickables.indexOf(a.hit); if (i > -1) pickables.splice(i, 1); a.chip.remove(); if (actors.get(a.id) === a) actors.delete(a.id); }
  function go(a, pts, cb, face) { a.path = pts.map((p) => V(p[0], 0, p[1])); a.onArrive = cb || null; a.faceYaw = face ?? null; }
  const goP = (a, pts, face) => new Promise((r) => go(a, pts, r, face));
  const act = (a, type, dur) => { a.act = { type, t: 0, dur }; };
  function leave(a, side = -1) { const p = a.root.position; const z = side < 0 ? LANE + 0.35 : LANE; const pts = p.z < 4.2 && p.z > -5 ? [...(p.x > 0 ? [[0.6, 2.2]] : []), [-3.5, 3.1], [-3.5, 4.6], [-3.5, z], [side * 20, z]] : [[p.x, z], [side * 20, z]]; return goP(a, pts).then(() => removeActor(a)); }

  function updActor(a, dt, t) {
    const p = a.root.position; let moving = false;
    if (a.path.length) {
      const tg = a.path[0], dx = tg.x - p.x, dz = tg.z - p.z, d = Math.hypot(dx, dz), step = a.speed * dt;
      if (d <= step) { p.x = tg.x; p.z = tg.z; a.path.shift(); if (!a.path.length) { if (a.faceYaw != null) a.goalYaw = a.faceYaw; const f = a.onArrive; a.onArrive = null; if (f) f(); } }
      else { p.x += (dx / d) * step; p.z += (dz / d) * step; a.goalYaw = Math.atan2(dx, dz); moving = true; a.phase += step * 4.6; }
    }
    a.yaw = lerpAng(a.yaw, a.goalYaw ?? a.yaw, 1 - Math.exp(-dt * 9));
    a.walkW += ((moving ? 1 : 0) - a.walkW) * Math.min(1, dt * 7);
    const w = a.walkW, s = Math.sin(a.phase), idle = 1 - w;
    let spin = 0, jump = 0, armUp = 0, wave = 0, nod = 0;
    if (a.act) {
      a.act.t += dt; const k = Math.min(1, a.act.t / a.act.dur);
      if (a.act.type === 'twirl') spin = easeInOut(k) * Math.PI * 2;
      if (a.act.type === 'jump') { jump = Math.abs(Math.sin(k * Math.PI * 2)) * 0.42 * (1 - k * 0.3); armUp = Math.sin(k * Math.PI); }
      if (a.act.type === 'wave') wave = Math.sin(k * Math.PI);
      if (a.act.type === 'nod') nod = Math.sin(k * Math.PI * 3) * 0.25;
      if (k >= 1) a.act = null;
    }
    a.root.rotation.y = a.yaw + spin;
    a.body.position.y = Math.abs(s) * 0.075 * w + jump;
    a.body.rotation.z = s * 0.05 * w; a.body.rotation.x = 0.06 * w;
    a.body.scale.y = 1 + Math.sin(t * 2.2 + a.seed) * 0.012 * idle;
    a.legs[0].rotation.x = s * 0.55 * w; a.legs[1].rotation.x = -s * 0.55 * w;
    a.dress.rotation.y = s * 0.08 * w; a.dress.scale.x = 1 + Math.sin(a.phase * 2) * 0.025 * w;
    a.head.rotation.y = Math.sin(t * 0.55 + a.seed) * 0.38 * idle + s * 0.06 * w; a.head.rotation.x = nod + Math.sin(t * 1.3 + a.seed) * 0.03 * idle; a.head.rotation.z = Math.sin(t * 0.8 + a.seed * 2) * 0.06 * idle;
    const [L, R] = a.arms;
    if (a.carrying) { L.rotation.x = R.rotation.x = -1.15 + Math.sin(a.phase * 2) * 0.04 * w; L.rotation.z = -0.25; R.rotation.z = 0.25; }
    else { L.rotation.x = s * 0.7 * w + Math.sin(t * 1.6 + a.seed) * 0.04 * idle - armUp * 2.6; R.rotation.x = -s * 0.7 * w + Math.sin(t * 1.6 + a.seed + 1) * 0.04 * idle - armUp * 2.6; L.rotation.z = -0.12 - armUp * 0.3; R.rotation.z = 0.12 + armUp * 0.3 + wave * 2.5 + (wave ? Math.sin(t * 16) * 0.3 * wave : 0); }
  }

  const staff = makePerson({ skin: '#e9bf9c', hair: '#2b1a14', outfit: '#3b2143', bun: true }, true);
  staff.root.position.set(5.85, 0, 0.4); staff.yaw = staff.goalYaw = -Math.PI / 2; scene.add(staff.root);

  // ---------------- placement ----------------
  const houseOf = (id) => HOUSES[(Number(id) * 3) % HOUSES.length];
  function slots(list) {
    // Order inside each zone: queue by visit date, others by `order`
    return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id - b.id);
  }
  function targetSpot(e, zoneLists) {
    const i = zoneLists[e.actor]?.indexOf(e) ?? -1;
    if (i < 0) return null;
    if (e.actor === 'queue') return i < CAPS.queue ? { p: visitSlot(i), yaw: Math.PI / 2 } : null;
    if (e.actor === 'fitting') return i < CAPS.fitting ? { p: fittingSlot(i), yaw: i === 0 ? Math.PI : Math.PI / 2 } : null;
    if (e.actor === 'returnDoor') return i < CAPS.returnDoor ? { p: retSlot(i), yaw: -Math.PI / 2 } : null;
    if (e.actor === 'cashier') return { p: cashSlot(i), yaw: Math.PI / 2 };
    if (e.actor === 'home') {
      const hx = houseOf(e.id); const same = zoneLists.home.filter((o) => houseOf(o.id) === hx); const j = same.indexOf(e);
      if (j >= CAPS.homePerHouse) return null;
      return { p: [hx + (j - (Math.min(same.length, CAPS.homePerHouse) - 1) / 2) * 0.8, 11.85], yaw: Math.PI };
    }
    return null;
  }
  function spawnPoint(e, spot) {
    if (e.actor === 'home') return { x: spot.p[0], z: spot.p[1] };
    return { x: spot.p[0], z: spot.p[1] };
  }

  function reconcile(first) {
    const list = [...entries.values()];
    const zoneLists = {};
    ['queue', 'fitting', 'returnDoor', 'home', 'cashier'].forEach((z) => (zoneLists[z] = slots(list.filter((e) => e.actor === z))));

    // actors
    const wanted = new Map();
    list.forEach((e) => { if (e.actor) { const s = targetSpot(e, zoneLists); if (s) wanted.set(e.id, s); } });
    actors.forEach((a, id) => { if (scripted.has(id)) return; if (!wanted.has(id) && !a.leaving) { a.leaving = true; leave(a, -1); } });
    wanted.forEach((s, id) => {
      if (scripted.has(id)) return;
      const e = entries.get(id); let a = actors.get(id);
      if (a && a.leaving) { removeActor(a); a = null; }
      if (!a) {
        if (first || e.actor === 'home') { const sp = spawnPoint(e, s); a = spawnActor(e, sp.x, sp.z, s.yaw); }
        else if (e.actor === 'queue') { a = spawnActor(e, -19, LANE, Math.PI / 2); go(a, [[s.p[0], LANE], s.p], null, s.yaw); }
        else if (e.actor === 'returnDoor') { a = spawnActor(e, 19, LANE, -Math.PI / 2); go(a, [[s.p[0], LANE], s.p], null, s.yaw); }
        else if (e.actor === 'fitting') { a = spawnActor(e, -19, LANE, Math.PI / 2); go(a, [...ENTER, [0.4, -1.4], s.p], null, s.yaw); }
        else { a = spawnActor(e, s.p[0], s.p[1], s.yaw); }
      } else {
        const p = a.root.position, last = a.path[a.path.length - 1];
        const at = last ? Math.hypot(last.x - s.p[0], last.z - s.p[1]) < 0.05 : Math.hypot(p.x - s.p[0], p.z - s.p[1]) < 0.05;
        if (!at) go(a, [s.p], null, s.yaw); else if (!last) a.goalYaw = s.yaw;
      }
      const carry = e.actor === 'returnDoor' ? 'bag' : e.actor === 'cashier' ? 'dress' : null;
      if (a.carrying !== carry) setCarry(a, carry, e.dress);
      updChip(a);
    });

    // keys
    const keyIds = slots(list.filter((e) => e.key)).slice(0, CAPS.keys).map((e) => e.id);
    keys.forEach((k, id) => { if (!scripted.has(id) && !keyIds.includes(id)) dropKey(id, !first); });
    keyIds.forEach((id) => {
      if (scripted.has(id)) return; const e = entries.get(id); const k = keys.get(id);
      const sig = JSON.stringify([e.name, e.keyTag]);
      if (!k) { const slot = freeHook(); if (slot >= 0) { const nk = makeKey(e, slot); if (!first) { nk.g.scale.setScalar(0.01); tween(0.6, (q) => nk.g.scale.setScalar(Math.max(0.01, q)), null, easeOutBack); } } }
      else if (k.sig !== sig) { k.sig = sig; drawKeyTag(k.tex.userData.x, 360, 234, e); k.tex.needsUpdate = true; }
    });

    // mannequins
    const manIds = slots(list.filter((e) => e.mannequin)).slice(0, CAPS.mannequins).map((e) => e.id);
    mans.forEach((m, id) => { if (!scripted.has(id) && !manIds.includes(id)) dropMannequin(id, !first); });
    manIds.forEach((id) => {
      if (scripted.has(id)) return; const e = entries.get(id); const m = mans.get(id);
      const sig = JSON.stringify([e.name, e.vitTag]);
      if (!m) { const slot = freeVitSlot(); if (slot >= 0) makeMannequin(e, slot, !first); }
      else if (m.sig !== sig) { m.sig = sig; drawVitTag(m.tex.userData.x, 400, 170, e); m.tex.needsUpdate = true; }
    });
  }

  // ---------------- transitions ----------------
  const actorPos = (a) => a.root.position.clone().add(V(0, 1.3, 0));
  async function ensureActorFromLeft(e, until) {
    let a = actors.get(e.id);
    if (!a) { a = spawnActor(e, -19, LANE, Math.PI / 2); await goP(a, until); }
    return a;
  }
  const TRANS = {
    async booked(e) {
      const a = actors.get(e.id);
      if (!a) return;
      act(a, 'jump', 1); sfx('whoosh');
      const from = actorPos(a);
      if (e.key) {
        const slot = freeHook();
        if (slot >= 0) {
          const k = makeKey(e, slot); const target = k.g.position.clone(); k.g.position.copy(from); k.g.scale.setScalar(2.2); cab.openUntil = clock.elapsedTime + 4;
          await sleep(0.4); await new Promise((r) => flyArc(k.g, from, target, 2.5, 1.6, r, 0, 2.2, 1)); sparkles(target, 14, 0.5); sfx('pop');
        }
      } else if (e.mannequin) {
        const slot = freeVitSlot(); if (slot >= 0) makeMannequin(e, slot, true);
      }
      act(a, 'wave', 1.2); await sleep(1.2);
      if (e.actor === 'fitting') return; // reconcile walks her to the fitting room
      a.leaving = true; leave(a, -1);
    },
    async visitClosed(e) { const a = actors.get(e.id); if (!a) return; act(a, 'nod', 1); await sleep(1); a.leaving = true; leave(a, -1); },
    async fittingDone(e) {
      cameraTo(VIEWS.fitting, 1);
      let a = actors.get(e.id);
      if (!a) a = await ensureActorFromLeft(e, [...ENTER, [0.4, -1.4], [5.8, -2.3]]);
      else await goP(a, [[5.8, -2.3]]);
      follow = a;
      curtain(1, 0.5); await goP(a, [[5.8, -4.0]], 0); a.goalYaw = 0; await sleep(0.6);
      setGown(a, true, e.dress); await sleep(0.6);
      curtain(0.18, 0.8); sparkles(V(5.8, 1.6, -3.6), 30, 1.2); sfx('level');
      await sleep(0.4); act(a, 'twirl', 1.6); sparkles(V(5.8, 1.2, -3.6), 20, 1, HEART);
      await sleep(3); curtain(1, 0.6); await sleep(0.8); setGown(a, false); curtain(0.18, 0.6);
      await goP(a, [[5.8, -2.3]]);
      if (e.actor) return; // still has an open fitting -> reconcile places her
      a.leaving = true; leave(a, -1);
    },
    async fittingScheduled(e) { const k = keys.get(e.id); const p = k ? k.g.position.clone() : actors.get(e.id) ? actorPos(actors.get(e.id)) : V(5.8, 1.6, -3); sparkles(p, 12, 0.5); floatText(p, e.chip?.sub || 'بروفة'); },
    async handedOver(e) {
      let a = actors.get(e.id);
      if (!a || a.carrying !== 'dress') { a = await bringToCashier(e); }
      follow = a; act(a, 'wave', 1.2); act(staff, 'wave', 1.2); await sleep(1.2);
      const hx = houseOf(e.id);
      await goP(a, [[0.6, 2.2], [-3.5, 3.1], [-3.5, 4.6], [-3.5, LANE], [0, LANE], [0, 10.5], [hx, 10.6], [hx, 11.85]], Math.PI);
      setCarry(a, null); act(a, 'wave', 1.4); sparkles(actorPos(a), 10, 0.5, HEART);
    },
    async returned(e) {
      const a = actors.get(e.id); if (!a) return;
      follow = a; setCarry(a, null);
      const bag = new THREE.Group(); box(0.5, 0.85, 0.14, M('#f4f0f3'), 0, 0, 0, bag); scene.add(bag);
      await new Promise((r) => flyArc(bag, actorPos(a), laundryPos.clone(), 1.5, 1, r, Math.PI * 3));
      scene.remove(bag); sparkles(laundryPos.clone().add(V(0, 0.5, 0)), 10, 0.4);
      act(a, 'jump', 1.3); confetti(actorPos(a).add(V(0, 0.7, 0)), 140); sparkles(actorPos(a).add(V(0, 0.5, 0)), 14, 0.6, HEART, 1.6);
      await sleep(1.6); act(a, 'wave', 1); await sleep(1);
      a.leaving = true; follow = null; const p = a.root.position; await goP(a, [[p.x, LANE], [20, LANE]]); removeActor(a);
    },
    async cancelled(e, before) {
      const p = keys.get(e.id)?.g.position.clone() || (mans.get(e.id) ? V(VIT_X[mans.get(e.id).slot], 1, -4.3) : null);
      if (p) { sparkles(p, 10, 0.4); floatText(p, 'اتلغى'); }
      dropKey(e.id); dropMannequin(e.id);
      const a = actors.get(e.id); if (a) { a.leaving = true; leave(a, -1); }
      void before;
    },
  };

  async function bringToCashier(e) {
    const m = mans.get(e.id); scripted.add(e.id);
    let a = actors.get(e.id);
    const vx = m ? VIT_X[m.slot] : 0;
    if (!a) a = spawnActor(e, -3.5, 4.6, Math.PI);
    a.speed = 3.4; follow = null; cameraTo({ t: V(0.5, 0.6, -1.4), r: 10, th: 0.1, ph: 0.95 }, 1);
    await goP(a, [[-3.5, 3.1], [vx, -3.0]], Math.PI);
    await sleep(0.3);
    if (m) {
      const d = m.dress; const wp = V(); d.getWorldPosition(wp); m.g.remove(d); scene.add(d); d.position.copy(wp); sfx('whoosh');
      dropMannequin(e.id, false);
      await new Promise((r) => tween(0.9, (k) => { d.position.lerpVectors(wp, a.root.position.clone().add(V(0, 0.55, 0.4)), k); d.position.y += Math.sin(k * Math.PI) * 0.8; d.scale.setScalar(1 - 0.5 * k); if (Math.random() < 0.4) sparkles(d.position.clone().add(V(0, 0.5, 0)), 1, 0.3); }, r));
      scene.remove(d);
    }
    setCarry(a, 'dress', e.dress); act(a, 'jump', 0.9); sparkles(actorPos(a).add(V(0, 0.3, 0)), 10, 0.5, HEART);
    await sleep(0.9);
    await goP(a, [[1.0, -1.1], cashSlot(0)], Math.PI / 2);
    a.speed = 2.3;
    return a;
  }

  function curtain(to, d = 0.7) { const from = fit.k; tween(d, (k) => { fit.k = from + (to - from) * k; fit.curtain.scale.x = fit.k; }); }

  // ---------------- camera ----------------
  const cam = { th: -0.5, ph: 0.6, r: 34, t: V(0, 0.6, 1.2) };
  let camTw = false;
  function cameraTo(v, d = 1.2) { const f = { th: cam.th, ph: cam.ph, r: cam.r, t: cam.t.clone() }; camTw = true; tween(d, (k) => { cam.th = f.th + (v.th - f.th) * k; cam.ph = f.ph + (v.ph - f.ph) * k; cam.r = f.r + (v.r - f.r) * k; cam.t.lerpVectors(f.t, v.t, k); }, () => (camTw = false)); }
  function applyCam() { const sp = Math.sin(cam.ph); camera.position.set(cam.t.x + cam.r * sp * Math.sin(cam.th), cam.t.y + cam.r * Math.cos(cam.ph), cam.t.z + cam.r * sp * Math.cos(cam.th)); camera.lookAt(cam.t); }

  let drag = null, pinch = null; const ptrs = new Map();
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function pickAt(e) {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(pickables, false);
    const br = h.find((x) => x.object.userData.brideId != null);
    if (br) return { id: br.object.userData.brideId };
    return h.length ? { zone: h[0].object.userData.zone } : null;
  }
  const onDown = (e) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (ptrs.size === 1) drag = { x: e.clientX, y: e.clientY, btn: e.button, moved: 0 }; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), r: cam.r }; drag = null; } };
  const onMove = (e) => {
    if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()]; cam.r = clamp((pinch.r * pinch.d) / Math.max(20, Math.hypot(a.x - b.x, a.y - b.y)), 4, 32); return; }
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 6) {
        canvas.classList.add('grab'); follow = null;
        if (drag.btn === 2 || e.shiftKey) { const right = V(Math.cos(cam.th), 0, -Math.sin(cam.th)), fwd = V(Math.sin(cam.th), 0, Math.cos(cam.th)); cam.t.addScaledVector(right, -dx * cam.r * 0.0016).addScaledVector(fwd, -dy * cam.r * 0.0016); cam.t.x = clamp(cam.t.x, -12, 12); cam.t.z = clamp(cam.t.z, -6, 14); }
        else { cam.th = clamp(cam.th - dx * 0.006, -1.7, 1.7); cam.ph = clamp(cam.ph - dy * 0.005, 0.3, 1.4); }
      }
    } else canvas.classList.toggle('hover', Boolean(pickAt(e)));
  };
  const onUp = (e) => { ptrs.delete(e.pointerId); canvas.classList.remove('grab'); if (drag && drag.moved < 6 && drag.btn === 0) { const p = pickAt(e); if (p?.id != null) onPick?.(p.id); else if (p?.zone) onZone?.(p.zone); } drag = null; if (ptrs.size < 2) pinch = null; };
  const onCancel = (e) => { ptrs.delete(e.pointerId); drag = null; pinch = null; };
  const onWheel = (e) => { e.preventDefault(); cam.r = clamp(cam.r * (1 + e.deltaY * 0.0011), 4, 32); };
  const onCtx = (e) => e.preventDefault();
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onCancel); canvas.addEventListener('wheel', onWheel, { passive: false }); canvas.addEventListener('contextmenu', onCtx);

  // ---------------- selection ----------------
  const selRing = new THREE.Mesh(new THREE.RingGeometry(0.48, 0.58, 40), new THREE.MeshBasicMaterial({ color: '#e9b949', transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
  selRing.rotation.x = -Math.PI / 2; selRing.visible = false; scene.add(selRing);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.13), M('#ffd36b', { emissive: '#e9a830', emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.25 }));
  gem.scale.y = 1.5; gem.visible = false; scene.add(gem);
  function anchorOf(id) {
    const a = actors.get(id); if (a) return a.root.position.clone().add(V(0, 1.9, 0));
    const k = keys.get(id); if (k) return k.g.position.clone().add(V(0.1, -0.3, 0));
    const m = mans.get(id); if (m) return m.g.position.clone().add(V(0, 1.7, 0));
    return null;
  }

  // ---------------- labels ----------------
  const pv = new THREE.Vector3();
  function placeChips(W, H) {
    const items = [];
    actors.forEach((a) => {
      pv.copy(a.root.position); pv.y += (a.carrying ? 2.25 : 2.15) + a.body.position.y;
      const dist = camera.position.distanceTo(pv); pv.project(camera);
      if (pv.z > 1 || pv.x < -1.1 || pv.x > 1.1 || pv.y < -1.1 || pv.y > 1.2) { a.chip.classList.add('off'); return; }
      if (!a.chipW) a.chipW = a.chip.offsetWidth || 90;
      items.push({ a, x: ((pv.x + 1) / 2) * W, y: ((1 - pv.y) / 2) * H, dist, pri: selected === a.id ? 0 : 1 });
    });
    items.sort((p, q) => p.pri - q.pri || p.dist - q.dist);
    const placed = [], h = 26, gap = 4;
    for (const it of items) {
      const w = it.a.chipW; let y = it.y - h; const x = it.x - w / 2; let ok = false;
      for (let tries = 0; tries < 7; tries++) { const hit = placed.find((r) => x < r.x + r.w + gap && x + w + gap > r.x && y < r.y + h + gap && y + h + gap > r.y); if (!hit) { ok = true; break; } y = hit.y - h - gap; }
      if (!ok || y < 8) { it.a.chip.classList.add('off'); continue; }
      placed.push({ x, y, w }); it.a.chip.classList.remove('off');
      it.a.chip.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      it.a.chip.style.setProperty('--lead', `${Math.max(4, it.y - y - h + 4)}px`);
    }
  }

  // ---------------- loop ----------------
  const clock = new THREE.Clock();
  let raf = 0, lastW = 0, lastH = 0;
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    lastW = w; lastH = h; renderer.setSize(w, h, false); camera.aspect = w / h;
    const asp = w / h; camera.fov = asp < 1.35 ? Math.min(78, (2 * Math.atan((Math.tan((21 * Math.PI) / 180) * 1.35) / asp) * 180) / Math.PI) : 42;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas);
  function loop() {
    if (disposed) return; raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, clock.getDelta()), t = clock.elapsedTime;
    for (let i = tweens.length - 1; i >= 0; i--) { const w = tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.d); w.fn(w.ease(k)); if (k >= 1) { tweens.splice(i, 1); if (w.done) try { w.done(); } catch (err) { console.error(err); } } }
    const crossing = [...actors.values()].some((a) => a.path.length && Math.abs(a.root.position.x) < 2.5 && a.root.position.z > 5.5 && a.root.position.z < 10.6 && (Math.abs(a.root.position.x) < 1.6 || a.path.some((p) => Math.abs(p.x) < 0.1)));
    cars.forEach((c) => { if (c.wait > 0) { c.wait -= dt; return; } const ahead = (0 - c.x) * c.dir; const stop = crossing && ahead > 1.2 && ahead < 4.5; c.v += ((stop ? 0 : c.speed) - c.v) * Math.min(1, dt * (stop ? 4 : 1.5)); c.x += c.v * c.dir * dt; c.g.position.x = c.x; c.wheels.forEach((w) => (w.rotation.y += c.v * dt * 3)); if (Math.abs(c.x) > 32) { c.x = -32 * c.dir; c.wait = rand(2, 9); c.speed = rand(4.5, 6.5); } });
    actors.forEach((a) => updActor(a, dt, t)); updActor(staff, dt, t);
    doors.forEach((d) => { let near = false; actors.forEach((a) => { const p = a.root.position; if (Math.abs(p.x - d.x) < 1.1 && Math.abs(p.z - 4) < 1.4) near = true; }); d.ang += ((near ? 1.35 : 0) - d.ang) * Math.min(1, dt * 5); d.piv.rotation.y = -d.dir * d.ang; });
    const selKey = selected != null && keys.has(selected) && !actors.has(selected);
    const open = t < cab.openUntil || selKey || cab.forceOpen; cab.open += ((open ? 1 : 0) - cab.open) * Math.min(1, dt * 3.5); cab.doors.forEach((d) => (d.piv.rotation.y = d.dir * cab.open * 1.75));
    keys.forEach((k) => (k.g.rotation.x = Math.sin(t * 1.4 + k.seed) * 0.05));
    trees.forEach((tr, i) => (tr.rotation.z = Math.sin(t * 0.9 + i) * 0.02));
    if (selected != null) { const p = anchorOf(selected); const a = actors.get(selected); selRing.visible = Boolean(a); if (a) { selRing.position.set(a.root.position.x, 0.03, a.root.position.z); selRing.scale.setScalar(1 + Math.sin(t * 4) * 0.06); } gem.visible = Boolean(p); if (p) { gem.position.copy(p).add(V(0, (a ? 0.55 : 0.45) + Math.sin(t * 3) * 0.08 + (a ? a.body.position.y : 0), 0)); gem.rotation.y = t * 2; } }
    else selRing.visible = gem.visible = false;
    if (follow && !camTw && actors.get(follow.id) === follow) cam.t.lerp(follow.root.position.clone().add(V(0, 0.9, 0)), 1 - Math.exp(-dt * 3));
    if (canvas.clientWidth !== lastW || canvas.clientHeight !== lastH) resize();
    applyCam();
    const lo = camera.position.x < -7 ? 0.15 : 1, rO = camera.position.x > 7 ? 0.15 : 1;
    walls.L.material.opacity += (lo - walls.L.material.opacity) * 0.15; walls.R.material.opacity += (rO - walls.R.material.opacity) * 0.15; walls.L.material.depthWrite = lo > 0.9; walls.R.material.depthWrite = rO > 0.9;
    updParts(dt); renderer.render(scene, camera);
    placeChips(lastW, lastH);
    floaters.forEach((f) => { pv.copy(f.pos).project(camera); f.el.style.left = `${((pv.x + 1) / 2) * lastW}px`; f.el.style.top = `${((1 - pv.y) / 2) * lastH}px`; });
  }
  resize(); applyCam(); loop();
  cameraTo(VIEWS.shop, 2.2);

  let synced = false;
  // ---------------- public API ----------------
  return {
    /** Replace the data; `events` plays transitions for brides that moved. Resolves when they finish */
    sync(list, events = {}) {
      list.forEach((e) => entries.set(e.id, e));
      [...entries.keys()].forEach((id) => { if (!list.some((e) => e.id === id)) entries.delete(id); });
      const first = !synced; synced = true;
      // Transitions read the new entry, but removed brides still need their name/dress for the animation
      const playing = Object.entries(events).map(([idStr, ev]) => {
        const id = Number(idStr); const fn = TRANS[ev.type]; if (!fn) return null;
        const e = list.find((x) => x.id === id) || { ...(ev.entry || {}), id, actor: null, key: false, mannequin: false };
        scripted.add(id);
        return Promise.resolve(fn(e, ev)).catch((err) => console.error(err)).finally(() => { scripted.delete(id); reconcile(false); });
      });
      reconcile(first);
      return Promise.all(playing);
    },
    /** Pickup: bride walks to the vitrine, takes her dress and queues at the cashier */
    async walkToCashier(entry) { await bringToCashier(entry); scripted.delete(entry.id); },
    /** Undo walkToCashier when the handover modal was closed without saving */
    release(id) { scripted.delete(id); const a = actors.get(id); if (a) { a.leaving = true; setCarry(a, null); leave(a, -1); } reconcile(false); },
    select(id) {
      selected = id; actors.forEach(updChip);
      if (id == null) { follow = null; return; }
      const a = actors.get(id);
      if (a) { follow = a; cameraTo({ t: a.root.position.clone().add(V(0, 0.9, 0)), r: Math.min(cam.r, 9), th: cam.th, ph: Math.min(cam.ph, 1.15) }, 0.9); }
      else { follow = null; const p = anchorOf(id); if (p) { if (keys.has(id)) { cab.openUntil = clock.elapsedTime + 5; cameraTo({ t: p, r: 4.6, th: 1.3, ph: 1.25 }, 1); } else cameraTo({ t: p.clone().setY(1.1), r: 6, th: 0.1, ph: 1.1 }, 1); } }
      sfx('pop');
    },
    view(name) { follow = null; if (VIEWS[name]) cameraTo(VIEWS[name]); cab.forceOpen = name === 'cabinet'; },
    /** Small reward on any saved action */
    reward(id, text, money) {
      const p = anchorOf(id) || V(0, 1.5, 0); sfx('step'); ringBurst(p.clone().setY(0), '#59cf9c'); sparkles(p, 12, 0.6); floatText(p, text);
      if (money) { const a = actors.get(id); if (a && a.root.position.distanceTo(till.pos) < 8) { coins(actorPos(a), till.pos, 6).then(() => { drawTill(till.tex.userData.x, 256, 128, money); till.tex.needsUpdate = true; tween(0.5, (k) => (till.drawer.position.x = -Math.sin(k * Math.PI) * 0.22)); act(staff, 'nod', 1); }); } }
    },
    celebrate(id) { const p = anchorOf(id) || V(0, 1.5, 0); confetti(p.clone().add(V(0, 0.5, 0)), 120); sfx('level'); },
    setMuted(v) { muted = v; },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onCancel); canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('contextmenu', onCtx);
      actors.forEach((a) => a.chip.remove()); floaters.forEach((f) => f.el.remove());
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
      disposables.forEach((d) => d.dispose?.());
      renderer.dispose();
      if (AC) AC.close().catch(() => {});
    },
  };
}
