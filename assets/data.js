/* Library model: one category = one page (experiments/exp-00N/), and demos keep being added to that page.
   To publish a category, add an experiment here and list its demos. Paths are site-relative.
   - category: filter label on the landing; keep it in `categories` (order = filter order).
   - demos: [key, name, english, description, group, account, url]; account/url are the Instagram source of that demo
     (leave them out when the whole page shares the page-level `sources`).
   - groups: optional section headers on the experiment page, shown in demo order; also summarised on the landing card.
   - scenes: demos listed here are drawn by app.js. If a page registers scene HTML in window.LAB_SCENES[slug][key]
     (experiments/exp-00N/scenes.js) app.js uses it.
   - interactive: the page's scenes are working UI patterns ({ label, hint, html, init(root) } in LAB_SCENES). app.js renders them as live
     controls instead of looping animations: the play/pause toolbar is replaced by reset buttons, and init() may return a cleanup function. */
(() => {
const IG = 'https://www.instagram.com/';
const toDemo = ([key, name, english, description, group, account, url]) => ({ key, name, english, description, group, sources: account ? [{ account, url }] : [] });

window.LAB = {
  copyPending: false,
  title: 'Agentic Coding Lab',
  intro: "소셜 미디어에서 발견한 모션, 카메라, 웹 디자인, 웹사이트 아이디어를 코드로 재현합니다.",
  credit: '제작 Claude Sonnet 5.5 · 2026-10-01',
  categories: ['모션', '카메라', '웹 디자인', '웹사이트'],
  experiments: [
    {
      id: 'EXP-001', slug: 'exp-001', title: '모션 용어', category: '모션', unit: '데모',
      description: "이징부터 마스크 리빌, AI 생성 모션, 타이포 모션, 키프레임 타입까지 21개의 CSS 모션 실험",
      sources: [{ platform: 'Threads', account: '@glitter_ai_factory', url: 'https://www.threads.net/@glitter_ai_factory' }],
      provenance: '구조 gpt-6.1-sol · 장면 Claude Sonnet 5.5 (복원) · 2026-10-01',
      sourceNote: '기본 10개의 출처입니다. 이어지는 11개는 카드마다 출처를 표기합니다.',
      groups: {
        basic: ['모션 기본 원리', '이징부터 마스크 리빌까지, 애니메이션의 기본 원리 열 가지.'],
        ai: ['AI 생성 모션', '프롬프트로 만든 영상에서 자주 보이는 여섯 가지 움직임을 CSS로 다시 그렸습니다.'],
        type: ['타이포 모션', '글자 자체가 움직이는 세 가지 방식.'],
        keyframe: ['키프레임 타입', '이징의 빠르기가 아니라 값을 이어 주는 방식 자체를 비교합니다.']
      },
      demos: [
        ['easing', '이징', 'Easing', "부드러운 가감속. 파란색 공은 출발과 도착이 부드럽고, 회색 공은 일정한 속도라 끝에서 갑자기 방향을 바꿉니다."], ['anticipation', '예비동작', 'Anticipation', "큰 동작 전 준비. 점프하기 전에 몸을 웅크리는 것처럼, 반대 방향의 작은 움직임이 큰 동작을 예고합니다."],
        ['squash', '스쿼시 앤 스트레치', 'Squash & Stretch', "눌리고 늘어나는 탄력. 떨어질 때 길어지고, 착지 순간 납작해지고, 튀어 오를 때 다시 길어지며 탄성을 표현합니다."], ['arc', '아크', 'Arc', "포물선 이동. 자연스러운 움직임은 직선이 아니라 곡선을 그립니다. 점선 원은 직선 이동과의 비교용입니다."],
        ['follow', '팔로스루', 'Follow-through', "끝부분이 늦게 따라옴. 본체가 멈춘 뒤에도 안테나·꼬리 같은 부속은 관성으로 더 휘둘리다 서서히 자리를 잡습니다."], ['overlap', '오버랩', 'Overlap', "부위별 시간차. 연결된 마디들이 같은 스윙을 조금씩 늦게 이어받아, 동작이 겹치며 물결처럼 전달됩니다."],
        ['stagger', '스태거', 'Stagger', "순차 등장. 여러 요소가 동시에가 아니라 차례대로 나타나 리듬감을 만듭니다."], ['match', '매치컷', 'Match Cut', "형태를 이어서 전환. 달이 농구공으로 컷되어도 원의 위치·크기·회전이 그대로 이어져 장면이 자연스럽게 넘어갑니다."],
        ['parallax', '패럴랙스', 'Parallax', "거리별 속도차. 멀리 있는 산은 느리게, 가까운 나무는 빠르게 움직여 깊이감을 표현합니다."], ['reveal', '마스크 리빌', 'Mask Reveal', "가려졌다 등장. 마스크(가림막)가 글자 위를 지나가며 텍스트를 드러내고, 같은 방향으로 다시 지웁니다."]
      ].map(([key, name, english, description]) => toDemo([key, name, english, description, 'basic'])).concat([
        ["loop", "루프 모션", "Loop Motion", "끝 상태가 시작 상태와 같아 이음매 없이 반복되는 모션. 점의 크기 변화와 회전이 4초에 정확히 한 바퀴 돌아 처음 모습으로 돌아옵니다.", "ai",
          "@lottie.files", IG + "p/Dd6W2-Rj6Gn/"],
        ["morph", "프롬프트 모핑", "Prompt Morph", "프롬프트의 단어가 바뀔 때마다 도형이 다음 모양으로 변형됩니다. 꼭짓점 수가 같은 폴리곤끼리 보간해 원, 사각형, 별이 이어집니다.", "ai",
          "@prompteafacil", IG + "reel/Dd443GhPkbg/"],
        ["particles", "파티클 플로우", "Particle Flow", "점들이 보이지 않는 물결 길을 따라 흐릅니다. 가로 이동은 일정하게, 세로 흔들림은 사인 곡선처럼 주어 세 갈래의 흐름을 만듭니다.", "ai",
          "@benkaluza.lab", IG + "reel/DdzuazdMxvU/"],
        ["curtain", "리빌 모션", "Reveal Motion", "네 장의 가림막이 시차를 두고 걷히며 장면을 드러냅니다. 가림막이 올라가는 동안 안쪽 그림은 크게 시작해 제 크기로 안착합니다.", "ai",
          "@getintoai", IG + "p/DdwRVCXmH1Q/"],
        ["gradient", "그라디언트 플로우", "Gradient Flow", "색의 띠가 면 안에서 천천히 흘러갑니다. 시작과 끝 색이 같은 그라디언트를 두 겹으로 겹치고 서로 다른 방향과 속도로 background-position을 움직입니다.", "ai",
          "@evolving.ai", IG + "p/DdwJgsNABze/"],
        ["texteffect", "텍스트 이펙트", "Text Effect", "윤곽선만 있던 글자가 왼쪽에서 오른쪽으로 채워진 뒤, 위아래 반쪽이 어긋나며 짧게 흔들리고 다시 지워집니다.", "ai",
          "@shhradddhaa.ai", IG + "reel/DdiN-ddoF6s/"],
        ["bouncetext", "바운스 텍스트", "Bounce Text", "글자가 위에서 떨어져 바닥에서 납작해졌다가 두 번 튀며 자리를 잡습니다. 글자마다 0.08초씩 늦게 떨어지고, 바닥 그림자가 높이에 맞춰 줄었다 커집니다.", "type",
          "@rupam.cinemotion", IG + "reel/DdzVbu_Sjph/"],
        ["type3d", "3D 타이프", "3D Type", "같은 글자를 깊이 방향으로 열한 장 겹쳐 두께를 만들고, 전체를 좌우로 천천히 돌립니다. 돌릴 때 측면의 층이 보여 입체감이 생깁니다.", "type",
          "@paulabaines", IG + "reel/Dcs6spVI75_/"],
        ["textstretch", "텍스트 스트레치", "Text Stretch", "글자가 바닥에 붙은 채 위로 길게 늘어났다 돌아옵니다. 늘어날 때 폭은 줄고 돌아올 때 살짝 눌려, 고무처럼 당겨지는 느낌을 줍니다. 물결은 글자 순서대로 이어집니다.", "type",
          "@mahla.artwork", IG + "reel/DdwXPBLsSFH/"],
        ["hold", "홀드·스텝", "Hold & Steps", "값이 중간을 거치지 않고 끊겨 바뀌는 보간 방식. hold는 키프레임마다 값이 머물다 점프하고, steps(6, end)는 구간 끝에서, steps(6, start)는 구간 시작에서 뜁니다.", "keyframe",
          "@saifsultan.ai", IG + "reel/DbyAhShTKjR/"],
        ["bezier", "커스텀 베지어", "Cubic-bezier · Back · Bounce", "제어점 값을 1 밖으로 보내면 도착점을 넘어갔다 돌아오는 back 효과가 생깁니다. 마지막은 cubic-bezier로 만들 수 없는 바운스를 linear() 정지점으로 그린 것입니다.", "keyframe",
          "@iamlazydesigner", IG + "reel/DdoRPWQyMQ2/"]
      ].map(toDemo))
    },
    {
      id: 'EXP-002', slug: 'exp-002', title: '카메라 움직임', category: '카메라', unit: '데모',
      description: "팬부터 오빗까지, 8개의 카메라 움직임 실험",
      sources: [{ platform: 'Threads', account: '@juuouse', url: 'https://www.threads.net/@juuouse' }],
      provenance: '제작 Claude Sonnet 5.5 · 2026-10-01',
      demos: [
        ['pan', '팬', 'Pan', "카메라 위치는 그대로 두고 몸통만 좌우로 돌립니다. 화면 속 장면이 옆으로 훑고 지나갑니다."], ['tilt', '틸트', 'Tilt', "제자리에서 고개를 들거나 숙이듯 위아래로 돌립니다. 높은 건물이나 제품의 아래위를 훑을 때 씁니다."], ['roll', '롤', 'Roll', "렌즈가 향한 방향은 그대로 두고 카메라를 기울입니다. 수평선이 비스듬해져 불안하거나 긴장된 느낌을 줍니다."],
        ['truck', '트럭', 'Truck', "카메라 몸체가 옆으로 평행 이동합니다. 가까운 물체는 빨리, 먼 물체는 느리게 스쳐 가 깊이가 생깁니다."], ['pedestal', '페데스탈', 'Pedestal', "카메라를 수직으로 올리거나 내립니다. 렌즈 각도는 그대로 두고 높이만 바뀌므로 고개를 드는 틸트와 구분됩니다."],
        ['dolly', '달리', 'Dolly', "카메라 몸체가 대상 쪽으로 다가가거나 멀어집니다. 앞뒤 사물의 크기 비율이 바뀌어 원근감이 함께 달라집니다."], ['zoom', '줌', 'Zoom', "카메라는 제자리에 둔 채 렌즈 초점거리만 바꿔 대상을 당겨 옵니다. 배경과 대상 사이의 거리감은 그대로입니다."], ['orbit', '오빗', 'Orbit', "대상을 중심에 두고 그 둘레를 돕니다. 대상은 제자리에 있고 보이는 면과 배경이 함께 바뀝니다."]
      ].map(([key, name, english, description]) => toDemo([key, name, english, description]))
    },
    {
      id: 'EXP-003', slug: 'exp-003', title: '웹 디자인 패턴', category: '웹 디자인', unit: '패턴', interactive: true,
      description: "탭, 드롭다운, 모달, 폼 검증까지 직접 눌러 보며 동작을 확인하는 13개의 웹 UI 패턴",
      sources: [],
      provenance: '제작 Claude Sonnet 5.5 · 2026-10-01',
      sourceNote: '출처가 있는 패턴에만 카드마다 표기합니다.',
      groups: {
        nav: ['탐색·이동', '화면 안에서 위치를 바꾸고 이동하는 다섯 가지 패턴.'],
        content: ['콘텐츠 펼침·전환', '같은 자리에서 내용을 펼치고 넘기고 걸러 내는 세 가지 패턴.'],
        feedback: ['오버레이·입력·피드백', '위에 겹쳐 뜨거나, 입력을 받고, 결과를 알려 주는 다섯 가지 패턴.']
      },
      demos: [
        toDemo(['tabs', '탭', 'Tabs', "탭을 누르면 아래 패널이 바뀝니다. 방향키와 Home·End로도 옮길 수 있고, 선택된 탭 하나만 Tab 키 순서에 들어갑니다.", 'nav', '@dotsystemsdevs', IG + 'p/DdRvGhlgvME/']),
        toDemo(['dropdown', '드롭다운', 'Dropdown', "버튼을 누르면 메뉴가 열리고, 항목을 고르면 아래 목록이 그 기준으로 정렬됩니다. 방향키로 이동하고 Esc나 바깥 클릭으로 닫습니다.", 'nav']),
        toDemo(['pagination', '페이지네이션', 'Pagination', "이전·다음 버튼과 번호로 스무 개 목록을 다섯 개씩 넘겨 봅니다. 첫 쪽과 끝 쪽에서는 해당 버튼이 꺼지고 현재 쪽은 aria-current로 표시됩니다.", 'nav']),
        toDemo(['sticky', '스티키 헤더', 'Sticky Header', "안쪽을 스크롤하면 헤더가 위에 붙으며 낮아지고, 지금 보는 구간의 링크가 강조됩니다. 링크를 누르면 그 구간으로 이동합니다.", 'nav', '@arman._.uiux', IG + 'p/DdySvZ4m8Zh/']),
        toDemo(['scrollpath', '스크롤 경로', 'Scroll Path', "스크롤한 만큼 점선 경로 위로 굵은 선이 그려지고, 지나간 지점이 차례로 채워집니다. 스크롤 진행률을 stroke-dashoffset에 그대로 연결했습니다.", 'nav', '@janm_ux', IG + 'reel/Dd4B9zdOiRU/']),
        toDemo(['accordion', '아코디언', 'Accordion', "제목을 누르면 내용이 펼쳐지고 다시 누르면 접힙니다. '하나만 열기'를 켜면 새 항목을 열 때 나머지가 자동으로 닫힙니다.", 'content']),
        toDemo(['carousel', '캐러셀', 'Carousel', "이전·다음 버튼, 점, 방향키, 좌우 스와이프로 후기를 넘깁니다. 자동 재생은 직접 켜고 끌 수 있고 마우스를 올리면 멈춥니다.", 'content', '@dotsystemsdevs', IG + 'p/DdRvGhlgvME/']),
        toDemo(['filter', '검색·필터', 'Search & Filter', "글자를 입력하거나 분류 칩을 누르면 목록이 바로 걸러지고 결과 개수가 갱신됩니다. 결과가 없으면 안내 문구를 보여 줍니다.", 'content', '@orbix_marketing', IG + 'p/DduRMxvGYVr/']),
        toDemo(['modal', '모달', 'Modal', "삭제 버튼을 누르면 확인 창이 뜨고 뒤쪽 화면은 조작할 수 없습니다. Tab은 창 안에서만 돌고, Esc나 바깥 클릭으로 닫으면 포커스가 버튼으로 돌아옵니다.", 'feedback']),
        toDemo(['tooltip', '툴팁', 'Tooltip', "마우스를 올리거나 키보드로 포커스하면 짧은 설명이 뜹니다. 아이콘만 있는 버튼의 의미를 알려 주며 Esc로 닫을 수 있습니다.", 'feedback']),
        toDemo(['toast', '토스트', 'Toast', "버튼을 누르면 화면 아래에 알림이 쌓이고 몇 초 뒤 사라집니다. 마우스를 올리면 타이머가 멈추고 ✕로 바로 닫을 수 있으며 최대 세 개만 보입니다.", 'feedback']),
        toDemo(['toggle', '토글 스위치', 'Toggle Switch', "스위치를 켜고 끄면 옆 미리보기가 바로 바뀝니다. role=switch와 aria-checked로 상태를 전달하고 Space·Enter로도 조작합니다.", 'feedback']),
        toDemo(['form', '폼 검증', 'Form Validation', "입력칸을 벗어나면 이메일 형식과 비밀번호 규칙을 검사해 오류를 알려 주고, 제출하면 첫 오류 칸으로 포커스를 옮깁니다. 모두 맞으면 완료 화면으로 바뀝니다.", 'feedback'])
      ]
    },
    {
      // A gallery, not a pattern library: the page is static HTML (experiments/exp-004/index.html) and each demo is a full site at
      // experiments/exp-004/sites/<key>/ that is entered by clicking its card. New sites: add a row here, a card there, and a folder under sites/.
      id: 'EXP-004', slug: 'exp-004', title: '웹사이트 갤러리', category: '웹사이트', unit: '사이트',
      description: "목록에서 고르면 전체 화면으로 들어가 직접 둘러보는, 실제 웹사이트를 재현한 데모 갤러리",
      sources: [],
      provenance: '제작 Claude Sonnet 5.5 · 2026-10-01',
      sourceNote: '사이트마다 원본 출처를 카드와 사이트 안에 표기합니다.',
      demos: [
        toDemo(['ordi', 'ORDI', 'Focus Your Time', "굵은 타이포와 겹쳐 쌓은 레이어가 돋보이는 생산성 서비스 사이트. 작동하는 집중 타이머, 모바일 메뉴, 요금제 전환, FAQ 아코디언, 스크롤 리빌까지 실제 사이트처럼 둘러볼 수 있습니다.", '', '@arman._.uiux', IG + 'p/DdySvZ4m8Zh/'])
      ]
    }
  ]
};
})();
