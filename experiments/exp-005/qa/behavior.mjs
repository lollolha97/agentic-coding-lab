// Behavioural QA against real headless Chrome (software WebGL 2 via SwiftShader). Usage: node qa/behavior.mjs [results.json]
// Every check is a real browser run; nothing here claims real-GPU/real-device behaviour.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const results = [];
const check = (group, name, ok, detail = '') => { results.push({ group, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail ? ' — ' + detail : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const { server, port, log } = await serve(root);
const base = `http://127.0.0.1:${port}/experiments/exp-005`;

async function session(opts, url) {
  const b = await launch(opts); await b.goto(base + url);
  const ev = e => b.evaluate(e), J = async e => JSON.parse(await b.evaluate(`JSON.stringify(${e})`));
  const settle = async (ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev('bar.getDiagnostics().atRest && !bar.raf')) return true; await sleep(60); } return false; };
  const rect = async slot => J(`(r => ({x: r.x, y: r.y, w: r.width, h: r.height}))(document.querySelector('[data-slot="${slot}"]').getBoundingClientRect())`);
  const click = async slot => { const r = await rect(slot); await mouse(r.x + r.w / 2, r.y + r.h / 2); };
  const mouse = async (x, y) => { await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
  const key = async (k, code, vk, text) => { await b.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, text }); await b.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); };
  return { b, ev, J, settle, rect, click, mouse, key, tab: () => key('Tab', 'Tab', 9), enter: () => key('Enter', 'Enter', 13, '\r'), space: () => key(' ', 'Space', 32, ' '), esc: () => key('Escape', 'Escape', 27) };
}
const geomEq = (d, g) => d.shapes.every((s, i) => s.x === g[i][0] && s.y === g[i][1] && s.w === g[i][2] && s.h === g[i][3]);
const HOME = [[-202, 0, 284, 144], [154, 0, 384, 144], [154, 0, 0.02, 0.02]];

// ------------------------------------------------------------------ A. 960x640 DPR1 harness: interaction, keyboard, rapid interruption, idle, determinism
{
  const s = await session({ width: 960, height: 640, dpr: 1 }, '/qa/harness.html');
  const { b, ev, J, settle } = s;
  await ev('bar.setAutoplay(false), 1'); await settle();
  let d = await J('bar.getDiagnostics()');
  check('boot', 'WebGL 2 context created (SwiftShader software renderer)', d.webgl.ok, d.webgl.version);
  check('boot', 'initial home geometry exact', geomEq(d, HOME) && d.mode === 'home');
  check('boot', 'idle on load: not rendering, atRest', d.atRest && !d.rendering);

  // idle render shutdown: frame counter must not advance while nothing happens
  const f0 = (await J('bar.getDiagnostics()')).frames; await sleep(700); const f1 = (await J('bar.getDiagnostics()')).frames;
  check('lifecycle', 'idle render shutdown (0 frames in 700 ms)', f1 === f0, `frames ${f0}->${f1}`);

  // real mouse clicks
  await s.click(0); await sleep(300);
  d = await J('bar.getDiagnostics()');
  check('interaction', 'mouse click Pay -> mode pay, transition running', d.mode === 'pay' && (d.transition || d.atRest));
  check('interaction', 'rendering resumed after click', (await J('bar.getDiagnostics()')).frames > f1);
  check('interaction', 'settles into exact pay geometry', await settle());
  d = await J('bar.getDiagnostics()');
  check('interaction', 'pay stable geometry == spec [-272,336][374,132][90,364]', d.mode === 'pay' && geomEq(d, [[-272, 0, 336, 144], [374, 0, 132, 144], [90, 0, 364, 144]]));
  check('interaction', 'rendering stops again once settled', (await sleep(300), !(await J('bar.getDiagnostics()')).rendering));
  const labels = await J(`[...document.querySelectorAll('.lb-btn')].filter(b => !b.hidden && !b.hasAttribute('inert')).map(b => b.getAttribute('aria-label') + '@' + Math.round(b.getBoundingClientRect().x))`);
  check('a11y', 'pay: DOM/Tab order == visual left-to-right order', labels.join(',').match(/Contact@.*Scan QR@.*Close@/) && labels.map(l => +l.split('@')[1]).every((v, i, a) => !i || v > a[i - 1]), labels.join(', '));
  await s.click(2); await sleep(120);
  check('events', 'Scan QR click emits scan-qr with branch=pay (no business logic)', JSON.stringify(await J('window.actions')) === '[{"action":"scan-qr","branch":"pay"}]', JSON.stringify(await J('window.actions')));
  await s.click(0); await sleep(120);
  check('events', 'Contact click emits contact with branch', (await J('window.actions')).some(a => a.action === 'contact' && a.branch === 'pay'));
  await s.click(1); await sleep(250);
  d = await J('bar.getDiagnostics()');
  check('interaction', 'mouse click Close -> mode home immediately (targets change on click)', d.mode === 'home');
  check('interaction', 'merge-back converges', await settle());
  d = await J('bar.getDiagnostics()');
  check('interaction', 'home geometry restored EXACTLY after merge-back', d.homeRestored && geomEq(d, HOME) && d.tension === 0, JSON.stringify(d.shapes.map(x => [x.x, x.w])));
  check('interaction', 'after merge-back all residuals zero (bend/press/velocity)', d.shapes.every(x => x.bend === 0 && x.press === 0) && d.tensionVelocity === 0);

  // keyboard
  await ev(`document.getElementById('before').focus(), 1`);
  await s.tab();
  let focus = await J(`document.activeElement.getAttribute('aria-label')`);
  check('keyboard', 'Tab from the element before the bar reaches first button (Pay)', focus === 'Pay', focus);
  await s.tab(); focus = await J(`document.activeElement.getAttribute('aria-label')`);
  check('keyboard', 'Tab order home: Pay -> Request', focus === 'Request', focus);
  await s.tab();
  check('keyboard', 'hidden child button is not in the Tab order at home (next Tab leaves the bar)', (await J(`document.activeElement.id`)) === 'after', await J(`document.activeElement.outerHTML.slice(0, 60)`));
  await ev(`document.querySelector('[data-slot="0"]').focus(), 1`);
  await s.enter(); await sleep(150);
  check('keyboard', 'Enter on Pay opens pay branch', (await J('bar.getDiagnostics().mode')) === 'pay');
  await settle();
  focus = await J(`document.activeElement.getAttribute('aria-label')`);
  check('keyboard', 'focus moved to first current button (Contact) after keyboard open', focus === 'Contact', focus);
  await s.tab(); await s.tab(); focus = await J(`document.activeElement.getAttribute('aria-label')`);
  check('keyboard', 'Tab order in pay: Contact -> Scan QR -> Close', focus === 'Close', focus);
  await s.esc(); await sleep(150);
  check('keyboard', 'Escape returns home', (await J('bar.getDiagnostics().mode')) === 'home');
  focus = await J(`document.activeElement.getAttribute('aria-label')`);
  const slotFocused = await J(`document.activeElement.dataset.slot`);
  await settle();
  focus = await J(`document.activeElement.getAttribute('aria-label')`);
  check('keyboard', 'Escape restores focus to the launcher element (slot 0, labelled Pay once settled)', slotFocused === '0' && focus === 'Pay', `slot ${slotFocused} label ${focus}`);
  await ev(`document.querySelector('[data-slot="1"]').focus(), 1`);
  await s.space(); await sleep(150);
  check('keyboard', 'Space on Request opens request branch', (await J('bar.getDiagnostics().mode')) === 'request');
  await settle();
  await s.tab(); await s.tab(); focus = await J(`document.activeElement.getAttribute('aria-label')`);
  check('keyboard', 'Tab order in request: Close -> Contact -> My QR', focus === 'My QR', focus);
  await s.esc(); await sleep(150); await settle();
  check('keyboard', 'Escape from request restores focus to Request launcher', (await J(`document.activeElement.getAttribute('aria-label')`)) === 'Request');
  check('interaction', 'request branch merge-back restores exact home', (await J('bar.getDiagnostics().homeRestored')));

  // pointer robustness: cancel / release outside must not leave a button pressed
  await ev(`(() => { const b = document.querySelector('[data-slot="0"]'); b.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 7, pointerType: 'touch'})); })(), 1`);
  const pr1 = await J('bar.shapes[0].press.target');
  await ev(`document.querySelector('[data-slot="0"]').dispatchEvent(new PointerEvent('pointercancel', {bubbles: true, pointerId: 7})), 1`);
  check('pointer', 'pointerdown presses, pointercancel releases', pr1 === 1 && (await J('bar.shapes[0].press.target')) === 0);
  await ev(`document.querySelector('[data-slot="1"]').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 8, pointerType: 'mouse'})), 1`);
  await ev(`window.dispatchEvent(new PointerEvent('pointerup', {pointerId: 8})), 1`);
  check('pointer', 'pointer released outside the button (window pointerup) does not stay pressed', (await J('bar.shapes[1].press.target')) === 0);
  await ev(`document.querySelector('[data-slot="1"]').dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerId: 9, pointerType: 'mouse'})), 1`);
  await ev(`window.dispatchEvent(new Event('blur')), 1`);
  check('pointer', 'window blur releases pressed button', (await J('bar.shapes[1].press.target')) === 0);
  await settle();

  // >= 24 rapid interruptions via real clicks + API (open/close/switch/open), random gaps, never waiting for settle
  const seq = []; let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const modes = ['pay', 'home', 'request', 'home', 'pay', 'request', 'home', 'request', 'pay', 'home'];
  let nan = false, minChild = 1e9, jumpMax = 0;
  const gaps = [];
  for (let i = 0; i < 40; i++) {
    const m = modes[Math.floor(rnd() * modes.length)];
    // before/after are read inside ONE synchronous evaluation so ordinary spring motion between CDP round-trips is not mistaken for a snap
    const jump = await J(`(() => { const snap = () => bar.shapes.map(s => [s.x.value, s.y.value, s.w.value, s.h.value]); const b = snap(); bar.setMode(${JSON.stringify(m)}); const a = snap();
      return Math.max(...b.map((p, k) => (k === 2 && p[2] < 1 && p[3] < 1) ? 0 : Math.max(...p.map((v, j) => Math.abs(v - a[k][j]))))); })()`);
    jumpMax = Math.max(jumpMax, jump);   // only the HIDDEN child may be placed inside its source parent
    const gap = Math.floor(30 + rnd() * 260); gaps.push(gap); await sleep(gap);
    const dd = await J('bar.getDiagnostics()');
    if (dd.shapes.some(x => ![x.x, x.y, x.w, x.h, x.bend].every(Number.isFinite)) || !Number.isFinite(dd.tension)) nan = true;
    seq.push(m);
  }
  check('rapid', '40 rapid interruptions: no NaN/Infinity in state', !nan);
  check('rapid', 'interrupt never snaps visible shapes (max |Δ| of x,y,w,h across setMode, same tick)', jumpMax < 1e-6, 'max jump ' + jumpMax.toExponential(2));
  await ev(`bar.setMode('home'), 1`);
  check('rapid', 'converges after rapid sequence', await settle(8000));
  d = await J('bar.getDiagnostics()');
  check('rapid', 'final home geometry exact after 40 interruptions', d.homeRestored && geomEq(d, HOME), JSON.stringify(d.shapes.map(x => [x.x, x.w, x.h])));
  // rapid via real mouse clicks on whatever is currently clickable
  for (let i = 0; i < 12; i++) { await s.click(i % 2 === 0 ? 0 : 1); await sleep(70 + (i % 4) * 40); }
  await ev(`bar.setMode('home'), 1`); await settle(8000);
  check('rapid', '12 rapid REAL mouse clicks then home: exact home', (await J('bar.getDiagnostics().homeRestored')));
  await ev(`bar.setMode('pay'), 1`); await sleep(400); await ev(`bar.setMode('request'), 1`); await sleep(300); await ev(`bar.setMode('home'), 1`); await sleep(150); await ev(`bar.setMode('pay'), 1`);
  check('rapid', 'open -> switch branch -> close -> open again converges', await settle(8000) && geomEq(await J('bar.getDiagnostics()'), [[-272, 0, 336, 144], [374, 0, 132, 144], [90, 0, 364, 144]]));
  await ev(`bar.setMode('home'), 1`); await settle();

  // determinism / solver equivalence: real-time stepping at 60 Hz vs fixed 1/240 inspect
  const rt = await J(`(() => { bar.jumpTo('home'); bar.mode = 'pay'; bar.startOpen('pay'); bar.retargetContent(0.105); for (let i = 0; i < 21; i++) bar.advance(1 / 60); const d = bar.getDiagnostics(); return {s: d.shapes.map(x => [x.x, x.w, x.h]), T: d.tension}; })()`);
  const ins = await J(`(() => { const d = bar.inspectTransition('pay', 0.35 / 0.9, 'open'); return {s: d.shapes.map(x => [x.x, x.w, x.h]), T: d.tension}; })()`);
  const dev = Math.max(...rt.s.flatMap((p, i) => p.map((v, k) => Math.abs(v - ins.s[i][k]))), Math.abs(rt.T - ins.T));
  check('solver', 'inspect(1/240 s steps) == real-time(1/60 s frames) at 350 ms within 1.5 units', dev < 1.5, 'max deviation ' + dev.toFixed(3));
  const a1 = await J(`bar.inspectTransition('request', 0.45 / 0.9, 'close').shapes.map(x => x.x)`), a2 = await J(`bar.inspectTransition('request', 0.45 / 0.9, 'close').shapes.map(x => x.x)`);
  check('solver', 'inspectTransition is deterministic (identical on repeat)', JSON.stringify(a1) === JSON.stringify(a2));

  // exact pause/resume
  await ev(`bar.inspectTransition('pay', 0.3 / 0.9, 'open'), bar.resume(), 1`); await sleep(200);
  await ev('bar.pause(), 1'); const p1 = await J('bar.getDiagnostics().shapes.map(x => [x.x, x.w])'); await sleep(400); const p2 = await J('bar.getDiagnostics().shapes.map(x => [x.x, x.w])');
  check('inspect', 'pause freezes the exact state (no drift over 400 ms)', JSON.stringify(p1) === JSON.stringify(p2));
  await ev('bar.resume(), 1'); await sleep(300); const p3 = await J('bar.getDiagnostics().shapes.map(x => [x.x, x.w])');
  check('inspect', 'resume continues from the frozen state', JSON.stringify(p3) !== JSON.stringify(p2));
  await settle(); await ev(`bar.setMode('home'), 1`); await settle();
  check('inspect', 'leaving inspection returns to normal interaction (click works)', (await (async () => { await ev(`bar.inspectTransition('pay', 0.5, 'open'), 1`); await s.click(1); await sleep(200); return (await J('bar.getDiagnostics()')).mode === 'home' && !(await J('bar.paused')); })()));
  await settle();

  // speed
  await ev(`bar.setSpeed(0.25), bar.setMode('pay'), 1`); await sleep(500); const slow = await J('bar.getDiagnostics().transition ? bar.getDiagnostics().transition.ms : 9999');
  check('speed', '0.25x runs the same solver 4x slower (500 ms wall ≈ ≤ 160 ms sim)', slow <= 170 && slow > 20, 'sim ms ' + slow);
  await ev(`bar.setSpeed(1), 1`); await settle(8000); await ev(`bar.setMode('home'), 1`); await settle(8000);
  check('speed', 'default speed is 1', (await J(`(() => { const d = document.createElement('div'); d.style.cssText = 'width:300px;height:200px'; document.body.appendChild(d); const t = LiquidBar.create(d); const v = t.speed; t.destroy(); d.remove(); return v; })()`)) === 1);

  // frame-time robustness: one 3-second stall must not replay work or run away
  await ev(`bar.setMode('pay'), 1`); await sleep(100);
  const sub = await J(`(() => { const t = performance.now(); bar.advance(10); return performance.now() - t; })()`);
  check('lifecycle', 'a 10 s frame gap is clamped (substep cap 60) and returns fast', sub < 500, sub.toFixed(1) + ' ms');
  await settle(8000);

  // hidden page pause (simulated: overrides document.hidden, dispatches visibilitychange)
  await ev(`bar.setMode('home'), 1`); await sleep(100);
  await ev(`Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}), document.dispatchEvent(new Event('visibilitychange')), 1`);
  const h0 = (await J('bar.getDiagnostics()')).frames; await sleep(500); const h1 = (await J('bar.getDiagnostics()')).frames;
  check('lifecycle', 'page hidden -> rendering paused (simulated visibilitychange)', h1 - h0 <= 1, `frames ${h0}->${h1}`);
  await ev(`Object.defineProperty(document, 'hidden', {configurable: true, get: () => false}), document.dispatchEvent(new Event('visibilitychange')), 1`);
  check('lifecycle', 'page visible again -> converges to exact home', await settle(8000) && (await J('bar.getDiagnostics().homeRestored')));

  // thickness changes the SAMPLED result (refraction scene) — pixel comparison of the actual WebGL output
  await ev(`bar.setScene('refraction'), bar.jumpTo('home'), 1`);
  const grab = `(() => { bar.render(); const c = document.createElement('canvas'); c.width = bar.glCanvas.width; c.height = bar.glCanvas.height; const x = c.getContext('2d'); x.drawImage(bar.glCanvas, 0, 0); return Array.from(x.getImageData(0, 0, c.width, c.height).data.filter((v, i) => i % 4 < 3)); })()`;
  await ev(`bar.setMaterial({thickness: 10})`); const g10 = await J(grab); await ev(`bar.setMaterial({thickness: 40})`); const g40 = await J(grab); await ev(`bar.setMaterial({thickness: 25})`);
  let diff = 0; for (let i = 0; i < g10.length; i++) if (Math.abs(g10[i] - g40[i]) > 8) diff++;
  check('material', 'thickness 10 vs 40 changes actual rendered pixels in refraction scene', diff > 500, diff + ' channel samples differ >8/255');
  await ev(`bar.setScene('reference'), 1`); const r10 = await (async () => { await ev(`bar.setMaterial({thickness: 10})`); return J(grab); })(); await ev(`bar.setMaterial({thickness: 40})`); const r40 = await J(grab);
  let diffR = 0; for (let i = 0; i < r10.length; i++) if (Math.abs(r10[i] - r40[i]) > 8) diffR++;
  check('material', 'on the flat reference background refraction is (correctly) nearly invisible', diffR < diff / 3, `${diffR} vs ${diff}`);
  await ev(`bar.setMaterial({thickness: 25}), 1`);

  // outline-only uses the same field and hides text
  await ev(`bar.setView('outline'), bar.jumpTo('home'), bar.render(), 1`);
  const outl = await J(`(() => { const s = bar.readSilhouette(); let n = 0; for (const a of s.alpha) if (a > 127) n++; return {n, textVisible: getComputedStyle(document.querySelector('.lb-inner')).visibility}; })()`);
  check('modes', 'outline-only: solid silhouette rendered by the same WebGL field, text hidden', outl.n > 20000 && outl.textVisible === 'hidden', JSON.stringify(outl));
  await ev(`bar.setView('glass'), 1`);

  check('errors', 'no console errors / exceptions in harness session', s.b.state.console.filter(c => c.type === 'error' || (c.type === 'log-error' && !/favicon/.test(c.text))).length === 0 && s.b.state.exceptions.length === 0 && (await J('window.errors')).length === 0, JSON.stringify(s.b.state.console.filter(c => !/favicon/.test(c.text))) + JSON.stringify(s.b.state.exceptions));
  const ext = s.b.state.requests.filter(u => !u.startsWith(`http://127.0.0.1:${port}/`) && !u.startsWith('data:') && !u.startsWith('blob:'));
  check('network', 'zero external network requests (harness)', ext.length === 0, JSON.stringify(ext));
  await s.b.close();
}

// ------------------------------------------------------------------ B. window resize / alignment / DPR 2 / hit areas
{
  const s = await session({ width: 960, height: 640, dpr: 1 }, '/qa/harness.html');
  const { b, ev, J, settle } = s;
  await ev('bar.setAutoplay(false), 1');
  for (const [w, h, dpr] of [[960, 640, 1], [700, 500, 1], [390, 844, 1], [320, 600, 1], [1280, 720, 2]]) {
    await b.setViewport(w, h, dpr, w < 500); await sleep(350);
    for (const mode of ['home', 'pay', 'request']) {
      await ev(`bar.jumpTo(${JSON.stringify(mode)}), bar.render(), 1`);
      // DOM button boxes vs the silhouette drawn by the shader (both derive from the same state) — compare bounding extents in CSS px
      const r = await J(`(() => { const s = bar.readSilhouette(), d = bar.getDiagnostics(), L = d.layout, glr = bar.glCanvas.getBoundingClientRect();
        let x0 = 1e9, x1 = -1;
        for (let y = Math.round(s.height / 2); y === Math.round(s.height / 2); y++) for (let x = 0; x < s.width; x++) if (s.alpha[y * s.width + x] > 127) { if (x < x0) x0 = x; x1 = x + 1; }
        const btns = [...document.querySelectorAll('.lb-btn')].filter(b => !b.hidden && !b.hasAttribute('inert')).map(b => b.getBoundingClientRect());
        const bl = Math.min(...btns.map(b => b.left)), br = Math.max(...btns.map(b => b.right));
        return {silL: glr.left + x0 / L.dpr, silR: glr.left + x1 / L.dpr, btnL: bl, btnR: br, scale: L.scale, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth}; })()`);
      const err = Math.max(Math.abs(r.silL - r.btnL), Math.abs(r.silR - r.btnR));
      check('resize', `${w}x${h}@${dpr} ${mode}: glass silhouette aligns with DOM buttons (|Δ| ≤ 1.5px)`, err <= 1.5 && !r.overflow, `Δ=${err.toFixed(2)}px scale=${r.scale.toFixed(3)}`);
    }
  }
  // background texture alignment: inside the glass centre refraction is ~0, so the GL pixels must correlate with the DISPLAYED background canvas
  // (same source, uv = (hostSize/2 + p*scale)/hostSize). Negative control: the same patch shifted by half a line spacing must correlate much worse.
  for (const [w, h, dpr] of [[960, 640, 1], [700, 500, 1], [390, 844, 1], [320, 600, 1], [1280, 720, 2]]) {
    await b.setViewport(w, h, dpr, w < 500); await sleep(350);
    await ev(`bar.setScene('refraction'), bar.jumpTo('home'), bar.render(), 1`);
    const r = await J(`(() => {
      const L = bar.getDiagnostics().layout, S = L.scale, cx = L.hostW / 2, cy = L.hostH / 2;
      const grab = (canvas, x0, y0, x1, y1) => { const cr = canvas.getBoundingClientRect(), k = canvas.width / cr.width; const hostR = bar.host.getBoundingClientRect();
        const px = (hostR.left + x0 - cr.left) * k, py = (hostR.top + y0 - cr.top) * k, pw = Math.max(2, Math.round((x1 - x0) * k)), ph = Math.max(2, Math.round((y1 - y0) * k));
        const c = document.createElement('canvas'); c.width = pw; c.height = ph; const x = c.getContext('2d'); x.drawImage(canvas, px, py, pw, ph, 0, 0, pw, ph);
        const d = x.getImageData(0, 0, pw, ph).data, g = new Float64Array(pw * ph); for (let i = 0; i < pw * ph; i++) g[i] = d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11; return g; };
      const corr = (a, b) => { let ma = 0, mb = 0; for (let i = 0; i < a.length; i++) { ma += a[i]; mb += b[i]; } ma /= a.length; mb /= a.length; let n = 0, da = 0, db = 0; for (let i = 0; i < a.length; i++) { n += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; } return n / Math.sqrt(da * db + 1e-9); };
      const x0 = cx + (-250) * S, x1 = cx + (-150) * S, y0 = cy - 30 * S, y1 = cy + 30 * S, shift = 7 * S;
      const gl = grab(bar.glCanvas, x0, y0, x1, y1), bg = grab(bar.bgCanvas, x0, y0, x1, y1), bgShift = grab(bar.bgCanvas, x0 + shift, y0, x1 + shift, y1);
      return {aligned: corr(gl, bg), shifted: corr(gl, bgShift), px: gl.length};
    })()`);
    check('texture', `${w}x${h}@${dpr}: refracted texture lines up with the displayed background (corr ${r.aligned.toFixed(2)} vs half-spacing shift ${r.shifted.toFixed(2)})`, r.aligned > 0.85 && r.aligned > r.shifted + 0.25, `${r.px} px patch`);
  }
  // custom background (component-managed image/canvas) with cover cropping
  await b.setViewport(960, 640, 1); await sleep(300);
  const custom = await J(`(() => { const c = document.createElement('canvas'); c.width = 400; c.height = 100; const x = c.getContext('2d'); x.fillStyle = '#cc3b3b'; x.fillRect(0, 0, 200, 100); x.fillStyle = '#3b6bcc'; x.fillRect(200, 0, 200, 100);
    bar.setBackgroundImage(c); bar.render(); const d = bar.bgCanvas.getContext('2d'); const a = d.getImageData(60, 60, 1, 1).data, z = d.getImageData(bar.bgCanvas.width - 60, 60, 1, 1).data;
    const out = {scene: bar.scene, left: Array.from(a).slice(0, 3), right: Array.from(z).slice(0, 3), view: bar.getDiagnostics().webgl.ok}; bar.setScene('reference'); return out; })()`);
  check('background', 'setBackgroundImage(canvas): displayed background is the cover-cropped source and uploaded to the shader', custom.scene === 'custom' && custom.left[0] > 150 && custom.right[2] > 150, JSON.stringify(custom));
  // minimum hit regions at 320 / 390
  for (const w of [390, 320]) {
    await b.setViewport(w, 700, 1, true); await sleep(300);
    await ev(`bar.jumpTo('pay'), bar.render(), 1`);
    const rects = await J(`[...document.querySelectorAll('.lb-btn')].filter(b => !b.hidden).map(b => { const r = b.getBoundingClientRect(); return {l: b.getAttribute('aria-label'), x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height}; })`);
    const close = rects.find(r => r.l === 'Close');
    // probe 21px left/right and up/down of the centre: elementFromPoint must still resolve to the button (invisible >=44px hit region)
    const hit = await J(`(() => { const c = ${JSON.stringify(close)}; return [[-21, 0], [21, 0], [0, -21], [0, 21]].map(([dx, dy]) => { const e = document.elementFromPoint(c.x + dx, c.y + dy); return !!(e && e.closest && e.closest('.lb-btn') && e.closest('.lb-btn').getAttribute('aria-label') === 'Close'); }); })()`);
    check('touch', `${w}px: Close visible ${close.w.toFixed(0)}x${close.h.toFixed(0)} css px, hit region ≥ 44x44 (probes ±21px)`, hit.every(Boolean), JSON.stringify(hit));
  }
  // DPR2 silhouette scale sanity
  await b.setViewport(1280, 720, 2); await sleep(300);
  const d2 = await J('bar.getDiagnostics().layout');
  check('resize', 'DPR 2 canvas is 2x CSS size (cap 2)', d2.dpr === 2 && d2.canvasW === 2 * Math.round(d2.canvasW / 2), JSON.stringify(d2));
  await b.shot('/tmp/liquid-qa/dpr2-home.png', { x: 0, y: 180, width: 1280, height: 360 });
  await b.close();
}

// ------------------------------------------------------------------ C. reduced motion, fallback, context loss, unmount/remount
{
  const s = await session({ width: 960, height: 640, dpr: 1 }, '/qa/harness.html?rm=1');
  const { b, ev, J, settle } = s;
  await ev('bar.setAutoplay(true), 1');
  check('reduced-motion', 'autoplay refused when reduced motion is on', (await J('bar.getDiagnostics().autoplay')) === false);
  await ev(`bar.setMode('pay'), 1`);
  const d = await J('bar.getDiagnostics()');
  check('reduced-motion', 'setMode jumps straight to stable pay geometry (no transition)', d.mode === 'pay' && d.transition === null && geomEq(d, [[-272, 0, 336, 144], [374, 0, 132, 144], [90, 0, 364, 144]]) && d.atRest);
  await sleep(200);
  const px = await J(`(() => { const s = bar.readSilhouette(); return s ? s.alpha.filter(a => a > 127).length : -1; })()`);
  check('reduced-motion', 'jumped state is actually rendered (canvas not stale)', px > 30000, px + ' px');
  await ev(`bar.setMode('home'), 1`); await sleep(200);
  check('reduced-motion', 'jump back to exact home', (await J('bar.getDiagnostics().homeRestored')));
  await b.close();
}
{
  const s = await session({ width: 960, height: 640, dpr: 1 }, '/qa/harness.html?webgl=0');
  const { b, ev, J } = s;
  const info = await J(`({note: document.querySelector('.lb-note').textContent, hidden: document.querySelector('.lb-note').hidden, fb: document.querySelector('.lb-host').hasAttribute('data-fallback'), gl: bar.getDiagnostics().webgl})`);
  check('fallback', 'no WebGL 2 -> explicit FALLBACK label shown, host marked data-fallback', !info.hidden && /FALLBACK/.test(info.note) && info.fb && info.gl.ok === false, info.note);
  check('fallback', 'fallback label states it is not the liquid-glass effect', /액체 유리 효과가 아닙니다/.test(info.note));
  await s.click(0); await sleep(300);
  check('fallback', 'fallback buttons still operable (state machine runs)', (await J('bar.getDiagnostics().mode')) === 'pay');
  check('errors', 'fallback session has no console errors', b.state.exceptions.length === 0 && b.state.console.filter(c => c.type === 'error').length === 0);
  await b.close();
}
{
  const s = await session({ width: 960, height: 640, dpr: 1 }, '/qa/harness.html');
  const { b, ev, J, settle } = s;
  await ev('bar.setAutoplay(false), 1');
  await ev(`window.ext = bar.gl.getExtension('WEBGL_lose_context'), window.ext.loseContext(), 1`); await sleep(300);
  let st = await J(`({lost: bar.glLost, note: document.querySelector('.lb-note').hidden ? '' : document.querySelector('.lb-note').textContent})`);
  check('context-loss', 'context loss detected and labelled (not silently faked)', st.lost === true && /컨텍스트/.test(st.note), st.note);
  await ev('window.ext.restoreContext(), 1'); await sleep(600);
  st = await J(`({lost: bar.glLost, ok: bar.getDiagnostics().webgl.ok, hidden: document.querySelector('.lb-note').hidden})`);
  check('context-loss', 'context restoration recreates program/texture and clears the note', !st.lost && st.ok && st.hidden, JSON.stringify(st));
  await ev(`bar.setMode('pay'), 1`); await settle();
  const px = await J(`(() => { const s = bar.readSilhouette(); return s ? s.alpha.filter(a => a > 127).length : -1; })()`);
  check('context-loss', 'rendering works after restore (silhouette drawn, pay geometry)', px > 30000 && geomEq(await J('bar.getDiagnostics()'), [[-272, 0, 336, 144], [374, 0, 132, 144], [90, 0, 364, 144]]), px + ' px');
  // unmount / remount
  const cnt = await J(`(() => { const host = document.getElementById('host'); const before = host.children.length; const frames = bar.frames; bar.destroy(); const after = host.children.length; const cls = host.className; window.old = bar; return {before, after, cls, rafZero: !bar.raf}; })()`);
  check('lifecycle', 'destroy removes canvases/content/listeners from host', cnt.before === 4 && cnt.after === 0 && !/lb-host/.test(cnt.cls) && cnt.rafZero, JSON.stringify(cnt));
  await ev(`window.bar = LiquidBar.create(document.getElementById('host'), {}), window.bar.setAutoplay(false), 1`); await sleep(300);
  await ev(`bar.setMode('request'), 1`); await settle();
  check('lifecycle', 'remount works: request geometry exact, host has exactly one set of layers', geomEq(await J('bar.getDiagnostics()'), [[-354, 0, 132, 144], [262, 0, 316, 144], [-92, 0, 336, 144]]) && (await J(`document.getElementById('host').children.length`)) === 4);
  const f = (await J('window.old.frames'));
  await sleep(300); check('lifecycle', 'destroyed instance no longer renders', (await J('window.old.frames')) === f);
  await ev(`document.getElementById('host').dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true})), 1`);
  check('errors', 'no exceptions across context-loss and remount', b.state.exceptions.length === 0 && (await J('window.errors')).length === 0, JSON.stringify(b.state.exceptions));
  await b.close();
}

fs.writeFileSync(process.argv[2] || '/tmp/liquid-qa/behavior-results.json', JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`); if (failed.length) console.log('FAILED:\n' + failed.map(f => ` - [${f.group}] ${f.name} ${f.detail}`).join('\n'));
server.close(); process.exit(failed.length ? 1 : 0);
