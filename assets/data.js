/* Add an object to experiments to publish another channel. Paths are site-relative. */
window.LAB = {
  copyPending: false,
  title: 'Agentic Coding Lab',
  intro: "a public catalog/archive of small web experiments. Each experiment re-implements a motion/design demo found on Instagram/Threads using agentic coding, recording method + result.",
  experiments: [
    {
      id: 'EXP-001', slug: 'exp-001', title: '모션 용어', category: '모션',
      description: "EXP-001: motion terms (10)", source: '@glitter_ai_factory',
      sourceUrl: 'https://www.threads.net/@glitter_ai_factory',
      demos: [
        ['easing', '이징', 'Easing', "부드러운 가감속. 주황색 공은 출발과 도착이 부드럽고, 회색 공은 일정한 속도라 끝에서 갑자기 방향을 바꿉니다."], ['anticipation', '예비동작', 'Anticipation', "큰 동작 전 준비. 점프하기 전에 몸을 웅크리는 것처럼, 반대 방향의 작은 움직임이 큰 동작을 예고합니다."],
        ['squash', '스쿼시 앤 스트레치', 'Squash & Stretch', "눌리고 늘어나는 탄력. 떨어질 때 길어지고, 착지 순간 납작해지고, 튀어 오를 때 다시 길어지며 탄성을 표현합니다."], ['arc', '아크', 'Arc', "포물선 이동. 자연스러운 움직임은 직선이 아니라 곡선을 그립니다. 점선 원은 직선 이동과의 비교용입니다."],
        ['follow', '팔로스루', 'Follow-through', "끝부분이 늦게 따라옴. 본체가 멈춘 뒤에도 안테나·꼬리 같은 부속은 관성으로 더 휘둘리다 서서히 자리를 잡습니다."], ['overlap', '오버랩', 'Overlap', "부위별 시간차. 연결된 마디들이 같은 스윙을 조금씩 늦게 이어받아, 동작이 겹치며 물결처럼 전달됩니다."],
        ['stagger', '스태거', 'Stagger', "순차 등장. 여러 요소가 동시에가 아니라 차례대로 나타나 리듬감을 만듭니다."], ['match', '매치컷', 'Match Cut', "형태를 이어서 전환. 달이 농구공으로 컷되어도 원의 위치·크기·회전이 그대로 이어져 장면이 자연스럽게 넘어갑니다."],
        ['parallax', '패럴랙스', 'Parallax', "거리별 속도차. 멀리 있는 산은 느리게, 가까운 나무는 빠르게 움직여 깊이감을 표현합니다."], ['reveal', '마스크 리빌', 'Mask Reveal', "가려졌다 등장. 마스크(가림막)가 글자 위를 지나가며 텍스트를 드러내고, 같은 방향으로 다시 지웁니다."]
      ].map(([key, name, english, description]) => ({ key, name, english, description }))
    },
    {
      id: 'EXP-002', slug: 'exp-002', title: '카메라 움직임', category: '카메라',
      description: "EXP-002: camera moves (8)", source: '@juuouse', sourceUrl: 'https://www.threads.net/@juuouse',
      demos: [
        ['pan', '팬', 'Pan', "카메라 위치는 그대로 두고 몸통만 좌우로 돌립니다. 화면 속 장면이 옆으로 훑고 지나갑니다."], ['tilt', '틸트', 'Tilt', "제자리에서 고개를 들거나 숙이듯 위아래로 돌립니다. 높은 건물이나 제품의 아래위를 훑을 때 씁니다."], ['roll', '롤', 'Roll', "렌즈가 향한 방향은 그대로 두고 카메라를 기울입니다. 수평선이 비스듬해져 불안하거나 긴장된 느낌을 줍니다."],
        ['truck', '트럭', 'Truck', "카메라 몸체가 옆으로 평행 이동합니다. 가까운 물체는 빨리, 먼 물체는 느리게 스쳐 가 깊이가 생깁니다."], ['pedestal', '페데스탈', 'Pedestal', "카메라를 수직으로 올리거나 내립니다. 렌즈 각도는 그대로 두고 높이만 바뀌므로 고개를 드는 틸트와 구분됩니다."],
        ['dolly', '달리', 'Dolly', "카메라 몸체가 대상 쪽으로 다가가거나 멀어집니다. 앞뒤 사물의 크기 비율이 바뀌어 원근감이 함께 달라집니다."], ['zoom', '줌', 'Zoom', "카메라는 제자리에 둔 채 렌즈 초점거리만 바꿔 대상을 당겨 옵니다. 배경과 대상 사이의 거리감은 그대로입니다."], ['orbit', '오빗', 'Orbit', "대상을 중심에 두고 그 둘레를 돕니다. 대상은 제자리에 있고 보이는 면과 배경이 함께 바뀝니다."]
      ].map(([key, name, english, description]) => ({ key, name, english, description }))
    }
  ]
};
