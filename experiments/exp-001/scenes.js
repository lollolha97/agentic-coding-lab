/* EXP-001 모션 카테고리 확장 — 기존 10개 데모(assets/app.js)는 그대로 두고, 신규 11개 장면을 같은 카드 구조로 뒤에 붙입니다.
   등록: window.LAB_SCENES['exp-001'][key] = { label, html, ...meta }. 스타일은 scenes.css(.mo- 접두), 색은 .scene 토큰만 사용합니다.
   app.js가 이 키들을 직접 렌더하게 되면 같은 id의 카드가 이미 있으므로 아래 렌더러는 해당 데모를 건너뜁니다. */
window.LAB_SCENES = window.LAB_SCENES || {};
(() => {
  const PROVENANCE = '제작 Claude Sonnet 5.5 · 2026-10-01';
  const times = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

  // 바운스 곡선: 낙하 → 반동을 점점 줄여 가며 1에 안착. linear() 정지점과 곡선 그래프가 같은 점을 씁니다.
  const bounceCurve = (() => {
    const segments = [[0, .36, 0], [.36, .64, .25], [.64, .78, .0625], [.78, .85, .0156], [.85, .89, .004]];
    const points = [];
    segments.forEach(([from, to, amp], index) => {
      for (let step = 0; step < 8; step += 1) {
        const u = step / 8, t = from + (to - from) * u;
        points.push([t, index === 0 ? u * u : 1 - amp * (1 - (2 * u - 1) ** 2)]);
      }
    });
    points.push([.89, 1], [1, 1]);
    return points;
  })();
  const bounceEase = `linear(${bounceCurve.map(([t, v]) => `${v.toFixed(3)} ${(t * 100).toFixed(1)}%`).join(', ')})`;
  const bezierGlyph = d => `<svg class="mo-bz-curve" viewBox="0 0 34 34" aria-hidden="true" focusable="false"><path class="mo-bz-axis" d="M3 3V31H31"/><path class="mo-bz-path" d="${d}"/></svg>`;
  const bezierPath = (x1, y1, x2, y2) => `M3 31C${(3 + 28 * x1).toFixed(1)} ${(31 - 28 * y1).toFixed(1)} ${(3 + 28 * x2).toFixed(1)} ${(31 - 28 * y2).toFixed(1)} 31 3`;
  const bounceGlyphPath = `M${bounceCurve.map(([t, v]) => `${(3 + 28 * t).toFixed(1)} ${(31 - 28 * v).toFixed(1)}`).join('L')}`;
  const bezierRow = (ease, label, glyph) => `<div class="mo-bz-row" style="--e:${ease}">${glyph}<div class="mo-bz-col"><span class="mo-tag">${label}</span><div class="mo-bz-lane"><i class="mo-bz-end"></i><i class="mo-bz-ball"></i></div></div></div>`;

  const stepsRow = (cls, label, keys = '') => `<div class="mo-st-row ${cls}"><span class="mo-tag">${label}</span><div class="mo-st-track">${keys}<i class="mo-st-ball"></i></div></div>`;

  const stream = (y, amp, phase, size, tone, count) => `<div class="mo-pf-s ${tone}" style="--y:${y}px;--a:${amp}px;--ph:${phase}s;--z:${size}px">${times(count, i => `<i style="--k:${i}"></i>`)}</div>`;

  const word = (text, tag = 'i') => [...text].map((char, i) => `<${tag} style="--i:${i}">${char}</${tag}>`).join('');
  const layers3d = times(11, i => `<i class="mo-3d-l" style="--z:${i}" aria-hidden="true">TYPE</i>`);

  const scenes = {
    loop: {
      name: '루프 모션', english: 'Loop Motion', group: 'ai',
      source_account: '@lottie.files', source_url: 'https://www.instagram.com/p/Dd6W2-Rj6Gn/',
      description: '끝 상태가 시작 상태와 같아 이음매 없이 반복되는 모션. 점의 크기 변화와 회전이 4초에 정확히 한 바퀴 돌아 처음 모습으로 돌아옵니다.',
      label: '루프 모션: 여덟 개의 점이 순서대로 커졌다 작아지며 원을 따라 돌고, 가운데 도형이 네모와 둥근 모양 사이를 오가며 끊김 없이 반복됩니다',
      html: `<div class="mo mo-lp"><div class="mo-lp-ring">${times(8, i => `<i style="--i:${i}"></i>`)}</div><i class="mo-lp-core"></i><i class="mo-lp-bar"><b></b></i><span class="mo-tag mo-lp-tag">loop 4s · 0% = 100%</span></div>`
    },
    morph: {
      name: '프롬프트 모핑', english: 'Prompt Morph', group: 'ai',
      source_account: '@prompteafacil', source_url: 'https://www.instagram.com/reel/Dd443GhPkbg/',
      description: '프롬프트의 단어가 바뀔 때마다 도형이 다음 모양으로 변형됩니다. 꼭짓점 수가 같은 폴리곤끼리 보간해 원, 사각형, 별이 이어집니다.',
      label: '프롬프트 모핑: 입력창의 단어가 원, 사각형, 별로 바뀌면 아래 도형이 같은 모양으로 변형되며 색도 함께 바뀝니다',
      html: `<div class="mo mo-mp"><div class="mo-mp-prompt"><b>›</b><span class="mo-mp-w1">원</span><span class="mo-mp-w2">사각형</span><span class="mo-mp-w3">별</span><i class="mo-mp-caret"></i></div><i class="mo-mp-shape"></i><span class="mo-tag mo-mp-tag">clip-path: polygon(24 points)</span></div>`
    },
    particles: {
      name: '파티클 플로우', english: 'Particle Flow', group: 'ai',
      source_account: '@benkaluza.lab', source_url: 'https://www.instagram.com/reel/DdzuazdMxvU/',
      description: '점들이 보이지 않는 물결 길을 따라 흐릅니다. 가로 이동은 일정하게, 세로 흔들림은 사인 곡선처럼 주어 세 갈래의 흐름을 만듭니다.',
      label: '파티클 플로우: 작은 점들이 세 줄의 물결 모양 경로를 따라 왼쪽에서 오른쪽으로 흐르며 양 끝에서 사라집니다',
      html: `<div class="mo mo-pf">${stream(58, 20, 0, 6, 'is-ink', 14)}${stream(96, 14, -.8, 5, 'is-fg', 14)}${stream(134, 22, -1.6, 6, 'is-gray', 14)}<span class="mo-tag mo-pf-tag">42 particles · 3 streams</span></div>`
    },
    curtain: {
      name: '리빌 모션', english: 'Reveal Motion', group: 'ai',
      source_account: '@getintoai', source_url: 'https://www.instagram.com/p/DdwRVCXmH1Q/',
      description: '네 장의 가림막이 시차를 두고 걷히며 장면을 드러냅니다. 가림막이 올라가는 동안 안쪽 그림은 크게 시작해 제 크기로 안착합니다.',
      label: '리빌 모션: 네 장의 세로 가림막이 차례로 걷히면 해와 언덕 그림과 REVEAL 글자가 드러나고, 잠시 뒤 다시 덮입니다',
      html: `<div class="mo mo-cr"><div class="mo-cr-frame"><div class="mo-cr-art"><i class="mo-cr-sun"></i><i class="mo-cr-hill"></i><b class="mo-cr-title">REVEAL</b></div><div class="mo-cr-strips"><i style="--i:0"></i><i style="--i:1"></i><i style="--i:2"></i><i style="--i:3"></i></div></div><span class="mo-tag">4 strips · stagger .12s</span></div>`
    },
    gradient: {
      name: '그라디언트 플로우', english: 'Gradient Flow', group: 'ai',
      source_account: '@evolving.ai', source_url: 'https://www.instagram.com/p/DdwJgsNABze/',
      description: '색의 띠가 면 안에서 천천히 흘러갑니다. 시작과 끝 색이 같은 그라디언트를 두 겹으로 겹치고 서로 다른 방향과 속도로 background-position을 움직입니다.',
      label: '그라디언트 플로우: 회색과 주황 띠가 둥근 카드 안에서 한 방향으로 흐르고, 비스듬한 옅은 띠가 다른 속도로 겹쳐 지나갑니다',
      html: `<div class="mo mo-gf"><div class="mo-gf-card"><i class="mo-gf-a"></i><i class="mo-gf-b"></i></div><span class="mo-tag">background-position 0 → 520px</span></div>`
    },
    texteffect: {
      name: '텍스트 이펙트', english: 'Text Effect', group: 'ai',
      source_account: '@shhradddhaa.ai', source_url: 'https://www.instagram.com/reel/DdiN-ddoF6s/',
      description: '윤곽선만 있던 글자가 왼쪽에서 오른쪽으로 채워진 뒤, 위아래 반쪽이 어긋나며 짧게 흔들리고 다시 지워집니다.',
      label: '텍스트 이펙트: EFFECT 글자의 윤곽선이 왼쪽에서 오른쪽으로 채워지고, 위아래 반쪽이 어긋나며 흔들린 뒤 사라집니다',
      html: `<div class="mo mo-te"><div class="mo-te-word"><span class="mo-te-ol">EFFECT</span><span class="mo-te-h mo-te-top"><span class="mo-te-f">EFFECT</span></span><span class="mo-te-h mo-te-bot"><span class="mo-te-f">EFFECT</span></span></div><span class="mo-tag">outline → fill → slice</span></div>`
    },
    bouncetext: {
      name: '바운스 텍스트', english: 'Bounce Text', group: 'type',
      source_account: '@rupam.cinemotion', source_url: 'https://www.instagram.com/reel/DdzVbu_Sjph/',
      description: '글자가 위에서 떨어져 바닥에서 납작해졌다가 두 번 튀며 자리를 잡습니다. 글자마다 0.08초씩 늦게 떨어지고, 바닥 그림자가 높이에 맞춰 줄었다 커집니다.',
      label: '바운스 텍스트: BOUNCE 글자가 한 자씩 위에서 떨어져 바닥에서 납작해지고 두 번 튀며 자리를 잡은 뒤 사라집니다',
      html: `<div class="mo mo-bt"><i class="mo-bt-ground"></i><div class="mo-bt-word">${word('BOUNCE', 'span')}</div><span class="mo-tag">drop → squash → bounce ×2</span></div>`
    },
    type3d: {
      name: '3D 타이프', english: '3D Type', group: 'type',
      source_account: '@paulabaines', source_url: 'https://www.instagram.com/reel/Dcs6spVI75_/',
      description: '같은 글자를 깊이 방향으로 열한 장 겹쳐 두께를 만들고, 전체를 좌우로 천천히 돌립니다. 돌릴 때 측면의 층이 보여 입체감이 생깁니다.',
      label: '3D 타이프: TYPE 글자가 두께를 가진 입체로 좌우 약 서른여덟 도씩 천천히 회전하며 측면이 드러납니다',
      html: `<div class="mo mo-3d"><div class="mo-3d-stage"><div class="mo-3d-word">${layers3d}<b class="mo-3d-front">TYPE</b></div></div><span class="mo-tag">translateZ × 11 · rotateY ±38°</span></div>`
    },
    textstretch: {
      name: '텍스트 스트레치', english: 'Text Stretch', group: 'type',
      source_account: '@mahla.artwork', source_url: 'https://www.instagram.com/reel/DdwXPBLsSFH/',
      description: '글자가 바닥에 붙은 채 위로 길게 늘어났다 돌아옵니다. 늘어날 때 폭은 줄고 돌아올 때 살짝 눌려, 고무처럼 당겨지는 느낌을 줍니다. 물결은 글자 순서대로 이어집니다.',
      label: '텍스트 스트레치: STRETCH 글자들이 차례로 위로 길게 늘어났다가 눌리며 제자리로 돌아오는 물결이 반복됩니다',
      html: `<div class="mo mo-ts"><i class="mo-ts-max"></i><div class="mo-ts-word">${word('STRETCH', 'span')}</div><i class="mo-ts-base"></i><span class="mo-tag">scale(.78, 2.1) → scale(1.12, .9)</span></div>`
    },
    hold: {
      name: '홀드·스텝', english: 'Hold & Steps', group: 'keyframe',
      source_account: '@saifsultan.ai', source_url: 'https://www.instagram.com/reel/DbyAhShTKjR/',
      description: '값이 중간을 거치지 않고 끊겨 바뀌는 보간 방식. hold는 키프레임마다 값이 머물다 점프하고, steps(6, end)는 구간 끝에서, steps(6, start)는 구간 시작에서 뜁니다.',
      label: '홀드와 스텝: 세 개의 점이 같은 거리를 계단식으로 이동합니다. hold는 세 키 위치에서 멈추고, steps(6, end)와 steps(6, start)는 여섯 칸으로 나눠 뜁니다',
      html: `<div class="mo mo-st">${stepsRow('mo-st-hold', 'hold · steps(1, end)', '<i class="mo-st-key" style="--k:0"></i><i class="mo-st-key" style="--k:.3"></i><i class="mo-st-key" style="--k:.62"></i><i class="mo-st-key" style="--k:1"></i>')}${stepsRow('mo-st-end', 'steps(6, end)')}${stepsRow('mo-st-start', 'steps(6, start)')}</div>`
    },
    bezier: {
      name: '커스텀 베지어', english: 'Cubic-bezier · Back · Bounce', group: 'keyframe',
      source_account: '@iamlazydesigner', source_url: 'https://www.instagram.com/reel/DdoRPWQyMQ2/',
      description: '제어점 값을 1 밖으로 보내면 도착점을 넘어갔다 돌아오는 back 효과가 생깁니다. 마지막은 cubic-bezier로 만들 수 없는 바운스를 linear() 정지점으로 그린 것입니다.',
      label: '커스텀 베지어: 세 개의 점이 도착선을 넘어갔다 돌아오는 back-out, 출발 전에 뒤로 물러났다 넘어가는 back-in-out, 벽에 튕기듯 점점 작게 튀는 바운스로 오갑니다',
      html: `<div class="mo mo-bz">${bezierRow('cubic-bezier(.34, 1.56, .64, 1)', 'back-out (.34, 1.56, .64, 1)', bezierGlyph(bezierPath(.34, 1.56, .64, 1)))}${bezierRow('cubic-bezier(.68, -.55, .27, 1.55)', 'back-in-out (.68, -.55, .27, 1.55)', bezierGlyph(bezierPath(.68, -.55, .27, 1.55)))}<div class="mo-bz-bounce" style="--bounce-linear:${bounceEase}">${bezierRow('var(--bounce)', 'bounce · linear(…)', bezierGlyph(bounceGlyphPath))}</div></div>`
    }
  };
  const groups = [
    ['ai', 'AI 생성 모션', '프롬프트로 만든 영상에서 자주 보이는 여섯 가지 움직임을 CSS로 다시 그렸습니다.'],
    ['type', '타이포 모션', '글자 자체가 움직이는 세 가지 방식.'],
    ['keyframe', '키프레임 타입', '이징의 빠르기가 아니라 값을 이어 주는 방식 자체를 비교합니다.']
  ];
  window.LAB_SCENES['exp-001'] = Object.assign(window.LAB_SCENES['exp-001'] || {}, scenes);

  // ── 렌더러: app.js가 만든 10개 카드 뒤에 같은 카드 구조로 이어 붙이고, 재생·정지·동작 줄이기를 같은 규칙으로 맞춥니다.
  const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const number = value => String(value).padStart(2, '0');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  function extend() {
    const list = document.querySelector('#demo-list');
    if (!list || document.body.dataset.page !== 'exp-001') return;
    const keys = Object.keys(scenes).filter(key => !document.getElementById(key));
    if (!keys.length) return;
    let count = list.querySelectorAll('.demo-card').length;
    const index = document.querySelector('#demo-index');
    const pieces = [];
    groups.forEach(([group, title, note]) => {
      const members = keys.filter(key => scenes[key].group === group);
      if (!members.length) return;
      pieces.push(`<div class="mo-group" id="mo-group-${group}"><h2>${escapeHTML(title)} <span class="count">${number(members.length)}</span></h2><p>${escapeHTML(note)}</p></div>`);
      members.forEach(key => {
        const demo = scenes[key];
        count += 1;
        if (index) index.insertAdjacentHTML('beforeend', `<a href="#${key}"><span>${number(count)}</span>${escapeHTML(demo.name)} ↓</a>`);
        pieces.push(`<article class="demo-card mo-card" id="${key}" aria-labelledby="title-${key}"><div class="demo-heading"><h3 id="title-${key}"><span class="demo-number">${number(count)}</span>${escapeHTML(demo.name)}</h3><span>${escapeHTML(demo.english)}</span></div><div class="stage stage-scene" role="img" aria-label="${escapeHTML(demo.label)}"><div class="scene scene-mo scene-mo-${key}" aria-hidden="true">${demo.html}</div></div><div class="demo-controls"><span class="tiny" data-play-status role="status">대기</span><button class="replay" type="button" aria-label="${escapeHTML(demo.name)} 다시 재생"><span aria-hidden="true">↻</span>다시 재생</button></div><div class="demo-info"><p class="demo-description">${escapeHTML(demo.description)}</p><p class="mo-credit">출처 <a href="${escapeHTML(demo.source_url)}" target="_blank" rel="noopener noreferrer">Instagram ${escapeHTML(demo.source_account)} ↗<span class="sr-only"> (새 탭)</span></a><span>${PROVENANCE}</span></p></div></article>`);
      });
    });
    list.insertAdjacentHTML('beforeend', pieces.join(''));
    const total = document.querySelector('.demo-toolbar .count');
    if (total) total.textContent = number(count);

    const cards = keys.map(key => document.getElementById(key));
    const replayAll = document.querySelector('#replay-all');
    const pauseAll = document.querySelector('#pause-all');
    let started = new WeakSet();
    const status = card => {
      card.querySelector('[data-play-status]').textContent = reducedMotion.matches ? '정지 화면' : document.body.classList.contains('is-paused') ? '일시정지' : card.classList.contains('is-off') ? '화면 밖에서 정지' : card.classList.contains('playing') ? '재생 중' : '대기';
    };
    const run = card => {
      if (reducedMotion.matches) return;
      started.add(card);
      card.classList.add('rewinding');
      card.classList.remove('playing');
      void card.offsetWidth;
      card.classList.remove('rewinding');
      card.classList.add('playing');
      status(card);
    };
    cards.forEach(card => card.querySelector('.replay').addEventListener('click', () => run(card)));
    if (replayAll) replayAll.addEventListener('click', () => cards.forEach(run));
    if (pauseAll) pauseAll.addEventListener('click', () => cards.forEach(status));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.classList.toggle('is-off', !entry.isIntersecting);
      if (entry.isIntersecting && !started.has(entry.target) && !reducedMotion.matches) run(entry.target);
      status(entry.target);
    }), { threshold: .15, rootMargin: '60px 0px' });
    cards.forEach(card => observer.observe(card));
    const syncMotion = () => {
      if (reducedMotion.matches) started = new WeakSet();
      cards.forEach(card => {
        card.querySelector('.replay').disabled = reducedMotion.matches;
        if (reducedMotion.matches) card.classList.remove('playing');
        else { const rect = card.getBoundingClientRect(); if (rect.top < innerHeight && rect.bottom > 0) run(card); }
        status(card);
      });
    };
    reducedMotion.addEventListener('change', syncMotion);
    syncMotion();
  }
  // defer 스크립트는 readyState가 interactive인 채로 순서대로 실행된 뒤 DOMContentLoaded가 오므로, app.js가 카드를 만든 다음에 확장됩니다.
  if (document.readyState === 'complete') extend(); else document.addEventListener('DOMContentLoaded', extend);
})();
