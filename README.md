# msng — 실시간 1:1 메신저

pmgoh.works 포트폴리오용 실시간 메신저 데모

---

## 세팅 순서

### 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 새 프로젝트 생성
3. **Authentication** → 시작하기 → Email/Password 사용 설정 ✓
4. **Realtime Database** → 데이터베이스 만들기 → 테스트 모드로 시작

### 2. 환경변수 설정

```bash
cp .env.local.example .env.local
```

Firebase Console → 프로젝트 설정 → 내 앱 → 웹 앱 추가 → 값 복사해서 `.env.local`에 붙여넣기

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 3. Firebase Database 보안 규칙 적용

Firebase Console → Realtime Database → 규칙 탭에 `firebase.rules.json` 내용 붙여넣기

### 4. 로컬 실행

```bash
npm install
npm run dev
```

### 5. Vercel 배포

```bash
# Vercel 환경변수에 .env.local 값들 동일하게 등록
vercel deploy
```

---

## 구조

```
pages/
  index.js          ← 로그인/회원가입
  lobby.js          ← 접속 중인 유저 목록
  chat/[roomId].js  ← 1:1 채팅방

lib/
  firebase.js       ← Firebase 초기화

styles/
  globals.css       ← 전역 스타일 (Copilot 다크 테마)
```

## Firebase 데이터 구조

```
users/
  {uid}/
    uid, username, online, createdAt

rooms/
  {uid1_uid2}/
    messages/
      {msgId}/
        sender, senderName, text, timestamp
```

## 메시지 보존 정책

당일(자정 기준) 메시지만 표시. 별도 삭제 없이 프론트에서 timestamp 필터링.
오래된 메시지 정리가 필요하면 Firebase Functions의 scheduled function 활용 권장.
