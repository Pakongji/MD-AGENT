# MD AI Agent — Cloudflare Pages frontend

기존 Next.js 서버와 화면을 공유하는 React + Vite SPA입니다. Next.js 서버는 기존대로 Lightsail에서 실행합니다. 서버 코드, DB, API 주소, CORS, 도메인 설정은 이 추가 작업에서 바꾸지 않았습니다.

## Cloudflare Pages에 입력할 값

| 항목 | 값 |
| --- | --- |
| GitHub repository | `Pakongji/MD-AGENT` |
| Production branch | `main` |
| Framework preset | `Vite` |
| Root directory | `frontend` |
| Build command | `pnpm build` |
| Build output directory | `dist` |
| Build environment variable | `NODE_VERSION=24`, `PNPM_VERSION=11.25.0` |

저장소 전체 checkout이 필요합니다. 상위 `features`, `components`, `lib`와 CSS를 재사용합니다. `frontend` 폴더만 별도 저장소로 복사하지 마세요. 독립 `pnpm-lock.yaml`과 workspace 파일을 두어 Pages 설치 시 서버의 Prisma postinstall이나 DB 연결을 요구하지 않습니다.

빌드 결과: `frontend/dist/index.html`, `assets/`, Pages API 프록시 `_worker.js`, `_routes.json`, 공용 Figma 플러그인 파일. `404.html`을 만들지 않으므로 Pages 기본 SPA fallback으로 `/tasks` 같은 직접 주소도 열립니다. API 경로만 Function을 실행합니다.

## 먼저 화면 배포, 이후 백엔드 연결

아직 `BACKEND_ORIGIN`이 없어도 화면 빌드/배포는 됩니다. `/login`에 백엔드 연결 대기 메시지가 표시되며, **실제 로그인과 데이터 조회는 아래 연결이 완료돼야 작동합니다**. 모의 데이터로 로그인 성공을 가장하지 않습니다.

1. GitHub `main`에서 위 값으로 Pages를 배포합니다. 성공 화면의 실제 `https://....pages.dev` 주소를 기록합니다.
2. Lightsail API를 유효한 인증서가 있는 HTTPS origin으로 공개합니다. `http://IP:3000`은 로그인 비밀번호/쿠키를 서버 사이에서 평문 전송하므로 프록시에서 거부합니다. 이 저장소 변경은 Lightsail의 네트워크나 TLS 설정을 대신 수행하지 않습니다.
3. Pages 프로젝트 Settings → Variables and Secrets에서 **런타임 변수** `BACKEND_ORIGIN`을 등록합니다. 값은 실제 HTTPS 백엔드 origin만 넣습니다. 경로(`/api`), 사용자명·비밀번호, 쿼리 문자열은 넣지 않습니다. 다시 배포해 반영합니다.
4. 기존 서버의 `AUTH_TRUST_HOST=true`를 확인합니다. `AUTH_URL`을 지정한다면 공개 Pages 주소로 맞춰야 합니다. 서버 앞의 Nginx 등도 프록시의 신뢰 가능한 `X-Forwarded-Host`/`X-Forwarded-Proto`를 보존하도록 확인해야 합니다. 이 작업에서는 서버 `.env`를 수정하지 않았습니다.
5. `https://실제Pages주소/api/health` → `{"status":"ok"}` 확인 후 로그인, 회원가입, 새로고침, 로그아웃, Excel 다운로드를 확인합니다.

브라우저는 `/api/*`를 같은 Pages 주소로 요청하고 Pages Function이 서버로 전달합니다. 브라우저에서 백엔드로 직접 교차 출처 요청을 하지 않으므로 CORS를 광범위하게 여는 설정은 필요 없습니다. 인증과 업무 권한 검증은 기존 Lightsail API가 계속 담당합니다. 프론트의 로그인 화면 전환은 서버 접근 제어를 대체하지 않습니다.

운영 Pages 주소와 Preview 주소를 혼용하지 마세요. 인증 대표 주소를 고정한 경우 Preview의 실제 로그인을 위해서는 별도 테스트 백엔드/설정이 필요합니다.

## 환경변수와 비밀값

| 위치 | 이름 | 용도 |
| --- | --- | --- |
| Pages 빌드 | `NODE_VERSION`, `PNPM_VERSION` | 빌드 도구 버전 |
| Pages 런타임 | `BACKEND_ORIGIN` | 기존 서버의 HTTPS origin |
| 로컬 frontend/.env | `DEV_BACKEND_ORIGIN` | 로컬 Vite 개발·미리보기 프록시, 기본 `http://127.0.0.1:3000` |
| Lightsail 서버만 | `DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`, `OPENAI_PROMOTION_MODEL`, `AI_PROVIDER`, `AUTH_TRUST_HOST`, 선택 `AUTH_URL` | 기존 DB·인증·AI 설정 |

서버 `.env`를 frontend나 Pages에 복사하지 마세요. `VITE_` 접두사의 값은 브라우저에 공개되므로 비밀키를 넣으면 안 됩니다. 이 프론트엔드는 브라우저에 넣을 API 주소나 비밀 환경변수가 필요 없습니다.

## 로컬 실행 및 검증

Node.js 24, pnpm 11.25.0을 사용합니다. 프로젝트 루트에서:

```sh
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

별도 터미널에서 기존 Next.js를 `pnpm dev`로 실행하면 Vite의 `/api`가 localhost:3000으로 프록시됩니다. 다른 로컬 서버 주소가 필요할 때만 `frontend/.env.example`을 `frontend/.env`로 복사해 수정하세요.

```sh
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:browser
```

브라우저 테스트는 모의 API로 로그인 프로토콜, 전체 화면 이동과 딥링크, 탭 새로고침, 연결 오류 표시를 검증합니다. 실제 배포된 Lightsail 로그인 연결 검증은 위 5번에서 따로 수행합니다.

기존 Next.js 서버는 프로젝트 루트의 `pnpm build` / `pnpm start`를 그대로 사용합니다. GitHub 반영만으로 Lightsail 코드가 자동 갱신되지는 않습니다.
