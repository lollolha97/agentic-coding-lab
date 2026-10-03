// Rain: one THREE.Points object. Positions never leave the GPU - each streak falls and wraps inside a box around the camera.
import * as THREE from 'three';
import { timeUniform } from './util.js';
import { viewUniforms } from './glow.js';

const VS = /* glsl */`
attribute vec4 aRain;       // x,z offset inside the box, y start height, w speed factor
uniform float uTime, uScale, uMax, uFog, uBoxW, uBoxD, uBoxH, uSpeed, uWind, uLen;
uniform vec3 uCam;
varying float vA;
void main(){
  float fall = uTime * uSpeed * aRain.w;
  float y = mod(aRain.y - fall, uBoxH);
  vec2 xz = vec2(aRain.x, aRain.z);          // [0,1) box coordinates
  vec3 p = vec3(0.0);
  p.x = uCam.x + (mod(xz.x * uBoxW - uCam.x + uBoxW * 0.5 + y * uWind, uBoxW) - uBoxW * 0.5);
  p.z = uCam.z + (mod(xz.y * uBoxD - uCam.z + uBoxD * 0.5, uBoxD) - uBoxD * 0.5);
  p.y = y;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  float d = max(-mv.z, 0.1);
  float px = uLen * uScale / d;
  gl_PointSize = clamp(px, 2.0, uMax);
  float edge = smoothstep(0.0, 2.5, y) * (1.0 - smoothstep(uBoxH - 3.0, uBoxH, y));
  vA = exp(-pow(d * uFog * 0.9, 2.0)) * edge * (px > uMax ? 0.6 : 1.0) * step(0.0, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FS = /* glsl */`
uniform float uSlant; varying float vA;
void main(){
  vec2 p = gl_PointCoord - 0.5; p.y = -p.y;
  p.x -= p.y * uSlant;
  float w = 0.03;
  float line = smoothstep(w, 0.0, abs(p.x));
  float tail = smoothstep(-0.5, 0.45, p.y) * (1.0 - smoothstep(0.42, 0.5, p.y));
  float a = line * tail * vA * 0.55;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vec3(0.72, 0.82, 1.0) * a, a);
}`;
export class Rain {
  constructor(count = 7000) {
    this.count = count;
    const arr = new Float32Array(count * 4), pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) arr.set([Math.random(), Math.random() * 26, Math.random(), 0.82 + Math.random() * 0.36], i * 4);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aRain', new THREE.BufferAttribute(arr, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    this.uCam = { value: new THREE.Vector3() };
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uTime: timeUniform, uCam: this.uCam, ...viewUniforms, uBoxW: { value: 44 }, uBoxD: { value: 56 }, uBoxH: { value: 26 }, uSpeed: { value: 10 }, uWind: { value: 0.12 }, uLen: { value: 0.9 }, uSlant: { value: 0.08 } }
    });
    this.points = new THREE.Points(g, this.mat); this.points.frustumCulled = false; this.points.renderOrder = 8;
  }
  update(camera) { this.uCam.value.copy(camera.position); }
}
