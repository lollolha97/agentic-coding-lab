// Every texture in this scene is drawn with Canvas 2D at start-up. There are no image files.
import * as THREE from 'three';
import { rng } from './util.js';

export const FONT = '"Noto Sans CJK KR","Apple SD Gothic Neo","Malgun Gothic","Nanum Gothic","NanumGothic",sans-serif';
export const NEON = { pink: '#ff2d95', cyan: '#19e6ff', green: '#39ff7a', yellow: '#ffd23c', orange: '#ff7a1a', violet: '#a855ff', red: '#ff3b3b', blue: '#3d7bff', white: '#f4f8ff', mint: '#4dffd2' };

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
const tex = (c, { srgb = true, repeat = true, aniso = 8 } = {}) => {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
};
const rgba = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
const speckle = (ctx, w, h, n, rand, amt = 0.06) => {
  for (let i = 0; i < n; i++) {
    const v = rand() < 0.5 ? 0 : 255;
    ctx.fillStyle = rgba(v, v, v, rand() * amt);
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2, 1 + rand() * 2);
  }
};

// ---------------------------------------------------------------- facades
// One tile = 4 bays x 4 floors, 128px each. World size of a tile is 12m x 12.8m.
export const FACADE_TILE = { w: 12, h: 12.8 };
const FACADE_STYLES = [
  { base: [58, 64, 78], frame: [30, 34, 42], win: [20, 62, 86, 56], litP: 0.42, ledge: true },                // grey concrete office
  { base: [92, 52, 46], frame: [40, 26, 24], win: [24, 58, 80, 52], litP: 0.38, ledge: true, brick: true },    // red brick villa
  { base: [118, 106, 88], frame: [52, 48, 42], win: [10, 70, 108, 40], litP: 0.5, ribbon: true },              // beige ribbon windows
  { base: [30, 48, 62], frame: [16, 24, 32], win: [4, 4, 120, 120], litP: 0.3, curtain: true },               // dark glass curtain wall
  { base: [74, 78, 66], frame: [34, 38, 32], win: [26, 52, 76, 60], litP: 0.45, balcony: true },             // stucco with balconies
  { base: [96, 108, 104], frame: [40, 48, 48], win: [22, 40, 84, 76], litP: 0.36, shutter: true }              // mint shutter villa
];
const LIGHTS = [[255, 212, 140], [255, 196, 120], [255, 226, 168], [226, 238, 255], [200, 226, 255], [255, 180, 140], [170, 200, 255]];

function facade(style, seed) {
  const rand = rng(seed), S = 512, B = 128;
  const [dc, d] = canvas(S, S), [ec, e] = canvas(S, S);
  d.fillStyle = rgba(...style.base); d.fillRect(0, 0, S, S);
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  // wall surface: vertical rain stains, brick courses or panel seams
  for (let i = 0; i < 40; i++) {
    const x = rand() * S, g = d.createLinearGradient(0, 0, 0, S);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, `rgba(0,0,0,${0.06 + rand() * 0.1})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    d.fillStyle = g; d.fillRect(x, 0, 2 + rand() * 6, S);
  }
  speckle(d, S, S, 3500, rand, 0.09);
  if (style.brick) {
    d.strokeStyle = 'rgba(0,0,0,.28)'; d.lineWidth = 1;
    for (let y = 0; y < S; y += 8) { d.beginPath(); d.moveTo(0, y); d.lineTo(S, y); d.stroke(); for (let x = (y / 8) % 2 ? 0 : 8; x < S; x += 16) { d.beginPath(); d.moveTo(x, y); d.lineTo(x, y + 8); d.stroke(); } }
  } else {
    d.strokeStyle = 'rgba(0,0,0,.35)'; d.lineWidth = 2;
    for (let k = 0; k <= 4; k++) { d.beginPath(); d.moveTo(0, k * B); d.lineTo(S, k * B); d.stroke(); }
  }
  const [wx, wy, ww, wh] = style.win;
  for (let f = 0; f < 4; f++) {
    for (let b = 0; b < 4; b++) {
      const x0 = b * B + wx, y0 = f * B + wy, w = style.ribbon ? B : ww, h = wh;
      const xx = style.ribbon ? b * B : x0, lit = rand() < style.litP;
      // frame
      d.fillStyle = rgba(...style.frame); d.fillRect(xx - 3, y0 - 3, w + 6, h + 6);
      // glass (unlit): sky-reflecting dark gradient
      const g = d.createLinearGradient(0, y0, 0, y0 + h);
      if (lit) {
        const L = LIGHTS[(rand() * LIGHTS.length) | 0], k = 0.65 + rand() * 0.35;
        g.addColorStop(0, rgba(L[0] * k, L[1] * k, L[2] * k)); g.addColorStop(1, rgba(L[0] * k * 0.72, L[1] * k * 0.72, L[2] * k * 0.72));
        d.fillStyle = g; d.fillRect(xx, y0, w, h);
        e.fillStyle = g; e.fillRect(xx, y0, w, h);
        // curtains, plants, silhouettes
        const r = rand();
        if (r < 0.28) { for (const ee of [d, e]) { ee.fillStyle = 'rgba(60,30,20,.38)'; ee.fillRect(xx, y0, w * (0.25 + rand() * 0.3), h); } }
        else if (r < 0.4) { for (const ee of [d, e]) { ee.fillStyle = 'rgba(20,20,26,.55)'; ee.beginPath(); ee.ellipse(xx + w * (0.3 + rand() * 0.4), y0 + h * 0.62, w * 0.12, h * 0.3, 0, 0, 7); ee.fill(); ee.fillRect(xx + w * 0.4, y0 + h * 0.35, w * 0.1, h * 0.65); } }
        else if (r < 0.5) { for (const ee of [d, e]) { ee.fillStyle = 'rgba(70,40,30,.5)'; ee.fillRect(xx, y0 + h * 0.55, w, 3); ee.fillRect(xx + w * 0.5, y0, 2, h); } }
      } else {
        g.addColorStop(0, '#16213a'); g.addColorStop(1, '#070b16');
        d.fillStyle = g; d.fillRect(xx, y0, w, h);
        d.fillStyle = 'rgba(120,150,220,.12)'; d.beginPath(); d.moveTo(xx, y0 + h); d.lineTo(xx + w * 0.5, y0); d.lineTo(xx + w * 0.7, y0); d.lineTo(xx + w * 0.2, y0 + h); d.fill();
      }
      d.fillStyle = 'rgba(0,0,0,.4)'; d.fillRect(xx + w / 2 - 1, y0, 2, h);                   // sash
      if (style.ledge) { d.fillStyle = 'rgba(190,190,200,.28)'; d.fillRect(xx - 6, y0 + h + 3, w + 12, 5); }
      if (style.balcony && f % 2 === 1) { d.fillStyle = 'rgba(15,16,20,.8)'; d.fillRect(xx - 8, y0 + h - 6, w + 16, 12); d.fillStyle = 'rgba(130,140,150,.4)'; for (let r = 0; r < w + 16; r += 8) d.fillRect(xx - 8 + r, y0 + h - 26, 2, 20); }
      if (style.shutter && rand() < 0.5) { d.fillStyle = 'rgba(40,70,60,.85)'; d.fillRect(xx - 12, y0 - 3, 11, h + 6); d.fillRect(xx + w + 1, y0 - 3, 11, h + 6); }
      if (rand() < 0.18) { d.fillStyle = 'rgba(200,205,210,.55)'; d.fillRect(xx + w + 8 > b * B + B - 14 ? xx - 20 : xx + w + 6, y0 + h - 22, 18, 20); d.fillStyle = 'rgba(30,30,34,.7)'; d.fillRect((xx + w + 8 > b * B + B - 14 ? xx - 20 : xx + w + 6) + 3, y0 + h - 18, 12, 10); }  // outdoor AC unit
    }
  }
  if (style.curtain) {   // mullion grid over the glass wall
    d.strokeStyle = 'rgba(8,12,18,.7)'; d.lineWidth = 3;
    for (let x = 0; x <= S; x += 32) { d.beginPath(); d.moveTo(x, 0); d.lineTo(x, S); d.stroke(); }
    for (let y = 0; y <= S; y += 32) { d.beginPath(); d.moveTo(0, y); d.lineTo(S, y); d.stroke(); }
    e.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 40; i++) e.fillRect(((rand() * 16) | 0) * 32, ((rand() * 16) | 0) * 32, 32, 32);
  }
  return { map: tex(dc), emissive: tex(ec) };
}
export const makeFacades = () => FACADE_STYLES.map((s, i) => facade(s, 1000 + i * 77));

// ---------------------------------------------------------------- ground-floor shopfronts (tile = 4m x 4.4m)
export const SHOP_TILE = { w: 4, h: 4.4 };
function shop(kind, seed) {
  const rand = rng(seed), W = 512, H = 512;
  const [dc, d] = canvas(W, H), [ec, e] = canvas(W, H);
  const wall = { bar: [44, 30, 28], cafe: [210, 214, 220], white: [180, 186, 190], club: [14, 10, 20], shutter: [86, 90, 96], bbq: [70, 30, 24] }[kind];
  d.fillStyle = rgba(...wall); d.fillRect(0, 0, W, H); e.fillStyle = '#000'; e.fillRect(0, 0, W, H);
  speckle(d, W, H, 2500, rand, 0.1);
  if (kind === 'shutter') {
    for (let y = 40; y < H; y += 14) { d.fillStyle = 'rgba(0,0,0,.35)'; d.fillRect(0, y, W, 3); d.fillStyle = 'rgba(255,255,255,.07)'; d.fillRect(0, y + 3, W, 2); }
    for (let i = 0; i < 14; i++) { d.fillStyle = [NEON.pink, NEON.cyan, NEON.yellow, '#fff'][i % 4]; d.globalAlpha = 0.5; d.fillRect(rand() * W, 120 + rand() * 280, 20 + rand() * 40, 14 + rand() * 20); }
    d.globalAlpha = 1; return { map: tex(dc), emissive: tex(ec) };
  }
  // glass opening
  const gx = 28, gy = 92, gw = W - 56, gh = H - 92 - 54;
  const interior = { bar: [[255, 150, 70], [255, 190, 110]], cafe: [[255, 244, 220], [255, 255, 240]], white: [[236, 250, 255], [255, 255, 255]], club: [[130, 30, 190], [255, 40, 150]], bbq: [[255, 120, 60], [255, 170, 90]] }[kind];
  const g = e.createLinearGradient(0, gy, 0, gy + gh);
  g.addColorStop(0, rgba(...interior[1])); g.addColorStop(1, rgba(...interior[0]));
  e.fillStyle = g; e.fillRect(gx, gy, gw, gh); d.fillStyle = g; d.fillRect(gx, gy, gw, gh);
  const dim = (c, a) => { for (const ctx of [d, e]) { ctx.fillStyle = c.replace('A', a); } };
  if (kind === 'bar' || kind === 'bbq') {
    for (const ctx of [d, e]) {
      ctx.fillStyle = 'rgba(30,14,10,.78)';
      for (let t = 0; t < 3; t++) { const x = gx + 40 + t * 150; ctx.fillRect(x, gy + gh - 120, 90, 10); ctx.fillRect(x + 40, gy + gh - 110, 10, 110); }
      for (let p = 0; p < 4; p++) { const x = gx + 36 + p * 124 + rand() * 20; ctx.beginPath(); ctx.arc(x, gy + gh - 150 - rand() * 16, 13, 0, 7); ctx.fill(); ctx.fillRect(x - 3, gy + gh - 140, 6, 40); }
      for (let l = 0; l < 4; l++) { ctx.fillStyle = 'rgba(255,230,160,.9)'; ctx.beginPath(); ctx.arc(gx + 56 + l * 130, gy + 24, 10, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(30,14,10,.78)'; }
    }
  } else if (kind === 'cafe' || kind === 'white') {
    for (const ctx of [d, e]) {
      for (let s = 0; s < 3; s++) { ctx.fillStyle = 'rgba(60,70,80,.65)'; ctx.fillRect(gx + 10, gy + 26 + s * 70, gw - 20, 6); for (let i = 0; i < 18; i++) { ctx.fillStyle = [NEON.pink, NEON.yellow, NEON.cyan, NEON.green, '#fff'][(rand() * 5) | 0]; ctx.globalAlpha = 0.85; ctx.fillRect(gx + 16 + i * 25, gy + 4 + s * 70, 17, 21); } ctx.globalAlpha = 1; }
    }
  } else if (kind === 'club') {
    for (const ctx of [d, e]) {
      ctx.strokeStyle = NEON.violet; ctx.lineWidth = 6; ctx.shadowColor = NEON.violet; ctx.shadowBlur = 24; ctx.strokeRect(gx + 4, gy + 4, gw - 8, gh - 8);
      ctx.strokeStyle = NEON.pink; ctx.beginPath(); ctx.moveTo(gx + 20, gy + gh - 40); ctx.lineTo(gx + gw / 2, gy + 30); ctx.lineTo(gx + gw - 20, gy + gh - 40); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(0,0,0,.72)'; ctx.fillRect(gx + gw / 2 - 40, gy + 50, 80, gh - 50);                 // door
    }
  }
  // mullions + bulkhead
  d.fillStyle = rgba(wall[0] * 0.55, wall[1] * 0.55, wall[2] * 0.55);
  for (const x of [gx, gx + gw / 2 - 4, gx + gw - 6]) d.fillRect(x, gy, 8, gh);
  d.fillRect(gx, gy + gh, gw, H - gy - gh); d.fillRect(gx, gy - 6, gw, 8);
  e.fillStyle = '#000'; for (const x of [gx, gx + gw / 2 - 4, gx + gw - 6]) e.fillRect(x, gy, 8, gh);
  // faint glass sheen
  d.fillStyle = 'rgba(255,255,255,.07)'; d.beginPath(); d.moveTo(gx, gy + gh); d.lineTo(gx + gw * 0.4, gy); d.lineTo(gx + gw * 0.52, gy); d.lineTo(gx + gw * 0.12, gy + gh); d.fill();
  return { map: tex(dc), emissive: tex(ec) };
}
export const SHOP_KINDS = ['bar', 'cafe', 'white', 'club', 'bbq', 'shutter'];
export const makeShops = () => SHOP_KINDS.map((k, i) => shop(k, 2000 + i * 31));

// convenience store front: 14m x 4.4m, fully lit
export function makeStoreFront() {
  const W = 1792, H = 560, rand = rng(77);
  const [c, x] = canvas(W, H);
  x.fillStyle = '#e9f3f0'; x.fillRect(0, 0, W, H);
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#fffef6'); g.addColorStop(1, '#d6f0ea'); x.fillStyle = g; x.fillRect(0, 70, W, H - 70);
  // ceiling light strips
  x.fillStyle = '#fff'; for (let i = 0; i < 6; i++) x.fillRect(80 + i * 290, 82, 200, 12);
  // shelves with product blocks
  for (let s = 0; s < 3; s++) {
    const y = 150 + s * 105;
    x.fillStyle = '#9fb0b0'; x.fillRect(40, y + 78, W - 80, 8);
    for (let i = 0; i < 70; i++) { x.fillStyle = [NEON.pink, NEON.yellow, NEON.cyan, NEON.green, '#ff8a3c', '#ffffff', '#3d7bff', '#e94a4a'][(rand() * 8) | 0]; const w = 14 + rand() * 18, h = 24 + rand() * 38; x.fillRect(46 + i * 24.5 + rand() * 4, y + 78 - h, w, h); }
  }
  // fridge doors (cool cyan glow) on the right
  x.fillStyle = 'rgba(120,230,255,.55)'; x.fillRect(W - 520, 110, 480, 380);
  x.strokeStyle = '#678'; x.lineWidth = 6; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(W - 520 + i * 120, 110); x.lineTo(W - 520 + i * 120, 490); x.stroke(); }
  for (let r = 0; r < 4; r++) for (let i = 0; i < 20; i++) { x.fillStyle = [NEON.pink, NEON.yellow, NEON.green, '#fff', '#ff7a1a'][(rand() * 5) | 0]; x.fillRect(W - 510 + i * 23.5, 130 + r * 88, 15, 52); }
  // counter + door
  x.fillStyle = '#7b8a90'; x.fillRect(560, 400, 240, 100);
  x.fillStyle = 'rgba(40,60,66,.35)'; x.fillRect(W / 2 - 110, 110, 220, 450);
  x.strokeStyle = '#5b6a70'; x.lineWidth = 8; x.strokeRect(W / 2 - 110, 110, 220, 450);
  // frame bars
  x.fillStyle = '#4a5a60'; for (const px of [0, 420, 880, 1340, W - 10]) x.fillRect(px, 70, 10, H - 70);
  x.fillStyle = '#2a3236'; x.fillRect(0, 520, W, 40);
  return tex(c, { repeat: false });
}

// ---------------------------------------------------------------- neon sign atlas
const BOX_PAD = 10;
function roundRect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function fit(ctx, text, maxW, size, weight = 800) { ctx.font = `${weight} ${size}px ${FONT}`; const m = ctx.measureText(text).width; return m > maxW ? size * maxW / m : size; }
function neonStroke(ctx, text, x, y, size, color) {
  ctx.font = `800 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.shadowColor = color; ctx.fillStyle = color;
  ctx.shadowBlur = size * 0.5; ctx.globalAlpha = 0.8; ctx.fillText(text, x, y); ctx.fillText(text, x, y);
  ctx.globalAlpha = 1; ctx.shadowBlur = size * 0.16; ctx.fillStyle = color; ctx.fillText(text, x, y);
  ctx.shadowBlur = size * 0.1; ctx.lineWidth = Math.max(2, size * 0.06); ctx.strokeStyle = 'rgba(255,255,255,.92)'; ctx.strokeText(text, x, y);
  ctx.shadowBlur = 0;
}

// Each design: kind h|v, text, color, optional sub text / style
export const SIGN_DEFS = [
  { id: 'hongdae', k: 'h', t: '홍대입구', c: 'cyan', sub: 'HONGDAE', s: 'neon', w: 1.6 },
  { id: 'club', k: 'h', t: '클럽', c: 'pink', sub: 'CLUB', s: 'neon' },
  { id: 'noraebang', k: 'h', t: '노래방', c: 'pink', s: 'neon' },
  { id: 'pc', k: 'h', t: 'PC방', c: 'green', s: 'neon' },
  { id: 'gopchang', k: 'h', t: '곱창', c: 'orange', sub: '막창·대창', s: 'neon' },
  { id: 'hof', k: 'h', t: '호프', c: 'yellow', sub: 'BEER', s: 'neon' },
  { id: 'coin', k: 'h', t: '코인노래방', c: 'violet', sub: 'COIN KARAOKE', s: 'neon' },
  { id: 'chicken', k: 'h', t: '치킨', c: 'yellow', s: 'box', bg: '#c1121f' },
  { id: 'pocha', k: 'h', t: '포차', c: 'red', sub: '24시', s: 'neon' },
  { id: 'makgeolli', k: 'h', t: '막걸리', c: 'white', sub: '파전·도토리묵', s: 'box', bg: '#1d4ed8' },
  { id: 'samgyup', k: 'h', t: '삼겹살', c: 'red', s: 'neon' },
  { id: 'cafe', k: 'h', t: '카페', c: 'mint', sub: 'COFFEE', s: 'neon' },
  { id: 'arcade', k: 'h', t: '오락실', c: 'yellow', sub: 'ARCADE', s: 'neon' },
  { id: 'photo', k: 'h', t: '인생네컷', c: 'pink', sub: 'PHOTO', s: 'neon' },
  { id: 'bar', k: 'h', t: 'BAR', c: 'blue', s: 'neon' },
  { id: 'live', k: 'h', t: 'LIVE', c: 'red', sub: '라이브 클럽', s: 'neon' },
  { id: 'open', k: 'h', t: 'OPEN', c: 'green', s: 'neon', small: true },
  { id: 'hair', k: 'h', t: '헤어', c: 'cyan', sub: 'HAIR', s: 'neon' },
  { id: 'tattoo', k: 'h', t: '타투', c: 'violet', sub: 'TATTOO', s: 'neon' },
  { id: 'ramen', k: 'h', t: '라멘', c: 'red', s: 'box', bg: '#111827' },
  { id: 'beer', k: 'h', t: '생맥주', c: 'orange', s: 'neon' },
  { id: 'wine', k: 'h', t: '와인바', c: 'pink', sub: 'WINE', s: 'neon' },
  { id: 'vintage', k: 'h', t: '빈티지', c: 'cyan', sub: 'VINTAGE', s: 'neon' },
  { id: 'tteok', k: 'h', t: '떡볶이', c: 'red', s: 'box', bg: '#ffdf6b', ink: '#c1121f' },
  { id: 'study', k: 'h', t: '스터디카페', c: 'green', s: 'neon' },
  { id: 'pharmacy', k: 'h', t: '약국', c: 'green', s: 'box', bg: '#052e1a', cross: true },
  { id: 'store24', k: 'h', t: '24시 편의점', c: 'white', s: 'store', w: 2.4 },
  { id: 'gantry', k: 'h', t: '홍대입구', c: 'cyan', sub: 'HONGDAE ENTRANCE', s: 'neon', w: 2.6, hh: 200 },
  { id: 'v-club', k: 'v', t: '클럽', c: 'pink', s: 'neon' },
  { id: 'v-noraebang', k: 'v', t: '노래방', c: 'cyan', s: 'neon' },
  { id: 'v-pc', k: 'v', t: 'PC방', c: 'green', s: 'neon' },
  { id: 'v-hof', k: 'v', t: '호프', c: 'yellow', s: 'neon' },
  { id: 'v-pocha', k: 'v', t: '포차', c: 'orange', s: 'neon' },
  { id: 'v-gopchang', k: 'v', t: '곱창', c: 'red', s: 'neon' },
  { id: 'v-billiard', k: 'v', t: '당구장', c: 'green', s: 'box', bg: '#052e1a' },
  { id: 'v-chicken', k: 'v', t: '치킨', c: 'yellow', s: 'box', bg: '#c1121f' },
  { id: 'v-arcade', k: 'v', t: '오락실', c: 'violet', s: 'neon' },
  { id: 'v-coin', k: 'v', t: '코인노래방', c: 'violet', s: 'neon' },
  { id: 'v-24', k: 'v', t: '24시', c: 'white', s: 'box', bg: '#047857' },
  { id: 'v-station', k: 'v', t: '홍대입구', c: 'white', s: 'station' },
  { id: 'v-stall', k: 'v', t: '어묵', c: 'red', s: 'box', bg: '#ffdf6b', ink: '#b91c1c' }
];

function drawSign(ctx, def, x, y, w, h) {
  ctx.save(); ctx.translate(x, y);
  const col = NEON[def.c] || '#fff';
  const vertical = def.k === 'v';
  ctx.shadowBlur = 0; ctx.globalAlpha = 1;
  if (def.s === 'store') {
    ctx.fillStyle = '#f7fbff'; roundRect(ctx, 4, 4, w - 8, h - 8, 10); ctx.fill();
    ctx.fillStyle = '#0a7d43'; ctx.fillRect(4, 4, w - 8, 18); ctx.fillStyle = '#ff7a1a'; ctx.fillRect(4, 22, w - 8, 10); ctx.fillStyle = '#1d4ed8'; ctx.fillRect(4, h - 26, w - 8, 22);
    ctx.fillStyle = '#0b3d2e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `900 ${fit(ctx, def.t, w * 0.8, h * 0.52, 900)}px ${FONT}`; ctx.fillText(def.t, w / 2, h / 2 + 2);
    ctx.restore(); return;
  }
  // dark backing panel
  ctx.fillStyle = def.s === 'box' ? def.bg : 'rgba(7,5,14,.94)'; roundRect(ctx, BOX_PAD, BOX_PAD, w - 2 * BOX_PAD, h - 2 * BOX_PAD, 14); ctx.fill();
  if (def.s === 'station') {
    ctx.fillStyle = '#0a8f4a'; ctx.fillRect(BOX_PAD, BOX_PAD, w - 2 * BOX_PAD, h - 2 * BOX_PAD);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(w / 2, 86, 42, 0, 7); ctx.fill();
    ctx.fillStyle = '#0a8f4a'; ctx.font = `900 62px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('2', w / 2, 90);
    ctx.fillStyle = '#fff'; const chars = [...def.t]; const sz = Math.min(w * 0.62, (h - 190) / chars.length);
    ctx.font = `900 ${sz}px ${FONT}`; chars.forEach((ch, i) => ctx.fillText(ch, w / 2, 150 + sz * (i + 0.55)));
    ctx.restore(); return;
  }
  if (def.s === 'box') {
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 3; roundRect(ctx, BOX_PAD + 7, BOX_PAD + 7, w - 2 * BOX_PAD - 14, h - 2 * BOX_PAD - 14, 10); ctx.stroke();
  } else {
    ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.shadowColor = col; ctx.shadowBlur = 14; roundRect(ctx, BOX_PAD + 5, BOX_PAD + 5, w - 2 * BOX_PAD - 10, h - 2 * BOX_PAD - 10, 12); ctx.stroke(); ctx.shadowBlur = 0;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const paint = (text, cx, cy, size) => {
    if (def.s === 'box') { ctx.font = `900 ${size}px ${FONT}`; ctx.fillStyle = def.ink || '#fff'; ctx.fillText(text, cx, cy); }
    else neonStroke(ctx, text, cx, cy, size, col);
  };
  if (vertical) {
    const chars = [...def.t]; const sz = Math.min(w * 0.62, (h - 70) / chars.length * 0.94);
    const total = sz * chars.length, y0 = (h - total) / 2;
    chars.forEach((ch, i) => paint(ch, w / 2, y0 + sz * (i + 0.52), sz));
  } else {
    const mainSize = h * (def.sub ? 0.5 : 0.62), cy = def.sub ? h * 0.42 : h / 2;
    const s = fit(ctx, def.t, w * 0.84, mainSize);
    if (def.cross) { ctx.fillStyle = '#39ff7a'; const cx = w * 0.14, r = h * 0.12; ctx.fillRect(cx - r, h / 2 - r * 0.35, r * 2, r * 0.7); ctx.fillRect(cx - r * 0.35, h / 2 - r, r * 0.7, r * 2); }
    paint(def.t, w / 2 + (def.cross ? w * 0.06 : 0), cy, s);
    if (def.sub) {
      const subSize = fit(ctx, def.sub, w * 0.7, h * 0.17, 700);
      ctx.font = `700 ${subSize}px ${FONT}`; ctx.fillStyle = def.s === 'box' ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.85)'; ctx.shadowColor = col; ctx.shadowBlur = def.s === 'box' ? 0 : 8;
      ctx.fillText(def.sub, w / 2, h * 0.8); ctx.shadowBlur = 0;
    }
  }
  ctx.restore();
}

// Shelf-pack every sign into one 2048 atlas, so all signs render in a single draw call.
export function makeSignAtlas() {
  const S = 2048, [c, ctx] = canvas(S, S);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, S, S);
  const entries = {}; let x = 0, y = 0, rowH = 0;
  for (const def of SIGN_DEFS) {
    const wide = def.w || 1;
    const w = def.k === 'h' ? Math.round(512 * wide) : 160, h = def.hh || (def.k === 'h' ? 144 : 512);
    if (x + w > S) { x = 0; y += rowH; rowH = 0; }
    drawSign(ctx, def, x, y, w, h);
    entries[def.id] = { id: def.id, k: def.k, u0: x / S, u1: (x + w) / S, v0: 1 - (y + h) / S, v1: 1 - y / S, aspect: w / h, color: NEON[def.c] || '#fff' };
    x += w; rowH = Math.max(rowH, h);
  }
  const t = tex(c, { repeat: false, aniso: 8 });
  return { texture: t, entries };
}

// soft glow used behind signs (stretched to the sign's shape)
export function makeGlowTexture() {
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.22, 'rgba(255,255,255,.55)'); g.addColorStop(0.5, 'rgba(255,255,255,.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return tex(c, { repeat: false });
}
// horizontal fade used by headlight beams / lamp pools on the ground
export function makePoolTexture() {
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return tex(c, { repeat: false });
}

// ---------------------------------------------------------------- road, sidewalk, crosswalk
export function makeRoad() {
  const rand = rng(31), W = 512, H = 1024, mpp = 14 / W;
  const [c, x] = canvas(W, H);
  x.fillStyle = '#17191f'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) { const a = x.createRadialGradient(0, 0, 0, 0, 0, 1); const r = 30 + rand() * 90; x.save(); x.translate(rand() * W, rand() * H); x.scale(r, r * 2.2); a.addColorStop(0, rgba(255, 255, 255, 0.025 + rand() * 0.03)); a.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = a; x.beginPath(); x.arc(0, 0, 1, 0, 7); x.fill(); x.restore(); }
  speckle(x, W, H, 30000, rand, 0.1);
  // tyre tracks (darker, polished) in each lane
  for (const lx of [-5.2, -2.3, 2.3, 5.2]) for (const off of [-0.75, 0.75]) { const px = (lx + off + 7) / mpp; const g = x.createLinearGradient(px - 12, 0, px + 12, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(px - 12, 0, 24, H); }
  // cracks
  x.strokeStyle = 'rgba(0,0,0,.5)'; x.lineWidth = 1.2;
  for (let i = 0; i < 12; i++) { x.beginPath(); let px = rand() * W, py = rand() * H; x.moveTo(px, py); for (let k = 0; k < 10; k++) { px += (rand() - 0.5) * 26; py += rand() * 24; x.lineTo(px, py); } x.stroke(); }
  const U = m => (m + 7) / mpp;
  x.fillStyle = 'rgba(255,196,32,.82)'; x.fillRect(U(-0.22), 0, 5, H); x.fillRect(U(0.14), 0, 5, H);     // double yellow centre line
  x.fillStyle = 'rgba(235,238,245,.7)';
  for (const lx of [-3.75, 3.75]) for (let y = 0; y < H; y += 220) x.fillRect(U(lx) - 3, y, 6, 110);     // dashed lane lines (pitch 6m)
  x.fillRect(U(-6.75) - 3, 0, 6, H); x.fillRect(U(6.75) - 3, 0, 6, H);                                  // edge lines
  // painted wear
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(0,0,0,${rand() * 0.25})`; x.fillRect(rand() * W, rand() * H, 2 + rand() * 6, 2 + rand() * 9); }
  x.globalCompositeOperation = 'source-over';
  const road = tex(c);
  // roughness: wet asphalt with elongated puddles (G channel, low = mirror-like)
  const [rc, r] = canvas(256, 512); r.fillStyle = '#a8a8a8'; r.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 46; i++) { const px = rand() * 256, py = rand() * 512, rr = 14 + rand() * 40; r.save(); r.translate(px, py); r.scale(rr * (0.6 + rand() * 0.5), rr * (1.2 + rand())); const g = r.createRadialGradient(0, 0, 0, 0, 0, 1); const lo = (18 + rand() * 40) | 0; g.addColorStop(0, rgba(lo, lo, lo)); g.addColorStop(0.55, rgba(lo + 40, lo + 40, lo + 40, 0.7)); g.addColorStop(1, 'rgba(168,168,168,0)'); r.fillStyle = g; r.beginPath(); r.arc(0, 0, 1, 0, 7); r.fill(); r.restore(); }
  speckle(r, 256, 512, 8000, rand, 0.18);
  return { map: road, rough: tex(rc, { srgb: false }) };
}
export function makeSidewalk() {
  const rand = rng(55), S = 512, [c, x] = canvas(S, S);
  x.fillStyle = '#26262d'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = 34 + rand() * 18; x.fillStyle = rgba(v, v, v + 4); x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); }
  speckle(x, S, S, 9000, rand, 0.1);
  x.strokeStyle = 'rgba(0,0,0,.7)'; x.lineWidth = 3; for (let k = 0; k <= 8; k++) { x.beginPath(); x.moveTo(k * 64, 0); x.lineTo(k * 64, S); x.stroke(); x.beginPath(); x.moveTo(0, k * 64); x.lineTo(S, k * 64); x.stroke(); }
  const [rc, r] = canvas(256, 256); r.fillStyle = '#8a8a8a'; r.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 24; i++) { r.save(); r.translate(rand() * 256, rand() * 256); r.scale(14 + rand() * 30, 14 + rand() * 30); const g = r.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, '#2a2a2a'); g.addColorStop(1, 'rgba(138,138,138,0)'); r.fillStyle = g; r.beginPath(); r.arc(0, 0, 1, 0, 7); r.fill(); r.restore(); }
  r.strokeStyle = '#e0e0e0'; r.lineWidth = 3; for (let k = 0; k <= 4; k++) { r.beginPath(); r.moveTo(k * 64, 0); r.lineTo(k * 64, 256); r.stroke(); r.beginPath(); r.moveTo(0, k * 64); r.lineTo(256, k * 64); r.stroke(); }
  return { map: tex(c), rough: tex(rc, { srgb: false }) };
}
// crosswalk zebra + stop lines, a 14m x 14m decal centred on the crossing
export function makeCrosswalk() {
  const rand = rng(9), S = 1024, [c, x] = canvas(S, S), mpp = 14 / S;
  x.clearRect(0, 0, S, S);
  const mid = S / 2, half = 2.2 / mpp;
  x.fillStyle = 'rgba(240,244,250,.88)';
  for (let m = -6.75; m < 6.8; m += 1.0) x.fillRect((m + 7) / mpp, mid - half, 0.5 / mpp, half * 2);
  // stop lines: traffic toward -Z (x>0) stops on the +Z side, the opposite lane on the -Z side
  // (canvas y grows toward world +Z)
  x.fillRect(S / 2, mid + half + 2.8 / mpp, 7 / mpp - 6, 0.4 / mpp);
  x.fillRect(6, mid - half - 3.2 / mpp, 7 / mpp - 6, 0.4 / mpp);
  x.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${rand() * 0.5})`; x.fillRect(rand() * S, rand() * S, 2 + rand() * 12, 2 + rand() * 14); }
  x.globalCompositeOperation = 'source-over';
  return tex(c, { repeat: false });
}
