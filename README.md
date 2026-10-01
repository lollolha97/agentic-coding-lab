# agentic-coding-lab

인스타그램/Threads에서 찾은 재밌어 보이는 Agentic Coding 데모·도구를
직접 실행하고 결과를 기록하는 실험실.

## 실험 목록

| 날짜 | 실험 | 출처 | 결과 |
|---|---|---|---|
| 2026-10-01 | [카메라 무브 용어 데모 사이트](experiments/2026-10-01-camera-terms-demo/) | Threads @juuouse | ✅ 완성 |
| 2026-09-30 | [모션 용어 데모 사이트](experiments/2026-09-30-motion-terms-demo/) | Threads @glitter_ai_factory | ✅ 완성 |

## 구조

- `experiments/날짜-주제/` — 각 실험 폴더
  - `index.html` 등 실험 산출물
  - `README.md` — 출처 링크, 재현 방법, 결과, 한줄 평가
  - `thumb.png` — 실험 갤러리의 썸네일
- `assets/lab.css` — 랜딩·실험 페이지가 공유하는 디자인 시스템. Are.na 팔레트 토큰(라이트 기본, `prefers-color-scheme` 다크), 1px 헤어라인, Arial/시스템 산세리프, 모션 이징·타이밍 토큰
- `index.html` — 랜딩. 새 실험은 `experiments` 배열에 항목 하나만 추가하면 목록에 나타남
- `assets/mark.svg` — 블록 격자 로고(파비콘). 헤더의 인라인 SVG도 같은 형태
- `assets/og.png` — 공유용 이미지
- `scripts/render_thumbs.py` — Pillow로 두 실험의 `thumb.png`와 `assets/og.png` 생성 (`python3 scripts/render_thumbs.py`; Pillow, Liberation Sans, Noto Sans CJK 필요)

새 실험을 등록할 때 고정 번호(`EXP-002` 등), 날짜, 설명, 데모 경로, 썸네일 경로와 대체 텍스트,
출처 링크, 상태를 배열에 기록합니다. 목록은 날짜 기준 최신순으로 정렬되며, 번호는 바뀌지 않습니다.
