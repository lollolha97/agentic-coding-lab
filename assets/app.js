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

  // Landing previews. Unknown or future slugs fall back to a neutral tile grid so a new category never renders an empty or wrong picture.
  const previews = {
    'exp-001': () => `<path class="line" d="M25 124H275"/><path class="preview-path" d="M50 106C80 15 183 15 225 106"/>
        ${dot(50, 106, 18, 'preview-ghost')}${dot(100, 50, 18, 'preview-ghost')}${dot(170, 50, 18, 'preview-key')}${dot(225, 106, 18, 'preview-ghost')}
        ${dot(50, 106, 18, 'ink animated preview-ball')}<path class="ink-line" d="M245 124h25m-5-4 5 4-5 4"/>
        <text x="25" y="148" class="svg-label">01 — ANTICIPATION</text><text x="192" y="148" class="svg-label">02 — ACTION</text>`,
    'exp-002': () => `<path class="line dash" d="M40 72 124 31 234 72 150 113Z"/><path class="line dash" d="M40 72v50l110 40 84-40V72M150 113v49"/>
      <path class="ink" d="m114 70 36-18 36 18-36 18Z"/><path class="violet" d="M114 70v38l36 18V88Z"/><path class="gray-fill" d="M150 88v38l36-18V70Z"/>
      <path class="ink-line" d="M31 137c-12-21 2-47 35-54M243 108c21 22 9 43-22 49m4-7-4 7 8 2"/>
      <text x="24" y="178" class="svg-label">CAMERA</text><text x="221" y="178" class="svg-label">SUBJECT</text>`,
    'exp-003': () => `<rect class="line" x="30" y="18" width="240" height="30"/><rect class="ink" x="30" y="18" width="74" height="30"/><path class="line" d="M118 33h40M172 33h40M226 33h30"/>
      <rect class="line" x="30" y="62" width="112" height="86"/><rect class="gray-fill" x="42" y="76" width="64" height="8"/><path class="line" d="M42 96h86M42 106h70"/><rect class="ink" x="42" y="122" width="40" height="16"/>
      <rect class="line" x="158" y="62" width="112" height="22"/><rect class="line" x="158" y="90" width="112" height="22"/><rect class="line" x="158" y="118" width="112" height="30"/><path class="ink-line" d="M258 70v6m-4-3 4 4 4-4"/><rect class="ink" x="238" y="97" width="22" height="8"/><rect class="gray-fill" x="170" y="130" width="52" height="6"/>
      <text x="30" y="172" class="svg-label">TABS · MODAL · FORM</text>`
  };
  function preview(experiment) {
    if (previews[experiment.slug]) return svg(previews[experiment.slug]());
    const count = Math.min(experiment.demos.length, 12);
    return svg(`<path class="line" d="M40 30H260V160H40Z"/>${Array.from({ length: count }, (_, i) => `<rect class="${i === 0 ? 'ink' : 'gray-fill'}" x="${54 + (i % 4) * 52}" y="${46 + Math.floor(i / 4) * 38}" width="40" height="28"/>`).join('')}`);
  }
  const accountsOf = experiment => [...new Set([...(experiment.sources || []).map(source => source.account), ...experiment.demos.flatMap(demo => (demo.sources || []).map(source => source.account))])];

  // Landing: one card per category. Cards summarise (section counts, or the first demo names) instead of listing every demo.
  function outline(item) {
    const groups = item.groups ? Object.entries(item.groups) : [];
    if (groups.length > 1) return groups.map(([id, [title]]) => `${title} ${item.demos.filter(demo => demo.group === id).length}`);
    const names = item.demos.slice(0, 3).map(demo => demo.name);
    return item.demos.length > names.length ? [...names, `외 ${item.demos.length - names.length}${item.unit}`] : names;
  }
  function catalog() {
    const { categories } = window.LAB;
    document.querySelector('#lab-intro').textContent = window.LAB.intro;
    document.querySelector('#total-count').textContent = number(experiments.length);
    const list = document.querySelector('#experiment-list');
    const search = document.querySelector('#search');
    const filters = document.querySelector('#category-filters');
    filters.insertAdjacentHTML('beforeend', categories.filter(name => experiments.some(item => item.category === name))
      .map(name => `<button type="button" data-filter="${escapeHTML(name)}" aria-pressed="false">${escapeHTML(name)}</button>`).join(''));
    let filter = 'all';
    function render() {
      const query = search.value.trim().toLocaleLowerCase();
      const selected = experiments.filter(item => (filter === 'all' || item.category === filter) &&
        `${item.id} ${item.title} ${item.category} ${item.description} ${accountsOf(item).join(' ')} ${Object.values(item.groups || {}).map(group => group[0]).join(' ')} ${item.demos.map(demo => `${demo.name} ${demo.english}`).join(' ')}`.toLocaleLowerCase().includes(query));
      list.innerHTML = selected.map(item => {
        const accounts = accountsOf(item);
        return `<a class="experiment-card" href="experiments/${escapeHTML(item.slug)}/" aria-labelledby="card-title-${escapeHTML(item.slug)} card-desc-${escapeHTML(item.slug)}">
        <div class="card-info"><span class="experiment-code">${escapeHTML(item.id)}</span><div class="card-title"><h3 id="card-title-${escapeHTML(item.slug)}">${escapeHTML(item.title)}</h3><span aria-hidden="true">→</span></div></div>
        <div class="card-preview">${preview(item)}</div><p class="card-desc" id="card-desc-${escapeHTML(item.slug)}">${escapeHTML(item.description)}</p>
        <ul class="card-outline" aria-label="구성">${outline(item).map(part => `<li>${escapeHTML(part)}</li>`).join('')}</ul>
        <div class="card-meta"><span>${item.demos.length}개 ${escapeHTML(item.unit)}</span><span>출처 ${accounts.length === 1 ? escapeHTML(accounts[0]) : `${accounts.length}곳`}</span></div></a>`;
      }).join('');
      document.querySelector('#empty-state').hidden = selected.length > 0;
      document.querySelector('#catalog-result').textContent = `카테고리 ${selected.length}개 표시`;
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
    easing: { time: '2.6 s', label: '이징(Easing) 애니메이션 데모: 파란색 공은 부드럽게 출발하고 멈추며, 회색 공은 일정한 속도로 왕복합니다',
      html: '<div class="track t-ease"></div><div class="track t-linear"></div><div class="ball ease"></div><div class="ball linear"></div><span class="label l-ease">ease-in-out</span><span class="label l-linear">linear</span>' },
    anticipation: { time: '2.8 s', label: '예비동작(Anticipation) 애니메이션 데모: 파란색 캐릭터가 웅크렸다가 위로 도약한 뒤 착지합니다',
      html: '<div class="ground"></div><div class="jumper"></div>' },
    squash: { time: '1.6 s', label: '스쿼시 앤 스트레치(Squash & Stretch) 애니메이션 데모: 공이 떨어질 때 길어지고, 착지하며 납작해지고, 튀어 오를 때 다시 길어집니다',
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

  // Camera scenes (EXP-002): DOM stages on the motion-scene chassis, looping forever. Each scene animates one custom
  // property on .cm (--s swing, --t turn); the camera glyph, gauge and viewfinder all read it so they stay in sync.
  // Styles live in style.css under "Camera scenes".
  const cmRepeat = (count, step, fn) => Array.from({ length: count }, (_, i) => fn(i * step, i)).join('');
  const cmArt = (w, h, body) => `<svg class="cm-art" style="width:${w}px;height:${h}px" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">${body}</svg>`;
  const cmSub = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-13" y="-30" width="26" height="30" rx="8" class="cm-sub"/><rect x="-8" y="-21" width="4" height="7" rx="2" class="cm-eye"/><rect x="4" y="-21" width="4" height="7" rx="2" class="cm-eye"/></g>`;
  const cmTree = (x, y, r) => `<rect x="${x - 1}" y="${y - r - 3}" width="2" height="${r + 3}" class="cm-near"/><circle cx="${x}" cy="${y - r * 2}" r="${r}" class="cm-mid"/>`;
  const cmPost = (x, y, h) => `<rect x="${x - 3.5}" y="${y - h}" width="7" height="${h}" class="cm-near"/><rect x="${x - 5.5}" y="${y - h - 2}" width="11" height="4" class="cm-near"/>`;
  const cmFloor = (y, w, h) => `<rect y="${y}" width="${w}" height="${h}" class="cm-floor"/><path class="cm-ground" d="M0 ${y}H${w}"/>`;
  const cmCam = (mod = '') => `<svg class="cm-glyph ${mod}" style="width:60px;height:62px" viewBox="-30 -50 60 62" aria-hidden="true" focusable="false"><path class="cm-fov" d="M0 -11 -22 -48H22Z"/><rect class="cm-body" x="-10" y="-7" width="20" height="14" rx="2"/><rect class="cm-lens" x="-4" y="-11" width="8" height="5" rx="1"/></svg>`;
  const cmFront = '<svg class="cm-glyph cm-front" style="width:64px;height:52px" viewBox="-32 -26 64 52" aria-hidden="true" focusable="false"><rect class="cm-outline" x="-30" y="-18" width="60" height="38" rx="6"/><rect class="cm-body" x="-18" y="-24" width="14" height="7" rx="2"/><circle class="cm-outline" cx="0" cy="1" r="12"/><circle class="cm-body" cx="0" cy="1" r="4"/><circle class="cm-lens" cx="22" cy="-9" r="2"/></svg>';
  const cmRig = (cls, mod) => `<div class="cm-rig ${cls}">${cmCam(mod)}</div>`;
  const cmRail = length => cmArt(length, 16, `<path class="cm-track" d="M0 8H${length}"/>${cmRepeat(Math.floor(length / 12) + 1, 12, x => `<path class="cm-tie" d="M${x} 3v10"/>`)}<path class="cm-stop" d="M1 0v16M${length - 1} 0v16"/>`);
  const cmCorners = '<i class="cm-corners"><b></b><b></b><b></b><b></b></i>';
  const cmSunRing = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" class="cm-sun"/>`;

  const panArt = `${cmFloor(80, 440, 22)}<path class="cm-far" d="M0 80V60L40 38 90 66 140 44 200 70 250 40 310 64 360 42 440 62V80Z"/><path class="cm-ground" d="M0 80H440"/>${cmRepeat(22, 20, x => `<path class="cm-tick" d="M${x + 10} 87v6"/>`)}
    <rect x="28" y="38" width="18" height="42" class="cm-mid"/>${cmTree(120, 80, 13)}${cmSub(220, 80, 1.15)}<rect x="311" y="34" width="2" height="46" class="cm-near"/><path d="M313 34 331 39 313 44Z" class="cm-near"/>${cmTree(352, 80, 11)}<rect x="372" y="44" width="40" height="36" class="cm-mid"/><rect x="384" y="62" width="10" height="18" class="cm-near"/>`;
  const tiltArt = `${cmSunRing(104, 40, 11)}<rect x="10" y="56" width="40" height="8" rx="4" class="cm-far"/><rect x="84" y="76" width="44" height="8" rx="4" class="cm-far"/>
    <rect x="40" y="126" width="60" height="162" class="cm-mid"/><rect x="34" y="120" width="72" height="6" class="cm-near"/>${cmRepeat(6, 20, y => `<rect x="52" y="${142 + y}" width="10" height="12" class="cm-win"/><rect x="78" y="${142 + y}" width="10" height="12" class="cm-win"/>`)}
    ${cmSub(70, 120)}${cmFloor(288, 140, 32)}<rect x="62" y="264" width="16" height="24" class="cm-near"/><rect x="10" y="274" width="7" height="14" class="cm-near"/><rect x="122" y="274" width="7" height="14" class="cm-near"/>`;
  const rollArt = `${cmFloor(150, 300, 150)}<path class="cm-far" d="M0 150V132L50 112 100 138 150 118 210 140 260 114 300 134V150Z"/><path class="cm-horizon" d="M0 150H300"/>${cmSunRing(200, 106, 10)}
    <rect x="178" y="124" width="26" height="26" class="cm-mid"/>${cmTree(96, 150, 12)}${cmSub(150, 150, 1.1)}<path class="cm-tick" d="M62 166h20M132 176h26M206 166h20M100 190h18M176 196h24"/>`;
  const truckFar = cmArt(420, 90, '<path class="cm-far" d="M0 70V54L36 34 84 58 132 38 190 62 244 36 300 60 352 40 420 56V70Z"/>');
  const truckMid = cmArt(420, 90, `${cmTree(96, 70, 10)}${cmTree(150, 70, 13)}${cmSub(210, 70, 1.1)}<rect x="268" y="40" width="34" height="30" class="cm-mid"/>${cmTree(352, 70, 12)}`);
  const truckNear = cmArt(520, 90, cmRepeat(6, 84, x => cmPost(44 + x, 90, 46)));
  const pedFar = cmArt(144, 112, `<path class="cm-far" d="M0 70V54L26 40 60 56 96 36 144 52V70Z"/>${cmSunRing(112, 18, 9)}`);
  const pedMid = cmArt(144, 164, `<rect y="106" width="144" height="58" class="cm-floor"/><path class="cm-ground" d="M0 106H144"/>${cmTree(26, 106, 11)}<rect x="112" y="68" width="26" height="38" class="cm-mid"/>${cmSub(72, 106, 1.1)}`);
  const pedNear = cmArt(144, 212, `<rect y="146" width="144" height="3" class="cm-near"/>${cmRepeat(4, 44, x => `<rect x="${x + 14}" y="146" width="5" height="60" class="cm-near"/>`)}`);
  const pedColumn = cmArt(60, 190, `<path class="cm-track" d="M46 14V176"/><path class="cm-stop" d="M34 177H58"/>${cmRepeat(19, 9, (d, i) => `<path class="cm-tie" d="M${i % 6 ? 38 : 32} ${176 - d}H46"/>${i % 6 ? '' : `<text x="2" y="${180 - d}" class="cm-t">${i / 6}m</text>`}`)}`);
  const dollyStatic = cmArt(216, 90, `${cmFloor(48, 216, 42)}<path class="cm-persp" d="M108 48-40 90M108 48 40 90M108 48 176 90M108 48 256 90"/>`);
  const dollyFar = cmArt(216, 90, '<path class="cm-far" d="M0 48V38L30 26 70 40 108 28 150 42 186 27 216 38V48Z"/>');
  const dollyMid = cmArt(216, 90, `${cmTree(62, 66, 10)}${cmTree(156, 66, 11)}<rect x="176" y="46" width="22" height="20" class="cm-mid"/>${cmSub(108, 66)}`);
  const dollyNear = cmArt(216, 90, `${cmPost(22, 75, 45)}${cmPost(194, 75, 45)}`);
  const zoomArt = cmArt(128, 94, `${cmFloor(59, 128, 35)}<path class="cm-far" d="M0 59V50L18 40 40 52 64 36 92 50 112 38 128 48V59Z"/>${cmTree(26, 59, 8)}<rect x="96" y="42" width="18" height="17" class="cm-mid"/>${cmSub(64, 59, .8)}${cmPost(10, 59, 19)}${cmPost(118, 59, 19)}`);
  const zoomRuler = cmArt(200, 36, `<path class="cm-track" d="M10 14H190"/>${[[24, 10], [35, 53], [50, 112], [70, 190]].map(([mm, x]) => `<path class="cm-tie" d="M${x} 9v10"/><text x="${x}" y="33" text-anchor="middle" class="cm-t">${mm}</text>`).join('')}`);
  const orbitPano = cmArt(560, 76, cmRepeat(2, 280, p => `<path class="cm-far" transform="translate(${p} 0)" d="M0 76V62L40 38 86 66 110 76Z"/>${cmSunRing(p + 150, 26, 10)}<rect x="${p + 196}" y="36" width="18" height="40" class="cm-mid"/><g transform="translate(${p} 0)">${cmTree(250, 76, 13)}</g>`));
  const cmFace = (cls, letter) => `<i class="cm-face ${cls}">${letter}</i>`;

  const cmScenes = {
    pan: `<div class="cm-vf cm-pan-vf"><div class="cm-world cm-pan-world">${cmArt(440, 102, panArt)}</div>${cmCorners}</div><i class="cm-arc cm-pan-arc"></i><i class="cm-stand cm-pan-stand"></i>${cmRig('cm-pan-rig')}`,
    tilt: `<div class="cm-vf cm-tilt-vf"><div class="cm-world cm-tilt-world">${cmArt(140, 320, tiltArt)}</div>${cmCorners}</div><i class="cm-arc cm-tilt-arc"></i><i class="cm-stand cm-tilt-stand"></i>${cmRig('cm-tilt-rig', 'is-right')}`,
    roll: `<div class="cm-vf cm-roll-vf"><div class="cm-world cm-roll-world">${cmArt(300, 300, rollArt)}</div><i class="cm-level"></i>${cmCorners}</div><i class="cm-ring cm-roll-ring"></i><div class="cm-rig cm-roll-rig">${cmFront}</div>`,
    truck: `<div class="cm-vf cm-truck-vf"><div class="cm-layer cm-t-far">${truckFar}</div><i class="cm-flat"></i><div class="cm-layer cm-t-mid">${truckMid}</div><div class="cm-layer cm-t-near">${truckNear}</div>${cmCorners}</div><div class="cm-rail cm-truck-rail">${cmRail(204)}</div><i class="cm-dot cm-truck-dot"></i>${cmRig('cm-truck-rig')}`,
    pedestal: `<div class="cm-ped-col">${pedColumn}</div><div class="cm-vf cm-ped-vf"><i class="cm-flat"></i><div class="cm-layer cm-p-far">${pedFar}</div><div class="cm-layer cm-p-mid">${pedMid}</div><div class="cm-layer cm-p-near">${pedNear}</div>${cmCorners}</div>${cmRig('cm-ped-rig', 'is-right')}`,
    dolly: `<div class="cm-vf cm-dolly-vf"><div class="cm-fixed">${dollyStatic}</div><div class="cm-layer cm-d-far">${dollyFar}</div><div class="cm-layer cm-d-mid">${dollyMid}</div><div class="cm-layer cm-d-near">${dollyNear}</div>${cmCorners}</div><div class="cm-rail cm-dolly-rail">${cmRail(204)}</div><i class="cm-dot cm-dolly-dot"></i>${cmRig('cm-dolly-rig', 'is-right')}`,
    zoom: `<div class="cm-vf cm-zoom-l"><div class="cm-zw cm-zw-s">${zoomArt}</div><i class="cm-corners cm-fovbox"><b></b><b></b><b></b><b></b></i></div>
      ${cmArt(16, 14, '<path class="cm-arrow" d="M1 7H14M10 3l4 4-4 4"/>').replace('class="cm-art"', 'class="cm-art cm-zoom-arrow"')}<div class="cm-vf cm-zoom-r"><div class="cm-zw">${zoomArt}</div>${cmCorners}</div>
      <span class="cm-mm"></span><div class="cm-ruler">${zoomRuler}</div><i class="cm-ptr"></i>`,
    orbit: `<i class="cm-ring cm-orb-ring"></i><i class="cm-orb-sub"></i><i class="cm-orb-letters"><b>A</b><b>B</b><b>C</b><b>D</b></i><div class="cm-rig cm-orb-arm"><div class="cm-orb-cam">${cmCam('is-in')}</div></div>
      <div class="cm-vf cm-orb-vf"><div class="cm-pano">${orbitPano}</div><i class="cm-flat"></i><i class="cm-shadow"></i><div class="cm-orb-wrap"><div class="cm-cube">${cmFace('cm-fn', 'A')}${cmFace('cm-fe', 'B')}${cmFace('cm-fs', 'C')}${cmFace('cm-fw', 'D')}${cmFace('cm-ft', '')}</div></div>${cmCorners}</div>`
  };
  const cameraDiagram = key => `<div class="scene scene-cm" aria-hidden="true"><div class="cm cm-${key}">${cmScenes[key]}</div></div>`;

  // Scene source per demo: scenes a page registers in window.LAB_SCENES[page][key] ({ label, html, hint, init }) win; the built-in
  // EXP-001 / EXP-002 stages above are the fallback; anything else gets an empty labelled stage instead of throwing.
  // A scene with init() is a live UI pattern: it is not hidden from assistive tech and is wired up by interactiveScenes().
  const registered = (window.LAB_SCENES || {})[page] || {};
  function stageFor(experiment, demo) {
    const own = registered[demo.key];
    if (own && own.html && own.init) return { label: own.label || `${demo.name} 시연`, hint: own.hint || '', live: true, html: `<div class="scene scene-ext">${own.html}</div>` };
    if (own && own.html) return { label: own.label || `${demo.name} 시연`, html: `<div class="scene scene-ext" aria-hidden="true">${own.html}</div>` };
    if (experiment.slug === 'exp-001' && scenes[demo.key]) return { label: scenes[demo.key].label, html: motionDiagram(demo.key) };
    if (experiment.slug === 'exp-002' && cmScenes[demo.key]) return { label: `${demo.name} 움직임 시연`, html: cameraDiagram(demo.key) };
    return { label: `${demo.name} 시연`, html: '<div class="scene scene-ext" aria-hidden="true"></div>' };
  }
  const sourceLinks = sources => sources.map(source => `<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(source.account)} ↗<span class="sr-only"> (새 탭)</span></a>`).join('');

  // Interactive pages: every card's scene is a working control set. init(root) wires it and may return a cleanup (timers, document listeners);
  // 초기화 rebuilds the scene from its registered HTML, so a demo can always be put back to its first state.
  function interactiveScenes(cards) {
    const cleanups = new Map();
    function mount(card, fresh) {
      const own = registered[card.id];
      const root = card.querySelector('.scene');
      if (cleanups.get(card)) cleanups.get(card)();
      if (fresh) root.innerHTML = own.html;
      const cleanup = own.init(root);
      cleanups.set(card, typeof cleanup === 'function' ? cleanup : null);
    }
    cards.forEach(card => {
      card.classList.add('playing');
      mount(card, false);
      card.querySelector('.replay').addEventListener('click', () => mount(card, true));
    });
    document.querySelector('#reset-all').addEventListener('click', () => cards.forEach(card => mount(card, true)));
  }

  function experimentPage() {
    const experiment = experiments.find(item => item.slug === page);
    if (!experiment || document.querySelector('#demo-list .demo-card')) return;
    const interactive = Boolean(experiment.interactive);
    const groups = experiment.groups || {};
    const credit = window.LAB.credit;
    const heading = (experiment.sources || []).map(source => `<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener noreferrer">출처 ${escapeHTML(source.platform)} ${escapeHTML(source.account)} ↗<span class="sr-only"> (새 탭)</span></a>`).join('');
    document.querySelector('#experiment-heading').innerHTML = `<section class="experiment-heading" aria-labelledby="experiment-title"><h1 id="experiment-title">${escapeHTML(experiment.title)}</h1><div class="experiment-meta">${heading}${experiment.sourceNote ? `<span>${escapeHTML(experiment.sourceNote)}</span>` : ''}<span>${escapeHTML(experiment.provenance)}</span></div></section>`;
    document.querySelector('#demo-toolbar').innerHTML = interactive ? `<div class="demo-toolbar"><h2>${escapeHTML(experiment.unit)} <span class="count">${number(experiment.demos.length)}</span></h2><div class="toolbar-buttons"><button type="button" id="reset-all">전체 초기화</button></div></div>` : `<div class="demo-toolbar"><h2>${escapeHTML(experiment.unit)} <span class="count">${number(experiment.demos.length)}</span></h2><div class="toolbar-buttons"><button type="button" id="pause-all" aria-pressed="false">전체 정지</button><button type="button" id="replay-all">전체 다시 재생</button></div><p class="motion-notice" id="motion-notice" role="status" hidden>동작 줄이기 설정으로 정지 화면을 표시합니다.</p></div>`;
    const startsGroup = (demo, index) => demo.group && groups[demo.group] && demo.group !== experiment.demos[index - 1]?.group;
    document.querySelector('#demo-index').innerHTML = experiment.demos.map((demo, index) => `${startsGroup(demo, index) ? `<span class="demo-index-group">${escapeHTML(groups[demo.group][0])}</span>` : ''}<a href="#${demo.key}"><span>${number(index + 1)}</span>${escapeHTML(demo.name)} ↓</a>`).join('');
    document.querySelector('#demo-index').addEventListener('click', event => {
      if (event.target.closest('a')) event.currentTarget.closest('details').open = false;
    });
    document.querySelector('#demo-list').innerHTML = experiment.demos.map((demo, index) => {
      const stage = stageFor(experiment, demo);
      const groupHead = startsGroup(demo, index) ? `<div class="demo-group" id="group-${demo.group}"><h2>${escapeHTML(groups[demo.group][0])} <span class="count">${number(experiment.demos.filter(item => item.group === demo.group).length)}</span></h2><p>${escapeHTML(groups[demo.group][1])}</p></div>` : '';
      const source = demo.sources && demo.sources.length ? `<p class="demo-credit"><span>출처 Instagram</span>${sourceLinks(demo.sources)}<span>${escapeHTML(credit)}</span></p>` : '';
      return `${groupHead}<article class="demo-card" id="${demo.key}" aria-labelledby="title-${demo.key}"><div class="demo-heading"><h3 id="title-${demo.key}"><span class="demo-number">${number(index + 1)}</span>${escapeHTML(demo.name)}</h3><span>${escapeHTML(demo.english)}</span></div><div class="stage stage-scene" role="${stage.live ? 'group' : 'img'}" aria-label="${escapeHTML(stage.label)}">${stage.html}</div><div class="demo-controls">${stage.live ? `<span class="tiny">${escapeHTML(stage.hint)}</span>` : '<span class="tiny" data-play-status role="status">대기</span>'}<button class="replay" type="button" aria-label="${escapeHTML(demo.name)} ${stage.live ? '초기화' : '다시 재생'}"><span aria-hidden="true">↻</span>${stage.live ? '초기화' : '다시 재생'}</button></div><div class="demo-info"><p class="demo-description">${escapeHTML(demo.description)}</p>${source}</div></article>`;
    }).join('');

    const cards = [...document.querySelectorAll('.demo-card')];
    if (interactive) return interactiveScenes(cards);
    let started = new WeakSet();
    const pause = document.querySelector('#pause-all');
    const replayAll = document.querySelector('#replay-all');
    let paused = false;
    function syncStatus(card) {
      card.querySelector('[data-play-status]').textContent = reducedMotion.matches ? '정지 화면' : paused ? '일시정지' : card.classList.contains('is-off') ? '화면 밖에서 정지' : card.classList.contains('playing') ? '재생 중' : '대기';
    }
    function run(card) {
      if (reducedMotion.matches) return;
      started.add(card);
      card.classList.add('rewinding');
      card.classList.remove('playing');
      void card.offsetWidth;
      card.classList.remove('rewinding');
      card.classList.add('playing');
      syncStatus(card);
    }
    cards.forEach(card => {
      card.querySelector('.replay').addEventListener('click', () => run(card));
    });
    pause.addEventListener('click', () => {
      paused = !paused;
      document.body.classList.toggle('is-paused', paused);
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? '전체 재생' : '전체 정지';
      cards.forEach(syncStatus);
    });
    replayAll.addEventListener('click', () => cards.forEach(run));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        // Scenes loop forever, so cards scrolled out of view stop animating.
        entry.target.classList.toggle('is-off', !entry.isIntersecting);
        if (entry.isIntersecting && !started.has(entry.target) && !reducedMotion.matches) run(entry.target);
        syncStatus(entry.target);
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
        if (reducedMotion.matches) card.classList.remove('playing');
        else { const rect = card.getBoundingClientRect(); if (rect.top < innerHeight && rect.bottom > 0) run(card); }
        syncStatus(card);
      });
    }
    reducedMotion.addEventListener('change', syncMotion);
    syncMotion();
  }
  if (page === 'catalog') catalog();
  else experimentPage();
})();
