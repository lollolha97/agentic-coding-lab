/* Library model: one category = one page (experiments/exp-00N/), and demos keep being added to that page.
   To publish a category, add an experiment here and list its demos. Paths are site-relative.
   - category: filter label on the landing; keep it in `categories` (order = filter order).
   - demos: [key, name, english, description, group, account, url]; account/url are the Instagram source of that demo
     (leave them out when the whole page shares the page-level `sources`).
   - groups: optional section headers on the experiment page, shown in demo order; also summarised on the landing card.
   - scenes: demos listed here are drawn by app.js. If a page registers scene HTML in window.LAB_SCENES[slug][key]
     (experiments/exp-00N/scenes.js) app.js uses it; `selfRendered` pages draw everything themselves and app.js leaves them alone. */
(() => {
const IG = 'https://www.instagram.com/';
const toDemo = ([key, name, english, description, group, account, url]) => ({ key, name, english, description, group, sources: account ? [{ account, url }] : [] });
const shared = (list, rows) => rows.map(([key, name, english, description, group]) => ({ key, name, english, description, group, sources: list.map(([account, url]) => ({ account, url })) }));
const TREND_SOURCES = [['@adobeexpress', IG + 'p/Dd6pUUdjkTZ/'], ['@uxbrainy', IG + 'p/DdORF23iBpe/']];
const REF_SOURCES = [['@orbix_marketing', IG + 'p/DduRMxvGYVr/'], ['@asmin_creates2', IG + 'p/DdtS0FFjAiy/']];
const DOTS_SOURCES = [['@dotsystemsdevs', IG + 'p/DdRvGhlgvME/']];

window.LAB = {
  copyPending: false,
  title: 'Agentic Coding Lab',
  intro: "소셜 미디어에서 발견한 모션, 카메라, 웹 디자인, AI 아이디어를 코드로 재현합니다.",
  credit: '제작 Claude Sonnet 5.5 · 2026-10-01',
  categories: ['모션', '카메라', '웹 디자인', 'AI'],
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
      id: 'EXP-003', slug: 'exp-003', title: '웹 디자인 패턴', category: '웹 디자인', unit: '데모',
      description: "랜딩 패턴 6종, 죽어가는 트렌드 6쌍, 디자인 레퍼런스 6장을 CSS로 재현한 웹 디자인 실험",
      sources: [],
      provenance: '제작 Claude Sonnet 5.5 · 2026-10-01',
      sourceNote: '출처는 카드마다 표기합니다.',
      groups: {
        landing: ['랜딩 패턴', '히어로부터 소셜 프루프까지, 랜딩 페이지를 이루는 여섯 구간.'],
        trend: ['죽어가는 트렌드 vs 대체재', '왼쪽이 사라지는 중인 표현, 오른쪽이 그 자리를 대신하는 표현입니다.'],
        ref: ['디자인 레퍼런스 디렉토리', '분류 구조만 재현한 카드입니다. 개별 사이트 링크는 출처 게시물에서 확인하세요.']
      },
      demos: [
        toDemo(['hero', '히어로', 'Hero', "내비게이션 아래에서 라벨, 두 줄 헤드라인, 설명, 버튼이 시간차를 두고 올라오고 오른쪽 제품 카드의 막대가 자랍니다. 첫 화면에서 읽는 순서대로 요소를 등장시키는 패턴입니다.", 'landing', '@arman._.uiux', IG + 'p/DdySvZ4m8Zh/']),
        toDemo(['path', '애니메이티드 패스', 'Animated Path', "점선 경로 위로 굵은 선이 그려지며 점이 네 지점을 차례로 지나가고, 지나간 지점은 채워집니다. 경로 길이를 100으로 맞춘 뒤 stroke-dashoffset만 움직여 그립니다.", 'landing', '@janm_ux', IG + 'reel/Dd4B9zdOiRU/'])
      ].concat(shared(DOTS_SOURCES, [
        ['marquee', '로고 마퀴', 'Logo Marquee', "가상 브랜드 로고 두 줄이 서로 반대 방향으로 끊기지 않고 흐르며 양끝은 옅어집니다. 같은 묶음을 두 번 이어 붙이고 절반 거리만 이동해 이음매를 숨깁니다.", 'landing'],
        ['feature', '기능 카드', 'Feature Cards', "세 장의 기능 카드가 차례로 올라온 뒤 한 장씩 위로 들리며 윤곽과 아이콘이 진해집니다. 카드마다 아이콘, 제목, 두 줄 설명으로 같은 틀을 반복합니다.", 'landing'],
        ['cta', 'CTA 버튼', 'Call to Action', "어두운 띠 위에서 커서가 버튼에 올라가면 화살표가 밀려나고, 잠시 벗어났다 돌아와 버튼을 누릅니다. 가장 중요한 행동 하나만 크게 두는 마무리 구간입니다.", 'landing'],
        ['proof', '소셜 프루프', 'Social Proof', "아바타 묶음과 별점 아래에서 후기 세 개가 차례로 바뀌고 아래 점이 현재 후기를 가리킵니다. 숫자와 실제 사람의 말로 신뢰를 보여 줍니다.", 'landing']
      ])).concat(shared(TREND_SOURCES, [
        ['trend-gradient', '그라디언트 vs 단색', 'Gradient vs Flat', "그라디언트 배경과 알약 버튼 대신, 단색 배경에 주황 밑줄 하나와 각진 버튼을 둔 예입니다. 포인트 색을 하나로 줄여 시선을 모읍니다.", 'trend'],
        ['trend-glass', '글래스모피즘 vs 불투명 서피스', 'Glassmorphism vs Solid', "뒤의 도형이 움직일 때 반투명 카드는 글자 뒤로 도형이 비치고, 불투명 카드는 1px 선으로 가려 글자가 또렷합니다.", 'trend'],
        ['trend-glow', '글로우 vs 선명한 윤곽', 'Glow vs Crisp Outline', "겹겹의 고리가 번지듯 맥동하는 버튼과, 또렷한 외곽선이 잠깐 벌어졌다 돌아오는 포커스 표시를 비교합니다.", 'trend'],
        ['trend-blob', '3D 블롭 vs 실제 화면', 'Blob vs Real UI', "떠다니는 추상 원 장식 대신, 지표 숫자와 막대 차트가 있는 실제 제품 화면을 보여 줍니다.", 'trend'],
        ['trend-card', '둥근 카드 vs 그리드', 'Rounded Cards vs Grid', "그림자가 있는 둥근 카드가 둥둥 뜨는 구성 대신, 가는 구분선이 차례로 그어지는 표로 정보를 정렬합니다.", 'trend'],
        ['trend-center', '중앙 정렬 vs 좌측 위계', 'Centered vs Left Hierarchy', "같은 크기의 가운데 줄과 색 점 불릿 대신, 제목·설명·링크를 왼쪽 기준선에 크기 순서대로 놓습니다.", 'trend']
      ])).concat(shared(REF_SOURCES, [
        ['ref-typography', '타이포그래피 레퍼런스', 'Typography reference', "큰 Aa, 한글 제목, 작은 설명 세 단계 글자 크기를 차례로 짚는 카드. 서체 고르기, 조합 사례, 자간·행간 점검으로 나뉩니다.", 'ref'],
        ['ref-color', '컬러 레퍼런스', 'Color reference', "높이가 다른 다섯 색 막대가 차례로 올라오는 카드. 팔레트 만들기, 명도 대비 검사, 다크 모드 대응으로 나뉩니다.", 'ref'],
        ['ref-motion', '모션 레퍼런스', 'Motion reference', "이징 곡선 위를 주황 점이 시간에 따라 오가는 카드. 이징 곡선, 전환 길이, 마이크로 인터랙션으로 나뉩니다.", 'ref'],
        ['ref-layout', '레이아웃 레퍼런스', 'Layout reference', "세 블록이 두 열에서 한 열로 바뀌었다 돌아오는 카드. 그리드 시스템, 간격 규칙, 반응형 흐름으로 나뉩니다.", 'ref'],
        ['ref-mockup', '목업 레퍼런스', 'Mockup reference', "브라우저 창 앞에서 휴대폰 프레임이 기울고 화면이 위로 스크롤되는 카드. 기기 프레임, 배경 장면, 내보내기로 나뉩니다.", 'ref'],
        ['ref-inspire', '영감 레퍼런스', 'Inspiration reference', "높이가 다른 여섯 타일이 올라오고 한 타일에 북마크 표시가 달랑거리는 카드. 작업물 갤러리, 수상작 아카이브, 무드보드로 나뉩니다.", 'ref']
      ]))
    },
    {
      id: 'EXP-004', slug: 'exp-004', title: 'GPU 없이 AI 모델 테스트하기', category: 'AI', unit: '단계', selfRendered: true,
      description: "호스팅 추론으로 GPU 없이 AI 모델을 시험해 보는 5단계 인터랙티브 가이드",
      sources: [{ platform: 'Instagram', account: '@leninbuilds.ai', url: IG + 'reel/DdyS12HzJVj/' }, { platform: 'Instagram', account: '@that_ai_insider', url: IG + 'reel/Ddx6APdTOyk/' }],
      provenance: '제작 Claude Sonnet 5.5 · 2026-10-01',
      demos: [
        ["why", "호스팅된 모델에 묻기", "Hosted inference", "큰 모델은 GPU 없는 내 컴퓨터의 메모리에 올리기 어렵습니다. 모델이 이미 올라가 있는 서버에 요청만 보내고 답만 받으면 내 컴퓨터 사양과 상관없이 테스트할 수 있습니다."],
        ["browse", "카탈로그에서 모델 고르기", "Browse the catalog", "NVIDIA Build 같은 호스팅 카탈로그에는 용도별로 모델이 모여 있습니다. 용도로 좁히고 카드를 눌러 써 볼 모델 하나를 정합니다. 아래 카드는 설명용 가상 모델입니다."],
        ["try", "브라우저에서 프롬프트 시험", "Try in the playground", "코드를 쓰기 전에 웹 화면에서 프롬프트를 넣고 답을 확인합니다. 모델의 성격을 가볍게 가늠하는 단계입니다. 응답은 시연용 문장이며 실제 모델의 출력이 아닙니다."],
        ["call", "API 키로 코드에서 호출", "Call it from code", "마음에 들면 같은 모델을 코드에서 부릅니다. 키를 만들고, 환경변수에 두고, 예제에서 주소와 모델 이름을 가져와, 요청에 실어 보냅니다. 구체적인 주소와 문법은 모델 페이지 예제를 기준으로 하세요."],
        ["decide", "결과 보고 다음 길 정하기", "Decide what is next", "시험해 본 결과를 점검하고 호스팅으로 계속 갈지, 다른 모델로 돌아갈지, 직접 배포를 알아볼지 정합니다. 항목을 눌러 흐름이 어떻게 바뀌는지 보세요."]
      ].map(([key, name, english, description]) => toDemo([key, name, english, description]))
    }
  ]
};
})();
