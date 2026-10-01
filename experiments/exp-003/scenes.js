/* EXP-003 · 웹 디자인 패턴 — 제작 Claude Sonnet 5.5 · 2026-10-01
   13개 장면은 모두 실제로 동작하는 UI 패턴입니다. 등록 형식: window.LAB_SCENES['exp-003'][key] = { label, hint, html, init(root) }.
   html 은 초기 상태 마크업, init(root) 는 그 안에 이벤트를 붙이고 정리 함수(타이머·document 리스너 해제)를 돌려줍니다.
   "초기화" 는 html 을 다시 그리고 init 을 다시 부르므로 init 은 root 바깥 상태를 바꾸지 않습니다. 스타일은 scenes.css(.exp003- 접두). */
window.LAB_SCENES = window.LAB_SCENES || {};
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (root, selector) => root.querySelector(selector);
  const $$ = (root, selector) => [...root.querySelectorAll(selector)];
  const uid = (key, name) => `x3-${key}-${name}`;
  const icon = path => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${path}</svg>`;
  const wrap = (cls, body) => `<div class="exp003 ${cls}">${body}</div>`;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /* ───────── 탭 ───────── */
  const TABS = [
    ['빠른 시작', '설치 없이 브라우저에서 바로 시작합니다. 템플릿을 고르면 첫 화면이 만들어집니다.'],
    ['자동 저장', '입력할 때마다 저장합니다. 연결이 끊겨도 마지막 상태가 남아 있습니다.'],
    ['팀 공유', '링크 하나로 팀원을 초대하고 보기·편집 권한을 나눕니다.']
  ];
  const tabs = {
    label: '탭: 탭을 누르면 아래 패널이 바뀝니다',
    hint: '탭을 누르거나 ← → 키를 눌러 보세요',
    html: wrap('exp003-tabs', `<div class="exp003-tablist" role="tablist" aria-label="기능 선택">${TABS.map(([name], i) => `<button type="button" role="tab" id="${uid('tabs', 't' + i)}" aria-selected="${i === 0}" aria-controls="${uid('tabs', 'p' + i)}" tabindex="${i === 0 ? 0 : -1}">${name}</button>`).join('')}</div>
      ${TABS.map(([name, text], i) => `<div class="exp003-panel" role="tabpanel" id="${uid('tabs', 'p' + i)}" aria-labelledby="${uid('tabs', 't' + i)}" tabindex="0"${i ? ' hidden' : ''}><b>${name}</b><p>${text}</p><span class="exp003-tabs-no">${i + 1} / ${TABS.length}</span></div>`).join('')}`),
    init(root) {
      const buttons = $$(root, '[role=tab]');
      const panels = $$(root, '[role=tabpanel]');
      const select = (index, focus) => {
        buttons.forEach((button, i) => { button.setAttribute('aria-selected', String(i === index)); button.tabIndex = i === index ? 0 : -1; panels[i].hidden = i !== index; });
        if (focus) buttons[index].focus();
      };
      buttons.forEach((button, i) => button.addEventListener('click', () => select(i)));
      $(root, '[role=tablist]').addEventListener('keydown', event => {
        const current = buttons.indexOf(event.target.closest('[role=tab]'));
        const next = { ArrowRight: (current + 1) % buttons.length, ArrowLeft: (current - 1 + buttons.length) % buttons.length, Home: 0, End: buttons.length - 1 }[event.key];
        if (next === undefined) return;
        event.preventDefault();
        select(next, true);
      });
    }
  };

  /* ───────── 드롭다운 ───────── */
  const SORTS = [['latest', '최신순'], ['low', '낮은 가격순'], ['high', '높은 가격순'], ['name', '이름순']];
  const GOODS = [['목재 트레이', 32000, 3], ['세라믹 컵', 18000, 4], ['린넨 앞치마', 45000, 1], ['유리 병', 12000, 2]];
  const SORT_FN = { latest: (a, b) => b[2] - a[2], low: (a, b) => a[1] - b[1], high: (a, b) => b[1] - a[1], name: (a, b) => a[0].localeCompare(b[0], 'ko') };
  const won = value => `${value.toLocaleString('ko-KR')}원`;
  const goodsRows = key => [...GOODS].sort(SORT_FN[key]).map(([name, price]) => `<li><span>${name}</span><b>${won(price)}</b></li>`).join('');
  const dropdown = {
    label: '드롭다운: 버튼을 누르면 정렬 메뉴가 열리고 고른 기준으로 아래 목록이 정렬됩니다',
    hint: '정렬 버튼을 눌러 기준을 바꿔 보세요',
    html: wrap('exp003-dd-root', `<div class="exp003-dd"><button type="button" class="exp003-dd-btn" aria-haspopup="menu" aria-expanded="false" aria-controls="${uid('dd', 'menu')}"><span>정렬: <b data-label>최신순</b></span><span aria-hidden="true">▾</span></button>
      <div class="exp003-dd-menu" role="menu" id="${uid('dd', 'menu')}" aria-label="정렬 기준" hidden>${SORTS.map(([key, name], i) => `<button type="button" role="menuitemradio" data-sort="${key}" aria-checked="${i === 0}" tabindex="-1"><span>${name}</span></button>`).join('')}</div></div>
      <ol class="exp003-dd-list" data-list>${goodsRows('latest')}</ol>`),
    init(root) {
      const trigger = $(root, '.exp003-dd-btn');
      const menu = $(root, '.exp003-dd-menu');
      const items = $$(root, '[role=menuitemradio]');
      const isOpen = () => !menu.hidden;
      const open = focusIndex => {
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        const checked = items.findIndex(item => item.getAttribute('aria-checked') === 'true');
        items[focusIndex ?? checked].focus();
      };
      const close = refocus => {
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        if (refocus) trigger.focus();
      };
      const choose = item => {
        items.forEach(other => other.setAttribute('aria-checked', String(other === item)));
        $(root, '[data-label]').textContent = item.textContent;
        $(root, '[data-list]').innerHTML = goodsRows(item.dataset.sort);
        close(true);
      };
      trigger.addEventListener('click', () => (isOpen() ? close(false) : open()));
      trigger.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(event.key === 'ArrowUp' ? items.length - 1 : undefined); }
      });
      items.forEach(item => item.addEventListener('click', () => choose(item)));
      menu.addEventListener('keydown', event => {
        const index = items.indexOf(document.activeElement);
        const next = { ArrowDown: (index + 1) % items.length, ArrowUp: (index - 1 + items.length) % items.length, Home: 0, End: items.length - 1 }[event.key];
        if (next !== undefined) { event.preventDefault(); items[next].focus(); }
        else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); }
        else if (event.key === 'Tab') close(false);
      });
      const outside = event => { if (isOpen() && !root.querySelector('.exp003-dd').contains(event.target)) close(false); };
      document.addEventListener('pointerdown', outside);
      return () => document.removeEventListener('pointerdown', outside);
    }
  };

  /* ───────── 페이지네이션 ───────── */
  const NOTES = Array.from({ length: 20 }, (_, i) => `디자인 노트 ${String(i + 1).padStart(2, '0')}`);
  const PER_PAGE = 5;
  const PAGES = NOTES.length / PER_PAGE;
  const pagination = {
    label: '페이지네이션: 스무 개 목록을 다섯 개씩 나누어 이전·다음 버튼과 번호로 넘깁니다',
    hint: '번호나 이전·다음을 눌러 보세요',
    html: wrap('exp003-pg-root', `<ol class="exp003-pg-list" data-list start="1"></ol>
      <div class="exp003-pg-foot"><span data-range role="status" aria-live="polite"></span>
      <nav class="exp003-pg-nav" aria-label="페이지"><button type="button" data-step="-1" aria-label="이전 페이지">‹</button>${Array.from({ length: PAGES }, (_, i) => `<button type="button" data-page="${i + 1}" aria-label="${i + 1}페이지">${i + 1}</button>`).join('')}<button type="button" data-step="1" aria-label="다음 페이지">›</button></nav></div>`),
    init(root) {
      let page = 1;
      const render = () => {
        const from = (page - 1) * PER_PAGE;
        const list = $(root, '[data-list]');
        list.start = from + 1;
        list.innerHTML = NOTES.slice(from, from + PER_PAGE).map(note => `<li>${note}</li>`).join('');
        $(root, '[data-range]').textContent = `${from + 1}–${from + PER_PAGE} / ${NOTES.length}`;
        $$(root, '[data-page]').forEach(button => { const current = Number(button.dataset.page) === page; if (current) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); });
        $(root, '[data-step="-1"]').disabled = page === 1;
        $(root, '[data-step="1"]').disabled = page === PAGES;
      };
      root.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button || button.disabled) return;
        const target = button.dataset.page ? Number(button.dataset.page) : page + Number(button.dataset.step);
        const refocus = button.dataset.step && (target <= 1 || target >= PAGES);
        page = clamp(target, 1, PAGES);
        render();
        if (refocus) $(root, `[data-page="${page}"]`).focus();
      });
      render();
    }
  };

  /* ───────── 스티키 헤더 ───────── */
  const SECTIONS = [['소개', '작은 팀이 쓰는 가벼운 도구입니다. 복잡한 설정 없이 첫날부터 쓸 수 있습니다.'], ['기능', '문서, 일정, 댓글을 한 화면에 모았습니다. 필요한 것만 켜고 나머지는 숨깁니다.'], ['가격', '개인은 무료, 팀은 월 구독입니다. 쓰지 않는 달에는 요금이 나가지 않습니다.']];
  const sticky = {
    label: '스티키 헤더: 안쪽을 스크롤하면 헤더가 위에 붙어 낮아지고 현재 구간의 링크가 강조됩니다',
    hint: '안쪽을 스크롤하거나 링크를 눌러 보세요',
    html: wrap('exp003-st', `<div class="exp003-st-sc" tabindex="0" role="region" aria-label="스크롤 영역">
      <header class="exp003-st-hd"><b>Plinth</b><nav aria-label="구간">${SECTIONS.map(([name], i) => `<button type="button" data-go="${i}"${i === 0 ? ' aria-current="true"' : ''}>${name}</button>`).join('')}</nav></header>
      ${SECTIONS.map(([name, text]) => `<section class="exp003-st-s"><b>${name}</b><p>${text}</p></section>`).join('')}</div>`),
    init(root) {
      const scroller = $(root, '.exp003-st-sc');
      const header = $(root, '.exp003-st-hd');
      const sections = $$(root, '.exp003-st-s');
      const links = $$(root, '[data-go]');
      const update = () => {
        header.classList.toggle('is-stuck', scroller.scrollTop > 4);
        const line = scroller.scrollTop + header.offsetHeight + 8;
        const atEnd = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
        let current = sections.findLastIndex(section => section.offsetTop <= line);
        if (atEnd) current = sections.length - 1;
        links.forEach((link, i) => { if (i === Math.max(current, 0)) link.setAttribute('aria-current', 'true'); else link.removeAttribute('aria-current'); });
      };
      scroller.addEventListener('scroll', update, { passive: true });
      links.forEach(link => link.addEventListener('click', () => {
        scroller.scrollTo({ top: sections[Number(link.dataset.go)].offsetTop - header.offsetHeight + 1, behavior: reduced.matches ? 'auto' : 'smooth' });
      }));
      update();
    }
  };

  /* ───────── 스크롤 경로 ───────── */
  const PATH_D = 'M24 118C64 118 72 40 112 40S170 100 208 100S256 36 296 36';
  const PATH_NODES = [[24, 118, '01 가입', 143, 'start'], [112, 40, '02 연결', 22, 'middle'], [208, 100, '03 공유', 128, 'middle'], [296, 36, '04 완료', 18, 'end']];
  const scrollpath = {
    label: '스크롤 경로: 안쪽을 스크롤하면 점선 경로 위로 굵은 선이 그려지고 지나간 지점이 채워집니다',
    hint: '안쪽을 아래로 스크롤해 보세요',
    html: wrap('exp003-sp', `<i class="exp003-sp-bar" data-bar></i><p class="exp003-sp-pct">진행 <b data-pct>0%</b></p>
      <svg class="exp003-sp-svg" viewBox="0 0 320 150" aria-hidden="true" focusable="false"><path class="exp003-sp-guide" d="${PATH_D}"/><path class="exp003-sp-draw" data-draw pathLength="100" d="${PATH_D}"/>
        ${PATH_NODES.map(([x, y, label, ty, anchor], i) => `<circle class="exp003-sp-nd" data-node="${i}" cx="${x}" cy="${y}" r="7"/><text class="exp003-sp-tx" x="${i === 0 ? 14 : i === 3 ? 306 : x}" y="${ty}" text-anchor="${anchor}">${label}</text>`).join('')}</svg>
      <div class="exp003-sp-sc" tabindex="0" role="region" aria-label="스크롤 영역"><div class="exp003-sp-tall"></div></div>`),
    init(root) {
      const scroller = $(root, '.exp003-sp-sc');
      const draw = $(root, '[data-draw]');
      const nodes = $$(root, '[data-node]');
      const guide = $(root, '.exp003-sp-guide');
      const total = guide.getTotalLength();
      // 각 점이 경로의 몇 % 지점인지 미리 구해 둡니다.
      const fractions = nodes.map(node => {
        const x = Number(node.getAttribute('cx')), y = Number(node.getAttribute('cy'));
        let best = 0, bestDistance = Infinity;
        for (let step = 0; step <= 300; step++) {
          const point = guide.getPointAtLength(total * step / 300);
          const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
          if (distance < bestDistance) { bestDistance = distance; best = step / 300; }
        }
        return best;
      });
      const update = () => {
        const max = scroller.scrollHeight - scroller.clientHeight;
        const progress = max > 0 ? clamp(scroller.scrollTop / max, 0, 1) : 0;
        draw.style.strokeDashoffset = String(100 * (1 - progress));
        nodes.forEach((node, i) => node.classList.toggle('is-on', progress >= fractions[i] - .001));
        $(root, '[data-pct]').textContent = `${Math.round(progress * 100)}%`;
        $(root, '[data-bar]').style.transform = `scaleX(${progress})`;
      };
      scroller.addEventListener('scroll', update, { passive: true });
      update();
    }
  };

  /* ───────── 아코디언 ───────── */
  const FAQ = [['무료로 쓸 수 있나요?', '기본 기능은 무료입니다. 팀 기능은 유료 요금제에서 열립니다.'], ['데이터는 어디에 저장되나요?', '내 계정에 연결된 서버에 저장되며 언제든 파일로 내려받을 수 있습니다.'], ['언제든 해지할 수 있나요?', '설정에서 한 번에 해지합니다. 남은 기간은 그대로 쓸 수 있습니다.']];
  const accordion = {
    label: '아코디언: 제목을 누르면 내용이 펼쳐지고 다시 누르면 접힙니다',
    hint: '제목을 눌러 펼치고 접어 보세요',
    html: wrap('exp003-ac', `<div class="exp003-acc">${FAQ.map(([q, a], i) => `<div><h4 class="exp003-ah"><button type="button" id="${uid('acc', 'b' + i)}" aria-expanded="${i === 0}" aria-controls="${uid('acc', 'p' + i)}">${q}</button></h4>
        <div class="exp003-ap${i === 0 ? ' is-open' : ''}" id="${uid('acc', 'p' + i)}" role="region" aria-labelledby="${uid('acc', 'b' + i)}"><div><p>${a}</p></div></div></div>`).join('')}</div>
      <div class="exp003-row"><span id="${uid('acc', 'one')}">하나만 열기</span><span class="exp003-sw-wrap"><button type="button" class="exp003-sw" role="switch" aria-checked="false" aria-labelledby="${uid('acc', 'one')}"></button></span></div>`),
    init(root) {
      const heads = $$(root, '.exp003-ah button');
      const bodies = $$(root, '.exp003-ap');
      const single = $(root, '[role=switch]');
      const set = (i, open) => { heads[i].setAttribute('aria-expanded', String(open)); bodies[i].classList.toggle('is-open', open); };
      heads.forEach((head, i) => head.addEventListener('click', () => {
        const open = head.getAttribute('aria-expanded') !== 'true';
        if (open && single.getAttribute('aria-checked') === 'true') heads.forEach((_, j) => set(j, false));
        set(i, open);
      }));
      single.addEventListener('click', () => {
        const on = single.getAttribute('aria-checked') !== 'true';
        single.setAttribute('aria-checked', String(on));
        if (on) { const first = heads.findIndex(head => head.getAttribute('aria-expanded') === 'true'); heads.forEach((_, j) => set(j, j === first)); }
      });
    }
  };

  /* ───────── 캐러셀 ───────── */
  const QUOTES = [['설정 10분 만에 팀 작업 방식이 바뀌었어요.', '김서연 · 디자인 리드'], ['핸드오프 질문이 눈에 띄게 줄었습니다.', '박도윤 · 프론트엔드 개발'], ['처음 쓰는 팀원도 바로 따라 했어요.', '이하린 · 프로덕트 매니저']];
  const carousel = {
    label: '캐러셀: 이전·다음 버튼, 점, 방향키, 스와이프로 후기 슬라이드를 넘깁니다',
    hint: '버튼, ← → 키, 좌우 스와이프를 써 보세요',
    html: wrap('exp003-cs', `<div class="exp003-cs-vp" tabindex="0" role="group" aria-roledescription="캐러셀" aria-label="사용자 후기"><div class="exp003-cs-tr" data-track>
        ${QUOTES.map(([text, who], i) => `<div class="exp003-cs-sl" role="group" aria-roledescription="슬라이드" aria-label="${i + 1} / ${QUOTES.length}"><b>“${text}”</b><small>${who}</small></div>`).join('')}</div><span class="exp003-cs-no" data-no aria-hidden="true">1 / ${QUOTES.length}</span></div>
      <div class="exp003-cs-ct"><button type="button" data-step="-1" aria-label="이전 슬라이드">‹</button><div class="exp003-cs-dots">${QUOTES.map((_, i) => `<button type="button" data-dot="${i}" aria-label="${i + 1}번 슬라이드"></button>`).join('')}</div><button type="button" data-step="1" aria-label="다음 슬라이드">›</button>
      <button type="button" class="exp003-cs-auto" aria-pressed="false" aria-label="자동 재생">자동 ▶</button></div>`),
    init(root) {
      const viewport = $(root, '.exp003-cs-vp');
      const slides = $$(root, '.exp003-cs-sl');
      const dots = $$(root, '[data-dot]');
      const auto = $(root, '.exp003-cs-auto');
      let index = 0, timer = null, hovering = false;
      const go = next => {
        index = (next + slides.length) % slides.length;
        $(root, '[data-track]').style.transform = `translateX(${-100 * index}%)`;
        slides.forEach((slide, i) => { slide.inert = i !== index; });
        dots.forEach((dot, i) => { if (i === index) dot.setAttribute('aria-current', 'true'); else dot.removeAttribute('aria-current'); });
        $(root, '[data-no]').textContent = `${index + 1} / ${slides.length}`;
      };
      const stop = () => { clearInterval(timer); timer = null; };
      const play = () => { stop(); if (auto.getAttribute('aria-pressed') === 'true' && !hovering) timer = setInterval(() => go(index + 1), 3000); };
      root.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.dataset.step) go(index + Number(button.dataset.step));
        else if (button.dataset.dot) go(Number(button.dataset.dot));
        else if (button === auto) { const on = auto.getAttribute('aria-pressed') !== 'true'; auto.setAttribute('aria-pressed', String(on)); auto.textContent = on ? '자동 ❚❚' : '자동 ▶'; }
        play();
      });
      viewport.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1); } else if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1); }
      });
      let startX = null;
      viewport.addEventListener('pointerdown', event => { startX = event.clientX; });
      viewport.addEventListener('pointerup', event => {
        if (startX !== null && Math.abs(event.clientX - startX) > 40) go(index + (event.clientX < startX ? 1 : -1));
        startX = null;
      });
      viewport.addEventListener('pointercancel', () => { startX = null; });
      root.addEventListener('mouseenter', () => { hovering = true; play(); });
      root.addEventListener('mouseleave', () => { hovering = false; play(); });
      go(0);
      return stop;
    }
  };

  /* ───────── 검색·필터 ───────── */
  const REFS = [['서체 고르기', '타이포'], ['조합 사례 보기', '타이포'], ['자간·행간 점검', '타이포'], ['팔레트 만들기', '컬러'], ['명도 대비 검사', '컬러'], ['다크 모드 대응', '컬러'], ['이징 곡선', '모션'], ['전환 길이', '모션'], ['마이크로 인터랙션', '모션'], ['그리드 시스템', '레이아웃'], ['간격 규칙', '레이아웃'], ['반응형 흐름', '레이아웃']];
  const CHIPS = ['전체', '타이포', '컬러', '모션', '레이아웃'];
  const filter = {
    label: '검색·필터: 글자를 입력하거나 분류 칩을 누르면 목록이 걸러지고 결과 개수가 갱신됩니다',
    hint: '"검사"를 입력하거나 칩을 눌러 보세요',
    html: wrap('exp003-fl', `<div class="exp003-fl-top"><input type="search" class="exp003-in" placeholder="검색" aria-label="레퍼런스 검색" autocomplete="off" spellcheck="false"><span class="exp003-fl-n" role="status" data-count></span></div>
      <div class="exp003-fl-chips" role="group" aria-label="분류">${CHIPS.map((name, i) => `<button type="button" aria-pressed="${i === 0}">${name}</button>`).join('')}</div>
      <div class="exp003-fl-box" tabindex="0" role="region" aria-label="결과 목록"><ul class="exp003-fl-list" data-list></ul></div>`),
    init(root) {
      const input = $(root, 'input');
      const chips = $$(root, '.exp003-fl-chips button');
      let category = '전체';
      const render = () => {
        const query = input.value.trim().toLocaleLowerCase();
        const rows = REFS.filter(([name, tag]) => (category === '전체' || tag === category) && (!query || `${name} ${tag}`.toLocaleLowerCase().includes(query)));
        $(root, '[data-list]').innerHTML = rows.length ? rows.map(([name, tag]) => `<li><span>${name}</span><small>${tag}</small></li>`).join('') : '<li class="exp003-fl-empty">조건에 맞는 항목이 없습니다.</li>';
        $(root, '[data-count]').textContent = `${rows.length}개`;
      };
      input.addEventListener('input', render);
      chips.forEach(chip => chip.addEventListener('click', () => {
        category = chip.textContent;
        chips.forEach(other => other.setAttribute('aria-pressed', String(other === chip)));
        render();
      }));
      render();
    }
  };

  /* ───────── 모달 ───────── */
  const modal = {
    label: '모달: 삭제 버튼을 누르면 확인 창이 뜨고 뒤쪽 화면은 조작할 수 없으며 Esc로 닫으면 포커스가 버튼으로 돌아옵니다',
    hint: '삭제를 눌러 창을 열고 Tab·Esc를 써 보세요',
    html: wrap('exp003-mo', `<div class="exp003-mo-base" data-base><div class="exp003-mo-card"><div><b data-name>봄 캠페인 시안</b><small>마지막 수정 어제</small></div><span class="exp003-mo-tag" data-tag>사용 중</span></div>
        <div class="exp003-mo-acts"><button type="button" data-open aria-haspopup="dialog">삭제…</button><button type="button" data-undo hidden>되돌리기</button></div><p class="exp003-mo-out" role="status" data-out>아직 아무것도 삭제하지 않았습니다.</p></div>
      <div class="exp003-mo-ov" data-overlay hidden><div class="exp003-mo-dlg" role="dialog" aria-modal="true" aria-labelledby="${uid('mo', 'title')}" aria-describedby="${uid('mo', 'desc')}">
        <b id="${uid('mo', 'title')}">시안을 삭제할까요?</b><p id="${uid('mo', 'desc')}">삭제한 시안은 이 화면에서 되돌릴 수 있습니다.</p>
        <div class="exp003-mo-acts"><button type="button" data-cancel>취소</button><button type="button" class="exp003-pri" data-confirm>삭제</button></div></div></div>`),
    init(root) {
      const base = $(root, '[data-base]');
      const overlay = $(root, '[data-overlay]');
      const dialog = $(root, '[role=dialog]');
      const opener = $(root, '[data-open]');
      const undo = $(root, '[data-undo]');
      const out = $(root, '[data-out]');
      let returnTo = opener;
      const focusables = () => $$(dialog, 'button:not(:disabled)');
      const open = () => { overlay.hidden = false; base.inert = true; returnTo = opener; focusables()[0].focus(); };
      const close = () => { overlay.hidden = true; base.inert = false; (opener.hidden ? undo : returnTo).focus(); };
      const setDeleted = deleted => {
        $(root, '[data-tag]').textContent = deleted ? '삭제됨' : '사용 중';
        $(root, '.exp003-mo-card').classList.toggle('is-gone', deleted);
        opener.hidden = deleted; undo.hidden = !deleted;
        out.textContent = deleted ? '삭제했습니다.' : '되돌렸습니다.';
      };
      opener.addEventListener('click', open);
      $(root, '[data-cancel]').addEventListener('click', () => { out.textContent = '취소했습니다.'; close(); });
      $(root, '[data-confirm]').addEventListener('click', () => { setDeleted(true); close(); });
      undo.addEventListener('click', () => { setDeleted(false); opener.focus(); });
      overlay.addEventListener('pointerdown', event => { if (event.target === overlay) { out.textContent = '바깥을 눌러 닫았습니다.'; close(); } });
      root.addEventListener('keydown', event => {
        if (overlay.hidden) return;
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); out.textContent = 'Esc로 닫았습니다.'; close(); }
        else if (event.key === 'Tab') {
          const list = focusables();
          const first = list[0], last = list[list.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      });
    }
  };

  /* ───────── 툴팁 ───────── */
  const TIPS = [['저장', '변경 사항을 저장합니다 · Ctrl+S', '<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>', '저장했습니다.'], ['공유', '링크를 만들어 공유합니다', '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8 15.8 7.2M8.2 13.2l7.6 3.6"/>', '공유 링크를 만들었습니다.'], ['삭제', '되돌릴 수 없습니다', '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>', '삭제했습니다.']];
  const tooltip = {
    label: '툴팁: 버튼에 마우스를 올리거나 포커스하면 짧은 설명이 뜨고 Esc로 닫을 수 있습니다',
    hint: '버튼에 마우스를 올리거나 Tab으로 이동해 보세요',
    html: wrap('exp003-tt-root', `<div class="exp003-tt-row">${TIPS.map(([name, tip, path], i) => `<span class="exp003-tt"><button type="button" class="exp003-tt-btn" aria-label="${name}" aria-describedby="${uid('tt', 't' + i)}" data-msg="${TIPS[i][3]}">${icon(path)}</button><span class="exp003-tt-tip" role="tooltip" id="${uid('tt', 't' + i)}"><span>${tip}</span></span></span>`).join('')}</div>
      <p class="exp003-tt-out" role="status" data-out>아이콘 버튼을 눌러 보세요.</p>
      <p class="exp003-tt-lab"><span>API 키</span><span class="exp003-tt" data-pos="below"><button type="button" class="exp003-tt-q" aria-label="API 키 도움말" aria-describedby="${uid('tt', 'q')}">?</button><span class="exp003-tt-tip" role="tooltip" id="${uid('tt', 'q')}"><span>계정 설정의 개발자 메뉴에서 만들 수 있습니다.</span></span></span></p>`),
    init(root) {
      const wrappers = $$(root, '.exp003-tt');
      const show = wrapper => wrapper.classList.add('is-open');
      const hide = wrapper => wrapper.classList.remove('is-open');
      wrappers.forEach(wrapper => {
        wrapper.addEventListener('mouseenter', () => show(wrapper));
        wrapper.addEventListener('mouseleave', () => { if (!wrapper.matches(':focus-within')) hide(wrapper); });
        wrapper.addEventListener('focusin', () => show(wrapper));
        wrapper.addEventListener('focusout', () => hide(wrapper));
      });
      root.addEventListener('keydown', event => { if (event.key === 'Escape') wrappers.forEach(hide); });
      $$(root, '.exp003-tt-btn').forEach(button => button.addEventListener('click', () => { $(root, '[data-out]').textContent = button.dataset.msg; }));
    }
  };

  /* ───────── 토스트 ───────── */
  const TOASTS = { ok: ['✓', '저장했습니다.'], error: ['!', '연결이 끊겼습니다. 다시 시도해 주세요.'], info: ['i', '새 댓글 1개가 달렸습니다.'] };
  const toast = {
    label: '토스트: 버튼을 누르면 화면 아래에 알림이 쌓이고 몇 초 뒤 사라지며 ✕로 바로 닫을 수 있습니다',
    hint: '버튼을 여러 번 눌러 알림을 쌓아 보세요',
    html: wrap('exp003-ts-root', `<div class="exp003-ts-btns"><button type="button" data-kind="ok">저장하기</button><button type="button" data-kind="error">오류 내기</button><button type="button" data-kind="info">댓글 알림</button></div>
      <div class="exp003-ts-box" role="region" aria-label="알림" aria-live="polite" data-box></div>`),
    init(root) {
      const box = $(root, '[data-box]');
      const timers = new Set();
      const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
      const remove = item => { if (!item.isConnected) return; item.classList.remove('is-in'); later(() => item.remove(), reduced.matches ? 0 : 200); };
      const add = kind => {
        const [mark, text] = TOASTS[kind];
        while (box.children.length >= 3) box.firstElementChild.remove();
        const item = document.createElement('div');
        item.className = `exp003-ts is-${kind}`;
        item.innerHTML = `<span class="exp003-ts-mk" aria-hidden="true">${mark}</span><span class="exp003-ts-tx">${text}</span><button type="button" aria-label="알림 닫기">✕</button>`;
        box.append(item);
        requestAnimationFrame(() => requestAnimationFrame(() => item.classList.add('is-in')));
        let timer = later(() => remove(item), 4000);
        item.addEventListener('mouseenter', () => { clearTimeout(timer); timers.delete(timer); });
        item.addEventListener('mouseleave', () => { timer = later(() => remove(item), 2000); });
        $(item, 'button').addEventListener('click', () => { clearTimeout(timer); remove(item); });
      };
      $$(root, '[data-kind]').forEach(button => button.addEventListener('click', () => add(button.dataset.kind)));
      return () => timers.forEach(clearTimeout);
    }
  };

  /* ───────── 토글 스위치 ───────── */
  const SWITCHES = [['dark', '다크 미리보기'], ['bell', '알림 받기'], ['auto', '자동 저장']];
  const toggle = {
    label: '토글 스위치: 스위치를 켜고 끄면 옆 미리보기의 모습이 바로 바뀝니다',
    hint: '스위치를 눌러 미리보기를 바꿔 보세요',
    html: wrap('exp003-tg', `<div class="exp003-tg-list">${SWITCHES.map(([key, name]) => `<div class="exp003-row"><span id="${uid('tg', key)}">${name}</span><span class="exp003-sw-wrap"><span class="exp003-sw-st" data-st="${key}" aria-hidden="true">끔</span><button type="button" class="exp003-sw" role="switch" aria-checked="false" data-key="${key}" aria-labelledby="${uid('tg', key)}"></button></span></div>`).join('')}</div>
      <div class="exp003-tg-pv" data-pv><b>미리보기</b><span class="exp003-tg-chip" data-bell>알림 꺼짐</span><span class="exp003-tg-chip" data-save>수동 저장 · <u>저장 필요</u></span></div>`),
    init(root) {
      const preview = $(root, '[data-pv]');
      const apply = {
        dark: on => { preview.classList.toggle('is-dark', on); },
        bell: on => { $(root, '[data-bell]').textContent = on ? '알림 켜짐' : '알림 꺼짐'; },
        auto: on => { $(root, '[data-save]').innerHTML = on ? '자동 저장 · <u>저장됨</u>' : '수동 저장 · <u>저장 필요</u>'; }
      };
      $$(root, '[role=switch]').forEach(button => button.addEventListener('click', () => {
        const on = button.getAttribute('aria-checked') !== 'true';
        button.setAttribute('aria-checked', String(on));
        $(root, `[data-st="${button.dataset.key}"]`).textContent = on ? '켬' : '끔';
        apply[button.dataset.key](on);
      }));
    }
  };

  /* ───────── 폼 검증 ───────── */
  const checkEmail = value => !value ? '이메일을 입력해 주세요.' : /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value) ? '' : '이메일 형식이 아닙니다. 예: name@mail.com';
  const checkPassword = value => !value ? '비밀번호를 입력해 주세요.' : value.length < 8 ? `8자 이상이어야 합니다. (${value.length}/8)` : !/\d/.test(value) ? '숫자를 한 개 이상 넣어 주세요.' : '';
  const form = {
    label: '폼 검증: 입력칸을 벗어나면 이메일 형식과 비밀번호 규칙을 검사해 오류를 알려 주고 제출하면 첫 오류 칸으로 포커스가 이동합니다',
    hint: '일부러 틀리게 입력하고 제출해 보세요',
    html: wrap('exp003-fm', `<form novalidate data-form>
        <div class="exp003-fm-f"><label for="${uid('fm', 'email')}">이메일</label><input class="exp003-in" id="${uid('fm', 'email')}" name="email" type="email" autocomplete="off" aria-describedby="${uid('fm', 'email-m')}"><p class="exp003-fm-m" id="${uid('fm', 'email-m')}" data-msg="email"></p></div>
        <div class="exp003-fm-f"><label for="${uid('fm', 'pw')}">비밀번호</label><div class="exp003-fm-pw"><input class="exp003-in" id="${uid('fm', 'pw')}" name="pw" type="password" autocomplete="new-password" aria-describedby="${uid('fm', 'pw-m')}"><button type="button" data-show aria-pressed="false">보기</button></div><p class="exp003-fm-m" id="${uid('fm', 'pw-m')}" data-msg="pw">8자 이상, 숫자 포함</p></div>
        <button type="submit" class="exp003-pri">가입하기</button></form>
      <div class="exp003-fm-done" data-done role="status" hidden><b>✓ 가입 완료</b><p>입력한 내용이 모두 규칙에 맞습니다. 실제로 전송하지는 않습니다.</p><button type="button" data-again>다시 입력</button></div>`),
    init(root) {
      const formEl = $(root, '[data-form]');
      const fields = { email: [$(root, '[name=email]'), checkEmail, ''], pw: [$(root, '[name=pw]'), checkPassword, '8자 이상, 숫자 포함'] };
      const touched = { email: false, pw: false };
      const show = name => {
        const [input, check, idle] = fields[name];
        const message = $(root, `[data-msg="${name}"]`);
        const error = touched[name] ? check(input.value) : '';
        if (error) { input.setAttribute('aria-invalid', 'true'); message.textContent = `! ${error}`; message.className = 'exp003-fm-m is-error'; }
        else {
          input.removeAttribute('aria-invalid');
          const good = touched[name] && input.value;
          message.textContent = good ? '✓ 사용할 수 있어요.' : idle;
          message.className = `exp003-fm-m${good ? ' is-ok' : ''}`;
        }
        return error;
      };
      Object.entries(fields).forEach(([name, [input]]) => {
        input.addEventListener('blur', () => { touched[name] = true; show(name); });
        input.addEventListener('input', () => { if (touched[name]) show(name); });
      });
      const pw = fields.pw[0];
      $(root, '[data-show]').addEventListener('click', event => {
        const on = pw.type === 'password';
        pw.type = on ? 'text' : 'password';
        event.currentTarget.setAttribute('aria-pressed', String(on));
        event.currentTarget.textContent = on ? '숨기기' : '보기';
      });
      formEl.addEventListener('submit', event => {
        event.preventDefault();
        Object.keys(touched).forEach(name => { touched[name] = true; });
        const invalid = Object.keys(fields).filter(name => show(name));
        if (invalid.length) { fields[invalid[0]][0].focus(); return; }
        formEl.hidden = true;
        $(root, '[data-done]').hidden = false;
        $(root, '[data-again]').focus();
      });
      $(root, '[data-again]').addEventListener('click', () => {
        formEl.reset();
        Object.keys(touched).forEach(name => { touched[name] = false; show(name); });
        $(root, '[data-done]').hidden = true;
        formEl.hidden = false;
        fields.email[0].focus();
      });
    }
  };

  window.LAB_SCENES['exp-003'] = { tabs, dropdown, pagination, sticky, scrollpath, accordion, carousel, filter, modal, tooltip, toast, toggle, form };
})();
