// Traffic signal clock + cars (instanced boxes with headlight cones, taillights and wet-road streaks).
import * as THREE from 'three';
import { rng, W, clamp, ADD_FOG } from './util.js';
import { makePoolTexture } from './textures.js';

export const CYCLE = 44;
// 0-26 cars go - 26-28.5 amber - 28.5-44 cars stopped; pedestrians walk 28.5-38 (blinking from 35), cleared by 44.
export class Signal {
  constructor(start = 29.2) { this.clock = start; }
  update(dt) { this.clock = (this.clock + dt) % CYCLE; }
  get carRed() { return this.clock >= 26; }
  get amber() { return this.clock >= 26 && this.clock < 28.5; }
  get pedWalk() { return this.clock >= 28.5 && this.clock < 38; }
  get pedBlink() { return this.clock >= 35 && this.clock < 38; }
  get pedStartWindow() { return this.clock >= 28.7 && this.clock < 31.6; }
}

const CAR_COLORS = [0x8f959d, 0x7e848c, 0x6b727b, 0x23262c, 0x17181c, 0x1e2f55, 0xc27a08, 0x7a1717, 0x59616b];
const LEN = 4.3, HALF = LEN / 2;
const _m = new THREE.Matrix4(), _l = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _Y = new THREE.Vector3(0, 1, 0);

export class Traffic {
  constructor({ scene, glow, wet, signal }) {
    this.signal = signal; this.glow = glow; this.wet = wet;
    const rand = rng(404); this.rand = rand;
    // two cars per lane in the near field, one more in the far field
    this.cars = [];
    const lanes = W.LANES;
    lanes.forEach((x, li) => {
      const dir = x < 0 ? 1 : -1;
      for (let i = 0; i < 3; i++) this.cars.push({ x, dir, z: 30 - i * 50 - li * 13 - rand() * 8, v: 0, v0: 8 + rand() * 4, color: CAR_COLORS[(rand() * CAR_COLORS.length) | 0], waiting: false, lane: li });
    });
    // keep initial gaps legal: sort per lane and push apart
    for (let li = 0; li < lanes.length; li++) {
      const c = this.cars.filter(k => k.lane === li).sort((a, b) => a.z - b.z);
      for (let i = 1; i < c.length; i++) if (c[i].z - c[i - 1].z < 22) c[i].z = c[i - 1].z + 22 + rand() * 6;
    }
    const N = this.cars.length; this.N = N;
    const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.34, metalness: 0.45, envMapIntensity: 0.9, ...extra });
    this.body = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.72, LEN).translate(0, 0.66, 0), std(0xffffff), N);
    this.cabin = new THREE.InstancedMesh(new THREE.BoxGeometry(1.55, 0.56, 2.35).translate(0, 1.3, -0.2), std(0x0c1424, { roughness: 0.12, metalness: 0.85 }), N);
    this.wheels = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.33, 0.33, 0.24, 10).rotateZ(Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x08080a }), N * 4);
    for (const m of [this.body, this.cabin, this.wheels]) { m.frustumCulled = false; scene.add(m); }
    this.cars.forEach((c, i) => this.body.setColorAt(i, new THREE.Color(c.color)));
    // headlight beams + road pools
    const beam = new THREE.ConeGeometry(2.6, 15, 16, 1, true).translate(0, -7.5, 0).rotateX(-Math.PI / 2 + 0.06);
    const pos = beam.attributes.position, cols = [];
    for (let k = 0; k < pos.count; k++) { const f = 1 - clamp(pos.getZ(k) / 15, 0, 1); cols.push(1 * f * f * 0.22, 0.95 * f * f * 0.22, 0.78 * f * f * 0.22); }
    beam.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const bm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    bm.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <fog_fragment>', ADD_FOG); };
    this.beams = new THREE.InstancedMesh(beam, bm, N * 2); this.beams.frustumCulled = false; this.beams.renderOrder = 5; scene.add(this.beams);
    const pm = new THREE.MeshBasicMaterial({ map: makePoolTexture(), color: 0xfff0cc, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.55 });
    pm.onBeforeCompile = s => { s.fragmentShader = s.fragmentShader.replace('#include <fog_fragment>', ADD_FOG); };
    this.pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.6, 13).rotateX(-Math.PI / 2).translate(0, 0.161, 7.5), pm, N); this.pools.frustumCulled = false; this.pools.renderOrder = 3; scene.add(this.pools);
    // lights: glow sprite + wet streak per lamp
    this.lampIdx = [];
    for (let i = 0; i < N; i++) {
      const g = [glow.add(0, 0, 0, 0xfff1d0, 2.2, 1.4), glow.add(0, 0, 0, 0xfff1d0, 2.2, 1.4), glow.add(0, 0, 0, 0xff2a2a, 0.9, 1.3), glow.add(0, 0, 0, 0xff2a2a, 0.9, 1.3)];
      const w = [wet.add(0, 0.7, 0, 0.3, 0.12, 0xfff1d0, 1.5), wet.add(0, 0.7, 0, 0.3, 0.12, 0xfff1d0, 1.5), wet.add(0, 0.75, 0, 0.25, 0.1, 0xff2a2a, 1.0), wet.add(0, 0.75, 0, 0.25, 0.1, 0xff2a2a, 1.0)];
      this.lampIdx.push({ g, w });
    }
    this.nearest = { d: 99, v: 0, side: 0 };
  }
  stopLine(c) { return c.dir < 0 ? W.CROSS_Z + W.CROSS_HALF + 3.0 : W.CROSS_Z - W.CROSS_HALF - 3.4; }

  update(dt, cam) {
    const sig = this.signal, cars = this.cars;
    let nd = 99, nv = 0, ns = 0;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      if (c.waiting) {      // parked off-stage until the lane entrance is clear
        const sz = c.dir < 0 ? 64 : -150;
        if (!cars.some(o => o !== c && o.lane === c.lane && !o.waiting && Math.abs(o.z - sz) < 24)) { c.waiting = false; c.z = sz; c.v = c.v0 * 0.6; c.v0 = 8 + this.rand() * 4; }
        else continue;
      }
      let allow = c.v0;
      const front = c.z + c.dir * HALF;
      // signal
      const dLine = c.dir < 0 ? front - this.stopLine(c) : this.stopLine(c) - front;
      if (sig.carRed && dLine > -0.3 && dLine < 70) {
        const canStop = dLine > c.v * c.v / (2 * 5.5);
        if (!sig.amber || canStop) allow = Math.min(allow, Math.sqrt(2 * 3.6 * Math.max(0, dLine - 0.8)));
      }
      // leader
      for (const o of cars) {
        if (o === c || o.lane !== c.lane || o.waiting) continue;
        const gap = (o.z - c.z) * c.dir - LEN;
        if (gap > -1 && gap < 40) allow = Math.min(allow, Math.sqrt(2 * 3.6 * Math.max(0, gap - 2.2)));
      }
      // the viewer counts as an obstacle in the lane
      if (cam && Math.abs(cam.x - c.x) < 2.0 && cam.y < 3.5) {
        const gap = (cam.z - c.z) * c.dir - HALF;
        if (gap > -1 && gap < 30) allow = Math.min(allow, Math.sqrt(2 * 3.6 * Math.max(0, gap - 1.8)));
      }
      const dv = allow - c.v;
      c.v += clamp(dv, -6 * dt, 2.6 * dt);
      c.z += c.dir * c.v * dt;
      if ((c.dir < 0 && c.z < -165) || (c.dir > 0 && c.z > 70)) { c.waiting = true; c.v = 0; }
      if (cam) {
        const d = Math.hypot(cam.x - c.x, cam.z - c.z);
        if (d < nd) { nd = d; nv = c.v; ns = Math.sign(c.x - cam.x); }
      }
    }
    this.nearest.d = nd; this.nearest.v = nv; this.nearest.side = ns;
    this.write();
  }
  write() {
    const { cars, glow, wet } = this;
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i], I = this.lampIdx[i];
      const hide = c.waiting;
      _q.setFromAxisAngle(_Y, c.dir < 0 ? Math.PI : 0); _p.set(c.x, hide ? -50 : 0, c.z);
      _m.compose(_p, _q, _s);
      this.body.setMatrixAt(i, _m); this.cabin.setMatrixAt(i, _m);
      for (let w = 0; w < 4; w++) { _l.makeTranslation((w & 1 ? 0.88 : -0.88), 0.33, (w & 2 ? 1.38 : -1.38)); _l.premultiply(_m); this.wheels.setMatrixAt(i * 4 + w, _l); }
      for (let s = 0; s < 2; s++) { _l.makeTranslation(s ? 0.62 : -0.62, 0.7, HALF - 0.05); _l.premultiply(_m); this.beams.setMatrixAt(i * 2 + s, _l); }
      this.pools.setMatrixAt(i, _m);
      const f = c.dir, y = hide ? -50 : 0;
      // local +z is the car's nose; dir<0 means the nose points to -Z
      const nose = c.z + f * (HALF - 0.04), tail = c.z - f * (HALF - 0.04);
      const braking = c.v < c.v0 * 0.85 && this.signal.carRed;
      glow.set(I.g[0], c.x - 0.62, y + 0.7, nose, 0xfff1d0, 2.3, 1.5); glow.set(I.g[1], c.x + 0.62, y + 0.7, nose, 0xfff1d0, 2.3, 1.5);
      glow.set(I.g[2], c.x - 0.62, y + 0.78, tail, 0xff2a2a, braking ? 1.7 : 1.0, braking ? 1.8 : 1.1); glow.set(I.g[3], c.x + 0.62, y + 0.78, tail, 0xff2a2a, braking ? 1.7 : 1.0, braking ? 1.8 : 1.1);
      wet.set(I.w[0], c.x - 0.62, y + 0.7, nose, 0.3, 0.12, 0xfff1d0, 1.5); wet.set(I.w[1], c.x + 0.62, y + 0.7, nose, 0.3, 0.12, 0xfff1d0, 1.5);
      wet.set(I.w[2], c.x - 0.62, y + 0.75, tail, 0.25, 0.1, 0xff2a2a, braking ? 1.4 : 0.8); wet.set(I.w[3], c.x + 0.62, y + 0.75, tail, 0.25, 0.1, 0xff2a2a, braking ? 1.4 : 0.8);
    }
    for (const m of [this.body, this.cabin, this.wheels, this.beams, this.pools]) m.instanceMatrix.needsUpdate = true;
    if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true;
    glow.commit();
  }
}
