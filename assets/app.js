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
        ${dot(50, 106, 18, 'pale')}${dot(100, 50, 18, 'pale')}${dot(170, 50, 18, 'violet')}${dot(225, 106, 18, 'pale')}
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

  // Repeating silhouettes for the parallax layers: generated so every layer is wider than any stage width plus its travel.
  const ridge = (x, base, tiles, shape, count) => {
    let d = `M${x} ${base}`;
    for (let i = 0; i < count; i += 1) {
      const [width, height] = tiles[i % tiles.length];
      d += shape(width, height);
    }
    return `${d}V172H${x}Z`;
  };
  const peaks = (width, height) => `l${width / 2} ${-height} l${width / 2} ${height}`;
  const hills = (width, height) => `q${width / 2} ${-height} ${width} 0`;
  const trees = (x, tiles) => {
    let cursor = x;
    return tiles.map(([gap, width, height]) => `M${cursor += gap} 160l${width / 2} ${-height} ${width / 2} ${height}Z`).join('');
  };
  // Jointed arm: each nested joint runs the same swing a little later than its parent.
  const arm = [0, 1, 2, 3].reduceRight((inner, index) => `<g transform="translate(${index ? 44 : 46} ${index ? 0 : 95})"><g class="animated overlap-seg"><rect x="-7" y="-7" width="${index === 3 ? 50 : 51}" height="14" rx="7" class="${index % 2 ? 'violet' : 'ink'}"/>${inner}<circle r="2.5" class="paper"/></g></g>`, '');

  function motionDiagram(key) {
    switch (key) {
      case 'easing': return svg(`<path class="line" d="M45 70h210M45 120h210"/><text x="44" y="52" class="svg-label">LINEAR</text><text x="44" y="102" class="svg-label">EASE IN-OUT</text>${dot(55, 70, 10, 'gray-dot animated linear-dot')}${dot(55, 120, 10, 'alert-dot animated easing-dot')}`);
      case 'anticipation': return svg(`${line}<path class="line dash" d="M60 70v60M210 70v60"/><path class="blue-line" d="M37 99H20m5-5-5 5 5 5M126 99h48m-5-5 5 5-5 5"/><g class="animated anticipation-move">${dot(60, 100, 17, 'ink animated anticipation-dot')}</g><text x="35" y="165" class="svg-label">PREPARE</text><text x="230" y="165" class="svg-label">ACT</text>`);
      case 'squash': return svg(`${line}<path class="line dash" d="M150 33v110"/><ellipse cx="150" cy="145" rx="19" ry="3" class="gray-fill animated squash-shadow"/>${dot(150, 128, 17, 'ink animated squash-dot')}<text x="176" y="50" class="svg-label">GRAVITY ↓</text>`);
      case 'arc': return svg(`${line}<path class="blue-line dash" d="M55 131Q150 -9 245 131"/>${dot(55, 145, 3, 'violet')}${dot(245, 145, 3, 'violet')}<circle cx="55" cy="131" r="14" class="ghost animated arc-x"/><g class="animated arc-x">${dot(55, 131, 14, 'ink animated arc-y')}</g>`);
      case 'follow': return svg(`${line}<path class="line dash" d="M217 40v120"/><text x="203" y="176" class="svg-label">STOP</text><g class="animated follow-body"><g class="animated follow-rod"><path class="rod" d="M67 105V57"/>${dot(67, 52, 7, 'ink')}</g><rect x="48" y="105" width="38" height="40" class="ink"/></g>`);
      case 'overlap': return svg(`<path class="line dash" d="M40 95H236"/><path class="line" d="M35 145H265"/>${arm}`);
      case 'stagger': return svg(`${line}<g>${[50, 80, 110, 70, 95].map((height, value) => `<rect x="${43 + value * 45}" y="${145 - height}" width="34" height="${height}" class="${value % 2 ? 'violet' : 'ink'} animated stagger-block"/>`).join('')}</g><text x="41" y="162" class="svg-label">0 ms</text><text x="214" y="162" class="svg-label">+400 ms</text>`);
      case 'match': return svg(`<path class="line" d="M35 145h230"/><rect x="35" y="40" width="230" height="100" class="paper animated match-a"/><rect x="35" y="40" width="230" height="100" class="pale animated match-b"/><path class="blue-line" d="M45 48h32M45 48v32M255 48h-32M255 48v32M45 132h32M45 132v-32M255 132h-32M255 132v-32"/>
        <g transform="translate(150 90)"><g class="animated match-spin"><g class="animated match-a">${dot(0, 0, 34, 'ink')}<g class="paper"><circle cx="-12" cy="-15" r="5"/><circle cx="10" cy="9" r="9"/><circle cx="-18" cy="14" r="3.5"/><circle cx="14" cy="-20" r="3"/></g></g>
        <g class="animated match-b">${dot(0, 0, 34, 'violet')}<path class="seam" d="M-34 0h68M0 -34v68M-22 -23c25 11 25 35 0 46M22 -23c-25 11-25 35 0 46"/></g></g></g><text x="257" y="34" text-anchor="end" class="svg-label animated match-flash">CUT</text>`);
      case 'parallax': return svg(`<g class="animated parallax-sky">${dot(235, 45, 11, 'pale')}</g>
        <g class="animated parallax-back"><path class="pale" d="${ridge(-200, 146, [[130, 92], [96, 58], [150, 104], [110, 66]], peaks, 8)}"/></g>
        <g class="animated parallax-mid"><path class="violet" d="${ridge(-200, 158, [[110, 52], [84, 36], [130, 60]], hills, 10)}"/></g>
        <g class="animated parallax-front"><path class="ink" d="${trees(-200, [[0, 26, 58], [128, 32, 76], [104, 24, 50], [136, 30, 66], [112, 28, 62], [124, 26, 54], [108, 32, 72], [140, 24, 52], [116, 30, 64], [126, 26, 58], [110, 32, 74], [132, 24, 50]])}M-200 160H700V172H-200Z"/></g>`);
      case 'reveal': return svg(`<defs><clipPath id="reveal-window"><rect class="animated reveal-window" x="48" y="48" width="204" height="94"/></clipPath></defs><rect x="48" y="48" width="204" height="94" class="pale"/>
        <text x="150" y="112" text-anchor="middle" class="reveal-glyph reveal-ghost">모션</text><g clip-path="url(#reveal-window)"><text x="150" y="112" text-anchor="middle" class="reveal-glyph ink">모션</text></g>
        <rect x="46.5" y="48" width="3" height="94" class="ink animated reveal-bar"/><path class="line" d="M48 145h252"/>`);
      default: return svg(line);
    }
  }

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
    document.querySelector('#demo-list').innerHTML = experiment.demos.map((demo, index) => `<article class="demo-card" id="${demo.key}" aria-labelledby="title-${demo.key}"><div class="stage" role="img" aria-label="${escapeHTML(demo.name)} 움직임 시연"><div class="stage-label" aria-hidden="true"><span>${number(index + 1)} / ${escapeHTML(demo.english.toUpperCase())}</span><span>CSS</span></div>${isCamera ? cameraDiagram(demo.key) : motionDiagram(demo.key)}<div class="stage-footer" aria-hidden="true"><span>${(isCamera ? cameraLabels : motionLabels)[demo.key] || 'STUDY'}</span><span>${isCamera ? 'VIEWFINDER' : '3.6 s'}</span></div></div><div class="demo-info"><div class="demo-heading"><h3 id="title-${demo.key}">${escapeHTML(demo.name)}</h3><span>${escapeHTML(demo.english)}</span></div><p class="demo-description">${escapeHTML(demo.description)}</p><div class="demo-controls"><span class="tiny" data-play-status>READY</span><button class="replay" type="button" aria-label="${escapeHTML(demo.name)} 다시 재생"><span aria-hidden="true">↻</span>다시 재생</button></div></div></article>`).join('');

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
        if (entry.isIntersecting && !started.has(entry.target) && !reducedMotion.matches) run(entry.target);
      });
    }, { threshold: .15 });
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
