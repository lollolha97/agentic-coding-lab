/* Liquid Actions V2 — liquid-glass capsule action bar.
   Vanilla JS + WebGL 2 + DOM/SVG, no dependencies, no network. One implicit field (capsule SDFs + polynomial smooth-min) drives the silhouette,
   the liquid neck, the refraction normals, the edge/lip highlights and the shadow. Content (text + SVG icons) is crisp DOM above the canvas.
   Spec: https://x.com/yunfeifan_x/status/2104925818195468503 (see ../README.md for what is and is not implemented).

   Usage:   const bar = LiquidBar.create(hostElement, { scene: 'reference', onAction(e) {} });
            bar.setMode('pay'); bar.inspectTransition('pay', 0.30 / 0.90, 'open'); bar.resume(); bar.destroy();
*/
(function (global) {
  'use strict';

  // ---------------------------------------------------------------- 3. frozen reference geometry (DESIGN UNITS: [cx, cy, fullWidth, fullHeight])
  const GEOMETRY = {
    home: [[-202, 0, 284, 144], [154, 0, 384, 144], [154, 0, 0.02, 0.02]],
    pay: [[-272, 0, 336, 144], [374, 0, 132, 144], [90, 0, 364, 144]],
    request: [[-354, 0, 132, 144], [262, 0, 316, 144], [-92, 0, 336, 144]]
  };
  const HIDDEN = 0.02;
  const PARENT = { pay: 1, request: 0 };            // the shape the hidden child is born in; liquid pair = (parent, 2)
  const UNRELATED = { pay: 0, request: 1 };
  const DESIGN_W = 960, AREA_W = 1060, AREA_H = 300;
  const EVENTS = [0.10, 0.12, 0.25, 0.265, 0.33];
  const DPR_CAP = { default: 2, balanced: 1.5, ultra: 3 };

  // visual order: home [Pay][Request]; pay [Contact][Scan QR][x]; request [x][Contact][My QR]. DOM order is always shape 0, 2, 1 which matches all three.
  const SLOTS = { home: ['pay', 'request', null], pay: ['contact', 'close', 'scan-qr'], request: ['close', 'my-qr', 'contact'] };
  const DOM_ORDER = [0, 2, 1];
  const CONTENT = {
    pay: { label: 'Pay', kind: 'launch', icon: 'arrowUp', ref: 284, opens: 'pay' },
    request: { label: 'Request', kind: 'launch', icon: 'arrowDown', ref: 384, opens: 'request' },
    contact: { label: 'Contact', kind: 'action', icon: 'person', ref: 336 },
    'scan-qr': { label: 'Scan QR', kind: 'action', icon: 'scan', ref: 364 },
    'my-qr': { label: 'My QR', kind: 'action', icon: 'qr', ref: 316 },
    close: { label: 'Close', kind: 'close', icon: 'close', ref: 132 }
  };
  const SVG = (inner, box, sw, stroke) => `<svg viewBox="0 0 ${box} ${box}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
  const ICONS = {
    arrowUp: SVG('<path d="M16 45 45 16M22 16h23v23"/>', 61, 6, '#fff'),
    arrowDown: SVG('<path d="M45 16 16 45M39 45H16V22"/>', 61, 6, '#fff'),
    person: SVG('<circle cx="29" cy="19" r="9"/><path d="M10 50c1-11 9-17 19-17s18 6 19 17"/>', 58, 4.6, '#050706'),
    scan: SVG('<path d="M8 20V12a4 4 0 0 1 4-4h8M38 8h8a4 4 0 0 1 4 4v8M50 38v8a4 4 0 0 1-4 4h-8M20 50h-8a4 4 0 0 1-4-4v-8M14 29h30"/>', 58, 4.6, '#050706'),
    qr: SVG('<rect x="9" y="9" width="15" height="15" rx="2"/><rect x="34" y="9" width="15" height="15" rx="2"/><rect x="9" y="34" width="15" height="15" rx="2"/><path d="M34 34h6v6M49 34v0M34 49h0M43 43h6v6h-6z"/>', 58, 4.4, '#050706'),
    close: SVG('<path d="M11 11 40 40M40 11 11 40"/>', 51, 5.2, '#050706')
  };

  // ---------------------------------------------------------------- 6. dynamics: mass-normalised damped spring, analytical step (stable for any dt)
  const SPRING = {
    pos: [190, 24], childW: [340, 31], childH: [380, 33], tensionBuild: [300, 36], tensionRelease: [240, 25], bend: [370, 18],
    press: [650, 38], hover: [300, 30], adhesion: [420, 40], light: [150, 24], enter: [760, 48], exit: [1100, 62]
  };
  class Spring {
    constructor(value, kc, eps, veps) {
      this.value = value; this.target = value; this.velocity = 0;
      this.k = kc[0]; this.c = kc[1]; this.eps = eps || 0.005; this.veps = veps || 0.03;
    }
    set(target) { this.target = target; }
    tune(kc) { this.k = kc[0]; this.c = kc[1]; }
    snap(v) { this.value = this.target = v; this.velocity = 0; }
    get rest() { return this.value === this.target && this.velocity === 0; }
    step(dt) {
      if (this.rest) return;
      const w0 = Math.sqrt(this.k), z = this.c / (2 * w0), x0 = this.value - this.target, v0 = this.velocity;
      let x, v;
      if (z < 1 - 1e-4) {
        const a = z * w0, wd = w0 * Math.sqrt(1 - z * z), e = Math.exp(-a * dt), B = (v0 + a * x0) / wd, cs = Math.cos(wd * dt), sn = Math.sin(wd * dt);
        x = e * (x0 * cs + B * sn); v = e * ((-a * x0 + wd * B) * cs + (-a * B - wd * x0) * sn);
      } else if (z < 1 + 1e-4) {
        const e = Math.exp(-w0 * dt); x = e * (x0 + (v0 + w0 * x0) * dt); v = e * (v0 - w0 * (v0 + w0 * x0) * dt);
      } else {
        const q = w0 * Math.sqrt(z * z - 1), r1 = -w0 * z + q, r2 = -w0 * z - q, c2 = (v0 - r1 * x0) / (r2 - r1), c1 = x0 - c2;
        const e1 = Math.exp(r1 * dt), e2 = Math.exp(r2 * dt); x = c1 * e1 + c2 * e2; v = c1 * r1 * e1 + c2 * r2 * e2;
      }
      this.value = this.target + x; this.velocity = v;
      if (Math.abs(x) < this.eps && Math.abs(v) < this.veps) { this.value = this.target; this.velocity = 0; }
    }
  }
  const unit = kc => new Spring(0, kc, 0.0005, 0.004);

  // ---------------------------------------------------------------- shaders: ONE field for outline, neck, normals, highlights, shadow
  const VERT = `#version 300 es
void main(){ vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0); }`;
  const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform float uPx; uniform vec2 uHost; uniform float uCss;
uniform vec4 uS[3]; uniform vec3 uBend; uniform vec2 uK;
uniform float uThick; uniform vec2 uLight; uniform int uMode; uniform sampler2D uBg;
out vec4 outColor;

// base capsule / rounded-rect SDF (spec 4) with the localized bend of spec 6 applied to the sampling coordinates
float sdShape(vec2 p, vec4 s, float bend){
  vec2 local = p - s.xy; vec2 halfSize = s.zw;
  local.y -= bend * sin(clamp(local.x / max(halfSize.x, 1.0), -1.0, 1.0) * 1.57079632679);
  float r = min(halfSize.x, halfSize.y);
  vec2 q = abs(local) - (halfSize - r);
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
float smin2(float a, float b, float k){
  float h = clamp(0.5 + 0.5 * (b - a) / max(k, 0.001), 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}
// uK.x couples shape0<->child (request branch), uK.y couples shape1<->child (pay branch); the unrelated pair only gets smoothing 1.
float field(vec2 p){
  float d0 = sdShape(p, uS[0], uBend.x), d1 = sdShape(p, uS[1], uBend.y), d2 = sdShape(p, uS[2], uBend.z);
  return min(min(smin2(d1, d2, uK.y), smin2(d0, d2, uK.x)), smin2(d0, d1, 1.0));
}
// same merged contour, but never less smooth than 26 units: a soft shadow has no cusp where two separate shapes' distance fields cross
float fieldSoft(vec2 p){
  float d0 = sdShape(p, uS[0], uBend.x), d1 = sdShape(p, uS[1], uBend.y), d2 = sdShape(p, uS[2], uBend.z);
  return min(min(smin2(d1, d2, max(uK.y, 26.0)), smin2(d0, d2, max(uK.x, 26.0))), smin2(d0, d1, 26.0));
}
vec3 bgAt(vec2 q){ return texture(uBg, (uHost * 0.5 + q * uCss) / uHost).rgb; }
// five-point transmission softening: centre 0.40, four neighbours 0.15 at 0.85 design units
vec3 soft(vec2 q){
  return 0.40 * bgAt(q) + 0.15 * (bgAt(q + vec2(0.85, 0.0)) + bgAt(q - vec2(0.85, 0.0)) + bgAt(q + vec2(0.0, 0.85)) + bgAt(q - vec2(0.0, 0.85)));
}
void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 p = (frag - uRes * 0.5) / uPx;
  float px = 1.0 / uPx;
  float f = field(p);
  const float E = 0.6;
  vec2 g = vec2(field(p + vec2(E, 0.0)) - field(p - vec2(E, 0.0)), field(p + vec2(0.0, E)) - field(p - vec2(0.0, E))) / (2.0 * E);
  float gl2 = length(g);
  float d = f / max(gl2, 0.45);                 // gradient-corrected distance
  vec2 n2 = g / max(gl2, 1e-4);                 // outward 2D normal = normalised field gradient
  float aa = max(fwidth(d) * 0.75, px * 0.5);
  float mask = 1.0 - smoothstep(-aa, aa, d);
  if (uMode == 1) { outColor = vec4(vec3(0.02), 1.0) * mask; return; }   // outline-only: solid silhouette of the SAME field
  if (d > 36.0) { outColor = vec4(0.0); return; }

  float thick = max(uThick, 1.0);
  float depth = max(-d, 0.0);
  float bevel = pow(1.0 - clamp(depth / thick, 0.0, 1.0), 2.0);
  vec2 gn = g / max(gl2, 0.45);
  vec3 normal = normalize(vec3(gn * (2.3 * bevel + 0.055), 1.0));
  vec3 ray = refract(vec3(0.0, 0.0, -1.0), normal, 1.0 / 1.46);
  vec2 rp = p + ray.xy / max(-ray.z, 0.1) * (thick * (0.55 + 0.45 * bevel));
  vec2 disp = n2 * (0.77 * bevel);              // subtle chromatic dispersion along the normal
  vec3 col = vec3(soft(rp + disp).r, soft(rp).g, soft(rp - disp).b);

  vec2 L = normalize(uLight + vec2(1e-5));
  float facing = dot(n2, L);
  col = mix(col, vec3(1.0), 0.07);                                           // light, clear body
  col += vec3(bevel * (0.035 + 0.10 * max(facing, 0.0)));                   // broad bevel
  col += vec3(exp(-pow((depth - 10.0) / 6.0, 2.0)) * (0.03 + 0.07 * max(-facing, 0.0)));  // soft reflection band on the far side
  float lip = exp(-pow((depth - 1.55) / 0.78, 2.0));                         // inner white lip
  col = mix(col, vec3(1.0), lip * (0.30 + 0.50 * (facing * 0.5 + 0.5)));
  col = clamp(col, 0.0, 1.0);

  float edge = exp(-pow(d / 0.90, 2.0));                                     // thin dark edge, not a stroke
  float eA = edge * 0.34;
  vec4 glass = vec4(col * mask, mask);
  vec4 c = vec4(vec3(0.02, 0.027, 0.024) * eA, eA) + glass * (1.0 - eA);
  float ds = 0.5 * (fieldSoft(p - vec2(0.0, 8.0)) + fieldSoft(p - vec2(0.0, 15.0)));   // shadow from the CURRENT merged contour
  float sh = (1.0 - smoothstep(-6.0, 24.0, ds)) * 0.12;
  c += vec4(0.0, 0.0, 0.0, sh) * (1.0 - c.a);
  outColor = c;
}`;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const sdfJS = (s, x, y) => {                       // JS twin of sdShape WITHOUT bend: used only by the simplified neck solver (spec 5)
    const lx = Math.abs(x - s.x) - (s.hw - Math.min(s.hw, s.hh)), ly = Math.abs(y - s.y) - (s.hh - Math.min(s.hw, s.hh));
    return Math.hypot(Math.max(lx, 0), Math.max(ly, 0)) + Math.min(Math.max(lx, ly), 0) - Math.min(s.hw, s.hh);
  };
  function solveEqual(A, B, y) {                       // 12 bisections between the centres for dA ≈ dB
    if (A.x > B.x) { const t = A; A = B; B = t; }
    let lo = A.x, hi = B.x;
    for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (sdfJS(A, m, y) - sdfJS(B, m, y) < 0) lo = m; else hi = m; }
    const x = (lo + hi) / 2;
    return { x, d: (sdfJS(A, x, y) + sdfJS(B, x, y)) / 2 };
  }

  let styleWarned = false;
  class LiquidBar {
    static create(host, options) { return new LiquidBar(host, options); }

    constructor(host, options = {}) {
      if (!host || !host.appendChild) throw new Error('LiquidBar: host element required');
      this.host = host; this.opts = options;
      this.listeners = {};
      if (options.onAction) this.on('action', options.onAction);
      if (options.onModeChange) this.on('modechange', options.onModeChange);
      this.destroyed = false;
      this.mode = 'home';
      this.scene = options.scene || 'reference';
      this.speed = options.speed || 1;
      this.thickness = options.thickness == null ? 25 : options.thickness;
      this.liquidity = options.liquidity == null ? 1 : options.liquidity;
      this.dprCap = DPR_CAP[options.quality] || DPR_CAP.default;
      this.view = 'glass';
      this.customBg = null;
      this.simTime = 0; this.transition = null;
      this.paused = false; this.inspecting = false;
      this.autoplay = false; this.autoState = null;
      this.raf = 0; this.lastT = null; this.frames = 0; this.draws = 0; this.visible = true;
      this.recoilCount = 0; this.connected = false; this.recoilArmed = true;
      this.pointer = { inside: false, x: 0, y: 0, pressed: new Map() };
      this.pair = { index: 1, unionK: 20, saddle: 99, connected: false, neckRadius: 0 };
      this.kUniform = [1, 20];
      this.fallbackReason = null; this.glLost = false;
      this.reducedQuery = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
      this.reducedOverride = options.reducedMotion === undefined ? 'auto' : options.reducedMotion;
      this.buildState();
      this.buildDOM();
      this.bind();
      this.initGL();
      this.resize();
      this.jumpTo('home');
      if (options.mode && options.mode !== 'home') this.setMode(options.mode, { instant: true, silent: true });
      if (options.autoplay) this.setAutoplay(true);
      this.wake();
    }

    // ------------------------------------------------------------ state
    get reduced() { return this.reducedOverride === 'auto' ? !!(this.reducedQuery && this.reducedQuery.matches) : !!this.reducedOverride; }

    buildState() {
      const g = GEOMETRY.home;
      this.shapes = g.map((geo, i) => ({
        x: new Spring(geo[0], SPRING.pos), y: new Spring(geo[1], SPRING.pos),
        w: new Spring(geo[2], SPRING.pos, 0.005, 0.03), h: new Spring(geo[3], SPRING.pos, 0.005, 0.03),
        press: unit(SPRING.press), hover: unit(SPRING.hover), bend: new Spring(0, SPRING.bend, 0.004, 0.03),
        render: { x: geo[0], y: geo[1], hw: geo[2] / 2, hh: geo[3] / 2, bend: 0 }
      }));
      this.T = new Spring(0, SPRING.tensionBuild, 0.01, 0.06);
      this.adhesion = unit(SPRING.adhesion);
      this.lightX = new Spring(-0.45, SPRING.light, 0.0005, 0.004); this.lightY = new Spring(-0.8, SPRING.light, 0.0005, 0.004);
      this.slots = [0, 1, 2].map(() => ({ shown: null, pending: undefined, swapAt: 0, a: unit(SPRING.enter), refW: 1, key: undefined }));
    }

    buildDOM() {
      const host = this.host;
      host.classList.add('lb-host');
      host.setAttribute('role', 'group');
      if (!host.hasAttribute('aria-label')) host.setAttribute('aria-label', 'Liquid glass action bar');
      this.bgCanvas = document.createElement('canvas'); this.bgCanvas.className = 'lb-bg'; this.bgCanvas.setAttribute('aria-hidden', 'true');
      this.glCanvas = document.createElement('canvas'); this.glCanvas.className = 'lb-gl'; this.glCanvas.setAttribute('aria-hidden', 'true');
      this.content = document.createElement('div'); this.content.className = 'lb-content';
      this.note = document.createElement('div'); this.note.className = 'lb-note'; this.note.setAttribute('role', 'status'); this.note.hidden = true;
      host.append(this.bgCanvas, this.glCanvas, this.content, this.note);
      this.bgCtx = this.bgCanvas.getContext('2d');
      this.buttons = [];
      for (const i of DOM_ORDER) {                       // DOM order == visual order in every state
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'lb-btn'; b.dataset.slot = String(i);
        const inner = document.createElement('span'); inner.className = 'lb-inner'; b.appendChild(inner);
        this.content.appendChild(b);
        this.buttons[i] = b; this.slots[i].inner = inner;
        b.hidden = true;
      }
      if (!styleWarned && getComputedStyle(this.content).position !== 'absolute') { styleWarned = true; console.warn('LiquidBar: liquid-bar.css is not loaded.'); }
    }

    // ------------------------------------------------------------ events
    on(name, fn) { (this.listeners[name] = this.listeners[name] || new Set()).add(fn); return () => this.off(name, fn); }
    off(name, fn) { if (this.listeners[name]) this.listeners[name].delete(fn); }
    emit(name, detail) {
      if (this.listeners[name]) for (const fn of this.listeners[name]) fn(detail);
      if (name === 'action' || name === 'modechange') this.host.dispatchEvent(new CustomEvent('liquidbar:' + name, { detail, bubbles: true }));
    }

    bind() {
      const L = this.cleanups = [];
      const add = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); L.push(() => t.removeEventListener(ev, fn, o)); };
      this.buttons.forEach((b, i) => {
        add(b, 'click', e => this.onClick(i, e));
        add(b, 'pointerdown', e => this.onDown(i, e));
        add(b, 'pointerup', () => this.release(i));
        add(b, 'pointercancel', () => this.release(i));
        add(b, 'lostpointercapture', () => this.release(i));
        add(b, 'pointerenter', e => { if (e.pointerType !== 'touch') this.shapes[i].hover.set(1), this.wake(); });
        add(b, 'pointerleave', () => { this.shapes[i].hover.set(0); this.wake(); });
        add(b, 'keydown', e => { if (e.key === ' ' || e.key === 'Enter') { this.shapes[i].press.set(1); this.wake(); } });
        add(b, 'keyup', () => this.release(i));
        add(b, 'blur', () => this.release(i));
      });
      add(global, 'pointerup', () => this.releaseAll());
      add(global, 'pointercancel', () => this.releaseAll());
      add(global, 'blur', () => this.releaseAll());
      add(document, 'keydown', e => {                           // Escape -> home, from inside the bar or when nothing else holds focus
        if (e.key !== 'Escape' || this.mode === 'home' || e.defaultPrevented) return;
        const ae = document.activeElement;
        if (this.host.contains(ae) || ae === document.body) { e.preventDefault(); this.userInteracted(); this.closeToHome(true); }
      });
      add(this.host, 'pointermove', e => {
        const r = this.host.getBoundingClientRect(); this.pointer.inside = true;
        this.pointer.x = clamp((e.clientX - r.left - r.width / 2) / (r.width / 2), -1, 1); this.pointer.y = clamp((e.clientY - r.top - r.height / 2) / (r.height / 2), -1, 1);
        this.lightX.set(-0.45 + this.pointer.x * 0.9); this.lightY.set(-0.8 + this.pointer.y * 0.5); this.wake();
      });
      add(this.host, 'pointerleave', () => { this.pointer.inside = false; this.lightX.set(-0.45); this.lightY.set(-0.8); this.wake(); });
      add(this.glCanvas, 'webglcontextlost', e => { e.preventDefault(); this.glLost = true; this.setNote('WebGL 컨텍스트가 끊겼습니다 — 복구를 기다리는 중 (대체 표시 아님, 일시 중단)'); });
      add(this.glCanvas, 'webglcontextrestored', () => { this.glLost = false; this.initGL(); this.resize(); this.setNote(null); this.wake(); });
      add(document, 'visibilitychange', () => {
        if (document.hidden) { cancelAnimationFrame(this.raf); this.raf = 0; } else { this.lastT = null; this.wake(); }
      });
      if (global.ResizeObserver) { this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.host); } else add(global, 'resize', () => this.resize());
      if (global.IntersectionObserver) {
        this.io = new IntersectionObserver(es => { this.visible = es[es.length - 1].isIntersecting; if (this.visible) { this.lastT = null; this.wake(); } });
        this.io.observe(this.host);
      }
      if (this.reducedQuery) {
        const fn = () => { if (this.reduced) { this.setAutoplay(false); this.jumpTo(this.mode); this.wake(); } };
        if (this.reducedQuery.addEventListener) add(this.reducedQuery, 'change', fn);
      }
    }

    onDown(i, e) {
      this.userInteracted();
      this.shapes[i].press.set(1); this.pointer.pressed.set(e.pointerId, i); this.wake();
      try { this.buttons[i].setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    }
    release(i) { if (this.shapes[i].press.target !== 0) { this.shapes[i].press.set(0); this.wake(); } }
    releaseAll() { for (let i = 0; i < 3; i++) this.release(i); this.pointer.pressed.clear(); }
    userInteracted() { if (this.autoplay) { this.setAutoplay(false); this.emit('autoplaychange', false); } }

    // 8/10: only the CURRENT mode's buttons act; a click on a slot whose content has not been swapped yet is ignored (it still shows the old state).
    onClick(i, e) {
      const key = SLOTS[this.mode][i], slot = this.slots[i];
      if (!key || slot.shown !== key) return;
      this.userInteracted();
      const def = CONTENT[key];
      const viaKeyboard = e.detail === 0;
      if (def.kind === 'launch') { this.setMode(def.opens); if (viaKeyboard) this.focusSlot(0); }
      else if (def.kind === 'close') this.closeToHome(viaKeyboard);
      else this.emit('action', { action: key, branch: this.mode });
    }
    focusSlot(i) { const b = this.buttons[i]; if (b && !b.hidden) b.focus({ preventScroll: true }); }
    closeToHome(restoreFocus) {
      const branch = this.mode, launcher = branch === 'pay' ? 0 : 1;
      this.setMode('home');
      if (restoreFocus) { const b = this.buttons[launcher]; b.hidden = false; b.removeAttribute('inert'); b.focus({ preventScroll: true }); }
    }

    // ------------------------------------------------------------ public API (12)
    setMode(mode, opts = {}) {
      if (!SLOTS[mode]) throw new Error('LiquidBar.setMode: unknown mode ' + mode);
      this.endInspection();
      if (mode === this.mode && !opts.force) return;
      const prev = this.mode;
      if (this.reduced || opts.instant) { this.jumpTo(mode); this.wake(); if (!opts.silent) this.emit('modechange', { mode, previous: prev }); return; }
      this.mode = mode;
      if (mode === 'home') this.startClose(prev); else this.startOpen(mode);
      this.retargetContent(mode === 'home' ? 0.215 : 0.105);
      this.syncInteractivity();
      if (!opts.silent) this.emit('modechange', { mode, previous: prev });
      this.wake();
    }
    setScene(scene) { if (scene !== 'reference' && scene !== 'refraction') throw new Error('LiquidBar.setScene: reference | refraction'); this.scene = scene; this.drawBackground(); this.wake(); }
    setSpeed(s) { this.speed = clamp(+s || 1, 0.05, 4); }
    setMaterial(m = {}) { if (m.thickness != null) this.thickness = clamp(+m.thickness, 1, 80); if (m.liquidity != null) this.liquidity = clamp(+m.liquidity, 0, 1); this.wake(); }
    setBackgroundImage(img) { this.customBg = img || null; this.scene = img ? 'custom' : 'reference'; this.drawBackground(); this.wake(); }
    setView(view) { this.view = view === 'outline' ? 'outline' : 'glass'; this.host.dataset.view = this.view; this.drawBackground(); this.wake(); }
    setAutoplay(on) {
      on = !!on && !this.reduced; if (on === this.autoplay) return;
      this.autoplay = on; this.autoState = on ? { idx: 0, wait: 0.9, started: false } : null;
      if (on) { this.endInspection(); this.wake(); }
    }
    pause() { this.paused = true; cancelAnimationFrame(this.raf); this.raf = 0; this.lastT = null; this.render(); }
    resume() { this.paused = false; this.inspecting = false; this.lastT = null; this.wake(); }
    endInspection() { if (this.paused || this.inspecting) { this.paused = false; this.inspecting = false; this.lastT = null; } }

    /** Deterministic frozen state: from stable home ('open') or stable branch ('close'), same solver at fixed 1/240 s, same shader. progress 0..1 -> 0..900 ms. */
    inspectTransition(branch, progress, direction = 'open') {
      if (!PARENT.hasOwnProperty(branch)) throw new Error('inspectTransition: branch must be pay | request');
      this.autoplay = false; this.autoState = null;
      this.jumpTo(direction === 'close' ? branch : 'home');
      this.mode = direction === 'close' ? 'home' : branch;
      if (direction === 'close') this.startClose(branch); else this.startOpen(branch);
      this.retargetContent(direction === 'close' ? 0.215 : 0.105);
      this.syncInteractivity();
      let t = clamp(progress, 0, 1) * 0.9;
      const FIXED = 1 / 240;
      while (t > 1e-9) { const dt = Math.min(FIXED, t); this.substep(dt); t -= dt; }
      this.paused = true; this.inspecting = true; cancelAnimationFrame(this.raf); this.raf = 0;
      this.render();
      return this.getDiagnostics();
    }

    destroy() {
      if (this.destroyed) return; this.destroyed = true;
      cancelAnimationFrame(this.raf); this.cleanups.forEach(fn => fn());
      if (this.ro) this.ro.disconnect(); if (this.io) this.io.disconnect();
      this.releaseGL();
      this.host.removeAttribute('data-view'); this.host.removeAttribute('data-fallback');
      this.bgCanvas.remove(); this.glCanvas.remove(); this.content.remove(); this.note.remove();
      this.host.classList.remove('lb-host'); this.listeners = {};
    }

    // ------------------------------------------------------------ transitions (7, 8)
    startOpen(branch) {
      const p = this.shapes[PARENT[branch]], child = this.shapes[2], geo = GEOMETRY[branch];
      if (child.w.value < 1 && child.h.value < 1) {            // hidden child is born INSIDE its source parent, never at the destination
        child.x.snap(p.x.value); child.y.snap(p.y.value); child.w.snap(HIDDEN); child.h.snap(HIDDEN);
      }
      for (let i = 0; i < 3; i++) { const s = this.shapes[i]; s.x.target = geo[i][0]; s.y.target = geo[i][1]; s.w.target = geo[i][2]; s.h.target = geo[i][3]; }
      child.w.tune(SPRING.childW); child.h.tune(SPRING.childH);
      this.adhesion.target = branch === 'request' ? 1 : 0;
      p.press.set(1);                                           // slight compression; released at 100 ms
      this.transition = { kind: 'open', branch, t: 0, hold: 0.265, pulse: true, absorbed: false, collapsing: false };
      this.recoilArmed = true;
    }
    startClose(branch) {
      if (!PARENT.hasOwnProperty(branch)) { this.transition = null; return; }
      const p = this.shapes[PARENT[branch]];
      this.adhesion.target = branch === 'request' ? 1 : 0;
      p.press.set(1);
      this.transition = { kind: 'close', branch, t: 0, hold: 0.330, pulse: true, absorbed: false, collapsing: false };
      this.recoilArmed = true;
    }
    drive(tr) {
      const T = this.T, shapes = this.shapes;
      const EPS = 1e-9, want = tr.t < tr.hold - EPS ? 132 : 0;                    // surface-tension target: hold, then release
      if (T.target !== want) { T.target = want; T.tune(want > 0 ? SPRING.tensionBuild : SPRING.tensionRelease); }
      if (tr.pulse && tr.t >= 0.10 - EPS) { tr.pulse = false; shapes[PARENT[tr.branch]].press.set(0); }
      if (tr.kind === 'close' && tr.t >= 0.12 - EPS) {                // first ~120 ms: geometry targets stay put while tension builds
        const parent = shapes[PARENT[tr.branch]], child = shapes[2], home = GEOMETRY.home;
        if (!tr.collapsing) {
          tr.collapsing = true;
          for (const i of [0, 1]) { const s = shapes[i]; s.x.target = home[i][0]; s.y.target = home[i][1]; s.w.target = home[i][2]; s.h.target = home[i][3]; }
        }
        child.x.target = parent.x.value; child.y.target = parent.y.value;           // child chases the parent centre at full size
        if (!tr.absorbed && tr.t >= 0.25 - EPS) {
          const gap = Math.abs(parent.x.value - child.x.value) - (parent.w.value + child.w.value) / 2;
          if (gap < -22) { tr.absorbed = true; child.w.target = HIDDEN; child.h.target = HIDDEN; child.w.tune(SPRING.pos); child.h.tune(SPRING.pos); }
        }
      }
    }

    // ------------------------------------------------------------ content handoff (10)
    retargetContent(delay) {
      SLOTS[this.mode].forEach((key, i) => {
        const s = this.slots[i];
        if (key === s.shown && s.pending === undefined) { s.a.tune(SPRING.enter); s.a.target = key ? 1 : 0; return; }
        if (key === s.shown) { s.pending = undefined; s.a.tune(SPRING.enter); s.a.target = key ? 1 : 0; return; }
        s.pending = key; s.swapAt = this.simTime + delay; s.a.tune(SPRING.exit); s.a.target = 0;
      });
    }
    setSlotContent(i, key) {
      const s = this.slots[i], b = this.buttons[i], inner = s.inner;
      s.shown = key; s.key = key;
      if (!key) { inner.innerHTML = ''; inner.removeAttribute('style'); b.removeAttribute('aria-label'); return; }
      const d = CONTENT[key];
      const label = d.kind === 'close' ? '' : `<span class="lb-label">${d.label}</span>`;
      const icon = d.kind === 'launch' ? `<span class="lb-orb lb-orb--${key}">${ICONS[d.icon]}</span>` : `<span class="lb-ico">${ICONS[d.icon]}</span>`;
      inner.className = 'lb-inner lb-inner--' + d.kind;
      inner.innerHTML = icon + label;
      inner.style.width = d.ref + 'px';
      let nat = d.ref;
      if (inner.lastElementChild && d.kind !== 'close') nat = Math.max(d.ref, inner.lastElementChild.offsetLeft + inner.lastElementChild.offsetWidth + 16);
      s.refW = nat; inner.style.width = nat + 'px';
      b.setAttribute('aria-label', d.label);
    }
    syncInteractivity() {
      SLOTS[this.mode].forEach((key, i) => {
        const b = this.buttons[i], on = !!key;
        b.hidden = !on && this.slots[i].a.value < 0.01 && this.shapes[i].w.value < 1;
        if (on) b.removeAttribute('inert'); else b.setAttribute('inert', '');
        b.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
    }
    updateContent() {
      this.slots.forEach((s, i) => {
        if (s.pending !== undefined && this.simTime >= s.swapAt && s.a.value < 0.02) {
          this.setSlotContent(i, s.pending); s.pending = undefined;
          s.a.tune(SPRING.enter); s.a.target = s.shown ? 1 : 0;
          this.syncInteractivity();
        }
      });
    }

    // ------------------------------------------------------------ the solver
    /** One physics substep. Substeps are split exactly at transition event times (pulse end, 0.12 s collapse, 0.25 s absorb gate, tension hold ends)
     *  so the result does not depend on the frame rate. Order: targets (drive) -> springs -> neck/connectivity -> recoil -> content. */
    substep(dt) {
      const tr = this.transition;
      if (tr) {
        for (const e of EVENTS) {
          if (tr.t < e - 1e-9 && tr.t + dt > e + 1e-9) { const d1 = e - tr.t; this.core(d1); return this.substep(dt - d1); }
        }
      }
      this.core(dt);
    }
    core(dt) {
      this.simTime += dt;
      const tr = this.transition;
      if (tr) this.drive(tr);
      for (const s of this.shapes) { s.x.step(dt); s.y.step(dt); s.w.step(dt); s.h.step(dt); s.press.step(dt); s.hover.step(dt); s.bend.step(dt); }
      this.T.step(dt); this.adhesion.step(dt); this.lightX.step(dt); this.lightY.step(dt);
      this.slots.forEach(s => s.a.step(dt));
      if (tr) tr.t += dt;
      this.updateRenderShapes();
      this.updateNeck();
      this.updateContent();
      if (tr && tr.t > tr.hold + 0.05 && this.allRest()) this.settle();
      if (this.autoplay && !this.transition && this.autoState) this.autoStep(dt);
    }
    updateRenderShapes() {
      const lq = this.liquidity;
      for (const s of this.shapes) {
        const press = s.press.value, hover = s.hover.value;
        const stretch = 1 + Math.min(0.065, Math.abs(s.x.velocity) * 0.000047) * lq;
        const w = Math.max(s.w.value, HIDDEN) * (1 - 0.022 * press) * stretch;
        const h = Math.max(s.h.value, HIDDEN) * (1 - 0.055 * press + 0.010 * hover) / Math.sqrt(stretch);
        const r = s.render; r.x = s.x.value; r.y = s.y.value + 2.2 * press - hover; r.hw = w / 2; r.hh = h / 2; r.bend = s.bend.value;
      }
    }
    unionFor(a, b) {                                           // spec 5: neck solve + saddle test for one pair
      const tension = Math.max(this.T.value, 0), neckRadius = tension * 0.32;
      const avgY = (a.y + b.y) / 2;
      const neck = solveEqual(a, b, avgY + neckRadius);
      const candidateK = clamp(4 * neck.d, 20, 180);
      const x = clamp(tension / 30, 0, 1), gate = x * x * (3 - 2 * x);
      const unionK = 20 + (candidateK - 20) * gate * this.liquidity;
      const centre = solveEqual(a, b, avgY);
      const meaningful = Math.min(a.hw, b.hw) * 2 >= 20 && Math.min(a.hh, b.hh) * 2 >= 20;
      const saddle = centre.d - unionK / 4;
      return { unionK, saddle, neckRadius, connected: meaningful && saddle < 0, meaningful };
    }
    updateNeck() {
      const sh = this.shapes, c = sh[2].render;
      const p1 = this.unionFor(sh[1].render, c), p0 = this.unionFor(sh[0].render, c);
      const s = clamp(this.adhesion.value, 0, 1);              // continuous adhesion-side selection
      this.kUniform = [1 + (p0.unionK - 1) * s, 1 + (p1.unionK - 1) * (1 - s)];
      const active = this.adhesion.target >= 0.5 ? p0 : p1;
      this.pair = { index: this.adhesion.target >= 0.5 ? 0 : 1, unionK: active.unionK, saddle: active.saddle, neckRadius: active.neckRadius, connected: active.connected };
      if (this.pair.connected) { this.recoilArmed = true; }
      if (this.connected && !this.pair.connected && active.meaningful && this.recoilArmed && this.transition) {   // connected -> disconnected: recoil ONCE
        this.recoilArmed = false; this.recoilCount++;
        const a = sh[this.pair.index], b = sh[2];
        for (const [s2, dir] of [[a, -1], [b, 1]]) { s2.w.velocity -= 145; s2.h.velocity += 172; s2.bend.velocity += 52 * dir; }
      }
      this.connected = this.pair.connected;
    }
    allRest() {
      for (const s of this.shapes) if (!(s.x.rest && s.y.rest && s.w.rest && s.h.rest && s.bend.rest && s.press.rest)) return false;
      return this.T.rest && this.adhesion.rest && this.slots.every(s => s.a.rest && s.pending === undefined);
    }
    settle() {
      this.transition = null; this.T.snap(0);
      if (this.mode === 'home') {                              // invisible hidden child returns to its home slot; shapes 0/1 are already exactly home
        const c = this.shapes[2]; c.x.snap(GEOMETRY.home[2][0]); c.y.snap(GEOMETRY.home[2][1]); c.w.snap(HIDDEN); c.h.snap(HIDDEN);
        this.updateRenderShapes(); this.updateNeck(); this.syncInteractivity();
      }
      this.emit('settle', { mode: this.mode });
    }
    /** Jump to a stable state (inspection start, reduced motion, instant). */
    jumpTo(mode) {
      const geo = GEOMETRY[mode];
      this.mode = mode; this.transition = null;
      this.shapes.forEach((s, i) => {
        s.x.snap(geo[i][0]); s.y.snap(geo[i][1]); s.w.snap(geo[i][2]); s.h.snap(geo[i][3]);
        s.press.snap(0); s.hover.snap(0); s.bend.snap(0);
        s.w.tune(SPRING.pos); s.h.tune(SPRING.pos);
      });
      this.T.snap(0); this.T.tune(SPRING.tensionBuild);
      this.adhesion.snap(mode === 'request' ? 1 : 0);
      this.simTime = 0; this.recoilArmed = true; this.connected = false; this.recoilCount = 0;
      SLOTS[mode].forEach((key, i) => { const s = this.slots[i]; s.pending = undefined; this.setSlotContent(i, key); s.a.tune(SPRING.enter); s.a.snap(key ? 1 : 0); });
      this.updateRenderShapes(); this.updateNeck(); this.connected = this.pair.connected;
      this.syncInteractivity();
    }
    autoStep(dt) {
      const a = this.autoState; a.wait -= dt;
      if (a.wait > 0 || !this.allRest()) return;
      const seq = ['pay', 'home', 'request', 'home'], next = seq[a.idx % 4]; a.idx++;
      a.wait = next === 'home' ? 1.0 : 1.7;
      this.setModeInternal(next);
    }
    setModeInternal(mode) { const keepAuto = this.autoplay; this.setMode(mode); this.autoplay = keepAuto; }

    // ------------------------------------------------------------ frame loop (11)
    needsFrame() {
      if (this.transition || this.autoplay) return true;
      if (!this.T.rest || !this.adhesion.rest || !this.lightX.rest || !this.lightY.rest) return true;
      for (const s of this.shapes) if (!(s.press.rest && s.hover.rest && s.bend.rest && s.x.rest && s.y.rest && s.w.rest && s.h.rest)) return true;
      return this.slots.some(s => !s.a.rest || s.pending !== undefined);
    }
    wake() {
      if (this.destroyed || this.glLost) return;
      if (this.paused) { this.render(); return; }                // frozen (inspection/pause): redraw once, never step
      if (this.raf || document.hidden || !this.visible) return;
      this.raf = requestAnimationFrame(t => this.frame(t));
    }
    frame(now) {
      this.raf = 0;
      if (this.destroyed || this.paused || document.hidden) return;
      let dt = this.lastT == null ? 0 : (now - this.lastT) / 1000;
      this.lastT = now;
      dt = clamp(dt, 0, 0.25) * this.speed;                  // long frames are clamped, never replayed
      this.advance(dt);
      this.render();
      this.frames++;
      this.emit('frame', this);
      if (this.needsFrame()) this.raf = requestAnimationFrame(t => this.frame(t));
      else { this.lastT = null; this.idleSince = now; }
    }
    advance(dt) {
      if (dt <= 0) return;
      const n = Math.min(Math.max(1, Math.ceil(dt / (1 / 120) - 1e-9)), 60), sub = dt / n;
      for (let i = 0; i < n; i++) this.substep(sub);
    }

    // ------------------------------------------------------------ layout, background, GL
    resize() {
      if (this.destroyed) return;
      const W = this.host.clientWidth, H = this.host.clientHeight;
      if (!W || !H) return;
      this.hostW = W; this.hostH = H;
      this.scale = Math.max(0.15, Math.min((W - 16) / 944, Math.max(0.22, (H - 60) / 350), 1));
      this.dpr = Math.min(global.devicePixelRatio || 1, this.dprCap);
      let cw = Math.min(W, Math.round(AREA_W * this.scale)); if ((W - cw) % 2) cw -= 1;
      let ch = Math.min(H, Math.round(AREA_H * this.scale)); if ((H - ch) % 2) ch -= 1;
      this.cssW = cw; this.cssH = ch;
      const g = this.glCanvas;
      g.width = Math.max(1, Math.round(cw * this.dpr)); g.height = Math.max(1, Math.round(ch * this.dpr));
      g.style.width = g.width / this.dpr + 'px'; g.style.height = g.height / this.dpr + 'px';
      g.style.left = (W - g.width / this.dpr) / 2 + 'px'; g.style.top = (H - g.height / this.dpr) / 2 + 'px';
      this.pxPerUnit = this.scale * this.dpr;
      this.content.style.transform = `translate(${W / 2}px, ${H / 2}px) scale(${this.scale})`;
      this.host.style.setProperty('--lb-scale', this.scale);
      this.drawBackground();
      this.wake(); if (this.paused) this.render();
    }
    drawBackground() {
      if (!this.hostW) return;
      const W = this.hostW, H = this.hostH, dpr = this.dpr, c = this.bgCanvas, ctx = this.bgCtx;
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const s = this.scale;
      if (this.view === 'outline') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); }
      else if (this.scene === 'custom' && this.customBg) {
        const iw = this.customBg.naturalWidth || this.customBg.videoWidth || this.customBg.width, ih = this.customBg.naturalHeight || this.customBg.videoHeight || this.customBg.height;
        const k = Math.max(W / iw, H / ih), dw = iw * k, dh = ih * k;           // cover crop; same canvas is both displayed and uploaded
        ctx.fillStyle = '#f1f1f1'; ctx.fillRect(0, 0, W, H); ctx.drawImage(this.customBg, (W - dw) / 2, (H - dh) / 2, dw, dh);
      } else if (this.scene === 'refraction') {
        ctx.fillStyle = '#f6f6f3'; ctx.fillRect(0, 0, W, H);
        const sp = 14 * s, cx = W / 2, cy = H / 2;
        ctx.lineCap = 'butt';
        for (let pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          for (let i = -Math.ceil(cx / sp); i <= Math.ceil(cx / sp); i++) { if ((i % 5 === 0) === (pass === 1)) { const x = cx + i * sp; ctx.moveTo(x, 0); ctx.lineTo(x, H); } }
          for (let j = -Math.ceil(cy / sp); j <= Math.ceil(cy / sp); j++) { if ((j % 5 === 0) === (pass === 1)) { const y = cy + j * sp; ctx.moveTo(0, y); ctx.lineTo(W, y); } }
          ctx.lineWidth = Math.max(1, (pass ? 2.4 : 1.4) * s); ctx.strokeStyle = pass ? 'rgba(30,38,34,.62)' : 'rgba(30,38,34,.38)'; ctx.stroke();
        }
      } else { ctx.fillStyle = '#f1f1f1'; ctx.fillRect(0, 0, W, H); }
      this.bgDirty = true;
    }
    initGL() {
      this.releaseGL();
      this.host.removeAttribute('data-fallback');
      if (this.opts.webgl === false) return this.fallback('WebGL 2 비활성화됨(옵션)');
      const gl = this.glCanvas.getContext('webgl2', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'default' });
      if (!gl) return this.fallback('이 브라우저에서 WebGL 2를 만들 수 없음');
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
      try {
        const prog = gl.createProgram(); const vs = mk(gl.VERTEX_SHADER, VERT), fs = mk(gl.FRAGMENT_SHADER, FRAG);
        gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
        gl.deleteShader(vs); gl.deleteShader(fs);
        this.gl = gl; this.prog = prog; this.vao = gl.createVertexArray();
        this.u = {}; for (const n of ['uRes', 'uPx', 'uHost', 'uCss', 'uS', 'uBend', 'uK', 'uThick', 'uLight', 'uMode', 'uBg']) this.u[n] = gl.getUniformLocation(prog, n);
        this.tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, this.tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        this.bgDirty = true; this.webgl = true; this.fallbackReason = null; this.setNote(null);
      } catch (err) { console.error('LiquidBar shader:', err); this.releaseGL(); this.fallback('셰이더 컴파일 실패'); }
    }
    fallback(reason) {
      this.webgl = false; this.fallbackReason = reason;
      this.host.setAttribute('data-fallback', '');
      this.setNote('FALLBACK · ' + reason + ' — 단색 대체 버튼이며 액체 유리 효과가 아닙니다.');
    }
    setNote(text) { this.note.hidden = !text; this.note.textContent = text || ''; }
    releaseGL() {
      const gl = this.gl; if (!gl) return;
      if (!gl.isContextLost()) { gl.deleteTexture(this.tex); gl.deleteProgram(this.prog); gl.deleteVertexArray(this.vao); }
      this.gl = null; this.tex = null; this.prog = null; this.vao = null;
    }
    draw(mode) {
      const gl = this.gl; if (!gl || gl.isContextLost()) return;
      gl.viewport(0, 0, this.glCanvas.width, this.glCanvas.height);
      gl.useProgram(this.prog); gl.bindVertexArray(this.vao);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.tex);
      if (this.bgDirty) { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.bgCanvas); this.bgDirty = false; }
      const r = this.shapes.map(s => s.render), u = this.u;
      gl.uniform2f(u.uRes, this.glCanvas.width, this.glCanvas.height); gl.uniform1f(u.uPx, this.pxPerUnit);
      gl.uniform2f(u.uHost, this.hostW, this.hostH); gl.uniform1f(u.uCss, this.scale);
      gl.uniform4fv(u.uS, new Float32Array([r[0].x, r[0].y, r[0].hw, r[0].hh, r[1].x, r[1].y, r[1].hw, r[1].hh, r[2].x, r[2].y, r[2].hw, r[2].hh]));
      gl.uniform3f(u.uBend, r[0].bend, r[1].bend, r[2].bend);
      gl.uniform2f(u.uK, this.kUniform[0], this.kUniform[1]);
      gl.uniform1f(u.uThick, this.thickness); gl.uniform2f(u.uLight, this.lightX.value, this.lightY.value);
      gl.uniform1i(u.uMode, mode); gl.uniform1i(u.uBg, 0);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.draws++;
    }
    render() {
      if (this.destroyed) return;
      if (this.webgl) this.draw(this.view === 'outline' ? 1 : 0);
      this.renderContent();
    }
    renderContent() {
      const sc = this.scale || 1;
      this.shapes.forEach((s, i) => {
        const b = this.buttons[i], r = s.render, w = r.hw * 2, h = r.hh * 2, slot = this.slots[i];
        if (b.hidden) return;
        b.style.width = w + 'px'; b.style.height = h + 'px';
        b.style.transform = `translate(${r.x - r.hw}px, ${r.y - r.hh}px)`;
        const hx = Math.max(0, (44 / sc - w) / 2), hy = Math.max(0, (44 / sc - h) / 2);
        b.style.setProperty('--lb-hx', hx + 'px'); b.style.setProperty('--lb-hy', hy + 'px');
        if (!slot.shown) return;
        const a = clamp(slot.a.value, 0, 1), press = s.press.value;
        const k = (0.76 + 0.24 * a) * Math.min(1, w / slot.refW) * (1 - 0.025 * press);
        const inner = slot.inner;
        inner.style.opacity = String(a);
        inner.style.transform = `translate(-50%, -50%) translateY(${(1 - a) * 2}px) scale(${k})`;
        inner.style.filter = a >= 0.999 ? 'none' : `blur(${((1 - a) * 5.5).toFixed(2)}px)`;   // no filter at all once settled
      });
    }

    // ------------------------------------------------------------ diagnostics / pixel readback for validation
    getDiagnostics() {
      const sh = this.shapes;
      return {
        mode: this.mode, transition: this.transition ? { kind: this.transition.kind, branch: this.transition.branch, ms: +(this.transition.t * 1000).toFixed(2), absorbed: this.transition.absorbed } : null,
        simTimeMs: +(this.simTime * 1000).toFixed(2),
        tension: this.T.value, tensionVelocity: this.T.velocity, neckRadius: this.pair.neckRadius, neckThicknessEstimate: this.pair.neckRadius * 2,
        unionK: this.pair.unionK, saddleDistance: this.pair.saddle, pairConnected: this.pair.connected, pairIndex: this.pair.index, kUniform: this.kUniform.slice(),
        recoilCount: this.recoilCount, adhesion: this.adhesion.value,
        shapes: sh.map(s => ({ x: s.x.value, y: s.y.value, w: s.w.value, h: s.h.value, bend: s.bend.value, press: s.press.value, render: { x: s.render.x, y: s.render.y, w: s.render.hw * 2, h: s.render.hh * 2 } })),
        targets: sh.map(s => [s.x.target, s.y.target, s.w.target, s.h.target]),
        content: this.slots.map(s => ({ shown: s.shown, pending: s.pending === undefined ? null : s.pending, a: s.a.value })),
        atRest: this.allRest() && !this.transition,
        homeRestored: this.mode === 'home' && GEOMETRY.home.every((g, i) => sh[i].x.value === g[0] && sh[i].y.value === g[1] && sh[i].w.value === g[2] && sh[i].h.value === g[3]) && this.T.value === 0,
        rendering: !!this.raf, frames: this.frames, draws: this.draws, speed: this.speed, thickness: this.thickness, liquidity: this.liquidity,
        scene: this.scene, view: this.view, autoplay: this.autoplay, paused: this.paused, inspecting: this.inspecting, reducedMotion: this.reduced,
        webgl: this.webgl ? { ok: true, lost: this.glLost, version: this.gl && this.gl.getParameter(this.gl.VERSION) } : { ok: false, reason: this.fallbackReason },
        layout: { hostW: this.hostW, hostH: this.hostH, scale: this.scale, dpr: this.dpr, canvasW: this.glCanvas.width, canvasH: this.glCanvas.height, pxPerUnit: this.pxPerUnit }
      };
    }
    /** Renders the SAME field in solid-color mode and reads it back: returns alpha (0..255) per device pixel plus the design-unit mapping. */
    readSilhouette() {
      if (!this.webgl || !this.gl) return null;
      this.draw(1);
      const gl = this.gl, w = this.glCanvas.width, h = this.glCanvas.height, buf = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
      const alpha = new Uint8Array(w * h);                       // flip rows so index 0 is the top row
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) alpha[y * w + x] = buf[((h - 1 - y) * w + x) * 4 + 3];
      this.draw(this.view === 'outline' ? 1 : 0);
      return { width: w, height: h, alpha, pxPerUnit: this.pxPerUnit, originX: w / 2, originY: h / 2 };
    }
  }

  LiquidBar.GEOMETRY = GEOMETRY; LiquidBar.SLOTS = SLOTS; LiquidBar.CONTENT = CONTENT; LiquidBar.version = '1.0.0';
  global.LiquidBar = LiquidBar;
  if (typeof module !== 'undefined' && module.exports) module.exports = LiquidBar;
})(typeof window !== 'undefined' ? window : globalThis);
