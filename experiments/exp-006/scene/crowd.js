// Low-poly pedestrians: eight InstancedMeshes draw everyone. Legs and arms swing on a walk phase; people sidestep
// obstacles and the viewer; at the crosswalk a crowd waits on the curb and crosses together on the walk signal.
import * as THREE from 'three';
import { rng, W, clamp, lerp } from './util.js';

const JACKETS = [0x1b1e27, 0x2a2f3d, 0x3b2f2f, 0x23352f, 0x4a4a52, 0x101114, 0x6b2737, 0x2c4a6e, 0xd9d4c8, 0x7a5a3a, 0x8f3b5e, 0x2f6f6a];
const PANTS = [0x15171d, 0x232a3a, 0x30302f, 0x4a5568, 0x0d0e11, 0x3d3a34];
const HAIR = [0x0b0b0d, 0x0b0b0d, 0x0b0b0d, 0x1c1410, 0x2c1d14, 0xd8c8a0, 0xff6fb5, 0x6be5d0, 0x9aa8ff, 0xc9ccd2];
const UMB = [0x16161c, 0x16161c, 0x1d2a4a, 0xaec3d8, 0xaec3d8, 0xc4202e, 0xe8b923, 0xf05d9a, 0x2c9d6a, 0xe9eaee];

const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
const _m = new THREE.Matrix4(), _b = new THREE.Matrix4(), _l = new THREE.Matrix4(), _qy = new THREE.Quaternion(), _qx = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();

export class Crowd {
  constructor({ scene, city, signal }) {
    const rand = rng(777); this.rand = rand; this.signal = signal; this.obstacles = city.obstacles;
    const P = this.people = [];
    const mk = (extra = {}) => ({ x: 0, z: 0, yaw: 0, vx: 0, vz: -1, speed: 1.3, phase: rand() * 6.28, kind: 'walk', umb: false, off: 0, offZ: 0, side: rand() < 0.5 ? -1 : 1, sc: 0.93 + rand() * 0.14, ...extra });
    // sidewalk walkers
    for (const s of [-1, 1]) for (let i = 0; i < 24; i++) {
      const dir = rand() < 0.5 ? -1 : 1;
      P.push(mk({ kind: 'walk', x: s * (7.9 + rand() * 2.9), z: 48 - rand() * 168, vz: dir, speed: 1.0 + rand() * 0.6, umb: rand() < 0.72 }));
    }
    // crosswalk crowd
    for (let i = 0; i < 26; i++) {
      const from = rand() < 0.5 ? -1 : 1, mid = rand() < 0.55;
      const p = mk({ kind: 'cross', from, lane: (rand() - 0.5) * 3.4, speed: 1.55 + rand() * 0.3, umb: rand() < 0.75, state: 'wait', delay: rand() * 2.2, progress: 0 });
      if (mid) { p.state = 'go'; p.progress = rand() * 0.9; }
      p.x = from * 7.6 * (p.state === 'wait' ? 1 : 1); p.z = W.CROSS_Z + p.lane;
      if (p.state === 'wait') { p.x = from * (7.9 + rand() * 1.2); }
      P.push(p);
    }
    // standing groups
    const stand = (x, z, yaw, umb, extra = {}) => P.push(mk({ kind: 'idle', x, z, yaw, umb, speed: 0, ...extra }));
    const cz = city.clubDoor.z;
    for (let i = 0; i < 7; i++) stand(10.7 + (rand() - 0.5) * 0.3, cz + 1.8 + i * 0.95, Math.PI, i > 1 ? rand() < 0.8 : false);
    stand(10.2, cz - 1.5, -Math.PI / 2, false); stand(10.2, cz + 0.9, -Math.PI / 2, false);
    const st = city.stall;
    for (let i = 0; i < 4; i++) stand(st.x - 1.55 - (i % 2) * 0.1, st.z - 1.1 + i * 0.75, Math.PI / 2, false);
    for (let i = 0; i < 3; i++) stand(-10.3, city.zones.store.z + 2 + i * 2.6 - 1, -Math.PI / 2, false);
    for (let i = 0; i < 4; i++) stand(city.zones.station.x + 1.1 - i * 0.35, city.zones.station.z - 1.3 + i * 1.1, rand() * 6.28, false);
    this.N = P.length;
    // colours
    this.colors = P.map(p => ({ jacket: JACKETS[(rand() * JACKETS.length) | 0], pants: PANTS[(rand() * PANTS.length) | 0], hair: HAIR[(rand() * HAIR.length) | 0], umb: UMB[(rand() * UMB.length) | 0] }));
    const N = this.N, U = P.filter(p => p.umb).length; this.U = U;
    const lam = (extra = {}) => new THREE.MeshLambertMaterial({ emissive: 0x161a24, ...extra });
    const geo = {
      torso: new THREE.BoxGeometry(0.4, 0.58, 0.23).translate(0, 1.17, 0),
      head: new THREE.IcosahedronGeometry(0.125, 1).translate(0, 1.6, 0),
      leg: new THREE.BoxGeometry(0.15, 0.86, 0.17).translate(0, -0.43, 0),
      arm: new THREE.BoxGeometry(0.09, 0.56, 0.1).translate(0, -0.28, 0),
      canopy: new THREE.ConeGeometry(0.66, 0.3, 10, 1, false).translate(0, 0.15, 0),
      stick: new THREE.CylinderGeometry(0.014, 0.014, 1.05, 5).translate(0, 0.52, 0)
    };
    const inst = (g, n, m) => { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; scene.add(im); return im; };
    this.m = {
      torso: inst(geo.torso, N, lam()), head: inst(geo.head, N, lam({ emissive: 0x20242e })),
      legL: inst(geo.leg, N, lam()), legR: inst(geo.leg, N, lam()), armL: inst(geo.arm, N, lam()), armR: inst(geo.arm, N, lam()),
      canopy: inst(geo.canopy, U, lam({ side: THREE.DoubleSide, emissive: 0x22262e })), stick: inst(geo.stick, U, lam({ emissive: 0x30323a }))
    };
    let u = 0;
    P.forEach((p, i) => {
      const c = this.colors[i];
      this.m.torso.setColorAt(i, _c.set(c.jacket)); this.m.armL.setColorAt(i, _c.set(c.jacket)); this.m.armR.setColorAt(i, _c.set(c.jacket));
      this.m.legL.setColorAt(i, _c.set(c.pants)); this.m.legR.setColorAt(i, _c.set(c.pants)); this.m.head.setColorAt(i, _c.set(c.hair));
      if (p.umb) { p.ui = u; this.m.canopy.setColorAt(u, _c.set(c.umb)); this.m.stick.setColorAt(u, _c.set(0x202026)); u++; }
    });
    for (const k in this.m) if (this.m[k].instanceColor) this.m[k].instanceColor.needsUpdate = true;
  }

  // lateral dodge: offset perpendicular to the direction of travel so that people curve around an obstacle instead of stopping
  dodge(p, cam, axis) {
    let tgt = 0;
    const test = (ox, oz, R) => {
      const dx = p.x - ox, dz = p.z - oz;
      if (axis === 'x') { // moving along z, dodge in x
        if (Math.abs(dz) >= R) return; const need = Math.sqrt(R * R - dz * dz), cur = dx + tgt;
        const sgn = Math.abs(cur) < 0.35 ? p.side : Math.sign(cur); const have = Math.abs(cur);
        if (have < need) tgt += sgn * (need - have);
      } else {
        if (Math.abs(dx) >= R) return; const need = Math.sqrt(R * R - dx * dx), cur = dz + tgt;
        const sgn = Math.abs(cur) < 0.35 ? p.side : Math.sign(cur); const have = Math.abs(cur);
        if (have < need) tgt += sgn * (need - have);
      }
    };
    if (cam) test(cam.x, cam.z, 2.3);
    for (const o of this.obstacles) { if (Math.abs(o.x - p.x) < o.r + 3.3 && Math.abs(o.z - p.z) < o.r + 3.3) test(o.x, o.z, o.r + 0.55); }
    return clamp(tgt, -3.2, 3.2);
  }

  update(dt, t, cam) {
    const { people: P, signal } = this, m = this.m, sig = signal;
    for (let i = 0; i < P.length; i++) {
      const p = P[i]; let moving = false, vx = 0, vz = 0;
      if (p.kind === 'walk') {
        p.z += p.vz * p.speed * dt; moving = true; vz = p.vz;
        if (p.vz < 0 && p.z < -122) p.z = 50; else if (p.vz > 0 && p.z > 52) p.z = -120;
        const tx = this.dodge(p, cam, 'x'); p.off = lerp(p.off, tx, Math.min(1, dt * 5));
      } else if (p.kind === 'cross') {
        if (p.state === 'wait') {
          if (sig.pedStartWindow) { p.delay -= dt; if (p.delay <= 0) { p.state = 'go'; p.progress = 0; } }
        } else {
          p.progress += p.speed * dt / 15.2; moving = true; vx = -p.from;
          if (p.progress >= 1) { p.state = 'wait'; p.from = -p.from; p.delay = Math.random() * 2.4; p.progress = 0; moving = false; vx = 0; p.x = p.from * (7.9 + Math.random() * 1.2); p.z = W.CROSS_Z + p.lane; }
          else p.x = p.from * (7.7 - p.progress * 15.4);
        }
        const tz = moving ? this.dodge(p, cam, 'z') : 0; p.offZ = lerp(p.offZ, tz, Math.min(1, dt * 5));
      } else {
        // idle: gentle shuffle; step away from the viewer
        const dx = p.x - (cam ? cam.x : 99), dz = p.z - (cam ? cam.z : 99), d = Math.hypot(dx, dz);
        const tx = d < 1.8 ? dx / (d || 1) * (1.8 - d) : 0, tz = d < 1.8 ? dz / (d || 1) * (1.8 - d) : 0;
        p.off = lerp(p.off, tx, Math.min(1, dt * 4)); p.offZ = lerp(p.offZ, tz, Math.min(1, dt * 4));
      }
      // render pose
      let px = p.x, pz = p.z;
      if (p.kind === 'walk') px += p.off; else if (p.kind === 'cross') pz = (p.state === 'wait' ? p.z : W.CROSS_Z + p.lane) + p.offZ; else { px += p.off; pz += p.offZ; }
      if (moving) {
        p.phase += dt * p.speed * 4.6;
        p.yaw = lerpAngle(p.yaw, vx || vz ? Math.atan2(vx + (p.kind === 'walk' ? clamp((p.off - (p.lastOff || 0)) / Math.max(dt, 1e-3), -1, 1) * 0.6 : 0), vz) : p.yaw, Math.min(1, dt * 6));
        p.lastOff = p.off;
      } else if (p.kind === 'idle') {
        p.phase += dt * 0.6;
      }
      const swing = moving ? Math.sin(p.phase) * 0.62 : 0, bob = moving ? Math.abs(Math.sin(p.phase)) * 0.035 : Math.sin(p.phase) * 0.004;
      _qy.setFromAxisAngle(AY, p.yaw); _p.set(px, bob, pz); _s.setScalar(p.sc);
      _b.compose(_p, _qy, _s);
      const part = (mesh, idx, ox, oy, oz, rx) => { _qx.setFromAxisAngle(AX, rx); _p.set(ox, oy, oz); _l.compose(_p, _qx, _one); _m.multiplyMatrices(_b, _l); mesh.setMatrixAt(idx, _m); };
      part(m.torso, i, 0, 0, 0, 0); part(m.head, i, 0, 0, 0, 0);
      part(m.legL, i, -0.1, 0.86, 0, swing); part(m.legR, i, 0.1, 0.86, 0, -swing);
      part(m.armL, i, -0.255, 1.43, 0, -swing * 0.8);
      if (p.umb) {
        part(m.armR, i, 0.255, 1.43, 0, -1.15);
        part(m.canopy, p.ui, 0.25, 1.98, 0.06, 0); part(m.stick, p.ui, 0.25, 1.05, 0.06, 0);
        // umbrella tilts a little with the walk
      } else part(m.armR, i, 0.255, 1.43, 0, swing * 0.8);
    }
    for (const k in m) m[k].instanceMatrix.needsUpdate = true;
  }
}
function lerpAngle(a, b, t) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * t; }
