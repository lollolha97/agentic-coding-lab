// The street itself: ground, buildings, shopfronts, neon signs, lamps, the convenience store, club door, food stall,
// subway entrance, gantry sign, signals and overhead cables. Static things are merged per material.
import * as THREE from 'three';
import { GeoBuilder, rng, W, flickerMaterial, ADD_FOG, timeUniform } from './util.js';
import * as T from './textures.js';

const C = hex => new THREE.Color(hex);
const col = (hex, k = 1) => { const c = C(hex); return [c.r * k, c.g * k, c.b * k]; };
const FLOOR = 3.2, SHOP_H = 4.4;
const FASCIA = {
  bar: ['hof', 'pocha', 'beer', 'bar', 'wine', 'makgeolli'], cafe: ['cafe', 'study', 'hair'], white: ['pc', 'pharmacy', 'arcade', 'photo'],
  club: ['club', 'noraebang', 'coin', 'live'], bbq: ['gopchang', 'samgyup', 'chicken', 'ramen', 'tteok'], shutter: ['tattoo', 'vintage', 'hair']
};
const SHOP_LIGHT = { bar: 0xff9a4a, cafe: 0xfff0d8, white: 0xe8fbff, club: 0xc03cff, bbq: 0xff8a50 };

export function buildCity({ scene, glow, wet, steamSpots }) {
  const rand = rng(20261003);
  const obstacles = [], signals = { ped: [], car: [] }, animated = {}, lamps = [];
  const root = new THREE.Group(); scene.add(root);
  const add = (geo, mat, order = 0) => { const m = new THREE.Mesh(geo, mat); m.renderOrder = order; root.add(m); return m; };

  // ---------------------------------------------------------------- textures & materials
  const facadeTex = T.makeFacades(), shopTex = T.makeShops(), atlas = T.makeSignAtlas(), glowTex = T.makeGlowTexture(), poolTex = T.makePoolTexture();
  const facadeMats = facadeTex.map(f => new THREE.MeshLambertMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 1.35 }));
  const shopMats = shopTex.map(f => new THREE.MeshLambertMaterial({ map: f.map, emissiveMap: f.emissive, emissive: 0xffffff, emissiveIntensity: 1.6 }));
  const signMat = flickerMaterial({ map: atlas.texture, toneMapped: false });
  const glowMat = flickerMaterial({ map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }, { additive: true });
  const darkMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const litMat = new THREE.MeshBasicMaterial({ vertexColors: true });   // self-lit props (vending machines, lamp heads, lightboxes)
  const roofMat = new THREE.MeshLambertMaterial({ vertexColors: true });

  const fb = facadeMats.map(() => new GeoBuilder()), sb = shopMats.map(() => new GeoBuilder());
  const rb = new GeoBuilder(), db = new GeoBuilder(), pb = new GeoBuilder(), signB = new GeoBuilder(true), glowB = new GeoBuilder(true), poolB = new GeoBuilder();
  const UV = (e) => [[e.u0, e.v0], [e.u1, e.v0], [e.u1, e.v1], [e.u0, e.v1]];
  const FULL = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const modeFor = () => { const r = rand(); return r < 0.66 ? 0 : r < 0.8 ? 1 : r < 0.89 ? 2 : r < 0.95 ? 3 : 4; };

  // ---------------------------------------------------------------- ground
  const roadTex = T.makeRoad(), walkTex = T.makeSidewalk();
  const LEN = 240, ZC = (W.Z_NEAR + 14 + W.Z_FAR - 20) / 2;
  roadTex.map.repeat.set(1, LEN / 28); roadTex.rough.repeat.set(1, LEN / 28);
  const road = add(new THREE.PlaneGeometry(14, LEN).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: roadTex.map, roughnessMap: roadTex.rough, roughness: 1, metalness: 0.1, envMapIntensity: 1.1 }));
  road.position.set(0, 0, ZC);
  walkTex.map.repeat.set(4.5 / 4, LEN / 4); walkTex.rough.repeat.set(4.5 / 4, LEN / 4);
  const walkMat = new THREE.MeshStandardMaterial({ map: walkTex.map, roughnessMap: walkTex.rough, roughness: 1, metalness: 0.05, envMapIntensity: 0.9 });
  for (const s of [-1, 1]) { const w = add(new THREE.BoxGeometry(4.5, W.CURB, LEN), walkMat); w.position.set(s * 9.25, W.CURB / 2, ZC); pb.box(s * 7.45, W.CURB + 0.004, ZC, 0.32, 0.01, LEN, col(0xc9a227, 0.5)); }
  const ground = add(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x050509 })); ground.position.y = -0.08;
  const cw = add(new THREE.PlaneGeometry(14, 14).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: T.makeCrosswalk(), transparent: true, roughness: 0.4, metalness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, envMapIntensity: 1 }), 1);
  cw.position.set(0, 0.012, W.CROSS_Z);
  // manholes
  for (const [mx, mz] of [[-1.2, 17], [4.6, -27]]) {
    const m = add(new THREE.CircleGeometry(0.42, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x1e2127, roughness: 0.35, metalness: 0.7 }), 1); m.position.set(mx, 0.02, mz);
    steamSpots.push({ x: mx, y: 0.1, z: mz, n: 22, size: 2.2, tint: [0.62, 0.66, 0.82] });
  }

  // ---------------------------------------------------------------- signs
  const gCol = new THREE.Color();
  const glowQuad = (corners, nor, hex, k, fl) => glowB.quad(corners[0], corners[1], corners[2], corners[3], nor, FULL, col(hex, k), fl);
  function wallSign(s, id, zc, yc, hgt, mode, phase, gk = 0.55, streak = true) {
    const e = atlas.entries[id], w = hgt * e.aspect, x = s * 11.4, y0 = yc - hgt / 2, y1 = yc + hgt / 2, zl = zc - w / 2, zh = zc + w / 2;
    const nor = [-s, 0, 0], fl = [mode, phase];
    if (s < 0) signB.quad([x, y0, zh], [x, y0, zl], [x, y1, zl], [x, y1, zh], nor, UV(e), [1, 1, 1], fl);
    else signB.quad([x, y0, zl], [x, y0, zh], [x, y1, zh], [x, y1, zl], nor, UV(e), [1, 1, 1], fl);
    const gx = s * 11.34, gw = w * 0.5 + hgt * 0.9, gh = hgt * 0.5 + hgt * 0.95, gl = zc - gw, gh2 = zc + gw;
    if (s < 0) glowQuad([[gx, yc - gh, gh2], [gx, yc - gh, gl], [gx, yc + gh, gl], [gx, yc + gh, gh2]], nor, e.color, gk, fl);
    else glowQuad([[gx, yc - gh, gl], [gx, yc - gh, gh2], [gx, yc + gh, gh2], [gx, yc + gh, gl]], nor, e.color, gk, fl);
    if (streak && yc < 15) wet.add(x, yc, zc, w / 2, hgt / 2, e.color, 0.8 * gk / 0.55, mode, phase);
    return w;
  }
  function blade(s, id, zc, y0, hgt, mode, phase, gk = 0.55) {
    const e = atlas.entries[id], w = hgt * e.aspect, xw = s * 11.4, xin = xw - s * w, xl = Math.min(xw, xin), xr = Math.max(xw, xin), y1 = y0 + hgt, yc = y0 + hgt / 2, fl = [mode, phase];
    signB.quad([xl, y0, zc + 0.03], [xr, y0, zc + 0.03], [xr, y1, zc + 0.03], [xl, y1, zc + 0.03], [0, 0, 1], UV(e), [1, 1, 1], fl);
    signB.quad([xr, y0, zc - 0.03], [xl, y0, zc - 0.03], [xl, y1, zc - 0.03], [xr, y1, zc - 0.03], [0, 0, -1], UV(e), [1, 1, 1], fl);
    const gx0 = xl - w * 0.8, gx1 = xr + w * 0.8, gy0 = y0 - hgt * 0.12, gy1 = y1 + hgt * 0.12;
    glowQuad([[gx0, gy0, zc + 0.06], [gx1, gy0, zc + 0.06], [gx1, gy1, zc + 0.06], [gx0, gy1, zc + 0.06]], [0, 0, 1], e.color, gk, fl);
    glowQuad([[gx1, gy0, zc - 0.06], [gx0, gy0, zc - 0.06], [gx0, gy1, zc - 0.06], [gx1, gy1, zc - 0.06]], [0, 0, -1], e.color, gk, fl);
    // bracket
    db.box((xl + xr) / 2, y1 + 0.05, zc, w, 0.08, 0.1, [0.05, 0.05, 0.06]);
    if (y0 < 14) wet.add((xl + xr) / 2, yc, zc, w * 0.55, hgt / 2, e.color, 0.9, mode, phase);
  }
  const H_IDS = T.SIGN_DEFS.filter(d => d.k === 'h' && !['store24', 'gantry', 'hongdae', 'open'].includes(d.id)).map(d => d.id);
  const V_IDS = T.SIGN_DEFS.filter(d => d.k === 'v' && !['v-station', 'v-stall'].includes(d.id)).map(d => d.id);
  const pick = a => a[(rand() * a.length) | 0];

  // ---------------------------------------------------------------- buildings
  function building(s, x0, z0, z1, depth, H, fv, withRoof = true) {
    const tw = T.FACADE_TILE.w, th = T.FACADE_TILE.h, uo = rand(), B = fb[fv];
    const xi = s * x0, xo = s * (x0 + depth), xl = Math.min(xi, xo), xr = Math.max(xi, xo), len = (z0 - z1) / tw, hv = H / th;
    if (s < 0) B.quad([xi, 0, z0], [xi, 0, z1], [xi, H, z1], [xi, H, z0], [1, 0, 0], [[uo, 0], [uo + len, 0], [uo + len, hv], [uo, hv]]);
    else B.quad([xi, 0, z1], [xi, 0, z0], [xi, H, z0], [xi, H, z1], [-1, 0, 0], [[uo, 0], [uo + len, 0], [uo + len, hv], [uo, hv]]);
    const dl = (xr - xl) / tw;
    B.quad([xl, 0, z0], [xr, 0, z0], [xr, H, z0], [xl, H, z0], [0, 0, 1], [[uo, 0], [uo + dl, 0], [uo + dl, hv], [uo, hv]]);
    B.quad([xr, 0, z1], [xl, 0, z1], [xl, H, z1], [xr, H, z1], [0, 0, -1], [[uo, 0], [uo + dl, 0], [uo + dl, hv], [uo, hv]]);
    if (!withRoof) return;
    const rc = [0.05 + rand() * 0.03, 0.055 + rand() * 0.03, 0.07 + rand() * 0.03];
    rb.quad([xl, H, z0], [xr, H, z0], [xr, H, z1], [xl, H, z1], [0, 1, 0], FULL, rc);
    if (rand() < 0.55) {   // rooftop clutter: water tank, plant room, antenna
      const cx = xl + (xr - xl) * (0.25 + rand() * 0.5), cz = z1 + (z0 - z1) * (0.25 + rand() * 0.5);
      if (rand() < 0.5) rb.geometry(new THREE.CylinderGeometry(0.9, 0.9, 1.7, 8), new THREE.Matrix4().makeTranslation(cx, H + 0.85, cz), [0.1, 0.11, 0.13]);
      else rb.box(cx, H + 0.8, cz, 2.4 + rand() * 2, 1.6, 2 + rand() * 2, [0.09, 0.1, 0.12]);
      rb.box(cx + 1.5, H + 3, cz - 0.5, 0.08, 6, 0.08, [0.03, 0.03, 0.04]);
      if (rand() < 0.5) glow.add(cx + 1.5, H + 6.05, cz - 0.5, 0xff2020, 1.4, 1.2, 2, rand());   // aircraft warning light
    }
  }
  function shopFront(s, kind, z0, z1, zc) {
    const B = sb[kind], x = s * 11.44, len = (z0 - z1) / T.SHOP_TILE.w, uo = 0;
    if (s < 0) B.quad([x, 0, z0], [x, 0, z1], [x, SHOP_H, z1], [x, SHOP_H, z0], [1, 0, 0], [[uo, 0], [uo + len, 0], [uo + len, 1], [uo, 1]]);
    else B.quad([x, 0, z1], [x, 0, z0], [x, SHOP_H, z0], [x, SHOP_H, z1], [-1, 0, 0], [[uo, 0], [uo + len, 0], [uo + len, 1], [uo, 1]]);
    if (SHOP_LIGHT[SHOP_KINDS[kind]]) wet.add(x, 2.1, zc, (z0 - z1) / 2, 1.6, SHOP_LIGHT[SHOP_KINDS[kind]], 0.5, 0, 0);
    // awning-like canopy shadow line
    db.box(s * 11.2, SHOP_H + 0.1, zc, 0.6, 0.12, z0 - z1, [0.04, 0.04, 0.05]);
  }
  const SHOP_KINDS = T.SHOP_KINDS;
  const kindPick = () => { const r = rand(); return r < 0.24 ? 0 : r < 0.38 ? 1 : r < 0.48 ? 2 : r < 0.6 ? 3 : r < 0.8 ? 4 : 5; };

  const forced = { '-1': [{ z0: -15, z1: -29, type: 'store' }], '1': [{ z0: -34, z1: -44, type: 'club' }] };
  const lots = [];
  for (const s of [-1, 1]) {
    let z = W.Z_NEAR; const list = forced[s];
    while (z > W.Z_FAR) {
      let w = 6.5 + rand() * 8.5, special = null;
      const nx = list.find(f => !f.done && f.z0 <= z + 0.01);
      if (nx) {
        if (Math.abs(z - nx.z0) < 0.01) { w = nx.z0 - nx.z1; special = nx; nx.done = true; }
        else if (z - w < nx.z0) { w = z - nx.z0; if (w < 2.5) { z = nx.z0; continue; } }
      }
      lots.push({ s, z0: z, z1: z - w, special }); z -= w;
    }
  }
  for (const L of lots) {
    const { s, z0, z1, special } = L, zc = (z0 + z1) / 2, w = z0 - z1, nearZone = z0 > -80;
    const depth = 11 + rand() * 6;
    if (!special && rand() < 0.1) {      // alley: a dark gap with a deep back wall and a lonely light
      building(s, 11.5 + 6.5, z0, z1, 10, 16 + rand() * 20, (rand() * 6) | 0);
      glow.add(s * 15.5, 2.4, zc, rand() < 0.5 ? 0xffb86b : 0x6bd5ff, 3.2, 0.9, rand() < 0.3 ? 1 : 0, rand());
      continue;
    }
    const H = nearZone ? 13 + rand() * 20 : 20 + rand() * 38, fv = (rand() * 6) | 0;
    building(s, 11.5, z0, z1, depth, H, fv);
    if (special && special.type === 'store') { L.kind = -1; continue; }   // store front is built separately below
    const kind = special && special.type === 'club' ? 3 : kindPick();
    shopFront(s, kind, z0, z1, zc);
    const ids = FASCIA[SHOP_KINDS[kind]];
    // fascia sign above the shop
    const fid = special ? 'club' : pick(ids), fh = Math.min(1.25 + rand() * 0.4, (w - 1) / atlas.entries[fid].aspect);
    wallSign(s, fid, zc + (rand() - 0.5) * (w * 0.2), SHOP_H + 0.75, fh, special ? 3 : modeFor(), rand());
    // upper floors
    const floors = Math.floor(H / FLOOR), nUp = special ? 2 : (rand() < 0.8 ? 1 + ((rand() * 3) | 0) : 0);
    for (let k = 0; k < nUp; k++) {
      const id = pick(H_IDS), f = 2 + ((rand() * Math.min(5, floors - 2)) | 0), e = atlas.entries[id];
      const hh = Math.min(1.1 + rand() * 0.9, (w - 1.4) / e.aspect);
      if (hh > 0.7) wallSign(s, id, zc + (rand() - 0.5) * Math.max(0, w - hh * e.aspect - 1), f * FLOOR + 1.5, hh, modeFor(), rand(), 0.5);
    }
    const nBl = special ? 1 : (rand() < 0.62 ? 1 + (rand() < 0.3 ? 1 : 0) : 0);
    for (let k = 0; k < nBl; k++) {
      const id = special ? 'v-club' : pick(V_IDS), hh = Math.min(3.2 + rand() * 2.8, H - 5), zz = k === 0 ? z0 - 1.1 : z1 + 1.1;
      if (hh > 2.5) blade(s, id, zz, SHOP_H + 0.3 + rand() * 3.2, hh, special ? 4 : modeFor(), rand(), 0.6);
    }
    // vending machine / pharmacy lightbox on the sidewalk wall
    if (rand() < 0.22) {
      const vc = pick([0x35c9ff, 0xff4d6d, 0x7dff9a, 0xffd23c]), vz = z1 + 1 + rand() * (w - 2);
      pb.box(s * 11.0, 0.95, vz, 0.8, 1.9, 1.0, col(vc, 0.85)); db.box(s * 10.98, 0.12, vz, 0.8, 0.24, 1.0, [0.03, 0.03, 0.04]);
      glow.add(s * 10.5, 1.2, vz, vc, 2.4, 0.5); wet.add(s * 10.6, 1.0, vz, 0.5, 0.9, vc, 0.5);
      obstacles.push({ x: s * 10.9, z: vz, r: 0.9 });
    }
  }

  // far skyline: tall towers set back from the street so the silhouette reads above the front rows
  for (const s of [-1, 1]) {
    let z = W.Z_NEAR + 10;
    while (z > W.Z_FAR - 40) {
      const w = 12 + rand() * 16, H = 36 + rand() * 60;
      building(s, 30 + rand() * 24, z, z - w, 18, H, (rand() * 6) | 0);
      z -= w + rand() * 6;
    }
  }
  // end-of-street towers closing the vista
  for (let i = 0; i < 8; i++) building(1, -40 + i * 11 - 11.5, W.Z_FAR - 10, W.Z_FAR - 30, 14, 40 + rand() * 50, (rand() * 6) | 0);

  // ---------------------------------------------------------------- convenience store (left, z -15 .. -29)
  const storeW = 14, storeZ = -22;
  {
    const tex = T.makeStoreFront();
    const m = add(new THREE.PlaneGeometry(storeW, SHOP_H), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.set(-11.43, SHOP_H / 2, storeZ); m.rotation.y = Math.PI / 2;
    const e = atlas.entries.store24, h = 1.3;
    wallSign(-1, 'store24', storeZ, SHOP_H + 0.85, h, 0, 0, 0.35, false);
    // canopy + door frame
    db.box(-10.9, SHOP_H + 0.1, storeZ, 1.3, 0.14, storeW + 0.4, [0.8, 0.85, 0.85]);
    wet.add(-11.4, 2.2, storeZ, storeW / 2, 2.2, 0xdcfff2, 1.5, 0, 0);
    poolB.quad([-11.5, 0.165, -15.5], [-6.4, 0.165, -15.5], [-6.4, 0.165, -28.5], [-11.5, 0.165, -28.5], [0, 1, 0], FULL, col(0xcaffe8, 0.5));
    glow.add(-10.7, SHOP_H - 0.35, storeZ, 0xe8fff4, 5.5, 0.55);
    const L = new THREE.PointLight(0xcfffee, 70, 26, 2); L.position.set(-9.6, 2.6, storeZ); root.add(L); animated.store = L;
    obstacles.push({ x: -10.4, z: storeZ + 1.5, r: 1.8 });   // customers by the door
  }
  // ---------------------------------------------------------------- club door (right, z -34 .. -44)
  const clubZ = -39;
  { const L = new THREE.PointLight(0xb03cff, 90, 26, 2); L.position.set(9.4, 2.8, clubZ); root.add(L); animated.club = L;
    poolB.quad([11.5, 0.165, -33], [5.5, 0.165, -33], [5.5, 0.165, -45], [11.5, 0.165, -45], [0, 1, 0], FULL, col(0xa040ff, 0.55));
    glow.add(10.6, 3.8, clubZ, 0xff2d95, 5, 0.9, 4, 0.3); glow.add(10.6, 0.7, clubZ - 1.6, 0x8a2bff, 3.5, 0.9, 1, 0.1);
    for (const oz of [-37.4, -35, -32.6]) obstacles.push({ x: 10.7, z: oz, r: 1.4 });
    for (let i = 0; i < 3; i++) pb.box(11.2, 0.5 + i * 1.2, clubZ + 1.2 + 0, 0.06, 0.05, 0.9, col(0xff2d95, 1)); }   // door stanchion lights

  // ---------------------------------------------------------------- food stall (right sidewalk, z -14)
  const stallX = 9.3, stallZ = -14;
  {
    db.box(stallX, 0.5, stallZ, 1.3, 1.0, 2.8, [0.28, 0.2, 0.14]);                       // counter
    pb.box(stallX - 0.66, 0.72, stallZ, 0.04, 0.3, 2.5, col(0xffb04a, 0.9));              // lit menu strip
    for (const [dx, dz] of [[-0.65, -1.4], [-0.65, 1.4], [0.65, -1.4], [0.65, 1.4]]) db.box(stallX + dx, 1.05, stallZ + dz, 0.07, 2.1, 0.07, [0.12, 0.1, 0.08]);
    // tarp roof, tilted toward the street
    const roof = new THREE.BoxGeometry(1.9, 0.07, 3.3); roof.rotateZ(0.12);
    db.geometry(roof, new THREE.Matrix4().makeTranslation(stallX - 0.1, 2.15, stallZ), [0.9, 0.38, 0.1]);
    for (let i = 0; i < 7; i++) glow.add(stallX - 0.8, 2.0, stallZ - 1.5 + i * 0.5, 0xffc060, 1.1, 1.0, i % 4 === 3 ? 1 : 0, rand());
    glow.add(stallX - 0.3, 1.5, stallZ, 0xff9a40, 4.5, 0.55);
    wallSign(1, 'tteok', stallZ, 2.55, 0.55, 0, 0, 0.5, false);   // placed on wall plane; stall also gets its own below
    blade(1, 'v-stall', stallZ + 2.2, 1.7, 1.6, 2, 0.4, 0.5);
    poolB.quad([stallX - 2.2, 0.165, stallZ + 3], [stallX + 1.2, 0.165, stallZ + 3], [stallX + 1.2, 0.165, stallZ - 3], [stallX - 2.2, 0.165, stallZ - 3], [0, 1, 0], FULL, col(0xff9a40, 0.5));
    steamSpots.push({ x: stallX, y: 1.05, z: stallZ - 0.6, n: 26, size: 1.3, tint: [0.88, 0.86, 0.84] }, { x: stallX, y: 1.05, z: stallZ + 0.7, n: 20, size: 1.1, tint: [0.88, 0.86, 0.84] });
    wet.add(stallX - 0.8, 1.6, stallZ, 0.6, 0.8, 0xffa24a, 1.0);
    const L = new THREE.PointLight(0xffa040, 55, 20, 2); L.position.set(stallX - 1, 1.9, stallZ); root.add(L); animated.stall = L;
    obstacles.push({ x: stallX, z: stallZ, r: 2.3 });
  }
  // ---------------------------------------------------------------- subway exit (left sidewalk, z 7)
  const stationX = -10.0, stationZ = 7;
  {
    db.box(stationX, 3.0, stationZ, 3.1, 0.14, 6.2, [0.12, 0.14, 0.16]);                 // canopy roof
    for (const dz of [-3, 3]) for (const dx of [-1.45, 1.45]) db.box(stationX + dx, 1.5, stationZ + dz, 0.12, 3, 0.12, [0.1, 0.12, 0.14]);
    pb.box(stationX + 1.48, 1.5, stationZ, 0.04, 2.7, 5.6, col(0x9fe8ff, 0.18));          // glass panel (street side)
    pb.box(stationX, 0.17, stationZ, 2.8, 0.02, 5.6, col(0x0c0c10, 1));                   // dark stair opening
    pb.box(stationX, 2.84, stationZ, 3.0, 0.05, 5.8, col(0xd6f7ff, 0.9));                 // light strip under the roof
    blade(-1, 'v-station', stationZ - 3.6, 3.4, 3.4, 0, 0, 0.5);
    glow.add(stationX, 2.7, stationZ, 0xd6f7ff, 6, 0.55); glow.add(stationX, 0.5, stationZ, 0xffd9a0, 5, 0.5);
    wet.add(stationX + 1.6, 1.4, stationZ, 2.2, 1.4, 0xcfeeff, 0.8);
    const L = new THREE.PointLight(0x7fe8ff, 45, 22, 2); L.position.set(stationX + 1, 2.7, stationZ); root.add(L); animated.station = L;
    for (const dz of [-2, 0, 2]) obstacles.push({ x: stationX, z: stationZ + dz, r: 1.5 });
  }
  // ---------------------------------------------------------------- gantry sign over the street (z -50)
  {
    const gz = -50, y = 9.3;
    for (const s of [-1, 1]) db.box(s * 10.6, 5, gz, 0.8, 10, 0.8, [0.06, 0.07, 0.09]);
    db.box(0, y, gz, 22, 2.6, 0.5, [0.05, 0.06, 0.08]);
    const e = atlas.entries.gantry, h = 2.3, w = h * e.aspect, fl = [0, 0];
    for (const f of [1, -1]) {
      const z = gz + f * 0.28;
      if (f > 0) signB.quad([-w / 2, y - h / 2, z], [w / 2, y - h / 2, z], [w / 2, y + h / 2, z], [-w / 2, y + h / 2, z], [0, 0, 1], UV(e), [1, 1, 1], fl);
      else signB.quad([w / 2, y - h / 2, z], [-w / 2, y - h / 2, z], [-w / 2, y + h / 2, z], [w / 2, y + h / 2, z], [0, 0, -1], UV(e), [1, 1, 1], fl);
      const zz = gz + f * 0.5, gw = w * 0.75, gh = h * 1.6;
      glowQuad(f > 0 ? [[-gw, y - gh, zz], [gw, y - gh, zz], [gw, y + gh, zz], [-gw, y + gh, zz]] : [[gw, y - gh, zz], [-gw, y - gh, zz], [-gw, y + gh, zz], [gw, y + gh, zz]], [0, 0, f], e.color, 0.7, fl);
    }
    wet.add(0, y, gz, w / 2, h / 2, e.color, 1.5);
    for (let i = 0; i < 9; i++) glow.add(-9 + i * 2.25, y - 1.45, gz + 0.35, 0x39ff7a, 0.9, 0.7, 3, i / 9);   // chase bulbs under the beam
    obstacles.push({ x: -10.6, z: gz, r: 0.9 }, { x: 10.6, z: gz, r: 0.9 });
  }

  // ---------------------------------------------------------------- street lamps
  const lampHex = [0xffb36b, 0xffd9a8, 0xcfe4ff];
  for (const s of [-1, 1]) for (let z = (s < 0 ? 50 : 38); z > W.Z_FAR; z -= 24) {
    const hex = lampHex[(rand() * 3) | 0], hx = s * 5.1, hy = 7.4;
    db.geometry(new THREE.CylinderGeometry(0.09, 0.13, 7.4, 8), new THREE.Matrix4().makeTranslation(s * 7.6, 3.7, z), [0.07, 0.08, 0.1]);
    db.box(s * 6.35, hy + 0.12, z, 2.6, 0.1, 0.12, [0.07, 0.08, 0.1]);
    pb.box(hx, hy, z, 0.9, 0.12, 0.4, col(hex, 1));
    const cone = new THREE.ConeGeometry(3.4, 7.3, 20, 1, true);
    glowB.geometry(cone, new THREE.Matrix4().makeTranslation(hx, hy - 3.65, z), [1, 1, 1], [0, 0], (v) => { const k = Math.max(0, (v.y - 0.0) / hy); const kk = k * k; return col(hex, 0.16 * kk + 0.002); });
    glow.add(hx, hy - 0.1, z, hex, 5.2, 1.0); glow.add(hx, hy - 0.2, z, hex, 15, 0.14);
    poolB.quad([hx - 4, 0.163, z + 4], [hx + 4, 0.163, z + 4], [hx + 4, 0.163, z - 4], [hx - 4, 0.163, z - 4], [0, 1, 0], FULL, col(hex, 0.34));
    wet.add(hx, hy, z, 0.5, 0.55, hex, 1.6);
    lamps.push({ x: hx, z, hex });
    obstacles.push({ x: s * 7.6, z, r: 0.5 });
  }

  // ---------------------------------------------------------------- signals at the crossing
  for (const s of [-1, 1]) for (const dz of [-1, 1]) {
    const px = s * 7.7, pz = W.CROSS_Z + dz * 3.3;
    db.box(px, 1.4, pz, 0.12, 2.8, 0.12, [0.08, 0.08, 0.1]); db.box(px, 2.9, pz, 0.3, 0.55, 0.22, [0.04, 0.04, 0.05]);
    signals.ped.push(glow.add(px - s * 0.02, 2.9, pz, 0xff2a2a, 1.1, 1.2));
    obstacles.push({ x: px, z: pz, r: 0.4 });
  }
  for (const [x, z] of [[6.1, W.CROSS_Z + 4.6], [-6.1, W.CROSS_Z - 4.6]]) {
    db.box(x + Math.sign(x) * 1.4, 2.6, z, 0.12, 5.2, 0.12, [0.08, 0.08, 0.1]); db.box(x + Math.sign(x) * 0.7, 5.15, z, 1.6, 0.1, 0.1, [0.08, 0.08, 0.1]);
    db.box(x, 5.0, z, 0.5, 0.9, 0.3, [0.04, 0.04, 0.05]);
    signals.car.push(glow.add(x, 5.0, z, 0xff2a2a, 1.6, 1.4));
  }

  // ---------------------------------------------------------------- overhead cables
  {
    const pts = [];
    for (let i = 0; i < 26; i++) {
      const z = 46 - i * 8.6 - rand() * 5, y0 = 8 + rand() * 9, y1 = y0 + (rand() - 0.5) * 2, sag = 0.7 + rand() * 1.3;
      for (let b = 0; b < 2 + ((rand() * 2) | 0); b++) {
        const dz = b * 0.12; let px = -11.4, py = y0, pz = z + dz;
        for (let k = 1; k <= 16; k++) { const t = k / 16, x = -11.4 + t * 22.8, y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * sag; pts.push(px, py, pz, x, y, z + dz); px = x; py = y; pz = z + dz; }
      }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); g.computeBoundingSphere();
    root.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0x050609 })));
  }

  // ---------------------------------------------------------------- flush the builders into meshes
  fb.forEach((b, i) => add(b.build(), facadeMats[i]));
  sb.forEach((b, i) => { if (b.vc) add(b.build(), shopMats[i]); });
  add(rb.build(), roofMat).material.vertexColors = true;
  add(db.build(), darkMat); add(pb.build(), litMat);
  add(signB.build(), signMat, 2);
  add(glowB.build(), glowMat, 5).material.side = THREE.DoubleSide;
  const poolMat = new THREE.MeshBasicMaterial({ map: poolTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  poolMat.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <fog_fragment>', ADD_FOG); };
  add(poolB.build(), poolMat, 3);

  const update = (t) => {
    animated.club.intensity = 70 + 40 * Math.max(0, Math.sin(t * 6.5)) * (0.5 + 0.5 * Math.sin(t * 0.9));
    animated.club.color.setHSL(0.78 + 0.1 * Math.sin(t * 0.7), 1, 0.55);
    animated.stall.intensity = 52 + 5 * Math.sin(t * 9.3) * Math.sin(t * 3.1);
  };
  return { obstacles, signals, animated, lamps, update, zones: { store: { x: -9, z: storeZ }, club: { x: 10, z: clubZ }, stall: { x: stallX, z: stallZ }, station: { x: stationX, z: stationZ } }, stall: { x: stallX, z: stallZ }, clubDoor: { x: 10.4, z: clubZ } };
}

// A tiny coloured room that PMREMGenerator turns into the reflection environment for wet asphalt.
export function makeEnvironment(renderer) {
  const env = new THREE.Scene();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 24, 12), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 hor = vec3(.20,.12,.32), top = vec3(.01,.015,.05); gl_FragColor = vec4(mix(hor, top, smoothstep(0.0, .7, h)) * (h < 0.0 ? .3 : 1.), 1.); }'
  }));
  env.add(dome);
  const panel = (hex, k, az, el, w, h) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: C(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(Math.sin(az) * 30, Math.sin(el) * 30, -Math.cos(az) * 30); m.lookAt(0, 0, 0); env.add(m);
  };
  panel(0xff2d95, 6, -0.9, 0.18, 12, 8); panel(0x19e6ff, 6, 0.8, 0.14, 12, 8); panel(0xffa24a, 5, 0.2, 0.1, 10, 5); panel(0xa855ff, 4, 1.8, 0.16, 8, 6);
  panel(0x39ff7a, 3, -1.9, 0.12, 8, 5); panel(0xffffff, 3, 3.0, 0.12, 8, 5); panel(0xff3b3b, 3, 2.4, 0.1, 6, 4); panel(0xffd9a8, 5, -0.2, 0.55, 5, 2);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.03);
  pm.dispose();
  return rt.texture;
}

// Night sky: gradient, drifting clouds lit from below by the city, and a lightning flash uniform.
export function makeSky() {
  const uniforms = { uTime: timeUniform, uFlash: { value: 0 } };
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); gl_Position.z = gl_Position.w; }',
    fragmentShader: /* glsl */`
      uniform float uTime, uFlash; varying vec3 vP;
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); return mix(mix(h2(i),h2(i+vec2(1,0)),f.x), mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x), f.y); }
      float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < 4; i++) { s += a * vn(p); p *= 2.07; a *= .5; } return s; }
      void main(){
        vec3 d = normalize(vP); float h = max(d.y, 0.0);
        vec3 hor = vec3(.105, .075, .16), mid = vec3(.035, .04, .09), top = vec3(.012, .016, .04);
        vec3 c = mix(hor, mid, smoothstep(0., .22, h)); c = mix(c, top, smoothstep(.2, .9, h));
        vec2 q = d.xz / (h + .25) * 1.6 + vec2(uTime * .012, uTime * .006);
        float cl = smoothstep(.38, .85, fbm(q));
        vec3 glowC = mix(vec3(.30, .12, .30), vec3(.12, .20, .36), vn(q * .6));
        c += cl * glowC * (.25 + .5 * smoothstep(.0, .5, h)) * smoothstep(.0, .12, h);
        c += uFlash * (vec3(.55, .62, .85) * (.3 + cl * 1.6));
        gl_FragColor = vec4(c, 1.);
      }`
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 24, 14), mat); sky.frustumCulled = false; sky.renderOrder = -10;
  return { mesh: sky, uniforms };
}
