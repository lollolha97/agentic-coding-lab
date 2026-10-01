# 실험 01 — 모션 용어 데모 사이트

- **날짜:** 2026-09-30
- **출처:** Threads @glitter_ai_factory — "오퍼스 5.5로 모션 만들 때 용어 정리"
  (https://www.threads.com/@glitter_ai_factory/post/Dd5WG3AE0Bi)
- **상태:** ✅ 완성

## 주장 / 아이디어

Opus 5.5로 모션을 만들 때 알아야 할 용어 10개:
1. 이징 (Easing) — 부드러운 가감속
2. 예비동작 (Anticipation) — 큰 동작 전 준비
3. 스쿼시 앤 스트레치 (Squash & Stretch) — 눌리고 늘어나는 탄력
4. 아크 (Arc) — 포물선 이동
5. 팔로스루 (Follow-through) — 끝부분이 늦게 따라옴
6. 오버랩 (Overlap) — 부위별 시간차
7. 스태거 (Stagger) — 순차 등장
8. 매치컷 (Match Cut) — 형태 이어서 전환
9. 패럴랙스 (Parallax) — 거리별 속도차
10. 마스크 리빌 (Mask Reveal) — 가려졌다 등장

## 재현 방법

각 용어를 순수 CSS 애니메이션으로 시각화한 데모 페이지(`index.html`)를 제작.
외부 라이브러리·폰트 없이 동작하며(공통 스타일은 `../../assets/lab.css`), 각 카드에 "다시 보기" 버튼과
전체 일시정지 토글, `prefers-reduced-motion` 대응 포함. 모든 루프는 4초(8박), 이징은 `lab.css`의 공통 토큰을 사용한다.

## 결과

10개 용어 전부 데모 완성. `index.html`을 브라우저에서 열면 바로 확인 가능.

## 한줄 평가

용어만 읽을 때보다 애니메이션으로 보니 각 기법의 차이가 확실히 와닿음.
특히 이징(linear vs ease-in-out 비교)과 팔로스루(시간차 꼬리)가 직관적.
다음에 Opus 5.5로 모션 만들 때 이 페이지를 레퍼런스로 쓰면 됨.
