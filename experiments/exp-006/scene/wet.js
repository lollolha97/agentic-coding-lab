// Wet-road illusion. Instead of re-rendering the city, every light-emitting thing (neon signs, lamps, headlights)
// owns a quad on the road whose position is the mirror image of the emitter as seen from the camera, smeared along the
// view direction like a rough puddle, and shimmered by a scrolling noise. Ripples are flat instanced rings.
import * as THREE from 'three';
import { FLICK_GLSL, timeUniform } from './util.js';

const NOISE = /* glsl */`
float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1,0)), f.x), mix(h21(i + vec2(0,1)), h21(i + vec2(1,1)), f.x), f.y); }`;

const STREAK_VS = /* glsl */`
attribute vec2 corner; attribute vec3 aPos; attribute vec2 aSize; attribute vec4 aCol; attribute vec2 aFlick;
uniform vec3 uCam; uniform float uTime, uFog, uStretch;
varying vec2 vUv; varying vec4 vCol; varying vec2 vGround; varying float vFade;
${FLICK_GLSL}
void main(){
  float ch = max(uCam.y, 0.35);
  float hb = max(aPos.y - aSize.y, 0.06), ht = aPos.y + aSize.y;
  vec2 d = aPos.xz - uCam.xz; float dist = max(length(d), 0.001); vec2 dir = d / dist;
  float db = dist * ch / (ch + hb), dt = dist * ch / (ch + ht);
  float smear = (db - dt) * uStretch + 0.7 + db * 0.16;
  float dn = max(dt - smear, 0.15);
  float along = mix(dn, db, corner.y);
  float hw = aSize.x * (ch / (ch + hb)) * (1.0 + (1.0 - corner.y) * 0.55) + 0.1;
  vec2 g = uCam.xz + dir * along + vec2(-dir.y, dir.x) * corner.x * hw;
  vGround = g; vUv = vec2(corner.x, corner.y); vCol = aCol;
  vFade = exp(-pow(dist * uFog, 2.0)) * flick(aFlick, uTime) * smoothstep(0.8, 4.0, dist);
  gl_Position = projectionMatrix * viewMatrix * vec4(g.x, 0.158, g.y, 1.0);
}`;
const STREAK_FS = /* glsl */`
uniform float uTime; varying vec2 vUv; varying vec4 vCol; varying vec2 vGround; varying float vFade;
${NOISE}
void main(){
  float across = pow(max(0.0, 1.0 - abs(vUv.x)), 1.6);
  float along = pow(smoothstep(0.0, 1.0, vUv.y), 1.15) * (1.0 - smoothstep(0.9, 1.0, vUv.y));
  float n = vnoise(vec2(vGround.x * 4.0, vGround.y * 0.55 + uTime * 0.35)) * 0.6 + vnoise(vec2(vGround.x * 11.0 + uTime * 0.3, vGround.y * 1.4)) * 0.4;
  float shimmer = 0.5 + 1.0 * n;
  float a = across * along * shimmer * vFade * vCol.a;
  gl_FragColor = vec4(vCol.rgb * a, a);
}`;

export class WetStreaks {
  constructor(capacity) {
    this.cap = capacity; this.count = 0;
    const base = new THREE.InstancedBufferGeometry();
    base.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    base.setAttribute('corner', new THREE.Float32BufferAttribute([-1, 0, 1, 0, 1, 1, -1, 1], 2));
    base.setIndex([0, 1, 2, 0, 2, 3]);
    this.pos = new Float32Array(capacity * 3); this.size = new Float32Array(capacity * 2); this.col = new Float32Array(capacity * 4); this.fl = new Float32Array(capacity * 2);
    const mk = (arr, n) => new THREE.InstancedBufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    base.setAttribute('aPos', mk(this.pos, 3)); base.setAttribute('aSize', mk(this.size, 2)); base.setAttribute('aCol', mk(this.col, 4)); base.setAttribute('aFlick', mk(this.fl, 2));
    base.instanceCount = 0;
    this.uCam = { value: new THREE.Vector3() };
    const mat = new THREE.ShaderMaterial({
      vertexShader: STREAK_VS, fragmentShader: STREAK_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: timeUniform, uCam: this.uCam, uFog: { value: 0.011 }, uStretch: { value: 1.6 } }
    });
    this.geometry = base; this.mesh = new THREE.Mesh(base, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
  }
  // x,y,z = centre of the emitter, hw/hh = half width/height (m). colour is a hex number.
  add(x, y, z, hw, hh, hex, intensity = 1, mode = 0, phase = 0) { const i = this.count++; this.set(i, x, y, z, hw, hh, hex, intensity, mode, phase); this.geometry.instanceCount = this.count; return i; }
  set(i, x, y, z, hw, hh, hex, intensity = 1, mode = 0, phase = 0) {
    const c = _c.set(hex);
    this.pos.set([x, y, z], i * 3); this.size.set([hw, hh], i * 2); this.col.set([c.r, c.g, c.b, intensity], i * 4); this.fl.set([mode, phase], i * 2);
  }
  update(camera) {
    this.uCam.value.copy(camera.position);
    const a = this.geometry.attributes; a.aPos.needsUpdate = a.aSize.needsUpdate = a.aCol.needsUpdate = a.aFlick.needsUpdate = true;
  }
}
const _c = new THREE.Color();

// Raindrop impact rings on the road
const RIPPLE_VS = /* glsl */`
attribute vec2 corner; attribute vec3 aSeed;
uniform float uTime, uFog; uniform vec3 uCam;
varying vec2 vP; varying float vAge; varying float vFade;
${NOISE}
void main(){
  float t = uTime * (0.55 + aSeed.z * 0.5) + aSeed.x * 17.0;
  float id = floor(t); vAge = fract(t);
  vec2 jitter = vec2(h21(aSeed.xy + id), h21(aSeed.yx + id * 1.7)) - 0.5;
  vec2 c = aSeed.xy + jitter * 2.4;
  vec2 q = c + corner * 0.62;
  float d = distance(vec3(q.x, 0.0, q.y), uCam);
  vFade = exp(-pow(d * uFog, 2.0)) * (1.0 - smoothstep(26.0, 40.0, d));
  vP = corner;
  float y = abs(c.x) > 7.0 ? 0.162 : 0.03;
  gl_Position = projectionMatrix * viewMatrix * vec4(q.x, y, q.y, 1.0);
}`;
const RIPPLE_FS = /* glsl */`
varying vec2 vP; varying float vAge; varying float vFade;
void main(){
  float r = length(vP);
  float rad = 0.12 + vAge * 0.88;
  float ring = smoothstep(0.1, 0.0, abs(r - rad)) + 0.5 * smoothstep(0.08, 0.0, abs(r - rad * 0.62));
  float a = ring * pow(1.0 - vAge, 2.0) * vFade * 0.5;
  gl_FragColor = vec4(vec3(0.62, 0.74, 1.0) * a, a);
}`;
export class Ripples {
  constructor(count = 900) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Array(12).fill(0), 3));
    g.setAttribute('corner', new THREE.Float32BufferAttribute([-1, -1, 1, -1, 1, 1, -1, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const seed = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) seed.set([(Math.random() * 2 - 1) * 8.6, 50 - Math.random() * 175, Math.random()], i * 3);
    g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seed, 3));
    g.instanceCount = count;
    this.uCam = { value: new THREE.Vector3() };
    const m = new THREE.ShaderMaterial({ vertexShader: RIPPLE_VS, fragmentShader: RIPPLE_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: timeUniform, uCam: this.uCam, uFog: { value: 0.011 } } });
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 3;
  }
  update(camera) { this.uCam.value.copy(camera.position); }
}
