# 03-animejs · Anime.js

createTimeline과 stagger(grid)로 96개 타일이 파도처럼 움직이는 타임라인

- 라이브러리 버전: animejs 4.5.0
- 참고(공식 저장소): https://github.com/juliangarnier/anime
- 주 결과물: `index.html` · 스크린샷: `screenshot.png`

## 실행
```bash
cd /workspace/studio/x20-demos && python3 -m http.server 8765
# 브라우저: http://127.0.0.1:8765/03-animejs/index.html
```

## 메모
anime.umd.min.js 로컬 벤더.

## 검증 (2026-10-28)
- 헤드리스 Chromium(SwiftShader WebGL)에서 로드, 콘솔 오류 0건, 실패 요청 0건, 3.0초와 3.7초 화면 해시가 다름(애니메이션 동작) → check.json
- 미확인: 손으로 하는 조작, 다른 브라우저(Safari/Firefox), 사용자 기기, 실제 GPU 성능(헤드리스는 SwiftShader라 성능 대표성 없음)
