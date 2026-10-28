# 02-hyperframes · HyperFrames

HTML+GSAP 타임라인을 프레임 단위로 캡처해 MP4로 렌더링

- 라이브러리 버전: hyperframes 0.8.210 (CLI), gsap 3.15.0 로컬 벤더
- 참고(공식 저장소): https://github.com/heygen-com/hyperframes
- 주 결과물: `hyperframes-demo.mp4` · 스크린샷: `screenshot.png`

## 실행
```bash
cd 02-hyperframes && npm i   # hyperframes, gsap, node@22(로컬)
export PATH=$PWD/node_modules/node/bin:$PWD/node_modules/.bin:$PATH
cd src && hyperframes lint . && hyperframes render -o ../hyperframes-demo.mp4 --no-browser-gpu -q delivery
```

## 메모
HyperFrames는 Node ≥22를 요구(시스템 Node 20.19.2에서 'HyperFrames requires Node.js >= 22' 오류) → 폴더 안에 npm 패키지 node@22(22.23.4)를 설치해 사용. 템플릿의 CDN gsap은 로컬 gsap.min.js로 교체. 1920x1080, 30fps, 6초. lint 0 errors. screenshot.png는 mp4의 3초 프레임.

## 검증 (2026-10-28)
- ffprobe: 1920x1080 h264, 6.0초, 180프레임 / ffmpeg 전체 디코드 오류 0건
- 미확인: 손으로 하는 조작, 다른 브라우저(Safari/Firefox), 사용자 기기, 실제 GPU 성능(헤드리스는 SwiftShader라 성능 대표성 없음)
