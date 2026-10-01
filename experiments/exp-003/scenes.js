/* EXP-003 · 웹 디자인 — 제작 Claude Sonnet 5.5 · 2026-10-01
   장면 HTML은 CSS/SVG/DOM만 씁니다. 출처 링크와 그룹 제목은 카드가 그려진 뒤 맨 아래 보강 코드가 붙입니다. */
window.LAB_SCENES = window.LAB_SCENES || {};
(() => {
  const ln = w => `<i class="exp003-ln" style="--w:${w}"></i>`;
  const lns = (...w) => `<div class="exp003-lns">${w.map(x => ln(x)).join('')}</div>`;
  const star = '<svg viewBox="0 0 12 12"><path d="M6 .8l1.6 3.4 3.7.5-2.7 2.6.7 3.7L6 9.2 2.7 11l.7-3.7L.7 4.7l3.7-.5z"/></svg>';
  const logoSet = marks => marks.map(([n, name]) => `<span class="exp003-lg"><i class="exp003-mk exp003-m${n}"></i>${name}</span>`).join('');
  const SET_A = logoSet([[1, 'Plinth'], [2, 'Orrery'], [3, 'Kelp'], [4, 'Tandem'], [5, 'Quill'], [6, 'Vesper']]);
  const SET_B = logoSet([[6, 'Ledger'], [4, 'Harbor'], [2, 'Moss'], [5, 'Fathom'], [1, 'Atlas'], [3, 'Birch']]);
  const marquee = (set, rev = '') => `<div class="exp003-row${rev}"><div class="exp003-trk">${set}${set}</div></div>`;
  const icon = path => `<span class="exp003-ic"><svg viewBox="0 0 24 24">${path}</svg></span>`;
  const feature = (i, path, title) => `<div class="exp003-fc exp003-in" style="--i:${i}"><div class="exp003-fi" style="--i:${i}">${icon(path)}<b>${title}</b>${lns('100%', '72%')}</div></div>`;
  const quote = (n, text, who) => `<div class="exp003-q exp003-q${n}"><b>“${text}”</b><small>${who}</small></div>`;
  // 트렌드 비교: 왼쪽 "사라지는 중", 오른쪽 "대체". 패널 안쪽은 장면마다 다릅니다.
  const pair = (bad, badCap, good, goodCap) => `<div class="exp003 exp003-tr"><div class="exp003-pair"><div class="exp003-sd exp003-bad"><span class="exp003-tg">사라지는 중</span><div class="exp003-pn ${bad[0]}">${bad[1]}</div><small>${badCap}</small></div><div class="exp003-sd exp003-good"><span class="exp003-tg">대체</span><div class="exp003-pn ${good[0]}">${good[1]}</div><small>${goodCap}</small></div></div></div>`;
  const bars = (cls, hs, colors = []) => `<div class="${cls}">${hs.map((h, i) => `<i style="--h:${h}%;--i:${i}${colors[i] ? `;--c:${colors[i]}` : ''}"></i>`).join('')}</div>`;
  const rows = (items) => `<div class="exp003-rows">${items.map((t, i) => `<span class="exp003-rw" style="--i:${i}"><i>0${i + 1}</i>${t}<em>→</em></span>`).join('')}</div>`;
  const ref = (cap, title, spec, items) => `<div class="exp003 exp003-ref"><div class="exp003-rh"><b>${title}</b><small>${cap}</small></div><div class="exp003-rb"><div class="exp003-sp">${spec}</div>${rows(items)}</div></div>`;

  window.LAB_SCENES['exp-003'] = {
    hero: {
      label: '히어로: 내비게이션 아래에서 두 줄 헤드라인과 시작하기 버튼이 차례로 올라오고, 오른쪽 제품 카드의 막대가 자라납니다',
      html: `<div class="exp003 exp003-hero"><div class="exp003-pg"><div class="exp003-nav"><i class="exp003-logo"></i>${ln('22px')}${ln('22px')}${ln('22px')}</div><div class="exp003-hb"><div class="exp003-copy"><span class="exp003-eb exp003-in" style="--i:0">NEW · 베타 공개</span><div class="exp003-h"><span class="exp003-in" style="--i:1">아이디어를</span><span class="exp003-in" style="--i:2">화면으로</span></div><div class="exp003-in" style="--i:3">${lns('92%', '64%')}</div><div class="exp003-btns exp003-in" style="--i:4"><span class="exp003-btn">시작하기 →</span><span class="exp003-btn exp003-ghost">데모 보기</span></div></div><div class="exp003-vis"><div class="exp003-card">${ln('46%')}${bars('exp003-bars', [38, 66, 52, 88])}</div><span class="exp003-badge">+24%</span></div></div></div></div>`
    },
    path: {
      label: '애니메이티드 패스: 점선 경로 위로 굵은 선이 그려지며 주황 점이 네 개의 지점을 차례로 지나고, 지나간 지점이 채워집니다',
      html: `<div class="exp003 exp003-pth"><div class="exp003-box"><svg viewBox="0 0 320 150" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path class="exp003-guide" d="M24 118C64 118 72 40 112 40S170 100 208 100S256 36 296 36"/><path class="exp003-draw" pathLength="100" d="M24 118C64 118 72 40 112 40S170 100 208 100S256 36 296 36"/><path class="exp003-head" pathLength="100" d="M24 118C64 118 72 40 112 40S170 100 208 100S256 36 296 36"/><circle class="exp003-nd exp003-nd1" cx="24" cy="118" r="7"/><circle class="exp003-nd exp003-nd2" cx="112" cy="40" r="7"/><circle class="exp003-nd exp003-nd3" cx="208" cy="100" r="7"/><circle class="exp003-nd exp003-nd4" cx="296" cy="36" r="7"/><text class="exp003-pt" x="30" y="143">01 가입</text><text class="exp003-pt" x="112" y="22">02 연결</text><text class="exp003-pt" x="208" y="126">03 공유</text><text class="exp003-pt" x="288" y="18">04 완료</text></svg></div><small class="exp003-cap">스크롤하면 경로가 이어서 그려집니다</small></div>`
    },
    marquee: {
      label: '로고 마퀴: 가상 브랜드 로고 두 줄이 서로 반대 방향으로 끊기지 않고 흘러가며 양끝이 옅어집니다',
      html: `<div class="exp003 exp003-mq"><div class="exp003-mqh"><b>함께 만드는 팀</b><small>1,200+ 팀이 사용 중</small></div>${marquee(SET_A)}${marquee(SET_B, ' exp003-rev')}</div>`
    },
    feature: {
      label: '기능 카드: 세 장의 기능 카드가 차례로 올라온 뒤, 한 장씩 위로 들리며 윤곽과 아이콘이 진해집니다',
      html: `<div class="exp003 exp003-feat"><div class="exp003-fhd"><b>필요한 기능만 골라 쓰세요</b><small>핵심 기능 3가지</small></div><div class="exp003-fg">${feature(0, '<path d="M13 3 5 13h6l-1 8 8-10h-6z"/>', '빠른 시작')}${feature(1, '<path d="M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6"/>', '자동 저장')}${feature(2, '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.5 2.7-6 6-6s6 2.5 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c3 .2 5 2.4 5 5.8"/>', '팀 공유')}</div></div>`
    },
    cta: {
      label: 'CTA: 어두운 띠 위에 커서가 버튼에 올라가 화살표를 밀어내고, 잠시 벗어났다가 돌아와 버튼을 누릅니다',
      html: `<div class="exp003 exp003-cta"><div class="exp003-band"><small>14일 무료 체험</small><div class="exp003-ch">지금 시작해 보세요</div><span class="exp003-bw"><span class="exp003-cb">무료로 시작하기<em>→</em></span><svg class="exp003-cur" viewBox="0 0 14 18" aria-hidden="true"><path d="M1 1v14l4-3.4 2.6 5.4 2.4-1.2-2.6-5.2H13z"/></svg></span><small>카드 등록 없이 · 언제든 해지</small></div></div>`
    },
    proof: {
      label: '소셜 프루프: 아바타 묶음과 별점 아래에서 후기 세 개가 차례로 바뀌고 아래 점이 현재 후기를 가리킵니다',
      html: `<div class="exp003 exp003-px"><div class="exp003-pg" style="padding:10px;gap:9px"><div class="exp003-prow"><div class="exp003-av"><i style="--c:var(--ink)"></i><i style="--c:var(--accent)"></i><i style="--c:var(--gray-6)"></i><i style="--c:var(--blue-2)"></i></div><div class="exp003-rate"><div class="exp003-stars">${star.repeat(5)}</div><b>4.9 · 2,400+ 팀</b></div></div><div class="exp003-qs">${quote(1, '설정 10분 만에 팀 작업 방식이 바뀌었어요.', '김서연 · 디자인 리드')}${quote(2, '핸드오프 질문이 눈에 띄게 줄었습니다.', '박도윤 · 프론트엔드 개발')}${quote(3, '처음 쓰는 팀원도 바로 따라 했어요.', '이하린 · 프로덕트 매니저')}</div><div class="exp003-dots"><i></i><i></i><i></i></div></div></div>`
    },
    'trend-gradient': {
      label: '그라디언트 배경 대 단색: 왼쪽은 회색 그라디언트 위의 알약 버튼, 오른쪽은 단색 배경에 주황 밑줄과 각진 버튼입니다',
      html: pair(['exp003-g1', '<span class="exp003-pill">AI 기반</span><b>더 빠른<br>내일</b><span class="exp003-pill">시작하기</span>'], '그라디언트 + 알약', ['exp003-flat', '<small>AI 기반</small><b>더 빠른<br>내일</b><i class="exp003-ul"></i><span class="exp003-btn" style="align-self:flex-start;height:24px">시작하기</span>'], '단색 + 포인트 하나')
    },
    'trend-glass': {
      label: '글래스모피즘 대 불투명 서피스: 두 패널 모두 뒤의 도형이 좌우로 움직이고, 왼쪽 반투명 카드는 글자 뒤로 도형이 비치며 오른쪽 불투명 카드는 가립니다',
      html: pair(['', '<i class="exp003-shp exp003-s1"></i><i class="exp003-shp exp003-s2"></i><div class="exp003-glass"><b>결제 완료</b>' + ln('70%') + '</div>'], '반투명 카드', ['', '<i class="exp003-shp exp003-s1"></i><i class="exp003-shp exp003-s2"></i><div class="exp003-solid"><b>결제 완료</b>' + ln('70%') + '</div>'], '불투명 + 1px 선')
    },
    'trend-glow': {
      label: '글로우 대 선명한 윤곽: 왼쪽 버튼은 겹겹의 주황 고리가 번지듯 맥동하고, 오른쪽 버튼은 또렷한 외곽선이 잠깐 벌어졌다 돌아옵니다',
      html: pair(['', '<b>알림 켜기</b>' + ln('80%') + '<span class="exp003-ringbtn">켜기</span>'], '고리 번짐', ['', '<b>알림 켜기</b>' + ln('80%') + '<span class="exp003-crisp">켜기</span>'], '또렷한 포커스 윤곽')
    },
    'trend-blob': {
      label: '3D 블롭 대 실제 화면: 왼쪽은 떠다니는 회색 원 장식과 문구, 오른쪽은 지표 숫자와 막대 차트가 있는 제품 화면입니다',
      html: pair(['', '<div class="exp003-blobs"><i class="exp003-bl exp003-bl1"></i><i class="exp003-bl exp003-bl2"></i><i class="exp003-bl exp003-bl3"></i></div><b>미래를 만나다</b>'], '추상 장식', ['', '<div class="exp003-kpi"><b>128</b><small>활성 사용자</small></div>' + bars('exp003-mini', [34, 52, 44, 70, 62, 90])], '실제 제품 화면')
    },
    'trend-card': {
      label: '둥근 카드 대 그리드: 왼쪽은 그림자가 있는 둥근 카드 셋이 둥둥 뜨고, 오른쪽은 가는 구분선이 차례로 그어지는 표입니다',
      html: pair(['', '<div class="exp003-fl">' + [0, 1, 2].map(i => `<div class="exp003-rc" style="--i:${i}"><i></i>${ln(['70%', '55%', '64%'][i])}</div>`).join('') + '</div>'], '둥근 + 그림자', ['', '<div class="exp003-tbl">' + [['속도', '빠름'], ['가격', '무료'], ['지원', '24시간']].map(([k, v], i) => `<div class="exp003-tr" style="--i:${i}"><span>${k}</span><b>${v}</b></div>`).join('') + '</div>'], '구분선 + 정렬')
    },
    'trend-center': {
      label: '중앙 정렬 대 좌측 위계: 왼쪽은 같은 크기의 가운데 줄과 색 점 불릿이 통통 튀고, 오른쪽은 제목·설명·링크가 왼쪽 기준선에 차례로 놓입니다',
      html: pair(['exp003-ctr', '<b>혁신적인 서비스</b>' + [['var(--accent)', '빠르고 쉬운'], ['var(--gray-5)', '강력하고 안전한'], ['var(--ink)', '모두를 위한']].map(([c, t], i) => `<span class="exp003-bu"><i style="--c:${c};--i:${i}"></i>${t}</span>`).join('')], '가운데 + 장식 불릿', ['exp003-left', '<span class="exp003-eb exp003-in" style="--i:0">정산</span><b class="exp003-in" style="--i:1">한 번에 끝내는<br>정산</b><div class="exp003-in" style="--i:2">' + lns('92%', '60%') + '</div><span class="exp003-lk exp003-in" style="--i:3">자세히 보기 →</span>'], '좌측 정렬 + 위계')
    },
    'ref-typography': {
      label: '타이포 카드: 큰 Aa, 한글 제목, 작은 설명 세 단계 글자 크기를 주황 표시가 차례로 가리키고, 오른쪽 세 항목이 차례로 강조됩니다',
      html: ref('레퍼런스 01', '타이포그래피', '<div class="exp003-ty"><b class="exp003-aa">Aa</b><span class="exp003-ko1">가나다라</span><span class="exp003-ko2">서체 위계 점검</span></div>', ['서체 고르기', '조합 사례 보기', '자간·행간 점검'])
    },
    'ref-color': {
      label: '컬러 카드: 높이가 다른 다섯 색 막대가 차례로 위로 들리고, 오른쪽 세 항목이 차례로 강조됩니다',
      html: ref('레퍼런스 02', '컬러', bars('exp003-sw', [100, 74, 88, 58, 70], ['var(--ink)', 'var(--accent)', 'var(--blue-2)', 'var(--gray-5)', 'var(--gray-3)']), ['팔레트 만들기', '명도 대비 검사', '다크 모드 대응'])
    },
    'ref-motion': {
      label: '모션 카드: 이징 곡선 위를 주황 점이 시간에 따라 오가고, 오른쪽 세 항목이 차례로 강조됩니다',
      html: ref('레퍼런스 03', '모션', '<div class="exp003-plot"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 100C65 100 35 0 100 0"/></svg><div class="exp003-dx"><i class="exp003-dy"></i></div></div>', ['이징 곡선', '전환 길이', '마이크로 인터랙션'])
    },
    'ref-layout': {
      label: '레이아웃 카드: 세 블록이 두 열 배치에서 한 열 배치로 바뀌었다가 돌아오고, 오른쪽 세 항목이 차례로 강조됩니다',
      html: ref('레퍼런스 04', '레이아웃', '<div class="exp003-lo"><i class="exp003-la"></i><i class="exp003-lb"></i><i class="exp003-lc"></i></div>', ['그리드 시스템', '간격 규칙', '반응형 흐름'])
    },
    'ref-mockup': {
      label: '목업 카드: 브라우저 창 앞에서 휴대폰 프레임이 살짝 기울고 화면 안의 내용이 위로 스크롤되며, 오른쪽 세 항목이 차례로 강조됩니다',
      html: ref('레퍼런스 05', '목업', '<i class="exp003-win"></i><div class="exp003-ph"><div class="exp003-scr"><i></i><i></i><i></i><i></i><i></i><i></i></div></div>', ['기기 프레임', '배경 장면', '내보내기'])
    },
    'ref-inspire': {
      label: '영감 카드: 높이가 다른 여섯 장의 타일이 차례로 올라오고 한 타일에 북마크 표시가 달랑거리며, 오른쪽 세 항목이 차례로 강조됩니다',
      html: ref('레퍼런스 06', '영감', '<div class="exp003-mas"><div><i style="--c:var(--gray-3);--f:3;--i:0"></i><i style="--c:var(--ink);--f:2;--i:3"></i></div><div><i class="exp003-sv" style="--c:var(--gray-4);--f:2;--i:1"></i><i style="--c:var(--gray-2);--f:3;--i:4"></i></div><div><i style="--c:var(--gray-5);--f:2;--i:2"></i><i style="--c:var(--blue-2);--f:2;--i:5"></i></div></div>', ['작업물 갤러리', '수상작 아카이브', '무드보드'])
    }
  };

  // 카드가 그려진 뒤 그룹 제목과 출처 줄을 붙입니다. 이미 붙어 있거나 카드에 같은 표기가 있으면 건너뜁니다.
  const PROVENANCE = '제작 Claude Sonnet 5.5 · 2026-10-01';
  const IG = 'https://www.instagram.com/';
  const SRC = {
    hero: [['@arman._.uiux', IG + 'p/DdySvZ4m8Zh/']],
    path: [['@janm_ux', IG + 'reel/Dd4B9zdOiRU/']],
    trend: [['@adobeexpress', IG + 'p/Dd6pUUdjkTZ/'], ['@uxbrainy', IG + 'p/DdORF23iBpe/']],
    ref: [['@orbix_marketing', IG + 'p/DduRMxvGYVr/'], ['@asmin_creates2', IG + 'p/DdtS0FFjAiy/']],
    dots: [['@dotsystemsdevs', IG + 'p/DdRvGhlgvME/']]
  };
  const sourceOf = key => key === 'hero' || key === 'path' ? SRC[key] : key.startsWith('trend-') ? SRC.trend : key.startsWith('ref-') ? SRC.ref : SRC.dots;
  const GROUPS = {
    hero: ['랜딩 패턴', '히어로부터 소셜 프루프까지, 랜딩 페이지를 이루는 여섯 구간.'],
    'trend-gradient': ['죽어가는 트렌드 vs 대체재', '왼쪽이 사라지는 중인 표현, 오른쪽이 그 자리를 대신하는 표현입니다.'],
    'ref-typography': ['디자인 레퍼런스 디렉토리', '분류 구조만 재현한 카드입니다. 개별 사이트 링크는 출처 게시물에서 확인하세요.']
  };
  const esc = value => String(value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  function enhance() {
    const list = document.querySelector('#demo-list');
    if (!list || document.body.dataset.page !== 'exp-003') return false;
    const cards = list.querySelectorAll('.demo-card');
    cards.forEach(card => {
      const info = card.querySelector('.demo-info');
      if (!info || info.querySelector('.exp003-source') || card.textContent.includes(PROVENANCE)) return;
      const links = sourceOf(card.id).map(([name, url]) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)} ↗<span class="sr-only"> (새 탭)</span></a>`).join('');
      info.insertAdjacentHTML('beforeend', `<p class="exp003-source"><span>출처 Instagram</span>${links}<span>${PROVENANCE}</span></p>`);
    });
    cards.forEach(card => {
      const group = GROUPS[card.id];
      if (group && !card.previousElementSibling?.classList.contains('exp003-group')) card.insertAdjacentHTML('beforebegin', `<div class="exp003-group"><h2>${esc(group[0])}</h2><p>${esc(group[1])}</p></div>`);
    });
    return cards.length > 0;
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!enhance()) new MutationObserver((records, observer) => { if (enhance()) observer.disconnect(); }).observe(document.body, { childList: true, subtree: true });
  });
})();
