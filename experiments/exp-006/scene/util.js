// Small shared helpers: seeded RNG, math, a merge-friendly geometry builder and shader patches.
import * as THREE from 'three';

export const rng = seed => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
export const wrapAngle = a => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

// World layout shared by every module. The street runs along Z; the camera starts near +Z and looks toward -Z.
export const W = {
  ROAD_HALF: 7, WALK_IN: 7, WALK_OUT: 11.5, CURB: 0.15,
  Z_NEAR: 56, Z_FAR: -150,
  CROSS_Z: -6, CROSS_HALF: 2.2,
  LANES: [-5.2, -2.3, 2.3, 5.2]            // x < 0 drives toward the camera (+Z), x > 0 drives away (-Z)
};

// Collects many small meshes into one BufferGeometry so a whole street costs a handful of draw calls.
export class GeoBuilder {
  constructor(flick = false) { this.p = []; this.n = []; this.u = []; this.c = []; this.f = flick ? [] : null; this.i = []; this.vc = 0; }
  _v(pos, nor, uv, col, fl) {
    this.p.push(pos[0], pos[1], pos[2]); this.n.push(nor[0], nor[1], nor[2]); this.u.push(uv[0], uv[1]);
    this.c.push(col[0], col[1], col[2]);
    if (this.f) this.f.push(fl ? fl[0] : 0, fl ? fl[1] : 0);
    return this.vc++;
  }
  // a,b,c,d counter-clockwise when seen from the side the normal points to
  quad(a, b, c, d, nor, uv = [[0, 0], [1, 0], [1, 1], [0, 1]], col = [1, 1, 1], fl = null) {
    const i = this._v(a, nor, uv[0], col, fl); this._v(b, nor, uv[1], col, fl); this._v(c, nor, uv[2], col, fl); this._v(d, nor, uv[3], col, fl);
    this.i.push(i, i + 1, i + 2, i, i + 2, i + 3);
  }
  // Copy an indexed/non-indexed three.js geometry through a matrix (used for cylinders, cones, spheres).
  geometry(geo, matrix, col = [1, 1, 1], fl = null, colorFn = null) {
    const g = geo.index ? geo : geo.toNonIndexed();
    const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    const v = new THREE.Vector3(), n = new THREE.Vector3(), base = this.vc;
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k).applyMatrix4(matrix); n.fromBufferAttribute(nor, k).applyMatrix3(nm).normalize();
      this._v([v.x, v.y, v.z], [n.x, n.y, n.z], uv ? [uv.getX(k), uv.getY(k)] : [0, 0], colorFn ? colorFn(v, k) : col, fl);
    }
    if (g.index) for (let k = 0; k < g.index.count; k++) this.i.push(base + g.index.getX(k));
    else for (let k = 0; k < pos.count; k++) this.i.push(base + k);
  }
  box(cx, cy, cz, sx, sy, sz, col = [1, 1, 1]) {
    const m = new THREE.Matrix4().makeTranslation(cx, cy, cz).scale(new THREE.Vector3(sx, sy, sz));
    this.geometry(UNIT_BOX, m, col);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.f) g.setAttribute('aFlick', new THREE.Float32BufferAttribute(this.f, 2));
    g.setIndex(this.i);
    g.computeBoundingSphere();
    return g;
  }
}
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);

// Neon behaviours, selected per sign through the aFlick attribute: x = mode, y = phase.
const FLICK_GLSL = /* glsl */`
float flick(vec2 f, float t){
  float m = f.x, p = f.y;
  if (m < 0.5) return 1.0;
  if (m < 1.5) { float s = fract(t * 0.21 + p); float drop = step(0.94, s) * step(0.5, fract(t * 19.0 + p * 9.0)); return mix(1.0, 0.1, drop); }
  if (m < 2.5) return 0.68 + 0.32 * sin(t * 2.3 + p * 6.283);
  if (m < 3.5) return mix(0.12, 1.0, step(0.5, fract(t * 0.55 + p)));
  return 0.35 + 0.65 * step(0.5, fract(t * 1.7 + p));
}`;

export const timeUniform = { value: 0 };

// MeshBasicMaterial + per-vertex flicker. Optional: additive fog (fade toward black instead of toward the fog colour).
export function flickerMaterial(params, { additive = false } = {}) {
  const mat = new THREE.MeshBasicMaterial(params);
  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = timeUniform;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec2 aFlick;\nvarying vec2 vFlick;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFlick = aFlick;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying vec2 vFlick;\n' + FLICK_GLSL)
      .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= flick(vFlick, uTime);');
    if (additive) shader.fragmentShader = shader.fragmentShader.replace('#include <fog_fragment>', ADD_FOG);
  };
  return mat;
}
export const ADD_FOG = /* glsl */`
#ifdef USE_FOG
  float fogK = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
  gl_FragColor.rgb *= (1.0 - fogK);
#endif`;
export { FLICK_GLSL };
