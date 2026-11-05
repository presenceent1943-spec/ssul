# 썰 (Ssul)

듣다가, 마음에 들면 구독하는 이야기 앱 — 시제품 (PRESENCE Entertainment)

## 설치형 웹앱 (지금 바로 설치)
`main`에 올리면 `site/` 폴더가 GitHub Pages로 자동 배포됩니다. 그 주소를 폰에서 열면:
- **안드로이드(크롬)**: 상단 "앱으로 설치" → 설치
- **아이폰(사파리)**: 공유 버튼 → 홈 화면에 추가

## 구성
| 경로 | 내용 |
|---|---|
| `src/` | 앱 소스 (React + esbuild). `node build.mjs` 로 빌드 |
| `site/` | 배포되는 결과물 — 단일 `index.html` + 매니페스트 + 서비스워커 + 아이콘 + Jua 글꼴 |
| `android/` | Capacitor 안드로이드 프로젝트 — Android Studio에서 열어 APK/AAB 빌드 |
| `ios/` | Capacitor iOS 프로젝트 — Mac의 Xcode에서 열어 빌드 (TestFlight·App Store) |
| `capacitor.config.json` | 앱 ID `com.presenceent.ssul`, 앱 이름 `썰` |

## 스토어용 빌드
```
npm install
npm run build          # site/ 갱신
npx cap sync           # site/ → android/, ios/ 로 복사
npx cap open android   # Android Studio
npx cap open ios       # Xcode (Mac 전용)
```
- 안드로이드: Android Studio → Build → Generate Signed Bundle (AAB) → Play Console 업로드
- iOS: Xcode → Product → Archive → TestFlight

## 현재 단계 (1단계 시제품)
- 모든 작품·창작자·수치는 시연용 샘플, 데이터는 기기(브라우저)에만 저장
- 음성은 기기 내장 TTS, 결제는 데모 — 스토어 심사 전에 로그인·서버 음성·인앱결제 연결 필요(2~3단계)

## 비밀 값
API 키·비밀번호는 코드에 넣지 않습니다.
