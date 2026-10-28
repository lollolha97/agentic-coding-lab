# 10-rapier · Rapier

WASM 물리 엔진으로 공·상자 90개의 낙하·경사면 충돌을 계산하고 Three.js로 표시

- 라이브러리 버전: @dimforge/rapier3d-compat 0.21.0, three 0.186.1
- 참고(공식 저장소): https://github.com/dimforge/rapier.js
- 주 결과물: `index.html` · 스크린샷: `screenshot.png`

## 실행
```bash
cd /workspace/studio/x20-demos && python3 -m http.server 8765
# 브라우저: http://127.0.0.1:8765/10-rapier/index.html
# 다시 빌드: 빌드: npx esbuild src/main.js --bundle --minify --format=esm --outfile=dist/main.js
```

## 메모
compat 빌드라 WASM이 JS에 내장(base64) → 별도 .wasm 요청 없음. dist/main.js ≈4.9MB.

## 검증 (2026-10-28)
- 헤드리스 Chromium(SwiftShader WebGL)에서 로드, 콘솔 오류 0건, 실패 요청 0건, 3.0초와 3.7초 화면 해시가 다름(애니메이션 동작) → check.json
- 미확인: 손으로 하는 조작, 다른 브라우저(Safari/Firefox), 사용자 기기, 실제 GPU 성능(헤드리스는 SwiftShader라 성능 대표성 없음)
