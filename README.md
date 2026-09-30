# agentic-coding-lab

인스타그램/Threads에서 찾은 재밌어 보이는 Agentic Coding 데모·도구를
직접 실행하고 결과를 기록하는 실험실.

## 실험 목록

| 날짜 | 실험 | 출처 | 결과 |
|---|---|---|---|
| 2026-09-30 | [모션 용어 데모 사이트](experiments/2026-09-30-motion-terms-demo/) | Threads @glitter_ai_factory | ✅ 완성 |

## 구조

- `experiments/날짜-주제/` — 각 실험 폴더
  - `index.html` 등 실험 산출물
  - `README.md` — 출처 링크, 재현 방법, 결과, 한줄 평가
- `assets/lab.css` — 랜딩·실험 페이지가 공유하는 디자인 시스템(컬러/타이포/간격 토큰, 헤더·푸터·버튼·카드)
- `index.html` — 랜딩. 새 실험은 `experiments` 배열에 항목 하나만 추가하면 목록에 나타남
