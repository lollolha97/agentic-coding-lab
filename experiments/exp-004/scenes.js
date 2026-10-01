/* EXP-004 · AI — 제작 Claude Sonnet 5.5 · 2026-10-01
   "GPU 없이 AI 모델 테스트하기" 5단계 가이드. 등록: window.LAB_SCENES['exp-004'][key] = { name, english, description, label, html }.
   장면 HTML은 DOM/CSS만 쓰고 스타일은 scenes.css(.exp004- 접두)에 있습니다. 모델 이름·응답·코드는 모두 설명용 가상 값이며,
   가격·엔드포인트·사양 수치는 다루지 않습니다. 페이지 골격(헤딩·툴바·카드)은 호스트가 이미 그렸으면 건드리지 않고, 비어 있으면 아래에서 그립니다. */
window.LAB_SCENES = window.LAB_SCENES || {};
(() => {
  const PAGE = 'exp-004';
  const PROVENANCE = '제작 Claude Sonnet 5.5 · 2026-10-01';
  const SOURCES = [['@leninbuilds.ai', 'https://www.instagram.com/reel/DdyS12HzJVj/'], ['@that_ai_insider', 'https://www.instagram.com/reel/Ddx6APdTOyk/']];
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const num = value => String(value).padStart(2, '0');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const isPaused = () => document.body.classList.contains('is-paused');

  const MODELS = [
    ['a', '대화 모델 A', '대화', '일반 질의응답과 글 다듬기'],
    ['b', '대화 모델 B', '대화', '가볍고 빠른 응답 위주'],
    ['c', '코드 모델 A', '코드', '코드 작성과 설명'],
    ['d', '코드 모델 B', '코드', '긴 파일 읽기와 수정 제안'],
    ['e', '문서 모델 A', '긴 문서', '긴 글을 줄여서 요약'],
    ['f', '문서 모델 B', '긴 문서', '보고서 항목 정리']
  ];
  const CATS = ['대화', '코드', '긴 문서'];
  const PROMPTS = [
    ['문장 다듬기', '“곧 보내 드릴게요”를 정중한 문장으로 바꿔 줘', '이렇게 바꿔 보았습니다.\n“정리가 끝나는 대로 곧 보내 드리겠습니다.”\n뜻은 그대로 두고 어조만 한 단계 높였어요.'],
    ['회의 요약', '회의 메모를 세 줄로 요약해 줘', '1. 일정은 다음 주 수요일로 확정\n2. 디자인 시안은 두 안으로 압축\n3. 담당별 후속 작업은 금요일까지 공유'],
    ['코드 예시', '목록을 정렬하는 함수 예시를 보여 줘', 'def sort_items(items):\n    return sorted(items)\n\n# key= 를 넘기면 정렬 기준을 바꿀 수 있어요.']
  ];
  const SIZES = {
    s: { w: 22, name: '작은 모델', local: '들어가긴 하지만 다른 작업과 메모리를 나눠 써야 해서 느릴 수 있어요.' },
    m: { w: 40, name: '중간 모델', local: '겨우 들어갑니다. 설치와 설정이 번거롭고 컴퓨터가 버거워질 수 있어요.' },
    l: { w: 80, name: '큰 모델', local: '메모리를 넘칩니다. 이 컴퓨터에서는 올릴 수 없어요.' }
  };
  const CALL = [
    ['키 만들기', '계정으로 로그인한 뒤 모델 페이지에서 API 키를 발급합니다. 메뉴 이름과 위치는 화면에 따라 다를 수 있어요.'],
    ['키 보관', '키를 코드 안에 직접 쓰지 말고 환경변수에 둡니다. 저장소에 올라가면 다른 사람이 내 키를 쓸 수 있어요.'],
    ['주소·모델', '모델 페이지의 예제 코드에서 엔드포인트 주소와 모델 이름을 그대로 복사합니다. 이 데모는 값을 정하지 않습니다.'],
    ['호출', '요청에 키를 실어 보내면 호스팅 서버가 모델을 돌려 답을 돌려줍니다. 응답 형식은 예제를 따르세요.']
  ];
  const CHECKS = [
    ['quality', '답의 품질이 충분했다'], ['speed', '응답 속도가 괜찮았다'], ['limit', '사용 한도 안에서 돌아간다'], ['data', '데이터를 외부 서버로 보내도 된다']
  ];
  const ROUTES = [
    ['host', '호스팅 유지', '지금 방식 그대로 프로토타입을 이어 갑니다.'],
    ['back', '모델 다시 비교', '카탈로그로 돌아가 같은 프롬프트로 다른 모델을 써 봅니다.'],
    ['self', '직접 배포 검토', '자체 서버나 로컬 실행을 알아봅니다.']
  ];

  const chip = (attrs, label, pressed = false) => `<button type="button" class="exp004-chip" ${attrs} aria-pressed="${pressed}">${label}</button>`;
  const memRow = (cls, cap) => `<div class="exp004-mem ${cls}" style="--cap:${cap}"><i class="exp004-zone"></i><i class="exp004-fill"></i><i class="exp004-spill"></i></div>`;
  const codeGroup = (g, text) => `<span class="exp004-cg" data-g="${g}">${text}</span>`;

  const scenes = {
    why: {
      name: '호스팅된 모델에 묻기', english: 'Hosted inference',
      description: '큰 모델은 GPU 없는 내 컴퓨터의 메모리에 올리기 어렵습니다. 모델이 이미 올라가 있는 서버에 요청만 보내고 답만 받으면 내 컴퓨터 사양과 상관없이 테스트할 수 있습니다.',
      label: '호스팅 추론 개념도: 모델 크기를 고르면 내 노트북의 메모리 막대는 큰 모델에서 넘치고, 호스팅 서버의 막대는 여유가 있으며 요청과 응답 점이 둘 사이를 오갑니다',
      html: `<div class="exp004 exp004-why" data-step="why" data-size="m">
        <div class="exp004-ctl" role="group" aria-label="모델 크기 고르기"><span class="exp004-cap">모델 크기</span>${chip('data-size="s"', '작은')}${chip('data-size="m"', '중간', true)}${chip('data-size="l"', '큰')}</div>
        <div class="exp004-split">
          <section class="exp004-box" aria-label="내 노트북"><h4>내 노트북 <small>GPU 없음</small></h4>${memRow('exp004-local', 45)}<p class="exp004-verdict" data-local aria-live="off"></p></section>
          <div class="exp004-wire" aria-hidden="true"><span class="exp004-ch"><span class="exp004-wl">요청</span><i class="exp004-lane"><b class="exp004-dot"></b></i></span><span class="exp004-ch exp004-back"><span class="exp004-wl">답</span><i class="exp004-lane"><b class="exp004-dot"></b></i></span></div>
          <section class="exp004-box exp004-hosted" aria-label="호스팅 서버"><h4>호스팅 서버 <small>모델이 이미 올라가 있음</small></h4>${memRow('exp004-host', 100)}<p class="exp004-verdict">모델은 서버에 있고, 내 컴퓨터는 요청을 보내고 답을 받기만 합니다.</p></section>
        </div>
        <p class="exp004-legend"><span><i class="exp004-sw exp004-sw-fill"></i>모델</span><span><i class="exp004-sw exp004-sw-spill"></i>넘치는 부분</span><span><i class="exp004-sw exp004-sw-zone"></i>쓸 수 있는 메모리</span></p>
        <p class="exp004-note">개념도입니다. 실제 용량·속도·비용을 나타내는 수치가 아닙니다.</p></div>`
    },
    browse: {
      name: '카탈로그에서 모델 고르기', english: 'Browse the catalog',
      description: 'NVIDIA Build 같은 호스팅 카탈로그에는 용도별로 모델이 모여 있습니다. 용도로 좁히고 카드를 눌러 써 볼 모델 하나를 정합니다. 아래 카드는 설명용 가상 모델입니다.',
      label: '모델 카탈로그 예시: 용도 필터를 고르면 맞지 않는 카드가 흐려지고, 카드를 누르면 선택한 모델이 아래에 표시됩니다',
      html: `<div class="exp004 exp004-browse" data-step="browse">
        <div class="exp004-bar" aria-hidden="true"><i></i><i></i><i></i><span>NVIDIA Build · 모델 카탈로그 (예시 화면)</span></div>
        <div class="exp004-ctl" role="group" aria-label="용도 필터"><span class="exp004-cap">용도</span>${chip('data-cat="all"', '전체', true)}${CATS.map(cat => chip(`data-cat="${cat}"`, cat)).join('')}</div>
        <div class="exp004-tiles" role="group" aria-label="모델 카드">${MODELS.map(([id, name, cat, desc], i) => `<button type="button" class="exp004-tile" data-id="${id}" data-cat="${cat}" aria-pressed="${i === 0}"><b>${name}</b><small>${desc}</small><em>${cat}</em></button>`).join('')}</div>
        <p class="exp004-pick" role="status">선택한 모델: <b data-model-name>대화 모델 A</b></p>
        <p class="exp004-note">이 데모는 글로 묻고 글로 답하는 모델만 다룹니다. 실제 카탈로그에는 다른 종류도 있을 수 있어요.</p></div>`
    },
    try: {
      name: '브라우저에서 프롬프트 시험', english: 'Try in the playground',
      description: '코드를 쓰기 전에 웹 화면에서 프롬프트를 넣고 답을 확인합니다. 모델의 성격을 가볍게 가늠하는 단계입니다. 응답은 시연용 문장이며 실제 모델의 출력이 아닙니다.',
      label: '플레이그라운드 시연: 프롬프트를 고르고 실행하면 대기, 전송, 생성, 완료 순서로 표시가 바뀌며 시연용 응답이 한 글자씩 나타납니다',
      html: `<div class="exp004 exp004-try" data-step="try">
        <div class="exp004-bar" aria-hidden="true"><i></i><i></i><i></i><span>Playground · <b data-model-name>대화 모델 A</b></span></div>
        <div class="exp004-ctl" role="group" aria-label="프롬프트 고르기"><span class="exp004-cap">프롬프트</span>${PROMPTS.map(([short], i) => chip(`data-p="${i}"`, short, i === 0)).join('')}</div>
        <div class="exp004-prompt"><p data-prompt>${esc(PROMPTS[0][1])}</p><button type="button" class="exp004-run" data-run>실행 ▶</button></div>
        <ol class="exp004-phases" aria-label="진행 단계"><li data-ph="0">대기</li><li data-ph="1">전송</li><li data-ph="2">생성</li><li data-ph="3">완료</li></ol>
        <div class="exp004-reply"><pre data-reply aria-live="off"></pre></div>
        <p class="sr-only" role="status" data-sr></p>
        <p class="exp004-note">시연용 응답입니다. 실제 모델의 답은 매번 다를 수 있어요.</p></div>`
    },
    call: {
      name: 'API 키로 코드에서 호출', english: 'Call it from code',
      description: '마음에 들면 같은 모델을 코드에서 부릅니다. 키를 만들고, 환경변수에 두고, 예제에서 주소와 모델 이름을 가져와, 요청에 실어 보냅니다. 구체적인 주소와 문법은 모델 페이지 예제를 기준으로 하세요.',
      label: 'API 호출 4단계: 키 만들기, 키 보관, 주소와 모델 복사, 호출 순서로 해당 코드 줄이 강조되고 마지막에 요청과 응답 점이 내 코드와 호스팅 서버 사이를 오갑니다',
      html: `<div class="exp004 exp004-call" data-step="call" data-active="1">
        <ol class="exp004-rail" aria-label="호출 4단계">${CALL.map(([title], i) => `<li><button type="button" data-s="${i + 1}" aria-current="${i === 0}"><span>${i + 1}</span>${title}</button></li>`).join('')}</ol>
        <pre class="exp004-code" aria-label="의사 코드 예시"><code>${codeGroup(1, '# 키 발급 화면에서 받은 문자열 → &lt;내 키&gt;\n')}${codeGroup(2, 'export API_KEY="&lt;내 키&gt;"\n\n')}${codeGroup(3, 'client = Client(\n    base_url="&lt;예제의 엔드포인트 주소&gt;",\n    api_key=os.environ["API_KEY"],\n)\n')}${codeGroup(4, 'reply = client.chat(\n    model="&lt;예제의 모델 이름&gt;",\n    messages=[{"role": "user", "content": "안녕"}],\n)\nprint(reply)')}</code></pre>
        <p class="exp004-tip" data-tip aria-live="off"></p>
        <div class="exp004-path" aria-hidden="true"><span class="exp004-node">내 코드</span><i class="exp004-lane"><b class="exp004-dot"></b></i><span class="exp004-node">호스팅 서버</span><i class="exp004-lane exp004-back"><b class="exp004-dot"></b></i><span class="exp004-node">모델</span></div>
        <div class="exp004-ctl exp004-pager"><button type="button" class="exp004-chip" data-prev>← 이전</button><button type="button" class="exp004-chip" data-next>다음 →</button></div>
        <p class="exp004-note">의사 코드입니다. 클래스 이름과 호출 방식은 예시이며 실제와 다를 수 있어요.</p></div>`
    },
    decide: {
      name: '결과 보고 다음 길 정하기', english: 'Decide what is next',
      description: '시험해 본 결과를 점검하고 호스팅으로 계속 갈지, 다른 모델로 돌아갈지, 직접 배포를 알아볼지 정합니다. 항목을 눌러 흐름이 어떻게 바뀌는지 보세요.',
      label: '다음 선택 점검표: 네 가지 점검 항목을 켜고 끄면 호스팅 유지, 모델 다시 비교, 직접 배포 검토 중 하나가 강조됩니다',
      html: `<div class="exp004 exp004-decide" data-step="decide">
        <div class="exp004-checks" role="group" aria-label="점검 항목">${CHECKS.map(([k, label]) => `<button type="button" class="exp004-check" data-k="${k}" aria-pressed="true"><i aria-hidden="true"></i>${label}</button>`).join('')}</div>
        <ul class="exp004-routes" aria-label="다음 선택지">${ROUTES.map(([k, title, text]) => `<li class="exp004-route" data-r="${k}"><b>${title}</b><small>${text}</small></li>`).join('')}</ul>
        <p class="exp004-result" role="status" data-result></p>
        <p class="exp004-note">점검 기준은 예시입니다. 한도와 약관은 제공처의 최신 안내를 확인하세요.</p></div>`
    }
  };
  window.LAB_SCENES[PAGE] = Object.assign(window.LAB_SCENES[PAGE] || {}, scenes);
  const KEYS = Object.keys(scenes);
  const SHORT = { why: '묻는 곳 정하기', browse: '모델 고르기', try: '브라우저에서 시험', call: '코드로 호출', decide: '다음 길 정하기' };

  // ── 상호작용: 단계마다 wire(root, card)가 { start, reset }을 돌려줍니다. 자동 재생은 사용자가 만지면 멈춥니다.
  const state = { model: 'a', prompt: 0 };
  function setModel(id) {
    const model = MODELS.find(item => item[0] === id) || MODELS[0];
    state.model = model[0];
    document.querySelectorAll('.exp004-tile').forEach(tile => tile.setAttribute('aria-pressed', String(tile.dataset.id === model[0])));
    document.querySelectorAll('[data-model-name]').forEach(el => { el.textContent = model[1]; });
  }
  const ticker = (card, ms, fn) => {
    let id = 0;
    const stop = () => { clearInterval(id); id = 0; };
    return { stop, start() { stop(); if (!reduced.matches) id = setInterval(() => { if (!isPaused() && !card.classList.contains('is-off')) fn(); }, ms); } };
  };
  const press = (buttons, active) => buttons.forEach(button => button.setAttribute('aria-pressed', String(button === active)));

  const wire = {
    why(root, card) {
      const buttons = [...root.querySelectorAll('[data-size]')].filter(el => el.tagName === 'BUTTON');
      const verdict = root.querySelector('[data-local]');
      const set = key => {
        root.dataset.size = key;
        root.style.setProperty('--w', SIZES[key].w);
        verdict.textContent = SIZES[key].local;
        press(buttons, buttons.find(button => button.dataset.size === key));
      };
      let touched = false;
      const order = ['s', 'm', 'l'];
      const auto = ticker(card, 2800, () => set(order[(order.indexOf(root.dataset.size) + 1) % order.length]));
      buttons.forEach(button => button.addEventListener('click', () => { touched = true; auto.stop(); verdict.setAttribute('aria-live', 'polite'); set(button.dataset.size); }));
      set('m');
      return { start() { if (touched) return; verdict.setAttribute('aria-live', 'off'); set('m'); auto.start(); }, reset() { touched = false; auto.stop(); set('m'); } };
    },
    browse(root) {
      const filters = [...root.querySelectorAll('[data-cat]')].filter(el => el.classList.contains('exp004-chip'));
      const tiles = [...root.querySelectorAll('.exp004-tile')];
      const set = cat => {
        press(filters, filters.find(filter => filter.dataset.cat === cat));
        tiles.forEach(tile => { tile.disabled = cat !== 'all' && tile.dataset.cat !== cat; });
        const current = tiles.find(tile => tile.dataset.id === state.model);
        if (current && current.disabled) setModel(tiles.find(tile => !tile.disabled).dataset.id);
      };
      filters.forEach(filter => filter.addEventListener('click', () => set(filter.dataset.cat)));
      tiles.forEach(tile => tile.addEventListener('click', () => setModel(tile.dataset.id)));
      return { start() {}, reset() { set('all'); setModel('a'); } };
    },
    try(root, card) {
      const chips = [...root.querySelectorAll('[data-p]')];
      const promptText = root.querySelector('[data-prompt]');
      const reply = root.querySelector('[data-reply]');
      const phases = [...root.querySelectorAll('[data-ph]')];
      const sr = root.querySelector('[data-sr]');
      const run = root.querySelector('[data-run]');
      const PRE = 14;
      let timer = 0, touched = false;
      const phase = n => {
        phases.forEach(item => { const k = Number(item.dataset.ph); item.dataset.state = k < n ? 'done' : k === n ? 'now' : 'todo'; item.toggleAttribute('aria-current', k === n); });
        reply.classList.toggle('is-typing', n === 1 || n === 2);
      };
      const clear = () => { clearInterval(timer); timer = 0; };
      const idle = () => { clear(); reply.textContent = ''; phase(0); };
      const play = () => {
        clear();
        const full = PROMPTS[state.prompt][2];
        reply.textContent = '';
        if (reduced.matches) { reply.textContent = full; phase(3); sr.textContent = '응답이 완료되었습니다.'; return; }
        let tick = 0, n = 0;
        phase(1); sr.textContent = '요청을 전송하는 중입니다.';
        timer = setInterval(() => {
          if (isPaused() || card.classList.contains('is-off')) return;
          tick += 1;
          if (tick <= PRE) return;
          if (n === 0) { phase(2); sr.textContent = '응답을 생성하는 중입니다.'; }
          n += 1;
          reply.textContent = full.slice(0, n);
          if (n >= full.length) { clear(); phase(3); sr.textContent = '응답이 완료되었습니다.'; }
        }, 32);
      };
      const choose = i => { state.prompt = i; promptText.textContent = PROMPTS[i][1]; press(chips, chips[i]); };
      chips.forEach((button, i) => button.addEventListener('click', () => { touched = true; choose(i); idle(); }));
      run.addEventListener('click', () => { touched = true; play(); });
      choose(0); phase(0);
      return { start() { if (touched) return; choose(0); play(); }, reset() { touched = false; choose(0); idle(); } };
    },
    call(root, card) {
      const steps = [...root.querySelectorAll('[data-s]')];
      const groups = [...root.querySelectorAll('.exp004-cg')];
      const tip = root.querySelector('[data-tip]');
      const prev = root.querySelector('[data-prev]');
      const next = root.querySelector('[data-next]');
      const set = n => {
        root.dataset.active = n;
        steps.forEach(button => button.setAttribute('aria-current', String(Number(button.dataset.s) === n)));
        groups.forEach(group => { const g = Number(group.dataset.g); group.dataset.state = g === n ? 'on' : g < n ? 'done' : 'todo'; });
        tip.textContent = `${n}. ${CALL[n - 1][0]} — ${CALL[n - 1][1]}`;
        prev.disabled = n === 1; next.disabled = n === CALL.length;
      };
      let touched = false;
      const auto = ticker(card, 3200, () => set(Number(root.dataset.active) % CALL.length + 1));
      const manual = n => { touched = true; auto.stop(); tip.setAttribute('aria-live', 'polite'); set(n); };
      steps.forEach(button => button.addEventListener('click', () => manual(Number(button.dataset.s))));
      prev.addEventListener('click', () => manual(Number(root.dataset.active) - 1));
      next.addEventListener('click', () => manual(Number(root.dataset.active) + 1));
      set(1);
      return { start() { if (touched) return; tip.setAttribute('aria-live', 'off'); set(1); auto.start(); }, reset() { touched = false; auto.stop(); set(1); } };
    },
    decide(root) {
      const checks = [...root.querySelectorAll('.exp004-check')];
      const routes = [...root.querySelectorAll('.exp004-route')];
      const result = root.querySelector('[data-result]');
      const update = () => {
        const on = Object.fromEntries(checks.map(check => [check.dataset.k, check.getAttribute('aria-pressed') === 'true']));
        let route, text;
        if (!on.data) { route = 'self'; text = '데이터를 외부로 보낼 수 없다면 호스팅은 맞지 않을 수 있어요. 직접 배포를 알아봅니다.'; }
        else if (!on.quality) { route = 'back'; text = '품질이 아쉬우면 카탈로그로 돌아가 같은 프롬프트로 다른 모델을 비교합니다.'; }
        else if (!on.limit) { route = 'self'; text = '사용 한도가 걸린다면 제공처의 한도 안내를 확인하고, 계속 필요하면 직접 배포를 검토합니다.'; }
        else if (!on.speed) { route = 'back'; text = '응답이 느리다면 더 가벼운 모델을 찾아 같은 프롬프트로 다시 비교합니다.'; }
        else { route = 'host'; text = '모두 괜찮다면 호스팅 그대로 프로토타입을 이어 갑니다. 규모가 커지면 그때 다시 정합니다.'; }
        routes.forEach(item => item.toggleAttribute('data-on', item.dataset.r === route));
        result.textContent = text;
      };
      checks.forEach(check => check.addEventListener('click', () => { check.setAttribute('aria-pressed', String(check.getAttribute('aria-pressed') !== 'true')); update(); }));
      update();
      return { start() {}, reset() { checks.forEach(check => check.setAttribute('aria-pressed', 'true')); update(); } };
    }
  };

  // ── 페이지 골격: 호스트가 이미 그린 영역은 건드리지 않습니다.
  const fill = (el, html) => { if (el && !el.innerHTML.trim()) { el.innerHTML = html; return true; } return false; };
  const sourceLine = () => `<p class="exp004-source"><span>출처 Instagram</span>${SOURCES.map(([name, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗<span class="sr-only"> (새 탭)</span></a>`).join('')}<span>${PROVENANCE}</span></p>`;
  const cardHTML = (key, i) => {
    const scene = scenes[key];
    const prev = KEYS[i - 1], next = KEYS[i + 1];
    return `<article class="demo-card exp004-card" id="${key}" aria-labelledby="title-${key}">
      <div class="exp004-text"><div class="demo-heading"><h3 id="title-${key}" tabindex="-1"><span class="demo-number">${num(i + 1)}</span>${esc(scene.name)}</h3><span>${esc(scene.english)}</span></div>
        <div class="demo-info"><p class="demo-description">${esc(scene.description)}</p>${sourceLine()}</div></div>
      <div class="exp004-main"><div class="exp004-stage" role="group" aria-label="${esc(scene.label)}">${scene.html}</div>
        <div class="demo-controls"><span class="tiny" data-play-status role="status">대기</span><button class="replay" type="button" aria-label="${esc(scene.name)} 처음부터 다시 재생"><span aria-hidden="true">↻</span>다시 재생</button></div></div>
      <nav class="exp004-nav" aria-label="${num(i + 1)}단계에서 이동">${prev ? `<a href="#${prev}">← ${num(i)} ${esc(SHORT[prev])}</a>` : '<span></span>'}${next ? `<a href="#${next}">${num(i + 2)} ${esc(SHORT[next])} →</a>` : '<a href="#exp004-flow">처음으로 ↑</a>'}</nav></article>`;
  };
  const flowHTML = `<section class="exp004-flow" id="exp004-flow" aria-labelledby="exp004-flow-title"><h2 id="exp004-flow-title">5단계 흐름</h2>
    <ol class="exp004-flow-list">${KEYS.map((key, i) => `<li><a href="#${key}"><span>${num(i + 1)}</span>${esc(SHORT[key])}</a></li>`).join('')}</ol>
    <div class="exp004-flow-ctl"><button type="button" class="exp004-chip" data-flow-prev>← 이전 단계</button><span class="tiny" data-flow-pos>시작 전</span><button type="button" class="exp004-chip" data-flow-next>다음 단계 →</button></div></section>`;

  function build() {
    if (document.body.dataset.page !== PAGE) return;
    const list = document.querySelector('#demo-list');
    if (!list) return;
    fill(document.querySelector('#experiment-heading'), `<section class="experiment-heading" aria-labelledby="experiment-title"><h1 id="experiment-title">GPU 없이 AI 모델 테스트하기</h1>
      <div class="experiment-meta"><span>출처 Instagram</span>${SOURCES.map(([name, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗<span class="sr-only"> (새 탭)</span></a>`).join('')}<span>${PROVENANCE}</span></div>
      <p class="exp004-lede">GPU가 없는 컴퓨터에서도 호스팅 서비스(NVIDIA Build 중심)를 통해 AI 모델을 먼저 써 볼 수 있습니다. 다섯 단계를 직접 눌러 보며 개념과 흐름을 익혀 보세요. 가격·주소·사양 같은 수치는 시점마다 달라 다루지 않으니, 최신 내용은 원본 릴과 공식 문서에서 확인하세요.</p></section>`);
    fill(document.querySelector('#demo-toolbar'), `<div class="demo-toolbar"><h2>단계 <span class="count">${num(KEYS.length)}</span></h2><div class="toolbar-buttons"><button type="button" id="pause-all" aria-pressed="false">전체 정지</button><button type="button" id="replay-all">전체 다시 재생</button></div><p class="motion-notice" id="motion-notice" role="status" hidden>동작 줄이기 설정으로 자동 재생을 끄고 정지 화면을 표시합니다.</p></div>`);
    fill(document.querySelector('#demo-index'), KEYS.map((key, i) => `<a href="#${key}"><span>${num(i + 1)}</span>${esc(scenes[key].name)} ↓</a>`).join(''));
    const hostRendered = list.querySelector('.demo-card');
    if (!hostRendered) {
      list.classList.add('exp004-list');
      list.insertAdjacentHTML('beforebegin', flowHTML);
      list.innerHTML = KEYS.map(cardHTML).join('');
    } else {
      list.querySelectorAll('.demo-card').forEach(card => {
        const info = card.querySelector('.demo-info');
        if (info && !info.querySelector('.exp004-source')) info.insertAdjacentHTML('beforeend', sourceLine());
      });
    }
    document.querySelector('#demo-index')?.addEventListener('click', event => { if (event.target.closest('a')) event.currentTarget.closest('details').open = false; });
    run();
  }

  function run() {
    const cards = [...document.querySelectorAll('.demo-card')].filter(card => card.querySelector('.exp004[data-step]'));
    const pause = document.querySelector('#pause-all');
    const replayAll = document.querySelector('#replay-all');
    const notice = document.querySelector('#motion-notice');
    const api = new Map();
    const started = new WeakSet();
    cards.forEach(card => { const root = card.querySelector('.exp004[data-step]'); api.set(card, wire[root.dataset.step](root, card)); });

    const status = card => {
      const el = card.querySelector('[data-play-status]');
      if (el) el.textContent = reduced.matches ? '정지 화면' : isPaused() ? '일시정지' : card.classList.contains('is-off') ? '화면 밖에서 정지' : card.classList.contains('playing') ? '재생 중' : '대기';
    };
    const play = card => {
      if (reduced.matches) return;
      started.add(card);
      card.classList.add('playing');
      api.get(card).start();
      status(card);
    };
    const replay = card => {
      api.get(card).reset();
      card.classList.remove('playing');
      void card.offsetWidth;
      play(card);
    };
    cards.forEach(card => card.querySelector('.replay')?.addEventListener('click', () => { if (reduced.matches) api.get(card).reset(); else replay(card); }));
    pause?.addEventListener('click', () => {
      const paused = !isPaused();
      document.body.classList.toggle('is-paused', paused);
      pause.setAttribute('aria-pressed', String(paused));
      pause.textContent = paused ? '전체 재생' : '전체 정지';
      cards.forEach(status);
    });
    replayAll?.addEventListener('click', () => cards.forEach(replay));

    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      entry.target.classList.toggle('is-off', !entry.isIntersecting);
      if (entry.isIntersecting && !started.has(entry.target)) play(entry.target);
      status(entry.target);
    }), { threshold: .2, rootMargin: '60px 0px' });
    cards.forEach(card => observer.observe(card));

    const syncMotion = () => {
      document.body.classList.toggle('exp004-still', reduced.matches);
      if (notice) notice.hidden = !reduced.matches;
      if (pause) pause.disabled = reduced.matches;
      if (replayAll) replayAll.disabled = reduced.matches;
      cards.forEach(card => {
        const button = card.querySelector('.replay');
        if (button) button.textContent = reduced.matches ? '↻ 처음 상태로' : '↻ 다시 재생';
        if (reduced.matches) { card.classList.remove('playing'); api.get(card).reset(); }
        status(card);
      });
    };
    reduced.addEventListener('change', syncMotion);
    syncMotion();

    // 5단계 흐름 막대: 지금 읽는 단계를 표시하고 이전/다음으로 넘깁니다.
    const flow = document.querySelector('#exp004-flow');
    if (!flow) return;
    const links = [...flow.querySelectorAll('.exp004-flow-list a')];
    const prev = flow.querySelector('[data-flow-prev]');
    const next = flow.querySelector('[data-flow-next]');
    const pos = flow.querySelector('[data-flow-pos]');
    let current = -1, frame = 0;
    const mark = () => {
      frame = 0;
      current = -1;
      cards.forEach((card, i) => { if (card.getBoundingClientRect().top <= innerHeight * .4) current = i; });
      links.forEach((link, i) => i === current ? link.setAttribute('aria-current', 'step') : link.removeAttribute('aria-current'));
      prev.disabled = current < 0;
      next.disabled = current >= cards.length - 1;
      pos.textContent = current < 0 ? '시작 전' : `${current + 1} / ${cards.length} · ${SHORT[KEYS[current]]}`;
    };
    const go = index => {
      const card = cards[Math.max(0, Math.min(cards.length - 1, index))];
      card.scrollIntoView({ behavior: reduced.matches ? 'auto' : 'smooth', block: 'start' });
      card.querySelector('h3')?.focus({ preventScroll: true });
    };
    prev.addEventListener('click', () => go(current - 1));
    next.addEventListener('click', () => go(current + 1));
    addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(mark); }, { passive: true });
    addEventListener('resize', mark);
    mark();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
