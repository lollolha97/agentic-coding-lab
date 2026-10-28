# 01-remotion · Remotion

React 컴포넌트를 프레임 단위로 렌더링해 MP4로 만드는 영상

- 라이브러리 버전: remotion 4.0.539 (@remotion/cli 동일), React 19
- 참고(공식 저장소): https://github.com/remotion-dev/remotion
- 주 결과물: `remotion-demo.mp4` · 스크린샷: `screenshot.png`

## 실행
```bash
cd 01-remotion && npm i && npx remotion render src/index.ts Demo remotion-demo.mp4 --browser-executable=<chrome-headless-shell 경로> --gl=swiftshader
# 미리보기: npx remotion studio src/index.ts
```

## 메모
1920x1080, 30fps, 6초(180프레임). useCurrentFrame·spring·interpolate·Sequence 사용. screenshot.png는 렌더된 mp4의 3초 프레임(Chromium 렌더 결과)을 ffmpeg로 추출.

## 검증 (2026-10-28)
- ffprobe: 1920x1080 h264, 6.0초, 180프레임 / ffmpeg 전체 디코드 오류 0건
- 미확인: 손으로 하는 조작, 다른 브라우저(Safari/Firefox), 사용자 기기, 실제 GPU 성능(헤드리스는 SwiftShader라 성능 대표성 없음)
