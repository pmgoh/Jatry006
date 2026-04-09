# Jatry Desktop (Electron)

Vercel에 배포된 웹앱을 감싸는 Electron 앱.
업데이트는 Vercel push만 하면 자동 반영됨.

## 세팅

```bash
cd electron
npm install
```

## 개발 실행

```bash
npm start
```

## 아이콘 준비

빌드 전에 아이콘 파일 필요:
- `icon.png` — 512x512 이상 PNG (Mac/Linux용)
- `icon.ico` — Windows용 ICO 파일

PNG → ICO 변환: https://convertio.co/png-ico/

## Windows .exe 빌드

```bash
npm run build:win
```

`dist/` 폴더에 설치 파일 생성됨.

## 배포 URL 변경

`main.js` 상단의 `VERCEL_URL` 수정:
```js
const VERCEL_URL = 'https://jatry006.vercel.app'
```
→ 커스텀 도메인 연결 시 여기만 바꾸면 됨.

## 주의사항

- 코드 서명 없으면 Windows에서 "알 수 없는 게시자" 경고 뜸 → 설치는 가능
- 앱 닫아도 시스템 트레이에 남아있음 (트레이 → 종료로 완전 종료)
