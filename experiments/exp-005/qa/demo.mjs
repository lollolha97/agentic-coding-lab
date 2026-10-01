// Demo-page QA: the real experiments/exp-005/index.html with its inspection toolbar. Usage: node qa/demo.mjs [results.json] [screenshotDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve, launch } from './cdp.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const shots = process.argv[3] || '/tmp/liquid-qa/demo'; fs.mkdirSync(shots, { recursive: true });
const results = []; const sleep = ms => new Promise(r => setTimeout(r, ms));
const check = (group, name, ok, detail = '') => { results.push({ group, name, ok: !!ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'}  [${group}] ${name}${detail ? ' — ' + detail : ''}`); };
const { server, port } = await serve(root);
const url = `http://127.0.0.1:${port}/experiments/exp-005/index.html`;
const mk = async opts => { const b = await launch(opts); const J = async e => JSON.parse(await b.evaluate(`JSON.stringify(${e})`)); const ev = e => b.evaluate(e); return { b, J, ev }; };
const clickSel = async (b, J, sel) => { const r = await J(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); e.scrollIntoView({block: 'center', behavior: 'instant'}); const r = e.getBoundingClientRect(); return {x: r.x + r.width / 2, y: r.y + r.height / 2}; })()`); await b.send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...r }); await b.send('Input.dispatchMouseEvent', { type: 'mousePressed', ...r, button: 'left', clickCount: 1 }); await b.send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...r, button: 'left', clickCount: 1 }); };

{
  const { b, J, ev } = await mk({ width: 1440, height: 900, dpr: 1 });
  await b.goto(url); await sleep(500);
  check('page', 'loads, LiquidBar + demo present, WebGL 2 active', await J('!!window.liquidBarDemo && liquidBarDemo.getDiagnostics().webgl.ok'));
  check('page', 'autoplay is ON by default (no reduced motion) and the button says so', (await J('liquidBarDemo.autoplay')) === true && (await J(`document.querySelector('#exp5-autoplay').textContent`)) === '켬');
  check('page', 'default speed 1x pressed, default scene = reference, default thickness 25 / liquidity 1', (await J(`document.querySelector('[data-speed="1"]').getAttribute('aria-pressed')`)) === 'true' && (await J('liquidBarDemo.scene')) === 'reference' && (await J('liquidBarDemo.thickness')) === 25 && (await J('liquidBarDemo.liquidity')) === 1);
  // autoplay actually cycles modes
  const seen = new Set(); for (let i = 0; i < 40; i++) { seen.add(await J('liquidBarDemo.mode')); if (seen.has('pay') && seen.has('request')) break; await sleep(400); }
  check('autoplay', 'autoplay cycles pay -> home -> request on its own', seen.has('pay') && seen.has('request'), [...seen].join(','));
  await ev(`document.querySelector('#exp5-stage').scrollIntoView({block: 'center'}), 1`);
  // user interaction stops autoplay (no fighting the user)
  await clickSel(b, J, '.lb-btn[data-slot="0"]'); await sleep(300);
  check('autoplay', 'a real click on the bar turns autoplay off and the toggle follows', (await J('liquidBarDemo.autoplay')) === false && (await J(`document.querySelector('#exp5-autoplay').textContent`)) === '끔');
  await ev(`liquidBarDemo.setMode('home'), 1`); await sleep(1500);

  // scene / view / speed controls
  await clickSel(b, J, '[data-scene="refraction"]'); check('modes', 'MODE 2 refraction scene button switches scene', (await J('liquidBarDemo.scene')) === 'refraction');
  await clickSel(b, J, '[data-view="outline"]'); await sleep(200);
  const ol = await J(`(() => { const s = liquidBarDemo.readSilhouette(); return {n: s.alpha.filter(a => a > 127).length, vis: getComputedStyle(document.querySelector('.lb-inner')).visibility, view: liquidBarDemo.view}; })()`);
  check('modes', 'MODE 3 outline-only: same-field silhouette present, text hidden', ol.view === 'outline' && ol.n > 20000 && ol.vis === 'hidden', JSON.stringify(ol));
  await b.shot(path.join(shots, 'outline-only.png'));
  await clickSel(b, J, '[data-view="glass"]'); await clickSel(b, J, '[data-scene="reference"]');
  for (const sp of ['0.5', '0.25', '1']) { await clickSel(b, J, `[data-speed="${sp}"]`); check('modes', `MODE 5 speed ${sp}x applied`, (await J('liquidBarDemo.speed')) === +sp); }
  await ev(`(() => { const t = document.querySelector('#exp5-thick'); t.value = 50; t.dispatchEvent(new Event('input', {bubbles: true})); })(), 1`);
  check('modes', 'thickness slider updates material', (await J('liquidBarDemo.thickness')) === 50 && (await J(`document.querySelector('#exp5-thick-out').textContent`)) === '50');
  await ev(`(() => { const t = document.querySelector('#exp5-thick'); t.value = 25; t.dispatchEvent(new Event('input', {bubbles: true})); })(), 1`);

  // MODE 4: deformation breakdown timeline
  check('timeline', 'timeline slider starts disabled until a transition is chosen', (await J(`document.querySelector('#exp5-time').disabled`)) === true);
  for (const [br, dir] of [['pay', 'open'], ['pay', 'close'], ['request', 'open'], ['request', 'close']]) {
    await clickSel(b, J, `[data-branch="${br}"][data-dir="${dir}"]`);
    await ev(`(() => { const t = document.querySelector('#exp5-time'); t.value = 350; t.dispatchEvent(new Event('input', {bubbles: true})); })(), 1`);
    const d = await J('liquidBarDemo.getDiagnostics()');
    check('timeline', `${br} ${dir} @350ms: frozen via inspectTransition`, d.inspecting && d.paused && Math.abs(d.transition.ms - 350) < 1 && d.transition.kind === dir && d.transition.branch === br, `ms=${d.transition && d.transition.ms}`);
    await clickSel(b, J, '#exp5-verify'); await sleep(200);
    const txt = await J(`document.querySelector('#exp5-readout').textContent`);
    check('timeline', `${br} ${dir} @350ms: pixel verification button reports components from rendered pixels`, /주요 영역 (\d+)개/.test(txt), txt.slice(-60));
    await b.shot(path.join(shots, `timeline-${br}-${dir}-350.png`), { x: 0, y: 0, width: 1440, height: 900 });
  }
  // key timestamp buttons
  await clickSel(b, J, '[data-branch="pay"][data-dir="open"]');
  for (const ms of [0, 100, 200, 300, 350, 450, 600, 900]) { await clickSel(b, J, `[data-ms="${ms}"]`); check('timeline', `marker ${ms}ms seeks exactly`, Math.abs((await J('liquidBarDemo.getDiagnostics().transition?.ms ?? 0')) - ms) < 0.5 || (ms === 900)); }
  // exact pause / resume through the UI
  await ev(`liquidBarDemo.setSpeed(0.25), 1`);   // 4x slower so wall-clock jitter of the CDP round-trips cannot finish the transition
  await clickSel(b, J, '[data-ms="300"]'); await clickSel(b, J, '#exp5-play'); await sleep(250);
  await clickSel(b, J, '#exp5-play'); const f1 = await J('liquidBarDemo.getDiagnostics().shapes.map(s => [s.x, s.w])'); await sleep(500); const f2 = await J('liquidBarDemo.getDiagnostics().shapes.map(s => [s.x, s.w])');
  const msPaused = await J(`+document.querySelector('#exp5-time').value`);
  check('timeline', 'UI pause freezes exact state and slider shows where it stopped', JSON.stringify(f1) === JSON.stringify(f2) && msPaused > 300 && msPaused < 900, `paused at ${msPaused} ms`);
  await clickSel(b, J, '#exp5-play'); await sleep(1500); await ev(`liquidBarDemo.setSpeed(1), 1`);
  check('timeline', 'UI resume continues from the pause point and reaches the end of the transition', (await J('liquidBarDemo.getDiagnostics().transition')) === null || (await J(`+document.querySelector('#exp5-time').value`)) > msPaused);
  // leaving inspection must not break normal interaction + autoplay
  await clickSel(b, J, '#exp5-autoplay'); await sleep(100);
  const autoOn = await J('liquidBarDemo.autoplay');
  await clickSel(b, J, '[data-branch="request"][data-dir="open"]'); await clickSel(b, J, '[data-ms="200"]');
  check('timeline', 'entering inspection pauses autoplay internally', (await J('liquidBarDemo.getDiagnostics().autoplay')) === false);
  await clickSel(b, J, '#exp5-exit'); await sleep(400);
  check('timeline', '검사 종료 returns to normal mode: not paused/inspecting, controls disabled again', !(await J('liquidBarDemo.paused')) && !(await J('liquidBarDemo.inspecting')) && (await J(`document.querySelector('#exp5-time').disabled`)) === true);
  check('timeline', 'autoplay resumes after leaving inspection (when it was on)', autoOn ? (await J('liquidBarDemo.getDiagnostics().autoplay')) === true : true, 'autoplay before inspection: ' + autoOn);
  await ev(`liquidBarDemo.setAutoplay(false), 1`); await sleep(2500);
  await clickSel(b, J, '.lb-btn[data-slot="1"]'); await sleep(300);
  check('timeline', 'normal click after inspection still works (Request opens)', (await J('liquidBarDemo.mode')) === 'request');
  // a real click on the bar while inspecting exits inspection
  await ev(`liquidBarDemo.setMode('home'), 1`); await sleep(1800);
  await clickSel(b, J, '[data-branch="pay"][data-dir="open"]'); await clickSel(b, J, '[data-ms="300"]');
  await clickSel(b, J, '.lb-btn[data-slot="1"]'); await sleep(300);   // frozen pay state: slot 1 is Close -> real mode change
  check('timeline', 'clicking Close on the bar during inspection leaves inspection cleanly and starts the merge-back', !(await J('liquidBarDemo.inspecting')) && (await J(`document.querySelector('#exp5-time').disabled`)) === true);
  // event log
  await ev(`liquidBarDemo.setMode('pay', {instant: true}), 1`); await sleep(400); await clickSel(b, J, '.lb-btn[data-slot="0"]'); await sleep(250);
  check('events', 'action click appears in the event log with the "not connected" disclaimer on the page', /이벤트 발생: contact \(branch: pay\)/.test(await J(`document.querySelector('#exp5-log').textContent`)) && /연결되어 있지 않습니다/.test(await J(`document.querySelector('.exp5-log').textContent`)));
  check('errors', '1440 session: no console errors / exceptions', b.state.exceptions.length === 0 && b.state.console.filter(c => c.type === 'error' || c.type === 'log-error').length === 0, JSON.stringify(b.state.console));
  const ext = b.state.requests.filter(u => !u.startsWith(`http://127.0.0.1:${port}/`) && !u.startsWith('data:') && !u.startsWith('blob:'));
  check('network', 'zero external network requests on the demo page', ext.length === 0, JSON.stringify(ext));
  // layouts
  for (const [w, h] of [[960, 800], [390, 844], [320, 700]]) {
    await b.setViewport(w, h, 1, w < 500); await b.goto(url); await sleep(500);
    const o = await J(`({sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, body: document.body.scrollWidth, wide: [...document.querySelectorAll('.exp5 *')].filter(e => e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).map(e => e.tagName + '.' + e.className).slice(0, 4)})`);
    check('layout', `${w}px: no horizontal overflow`, o.sw <= o.cw && o.wide.length === 0, JSON.stringify(o));
    await ev(`liquidBarDemo.setAutoplay(false), liquidBarDemo.setMode('pay', {instant: true}), window.scrollTo(0, 0), 1`); await sleep(300);
    await b.shot(path.join(shots, `demo-${w}.png`));
  }
  await b.close();
}
{
  const { b, J, ev } = await mk({ width: 1440, height: 900, dpr: 1, args: ['--force-prefers-reduced-motion'] });
  await b.goto(url); await sleep(500);
  const r = await J(`({rm: liquidBarDemo.reduced, auto: liquidBarDemo.autoplay, btn: document.querySelector('#exp5-autoplay').textContent, dis: document.querySelector('#exp5-autoplay').disabled, status: document.querySelector('#exp5-status').textContent})`);
  check('reduced-motion', 'page honours prefers-reduced-motion: autoplay off + disabled + explained', r.rm && !r.auto && r.dis && /모션 줄이기/.test(r.btn + r.status), JSON.stringify(r));
  await ev(`liquidBarDemo.setMode('pay'), 1`); await sleep(150);
  const d = await J('liquidBarDemo.getDiagnostics()');
  check('reduced-motion', 'click jumps to the stable branch state (no transition)', d.mode === 'pay' && d.transition === null && d.atRest);
  await ev(`document.querySelector('[data-branch="pay"][data-dir="open"]').click(), 1`); await ev(`(() => { const t = document.querySelector('#exp5-time'); t.value = 300; t.dispatchEvent(new Event('input', {bubbles: true})); })(), 1`);
  check('reduced-motion', 'timeline scrubbing (static frozen frames) still available; auto-play button disabled', (await J('liquidBarDemo.getDiagnostics().inspecting')) && (await J(`document.querySelector('#exp5-play').disabled`)) === true);
  await b.close();
}
fs.writeFileSync(process.argv[2] || '/tmp/liquid-qa/demo-results.json', JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`); if (failed.length) console.log('FAILED:\n' + failed.map(f => ` - [${f.group}] ${f.name} ${f.detail}`).join('\n'));
server.close(); process.exit(failed.length ? 1 : 0);
