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

## AI 대본 작가 서버 (Cloudflare Worker)
`worker/tidy-worker.js` 를 Cloudflare Worker로 올리고, 앱의 **내 정보 → 관리자 화면 → 운영 설정 → AI 대본 작가 서버 주소**에 Worker 주소를 넣으면
"대본 정리하기"가 막 말한 이야기를 흐름·의도를 읽어 숏츠·드라마 대본(훅 → 전개 → 반전)으로 다시 씁니다.
스타일: 숏츠 대본 / 라디오 사연 / 담백 정리. 욕·거친 표현: 살려서 세게 / 순화 / 빼기. 제목·소개·카테고리·태그도 함께 제안합니다.
1. https://dash.cloudflare.com → Workers & Pages → Create → Hello World → 이름 `ssul-tidy` → Deploy
2. Edit code → 내용을 `worker/tidy-worker.js` 로 교체 → Deploy
3. Settings → Variables and Secrets → `ANTHROPIC_API_KEY` (Secret, https://console.anthropic.com 에서 발급)
4. Worker 주소(`https://ssul-tidy.xxxx.workers.dev`)를 앱 운영 설정에 입력 (기본값으로 넣으려면 `src/store.jsx` 의 `tidyUrl`)
서버 주소가 비어 있으면 기본 정리(문장 끊기·군더더기 제거)만 합니다.

## 음성 생성 서버 (Cloudflare Worker, 사람 목소리)
`worker/tts-worker.js` 를 Worker로 올리고 **관리자 화면 → 운영 설정 → 음성 생성 서버 주소**에 넣으면, 게시할 때 문장마다
화자(20·30·50·70대 여성/남성, 아이, 속삭임)와 등장인물별 신경망 음성으로 실제 음성 파일을 만들어 기기에 저장합니다.
1. Azure Portal → "Speech" 리소스 생성(지역 koreacentral, F0 무료 등급) → Keys and Endpoint 에서 키 복사
2. Cloudflare Workers → Create → 이름 `ssul-tts` → 코드를 `worker/tts-worker.js` 로 교체 → Deploy
3. Settings → Variables and Secrets → `AZURE_SPEECH_KEY`(Secret), `AZURE_REGION`=koreacentral
4. Worker 주소를 앱 운영 설정에 입력 (기본값으로 넣으려면 `src/store.jsx` 의 `ttsUrl`)
샘플 20편은 Higgsfield Seed Audio로 미리 만든 음성 파일(`site/audio/`)을 재생합니다. (`scripts/tts-manifest.mjs` → `scripts/tts/assemble.py`)

## 대화형 대본 (등장인물별 목소리)
대본에서 줄 앞에 `이름:` 을 붙이면 그 줄은 그 사람 목소리로 읽습니다. 이름 없는 줄은 화자(나).
```
월요일 아침, 부장님이 카드를 내밀었어요.
부장님: 아메리카노 다섯, 라떼 둘. 내 건 알아서.
알아서가 뭐예요, 알아서가.
```
만들기 → 대본 단계에서 등장인물마다 목소리를 고르고(들어보기), AI 작가에 "등장인물 대화로 만들기"를 켜면 상대방 말을 자동으로 나눠 씁니다.

## 현재 단계 (1단계 시제품)
- 모든 작품·창작자·수치는 시연용 샘플, 데이터는 기기(브라우저)에만 저장
- 샘플은 생성된 사람 목소리 파일, 새 작품은 음성 생성 서버 연결 전까지 기기 내장 TTS. 결제는 데모 — 스토어 심사 전에 로그인·인앱결제 연결 필요(2~3단계)

## 비밀 값
API 키·비밀번호는 코드에 넣지 않습니다.
