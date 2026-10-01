/* EXP-005 demo page controller. Everything about the effect lives in liquid-bar/liquid-bar.js; this file only wires the inspection toolbar.
   `window.liquidBarDemo` exposes the component instance for the QA scripts in experiments/exp-005/qa/. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const status = $('#exp5-status');
  if (!window.LiquidBar) { status.textContent = 'LiquidBar 스크립트를 불러오지 못했습니다.'; return; }

  const bar = LiquidBar.create($('#exp5-bar'));
  window.liquidBarDemo = bar;
  const pressed = (buttons, match) => buttons.forEach(b => b.setAttribute('aria-pressed', String(match(b))));
  const DIR = { open: '펼치기', close: '합치기' };
  const NAME = { pay: 'Pay', request: 'Request' };

  // ---------------------------------------------------------------- availability
  const reduced = bar.reduced;
  const noGL = !bar.getDiagnostics().webgl.ok;
  const autoBtn = $('#exp5-autoplay');
  let wantAutoplay = !reduced && !noGL;
  function syncAutoplay() {
    autoBtn.textContent = reduced ? '꺼짐 (모션 줄이기)' : bar.autoplay ? '켬' : '끔';
    autoBtn.setAttribute('aria-pressed', String(bar.autoplay)); autoBtn.disabled = reduced || noGL;
  }
  if (wantAutoplay) bar.setAutoplay(true);
  syncAutoplay();
  autoBtn.addEventListener('click', () => { wantAutoplay = !bar.autoplay; leaveInspect(false); bar.setAutoplay(wantAutoplay); syncAutoplay(); });
  bar.on('autoplaychange', () => { wantAutoplay = false; syncAutoplay(); });
  if (noGL) $$('[data-scene],[data-view],[data-speed],#exp5-thick,#exp5-liq,.exp5-branches button').forEach(el => { el.disabled = true; });

  // ---------------------------------------------------------------- scene / view / speed / material
  const sceneBtns = $$('[data-scene]'), viewBtns = $$('[data-view]'), speedBtns = $$('[data-speed]');
  sceneBtns.forEach(b => b.addEventListener('click', () => { bar.setScene(b.dataset.scene); pressed(sceneBtns, x => x === b); }));
  viewBtns.forEach(b => b.addEventListener('click', () => { bar.setView(b.dataset.view); pressed(viewBtns, x => x === b); }));
  speedBtns.forEach(b => b.addEventListener('click', () => { bar.setSpeed(+b.dataset.speed); pressed(speedBtns, x => x === b); }));
  $('#exp5-thick').addEventListener('input', e => { bar.setMaterial({ thickness: +e.target.value }); $('#exp5-thick-out').textContent = e.target.value; });
  $('#exp5-liq').addEventListener('input', e => { bar.setMaterial({ liquidity: +e.target.value }); $('#exp5-liq-out').textContent = (+e.target.value).toFixed(2); });

  // ---------------------------------------------------------------- deformation breakdown timeline
  const slider = $('#exp5-time'), timeOut = $('#exp5-time-out'), readout = $('#exp5-readout');
  const playBtn = $('#exp5-play'), verifyBtn = $('#exp5-verify'), exitBtn = $('#exp5-exit'), branchBtns = $$('.exp5-branches button'), markBtns = $$('.exp5-marks button');
  let inspect = null, playing = false;
  const setInspectUI = on => { slider.disabled = !on; playBtn.disabled = !on || reduced; verifyBtn.disabled = !on; exitBtn.disabled = !on; };

  function describe(ms) {
    const d = bar.getDiagnostics();
    return `${NAME[inspect.branch]} ${DIR[inspect.dir]} · ${Math.round(ms)}ms · T=${d.tension.toFixed(1)} · 목 두께≈${Math.max(0, d.neckThicknessEstimate).toFixed(0)} · unionK=${d.unionK.toFixed(1)} · saddle=${d.saddleDistance.toFixed(1)} · 쌍 연결 ${d.pairConnected ? '예' : '아니오'} · 반동 ${d.recoilCount}회`;
  }
  function seek(ms) {
    playing = false; playBtn.textContent = '▶ 이어서 재생';
    ms = Math.max(0, Math.min(900, ms));
    slider.value = ms; timeOut.textContent = Math.round(ms) + ' ms'; slider.setAttribute('aria-valuetext', Math.round(ms) + '밀리초');
    bar.inspectTransition(inspect.branch, ms / 900, inspect.dir);
    readout.textContent = describe(ms); syncAutoplay();
  }
  function enterInspect(branch, dir) {
    inspect = { branch, dir };
    pressed(branchBtns, b => b.dataset.branch === branch && b.dataset.dir === dir);
    setInspectUI(true); seek(+slider.value);
  }
  function leaveInspect(resume = true) {
    if (!inspect) return;
    inspect = null; playing = false; playBtn.textContent = '▶ 이어서 재생';
    pressed(branchBtns, () => false); setInspectUI(false);
    if (resume) { bar.resume(); if (wantAutoplay) bar.setAutoplay(true); syncAutoplay(); }
    readout.textContent = '검사를 종료했습니다. 일반 조작과 자동 재생이 계속됩니다.';
  }
  branchBtns.forEach(b => b.addEventListener('click', () => enterInspect(b.dataset.branch, b.dataset.dir)));
  slider.addEventListener('input', () => seek(+slider.value));
  markBtns.forEach(b => b.addEventListener('click', () => { if (!inspect) enterInspect('pay', 'open'); seek(+b.dataset.ms); }));
  exitBtn.addEventListener('click', () => leaveInspect(true));
  playBtn.addEventListener('click', () => {                       // exact pause / resume: no re-simulation, the frozen state continues in real time
    if (playing) { bar.pause(); playing = false; playBtn.textContent = '▶ 이어서 재생'; readout.textContent = describe(slider.value); return; }
    playing = true; playBtn.textContent = '⏸ 일시정지'; bar.resume();
  });
  bar.on('frame', () => {
    if (!inspect || !playing) return;
    const tr = bar.transition, ms = tr ? Math.min(900, tr.t * 1000) : 900;
    slider.value = ms; timeOut.textContent = Math.round(ms) + ' ms'; readout.textContent = describe(ms);
    if (!tr) { playing = false; playBtn.textContent = '▶ 이어서 재생'; }
  });
  bar.on('modechange', () => { if (inspect) leaveInspect(false); });   // a real click on the bar leaves inspection without breaking normal interaction

  // pixel verification of the CURRENT frame: same shader in solid-colour mode, then count major connected regions
  verifyBtn.addEventListener('click', () => {
    const sil = bar.readSilhouette(); if (!sil) { readout.textContent = '윤곽을 읽을 수 없습니다 (WebGL 없음).'; return; }
    const { width: W, height: H, alpha: a } = sil, seen = new Uint8Array(W * H), stack = [], areas = [];
    for (let i = 0; i < W * H; i++) {
      if (a[i] < 128 || seen[i]) continue;
      let n = 0; stack.push(i); seen[i] = 1;
      while (stack.length) {
        const p = stack.pop(); n++; const x = p % W;
        if (x > 0 && a[p - 1] >= 128 && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
        if (x < W - 1 && a[p + 1] >= 128 && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
        if (p >= W && a[p - W] >= 128 && !seen[p - W]) { seen[p - W] = 1; stack.push(p - W); }
        if (p < W * (H - 1) && a[p + W] >= 128 && !seen[p + W]) { seen[p + W] = 1; stack.push(p + W); }
      }
      areas.push(n);
    }
    const major = areas.filter(n => n >= 400).length;
    readout.textContent = `${describe(slider.value)} · 실제 렌더 픽셀 기준 주요 영역 ${major}개 (임계값 alpha≥128, 면적≥400px, DPR ${sil.pxPerUnit / bar.getDiagnostics().layout.scale})`;
  });

  // ---------------------------------------------------------------- status + event log
  let statusTimer = 0, lastStatus = 0;
  function refreshStatus() {
    const d = bar.getDiagnostics();
    if (!d.webgl.ok) { status.textContent = `FALLBACK — ${d.webgl.reason}. 액체 유리 효과는 표시되지 않고, 단색 대체 버튼만 동작합니다.`; return; }
    const motion = reduced ? '모션 줄이기: 상태가 즉시 전환됩니다 · ' : '';
    status.textContent = `${motion}모드 ${d.mode} · ${d.transition ? d.transition.kind + ' ' + Math.round(d.transition.ms) + 'ms' : '안정'} · ${d.rendering ? '렌더링 중' : '유휴 — 렌더링 정지'} · WebGL 2`;
  }
  bar.on('frame', () => { const now = performance.now(); if (now - lastStatus > 150) { lastStatus = now; refreshStatus(); } clearTimeout(statusTimer); statusTimer = setTimeout(refreshStatus, 450); });
  bar.on('modechange', () => { refreshStatus(); clearTimeout(statusTimer); statusTimer = setTimeout(refreshStatus, 1200); });
  refreshStatus(); setTimeout(refreshStatus, 600);

  const log = $('#exp5-log');
  bar.on('action', e => {
    const empty = log.querySelector('.exp5-empty'); if (empty) empty.remove();
    const li = document.createElement('li'); li.textContent = `${new Date().toLocaleTimeString('ko-KR', { hour12: false })}  이벤트 발생: ${e.action} (branch: ${e.branch})`;
    log.prepend(li); while (log.children.length > 8) log.lastChild.remove();
  });
})();
