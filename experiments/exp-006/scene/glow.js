// Screen-facing glow sprites (THREE.Points) for lamps, headlights, bulbs and the steam puffs. One draw call each.
import * as THREE from 'three';
import { FLICK_GLSL, timeUniform } from './util.js';

export const viewUniforms = { uScale: { value: 800 }, uMax: { value: 128 }, uFog: { value: 0.011 } };

const GLOW_VS = /* glsl */`
attribute vec3 aColor; attribute float aSize; attribute vec2 aFlick;
uniform float uScale, uMax, uTime, uFog;
varying vec3 vColor; varying float vFade;
${FLICK_GLSL}
void main(){
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float d = max(-mv.z, 0.05);
  float px = aSize * uScale / d;
  gl_PointSize = min(px, uMax);
  vFade = exp(-pow(d * uFog, 2.0)) * flick(aFlick, uTime) * (px > uMax ? uMax / px : 1.0);
  vColor = aColor;
  gl_Position = projectionMatrix * mv;
}`;
const GLOW_FS = /* glsl */`
varying vec3 vColor; varying float vFade;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
  if (r > 1.0) discard;
  float core = exp(-r * r * 9.0);
  float halo = pow(1.0 - r, 2.6) * 0.5;
  float a = (core + halo) * vFade;
  gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.55), a);
}`;

export class GlowPoints {
  constructor(capacity) {
    this.cap = capacity; this.count = 0;
    this.pos = new Float32Array(capacity * 3); this.col = new Float32Array(capacity * 3); this.size = new Float32Array(capacity); this.fl = new Float32Array(capacity * 2);
    const g = this.geometry = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aFlick', new THREE.BufferAttribute(this.fl, 2));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -40), 400);
    const mat = new THREE.ShaderMaterial({
      vertexShader: GLOW_VS, fragmentShader: GLOW_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: timeUniform, ...viewUniforms }
    });
    this.points = new THREE.Points(g, mat); this.points.frustumCulled = false; this.points.renderOrder = 6;
  }
  add(x, y, z, hex, size, intensity = 1, mode = 0, phase = 0) { const i = this.count++; this.set(i, x, y, z, hex, size, intensity, mode, phase); this.geometry.setDrawRange(0, this.count); return i; }
  set(i, x, y, z, hex, size, intensity = 1, mode = 0, phase = 0) {
    const c = _c.set(hex);
    this.pos.set([x, y, z], i * 3); this.col.set([c.r * intensity, c.g * intensity, c.b * intensity], i * 3); this.size[i] = size; this.fl[i * 2] = mode; this.fl[i * 2 + 1] = phase;
  }
  setColor(i, hex, intensity = 1) { const c = _c.set(hex); this.col.set([c.r * intensity, c.g * intensity, c.b * intensity], i * 3); this.geometry.attributes.aColor.needsUpdate = true; }
  setPos(i, x, y, z) { this.pos.set([x, y, z], i * 3); }
  setSize(i, s) { this.size[i] = s; }
  commit(positionsOnly = false) {
    const a = this.geometry.attributes; a.position.needsUpdate = true;
    if (!positionsOnly) { a.aColor.needsUpdate = true; a.aSize.needsUpdate = true; a.aFlick.needsUpdate = true; }
  }
}
const _c = new THREE.Color();

// Rising steam / smoke puffs, animated entirely in the vertex shader.
const STEAM_VS = /* glsl */`
attribute vec4 aSeed;      // x phase, y speed, z size, w sway
attribute vec3 aTint;
uniform float uTime, uScale, uMax, uFog;
varying float vAlpha; varying vec3 vTint; varying float vSeed;
void main(){
  float age = fract(uTime * aSeed.y + aSeed.x);
  vec3 p = position;
  p.y += age * (1.6 + aSeed.z * 1.2);
  p.x += sin(uTime * 0.8 + aSeed.x * 40.0) * 0.25 * age + age * age * 0.5;
  p.z += cos(uTime * 0.6 + aSeed.x * 31.0) * 0.2 * age;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float d = max(-mv.z, 0.05);
  float size = aSeed.z * (0.35 + age * 1.5);
  gl_PointSize = min(size * uScale / d, uMax);
  vAlpha = sin(age * 3.14159) * 0.42 * exp(-pow(d * uFog, 2.0));
  vTint = aTint; vSeed = aSeed.x;
  gl_Position = projectionMatrix * mv;
}`;
const STEAM_FS = /* glsl */`
varying float vAlpha; varying vec3 vTint; varying float vSeed;
void main(){
  vec2 p = gl_PointCoord * 2.0 - 1.0; float r = length(p);
  if (r > 1.0) discard;
  float wob = 0.85 + 0.15 * sin(atan(p.y, p.x) * 3.0 + vSeed * 20.0);
  float a = pow(max(0.0, 1.0 - r / wob), 1.6) * vAlpha;
  gl_FragColor = vec4(vTint, a);
}`;
export class Steam {
  constructor(spots) {   // spots: [{x,y,z,n,size,tint:[r,g,b]}]
    const total = spots.reduce((s, p) => s + p.n, 0);
    const pos = new Float32Array(total * 3), seed = new Float32Array(total * 4), tint = new Float32Array(total * 3);
    let k = 0;
    for (const s of spots) for (let i = 0; i < s.n; i++, k++) {
      pos.set([s.x + (Math.random() - 0.5) * 0.3, s.y, s.z + (Math.random() - 0.5) * 0.3], k * 3);
      seed.set([Math.random(), 0.12 + Math.random() * 0.1, s.size * (0.7 + Math.random() * 0.6), Math.random()], k * 4);
      tint.set(s.tint, k * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4)); g.setAttribute('aTint', new THREE.BufferAttribute(tint, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, -40), 400);
    const m = new THREE.ShaderMaterial({ vertexShader: STEAM_VS, fragmentShader: STEAM_FS, transparent: true, depthWrite: false, uniforms: { uTime: timeUniform, ...viewUniforms } });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 7;
  }
}
