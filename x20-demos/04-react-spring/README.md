# 04-react-spring · React Spring

useTrail·useSpring으로 튕기며 따라오는 스프링 물리 모션

- 라이브러리 버전: @react-spring/web 10.1.2, React 19.3.1
- 참고(공식 저장소): https://github.com/pmndrs/react-spring
- 주 결과물: `index.html` · 스크린샷: `screenshot.png`

## 실행
```bash
cd /workspace/studio/x20-demos && python3 -m http.server 8765
# 브라우저: http://127.0.0.1:8765/04-react-spring/index.html
# 다시 빌드: 빌드: npx esbuild src/main.jsx --bundle --minify --outfile=dist/main.js --define:process.env.NODE_ENV='"production"' --jsx=automatic
```

## 메모
dist/main.js가 정적 번들.

## 검증 (2026-10-28)
- 헤드리스 Chromium(SwiftShader WebGL)에서 로드, 콘솔 오류 0건, 실패 요청 0건, 3.0초와 3.7초 화면 해시가 다름(애니메이션 동작) → check.json
- 미확인: 손으로 하는 조작, 다른 브라우저(Safari/Firefox), 사용자 기기, 실제 GPU 성능(헤드리스는 SwiftShader라 성능 대표성 없음)
