(() => {
  'use strict';
  const { experiments } = window.LAB;
  const page = document.body.dataset.page;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const number = value => String(value).padStart(2, '0');
  const svg = content => `<svg viewBox="0 0 300 190" aria-hidden="true">${content}</svg>`;
  const line = '<path class="line" d="M35 145H265M35 141v8M265 141v8"/>';
  const dot = (x, y, radius = 14, classes = 'ink') => `<circle cx="${x}" cy="${y}" r="${radius}" class="${classes}"/>`;

  function preview(experiment) {
    if (experiment.slug === 'exp-001') {
      return svg(`<path class="line" d="M25 124H275"/><path class="preview-path" d="M50 106C80 15 183 15 225 106"/>
        ${dot(50, 106, 18, 'preview-ghost')}${dot(100, 50, 18, 'preview-ghost')}${dot(170, 50, 18, 'preview-key')}${dot(225, 106, 18, 'preview-ghost')}
        ${dot(50, 106, 18, 'ink animated preview-ball')}<path class="ink-line" d="M245 124h25m-5-4 5 4-5 4"/>
        <text x="25" y="148" class="svg-label">01 — ANTICIPATION</text><text x="192" y="148" class="svg-label">02 — ACTION</text>`);
    }
    return svg(`<path class="blue-line" d="M40 72 124 31 234 72 150 113Z"/><path class="line dash" d="M40 72v50l110 40 84-40V72M150 113v49"/>
      <path class="ink" d="m114 70 36-18 36 18-36 18Z"/><path class="violet" d="M114 70v38l36 18V88Z"/><path class="pale" d="M150 88v38l36-18V70Z"/>
      <path class="ink-line" d="M31 137c-12-21 2-47 35-54M243 108c21 22 9 43-22 49m4-7-4 7 8 2"/>
      <text x="24" y="178" class="svg-label">CAMERA</text><text x="221" y="178" class="svg-label">SUBJECT</text>`);
  }

  function catalog() {
    document.querySelector('#lab-intro').textContent = window.LAB.intro;
    document.querySelector('#about-copy').textContent = window.LAB.about || window.LAB.intro;
    document.querySelector('#total-count').textContent = number(experiments.length);
    document.querySelector('.nav-count').textContent = number(experiments.length);
    document.querySelector('[data-filter="all"] span').textContent = number(experiments.length);
    document.querySelector('#block-count').textContent = experiments.reduce((total, item) => total + item.demos.length, 0);
    const aboutNumbers = document.querySelectorAll('.about-index > span:not(.tiny)');
    aboutNumbers[0].firstChild.textContent = `${number(experiments.length)} `;
    aboutNumbers[1].firstChild.textContent = `${experiments.reduce((total, item) => total + item.demos.length, 0)} `;
    const list = document.querySelector('#experiment-list');
    const search = document.querySelector('#search');
    let filter = 'all';
    function render() {
      const query = search.value.trim().toLocaleLowerCase();
      const selected = experiments.filter(item => (filter === 'all' || item.category === filter) &&
        `${item.id} ${item.title} ${item.description} ${item.source} ${item.demos.map(demo => `${demo.name} ${demo.english}`).join(' ')}`.toLocaleLowerCase().includes(query));
      list.innerHTML = selected.map(item => `<a class="experiment-card" href="experiments/${escapeHTML(item.slug)}/" aria-label="${escapeHTML(item.id)} ${escapeHTML(item.title)} — ${item.demos.length}개 데모">
        <div class="card-preview"><span class="preview-id">${escapeHTML(item.id)} / STUDY</span><span class="preview-type">CSS ANIMATION</span>${preview(item)}<div class="preview-bottom"><span>${item.slug === 'exp-001' ? 'MOTION PRINCIPLES' : 'CAMERA MOVEMENTS'}</span><span>${number(item.demos.length)} BLOCKS</span></div></div>
        <div class="card-info"><div class="card-topline"><span class="experiment-code">${escapeHTML(item.id)}</span><span class="badge">${escapeHTML(item.category)}</span></div><div class="card-title"><h3>${escapeHTML(item.title)}</h3><span aria-hidden="true">↗</span></div><p class="card-description">${escapeHTML(item.description)}</p><div class="card-meta"><span>${number(item.demos.length)}개 데모 · HTML / CSS</span><span>Threads ${escapeHTML(item.source)}</span></div></div></a>`).join('');
      document.querySelector('#empty-state').hidden = selected.length > 0;
      document.querySelector('#catalog-result').textContent = `${number(selected.length)} / ${number(experiments.length)} EXPERIMENTS`;
      if (!reducedMotion.matches) list.querySelectorAll('.card-preview').forEach(element => element.classList.add('playing'));
    }
    document.querySelectorAll('[data-filter]').forEach(button => {
      button.addEventListener('click', () => {
        filter = button.dataset.filter;
        document.querySelectorAll('[data-filter]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        render();
      });
    });
    search.addEventListener('input', render);
    document.addEventListener('keydown', event => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        event.preventDefault(); search.focus();
      }
    });
    render();
  }

  // Motion scenes: the original HTML/CSS stage internals (EXP-001 pre-wipe build), restored inside the card chrome.
  // Styles live in style.css under "Motion scenes"; every element is plain DOM so the original keyframes apply unchanged.
  const tile = (id, width, height, d) => `<svg class="layer ${id}" aria-hidden="true" focusable="false"><defs><pattern id="px-${id}" width="${width}" height="${height}" patternUnits="userSpaceOnUse"><path d="${d}" fill="currentColor"/></pattern></defs><rect width="100%" height="100%" fill="url(#px-${id})"/></svg>`;
  const moon = '<svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="39" class="mc-fill"/><circle cx="29" cy="26" r="7" class="mc-cut-out"/><circle cx="53" cy="51" r="11" class="mc-cut-out"/><circle cx="24" cy="56" r="4" class="mc-cut-out"/></svg>';
  const basketball = '<svg viewBox="0 0 84 84" aria-hidden="true"><circle cx="42" cy="42" r="39" class="mc-fill"/><g fill="none" class="mc-seam" stroke-width="2"><path d="M3 42h78M42 3v78M15 14c30 14 30 42 0 56M69 14c-30 14-30 42 0 56"/></g></svg>';
  const scenes = {
    easing: { time: '2.6 s', label: '이징(Easing) 애니메이션 데모: 주황색 공은 부드럽게 출발하고 멈추며, 회색 공은 일정한 속도로 왕복합니다',
      html: '<div class="track t-ease"></div><div class="track t-linear"></div><div class="ball ease"></div><div class="ball linear"></div><span class="label l-ease">ease-in-out</span><span class="label l-linear">linear</span>' },
    anticipation: { time: '2.8 s', label: '예비동작(Anticipation) 애니메이션 데모: 주황색 캐릭터가 웅크렸다가 위로 도약한 뒤 착지합니다',
      html: '<div class="ground"></div><div class="jumper"></div>' },
    squash: { time: '1.6 s', label: '스쿼시 앤 스트레치(Squash & Stretch) 애니메이션 데모: 주황색 공이 떨어질 때 길어지고, 착지하며 납작해지고, 튀어 오를 때 다시 길어집니다',
      html: '<div class="ground"></div><div class="bouncer"></div>' },
    arc: { time: '2.4 s', label: '아크(Arc) 애니메이션 데모: 주황색 공은 포물선을 그리며 이동하고, 점선 원은 같은 속도로 직선 이동해 비교됩니다',
      html: '<svg class="arc-guide" viewBox="0 0 100 110" preserveAspectRatio="none" aria-hidden="true"><path d="M0 110 Q50 -110 100 110"/></svg><div class="arc-ghost"></div><div class="arc-ball"></div><span class="label label-bl">출발</span><span class="label label-br">도착</span>' },
    follow: { time: '4.8 s', label: '팔로스루(Follow-through) 애니메이션 데모: 몸통이 급정지한 뒤에도 위에 달린 막대가 더 흔들리다가 서서히 멈춥니다',
      html: '<div class="ground"></div><div class="ft-body"><div class="ft-tail"></div></div>' },
    overlap: { time: '2.4 s', label: '오버랩(Overlap) 애니메이션 데모: 관절로 연결된 네 마디가 같은 스윙을 조금씩 늦게 이어받아 물결처럼 움직입니다',
      html: '<div class="arm"><div class="seg s1"><div class="seg s2"><div class="seg s3"><div class="seg s4"></div></div></div></div></div>' },
    stagger: { time: '2.4 s', label: '스태거(Stagger) 애니메이션 데모: 막대 여섯 개가 0.15초 간격으로 차례대로 나타납니다',
      html: '<div class="stagger-wrap"><span></span><span></span><span></span><span></span><span></span><span></span></div>' },
    match: { time: '3.6 s', label: '매치컷(Match Cut) 애니메이션 데모: 배경이 바뀌며 달이 농구공으로 컷되지만 원의 위치·크기·회전은 끊기지 않고 이어집니다',
      html: `<div class="mc-bg"></div><div class="mc-circle"><span class="mc-face mc-a">${moon}</span><span class="mc-face mc-b">${basketball}</span></div><span class="mc-cut" aria-hidden="true">CUT</span>` },
    parallax: { time: '10 s · 3 s · 1.2 s', label: '패럴랙스(Parallax) 애니메이션 데모: 먼 산은 느리게, 중간 언덕은 보통, 가까운 나무는 빠르게 흘러가 깊이감을 만듭니다',
      html: `<div class="px-sun"></div>${tile('far', 160, 80, 'M0 80L50 20L100 80ZM80 80L120 40L160 80Z')}${tile('mid', 120, 56, 'M0 56Q30 6 60 56Q90 14 120 56Z')}<div class="px-ground"></div>${tile('near', 90, 70, 'M6 70L26 14L46 70ZM48 70L66 34L84 70Z')}` },
    reveal: { time: '3.6 s', label: '마스크 리빌(Mask Reveal) 애니메이션 데모: 가림막이 글자 ‘모션’ 위를 지나가며 드러내고, 같은 방향으로 다시 지웁니다',
      html: '<div class="reveal-wrap"><span class="reveal-ghost">모션</span><div class="reveal-text">모션</div><div class="reveal-bar"></div></div>' }
  };
  const motionDiagram = key => `<div class="scene scene-${key}" aria-hidden="true">${scenes[key].html}</div>`;

  const cameraLabels = { pan: 'ROTATION / Y', tilt: 'ROTATION / X', roll: 'ROTATION / Z', truck: 'TRANSLATION / X', pedestal: 'TRANSLATION / Y', dolly: 'TRANSLATION / Z', zoom: 'FOCAL LENGTH', orbit: 'ROTATION / SUBJECT' };
  const motionLabels = { easing: 'VELOCITY / TIME', anticipation: 'PREPARE → ACT', squash: 'VOLUME / IMPACT', arc: 'CURVED TRAJECTORY', follow: 'ACTION → SETTLE', overlap: 'PHASE / OFFSET', stagger: 'SEQUENCE / DELAY', match: 'SHAPE / CONTINUITY', parallax: 'DEPTH / SPEED', reveal: 'CLIP / VISIBILITY' };
  function cameraDiagram(key) {
    if (key === 'orbit') return `<div class="camera-window"><div class="orbit-room"><div class="orbit-grid"></div><div class="orbit-camera animated">${['front', 'back', 'right', 'left', 'top', 'bottom'].map(side => `<div class="cube-face cube-${side}"></div>`).join('')}</div></div></div>`;
    const backClass = { truck: 'camera-truck-back', pedestal: 'camera-pedestal-back', dolly: 'camera-dolly-back' }[key] || '';
    const frontClass = { truck: 'camera-truck-front', pedestal: 'camera-pedestal-front', dolly: 'camera-dolly-front' }[key] || '';
    const allClass = { pan: 'camera-pan', tilt: 'camera-tilt', roll: 'camera-roll', zoom: 'camera-zoom' }[key] || '';
    return `<div class="camera-window">${svg(`<g class="scene-pivot ${allClass ? `animated ${allClass}` : ''}">
      <g class="${backClass ? `animated ${backClass}` : ''}"><rect x="-150" y="-100" width="600" height="420" class="paper"/><path class="line" d="M-150 105h600M150 105 5 260M150 105 295 260M150 105v155M-100 145h500M-100 190h500"/><path class="pale" d="M-50 105V50h47v55H48V30h35v75h55V58h32v47h53V22h48v83h80v70H-50Z"/><path class="blue-line" d="M-50 105h400"/>${dot(220, 35, 11, 'violet')}</g>
      <g class="${frontClass ? `animated ${frontClass}` : ''}"><path class="ink" d="m119 88 31-16 31 16-31 16Z"/><path class="violet" d="M119 88v51l31 16v-51Z"/><path class="pale" d="M150 104v51l31-16V88Z"/><path class="ink-line" d="m119 88 31-16 31 16v51l-31 16-31-16V88m31 16v51m-31-67 31 16 31-16"/><path class="ink" d="M34 137h14v43H34Z"/><path class="violet" d="m32 137 9-7 9 7Z"/></g>
    </g>`)}</div>`;
  }

  function experimentPage() {
    const experiment = experiments.find(item => item.slug === page);
    if (!experiment) return;
    const isCamera = experiment.category === '카메라';
    document.querySelector('#experiment-heading').innerHTML = `<section class="experiment-heading" aria-labelledby="experiment-title"><div><span class="experiment-code">${escapeHTML(experiment.id)} / ${isCamera ? 'CAMERA MOVEMENTS' : 'MOTION PRINCIPLES'}</span><h1 id="experiment-title">${escapeHTML(experiment.title)}</h1><p>${escapeHTML(experiment.description)}</p></div><aside class="source-note"><span class="tiny">REFERENCE / SOURCE</span><span>Threads</span><a href="${escapeHTML(experiment.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(experiment.source)} ↗<span class="sr-only"> (새 탭)</span></a><small>원본에서 관찰하고, CSS로 재현한 실험.</small></aside></section>`;
    document.querySelector('#demo-toolbar').innerHTML = `<div class="demo-toolbar"><h2>데모 <span class="count">${number(experiment.demos.length)}</span></h2><div class="toolbar-buttons"><button type="button" id="pause-all" aria-pressed="false">Ⅱ 일시정지</button><button type="button" id="replay-all">↻ 전체 다시 재생</button></div><p class="motion-notice" id="motion-notice" role="status" hidden>기기의 동작 줄이기 설정에 따라 정지 화면으로 표시합니다.</p></div>`;
    document.querySelector('#demo-index').innerHTML = experiment.demos.map((demo, index) => `<a href="#${demo.key}"><span>${number(index + 1)}</span>${escapeHTML(demo.name)}</a>`).join('');
    document.querySelector('#demo-list').innerHTML = experiment.demos.map((demo, index) => `<article class="demo-card" id="${demo.key}" aria-labelledby="title-${demo.key}"><div class="stage${isCamera ? '' : ' stage-scene'}" role="img" aria-label="${escapeHTML(isCamera ? `${demo.name} 움직임 시연` : scenes[demo.key].label)}"><div class="stage-label" aria-hidden="true"><span>${number(index + 1)} / ${escapeHTML(demo.english.toUpperCase())}</span><span>CSS</span></div>${isCamera ? cameraDiagram(demo.key) : motionDiagram(demo.key)}<div class="stage-footer" aria-hidden="true"><span>${(isCamera ? cameraLabels : motionLabels)[demo.key] || 'STUDY'}</span><span>${isCamera ? 'VIEWFINDER' : scenes[demo.key].time}</span></div></div><div class="demo-info"><div class="demo-heading"><h3 id="title-${demo.key}">${escapeHTML(demo.name)}</h3><span>${escapeHTML(demo.english)}</span></div><p class="demo-description">${escapeHTML(demo.description)}</p><div class="demo-controls"><span class="tiny" data-play-status>READY</span><button class="replay" type="button" aria-label="${escapeHTML(demo.name)} 다시 재생"><span aria-hidden="true">↻</span>다시 재생</button></div></div></article>`).join('');

    const cards = [...document.querySelectorAll('.demo-card')];
    let started = new WeakSet();
    const pause = document.querySelector('#pause-all');
    const replayAll = document.querySelector('#replay-all');
    let paused = false;
    function run(card) {
      if (reducedMotion.matches) return;
      started.add(card);
      card.classList.add('rewinding');
      card.classList.remove('playing');
      void card.offsetWidth;
      card.classList.remove('rewinding');
      card.classList.add('playing');
      card.querySelector('[data-play-status]').textContent = paused ? 'PAUSED' : 'PLAYING';
    }
    cards.forEach(card => {
      card.querySelector('.replay').addEventListener('click', () => {
        if (paused) {
          paused = false;
          document.body.classList.remove('is-paused');
          pause.setAttribute('aria-pressed', 'false');
          pause.textContent = 'Ⅱ 일시정지';
          cards.forEach(item => {
            if (item.querySelector('[data-play-status]').textContent === 'PAUSED') item.querySelector('[data-play-status]').textContent = 'PLAYING';
          });
        }
        run(card);
      });
      card.addEventListener('animationend', () => {
        if (card.getAnimations({ subtree: true }).every(animation => animation.playState === 'finished')) card.querySelector('[data-play-status]').textContent = 'COMPLETE';
      });
    });
    pause.addEventListener('click', () => {
      paused = !paused;
      document.body.classList.toggle('is-paused', paused);
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? '▷ 계속 재생' : 'Ⅱ 일시정지';
      cards.forEach(card => {
        if (card.classList.contains('playing') && card.getAnimations({ subtree: true }).some(animation => animation.playState !== 'finished')) card.querySelector('[data-play-status]').textContent = paused ? 'PAUSED' : 'PLAYING';
      });
    });
    replayAll.addEventListener('click', () => {
      paused = false;
      document.body.classList.remove('is-paused');
      pause.setAttribute('aria-pressed', 'false');
      pause.textContent = 'Ⅱ 일시정지';
      cards.forEach(run);
    });
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        // Scenes loop forever, so cards scrolled out of view stop animating.
        entry.target.classList.toggle('is-off', !entry.isIntersecting);
        if (entry.isIntersecting && !started.has(entry.target) && !reducedMotion.matches) run(entry.target);
      });
    }, { threshold: .15, rootMargin: '60px 0px' });
    cards.forEach(card => observer.observe(card));
    function syncMotion() {
      if (reducedMotion.matches) started = new WeakSet();
      document.querySelector('#motion-notice').hidden = !reducedMotion.matches;
      pause.disabled = reducedMotion.matches;
      replayAll.disabled = reducedMotion.matches;
      cards.forEach(card => {
        card.querySelector('.replay').disabled = reducedMotion.matches;
        if (reducedMotion.matches) { card.classList.remove('playing'); card.querySelector('[data-play-status]').textContent = 'STILL'; }
        else { const rect = card.getBoundingClientRect(); if (rect.top < innerHeight && rect.bottom > 0) run(card); }
      });
    }
    reducedMotion.addEventListener('change', syncMotion);
    syncMotion();
  }
  if (page === 'catalog') catalog();
  else experimentPage();
})();
