// Camera rig: a cinematic auto tour along a closed spline, or free walking (WASD / arrows / drag to look / on-screen pad).
import * as THREE from 'three';
import { W, clamp, lerp, wrapAngle, smooth } from './util.js';

const EYE = 1.65, PERIOD = 130;
const POS = [[3.6, 1.55, 34], [4.8, 1.35, 20], [3.2, 1.5, 8], [0.4, 1.45, 0], [-4.4, 2.0, -3.5], [-6.2, 3.6, 6], [-5.2, 2.4, 20], [-1.5, 1.7, 30]];
const LOOK = [[0, 3.2, -30], [-5, 3.4, -12], [8, 2.2, -14], [3, 2.6, -34], [4, 2.4, -26], [-3, 3.4, -8], [3, 3, -4], [-2, 3.5, -20]];

export class CameraRig {
  constructor(camera, dom, { obstacles, reduced }) {
    this.camera = camera; this.dom = dom; this.obstacles = obstacles;
    this.posCurve = new THREE.CatmullRomCurve3(POS.map(p => new THREE.Vector3(...p)), true, 'centripetal');
    this.lookCurve = new THREE.CatmullRomCurve3(LOOK.map(p => new THREE.Vector3(...p)), true, 'centripetal');
    this.mode = reduced ? 'walk' : 'auto'; this.pos = new THREE.Vector3(3.6, EYE, 34); this.yaw = 0.06; this.pitch = 0.04;
    this.blend = 1; this.from = null; this.keys = new Set(); this.pad = { f: 0, t: 0 }; this.vel = new THREE.Vector3(); this.bob = 0; this.reduced = reduced; this.clock = 0;
    this.moved = false;
    if (reduced) { this._applyAutoPose(0, this); }
    this.onModeChange = () => {};
  }
  _autoPose(t) {
    const u = ((t / PERIOD) % 1 + 1) % 1, p = this.posCurve.getPoint(u), l = this.lookCurve.getPoint(u);
    const sway = 0.5 + 0.5 * Math.sin(t * 0.37);
    p.y += Math.sin(t * 0.21) * 0.08; p.x += Math.sin(t * 0.13) * 0.15;
    const dx = l.x - p.x, dy = l.y - p.y, dz = l.z - p.z;
    return { pos: p, yaw: Math.atan2(-dx, -dz) + Math.sin(t * 0.17) * 0.015 * sway, pitch: Math.atan2(dy, Math.hypot(dx, dz)) + Math.sin(t * 0.23) * 0.01 };
  }
  _applyAutoPose(t, target) { const a = this._autoPose(t); target.pos.copy(a.pos); target.yaw = a.yaw; target.pitch = a.pitch; }
  setMode(mode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (mode === 'auto') { this.blend = 0; this.from = { pos: this.pos.clone(), yaw: this.yaw, pitch: this.pitch }; }
    this.vel.set(0, 0, 0);
    this.onModeChange(mode);
  }
  look(dx, dy) { if (this.mode === 'auto') this.setMode('walk'); this.yaw -= dx * 0.0042; this.pitch = clamp(this.pitch - dy * 0.0042, -1.2, 1.2); }

  update(dt, realT) {
    const walk = this.mode === 'walk';
    if (!walk) {
      this.clock += dt;
      const a = this._autoPose(this.clock);
      if (this.blend < 1) {
        this.blend = Math.min(1, this.blend + dt / 2.4); const k = smooth(this.blend);
        this.pos.lerpVectors(this.from.pos, a.pos, k); this.yaw = this.from.yaw + wrapAngle(a.yaw - this.from.yaw) * k; this.pitch = lerp(this.from.pitch, a.pitch, k);
      } else { this.pos.copy(a.pos); this.yaw = a.yaw; this.pitch = a.pitch; }
    } else {
      const k = this.keys, f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) + this.pad.f;
      const sx = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0) + this.pad.t;
      this.yaw += turn * 1.7 * dt;
      const speed = (k.has('ShiftLeft') || k.has('ShiftRight') ? 6.2 : 3.2);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const tx = (fx * f + rx * sx) * speed, tz = (fz * f + rz * sx) * speed;
      this.vel.x = lerp(this.vel.x, tx, Math.min(1, dt * 7)); this.vel.z = lerp(this.vel.z, tz, Math.min(1, dt * 7));
      this.pos.x += this.vel.x * dt; this.pos.z += this.vel.z * dt;
      this.pos.x = clamp(this.pos.x, -10.4, 10.4); this.pos.z = clamp(this.pos.z, -128, 52);
      for (const o of this.obstacles) {
        const dx = this.pos.x - o.x, dz = this.pos.z - o.z, d = Math.hypot(dx, dz), R = o.r + 0.45;
        if (d < R) { const n = d || 1; this.pos.x = o.x + dx / n * R; this.pos.z = o.z + dz / n * R; }
      }
      const sp = Math.hypot(this.vel.x, this.vel.z);
      if (!this.reduced) this.bob += dt * sp * 2.6;
      const targetY = EYE + (this.reduced ? 0 : Math.sin(this.bob) * 0.035 * Math.min(1, sp / 3));
      this.pos.y = lerp(this.pos.y, targetY, Math.min(1, dt * 3));
    }
    const c = this.camera;
    c.position.copy(this.pos); c.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
