# 자동채점 시스템

교사가 시험을 관리하고, 학생이 QR코드로 접속하여 OMR 형식으로 답안을 제출하는 자동채점 시스템입니다.

## 기술 스택

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Firebase (Firestore, Auth, Hosting)
- **QR 생성**: qrcode.react
- **엑셀 내보내기**: xlsx

## 프로젝트 구조

```
자동 채점 시스템/
├── teacher-app/     # 교사용 앱
├── student-app/     # 학생용 앱
├── firebase.json    # Firebase 배포 설정
├── firestore.rules  # Firestore 보안 규칙
└── README.md
```

## 시작하기

### 1. Firebase 프로젝트 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication > Google 로그인 활성화
3. Firestore Database 생성
4. 프로젝트 설정 > 웹 앱 추가 > 구성값 복사

### 2. 환경변수 설정

각 앱 폴더에 `.env` 파일 생성:

```bash
# teacher-app/.env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_STUDENT_APP_URL=http://localhost:5174
```

```bash
# student-app/.env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. 개발 서버 실행

```bash
# 교사용 앱 (포트 5173)
cd teacher-app
npm install
npm run dev

# 학생용 앱 (포트 5174)
cd student-app
npm install
npm run dev -- --port 5174
```

### 4. Firebase 배포

```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 연결
firebase use your_project_id

# 빌드
cd teacher-app && npm run build
cd ../student-app && npm run build

# 배포
cd ..
firebase deploy
```

## 사용 방법

### 교사

1. Google 계정으로 로그인
2. 새 학급 생성 (학생 수 입력)
3. 시험 생성 (과목, 문항 수, 정답 입력)
4. QR 코드 인쇄하여 학생에게 배부
5. 실시간으로 성적 확인

### 학생

1. QR 코드 스캔 또는 6자리 코드 입력
2. 본인 번호 확인
3. 응시할 과목 선택
4. OMR 형식으로 답안 입력
5. 제출 완료

## 주요 기능

- ✅ 학급별 학생 코드 자동 생성
- ✅ QR 코드 대량 인쇄
- ✅ OMR 스타일 답안 입력
- ✅ 자동 채점
- ✅ 실시간 성적 조회
- ✅ 문항별 정오표/오답 분석
- ✅ 엑셀 내보내기
- ✅ 시간 제한 기능
- ✅ 중복 제출 방지

## 라이선스

MIT License
