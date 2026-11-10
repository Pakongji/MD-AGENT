# MD AI Agent

Cloudflare Pages용 React 프론트엔드는 [`frontend/README.md`](frontend/README.md)를 참조하세요. 기존 Next.js 서버는 아래 실행 방법을 그대로 사용합니다.

매출·재고·시장·경쟁사 데이터를 **변화 → AI 해석 → 자사 영향 → MD 판단 → 실행**으로 연결하는 Beauty Commerce용 MD 업무 파트너 MVP입니다.

단순 BI 화면이 아니라 모든 핵심 신호를 실제 업무, 발주, 프로모션, 캘린더, 협업 요청, 성과 리포트와 지식 저장으로 연결합니다. API 키가 없어도 `MockAIProvider`로 전체 흐름이 동작합니다.

## 빠른 시작

### 요구 환경

- Node.js 20.9 이상
- pnpm 10 이상 권장

현재 설치된 환경은 Node.js 24.22.1, pnpm 11.25.0, Next.js 16.4.0, React 19.3.0, Prisma CLI/Client 6.19.0입니다. Prisma 6의 스키마 설정을 유지하며 `prisma.config.ts`는 사용하지 않습니다.

처음 연결할 때는 [Supabase 설정·테이블 생성·가입 및 저장 확인 안내](docs/supabase-setup.md)를 순서대로 따라 하세요.

### 설치 및 실행

```bash
pnpm install
```

프로젝트 루트(`package.json` 옆)에 `.env`가 없을 때만 `.env.example`을 복사합니다. 기존 파일을 덮어쓰지 마세요. `.env`의 `DATABASE_URL`을 Supabase **Session pooler(5432)** URI로 설정한 뒤 테이블을 준비합니다. 같은 연결을 앱과 migration이 사용하므로 `DIRECT_URL`은 필요하지 않습니다. `db:setup`은 환경변수·스키마 검사, Prisma Client 생성, 미적용 migration 적용과 상태 확인을 실행하며 데모 데이터는 넣지 않습니다. Windows 실행 정책 오류가 나면 `pnpm.cmd`를 사용하세요.

```bash
pnpm db:setup
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

### 계정 로그인 설정

로그인 페이지에서 이메일·비밀번호 계정을 만들 수 있습니다. 비밀번호는 scrypt로 해시해 저장하며, 로그인 계정은 업무 데이터와 별도 테이블에 보관됩니다.

프로덕션에서는 `AUTH_SECRET` 환경변수를 설정하세요. 충분히 무작위인 값을 생성하려면 다음 명령을 실행할 수 있습니다.

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

GitHub는 코드 저장소로 연결되어 있으며 앱의 업무 데이터 저장소는 Prisma DB입니다. 가입 계정은 기존처럼 공용 MD 워크스페이스의 업무 데이터와 AI 대화 기록을 함께 사용합니다. Supabase Auth로 변경하지 않았습니다.

macOS/Linux에서는 환경 파일 복사만 아래처럼 실행하면 됩니다.

```bash
test -f .env || cp .env.example .env
```

### 프로덕션 실행

```bash
pnpm build
pnpm start
```

### Docker 실행

```bash
docker build -t md-ai-agent .
docker run --rm -p 3000:3000 --env-file .env md-ai-agent
```

컨테이너 시작 시 적용되지 않은 Prisma migration만 실행합니다. Supabase 연결 정보가 없거나 올바르지 않으면 시작에 실패하며 SQLite로 대체하지 않습니다. 빈 DB에 데모 데이터를 자동 삽입하지 않습니다.

### Render 배포

루트의 `render.yaml`은 싱가포르 리전의 Docker Web Service를 정의합니다. Render의 `DATABASE_URL` 환경변수에 Supabase Session pooler URI를 직접 등록하세요. Git 원격 저장소를 Render Blueprint에 연결하면 커밋마다 자동 배포됩니다.

- Health check: `/api/health`
- AI Provider: `mock`
- `OPENAI_API_KEY`: Mock Mode에서는 빈 값으로 등록 가능

## 환경 변수

```env
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
AI_PROVIDER="mock"
OPENAI_API_KEY=""
AUTH_SECRET=""
```

- `DATABASE_URL`: Supabase Dashboard의 **Connect → Session pooler**에서 복사한 URI입니다. 예시의 프로젝트 ref, region, password를 실제 값으로 바꾸세요. 비밀번호에 특수문자가 있으면 URL 인코딩해야 합니다.
- `AI_PROVIDER`: 현재 구현된 값은 `mock`입니다.
- `OPENAI_API_KEY`: 향후 실제 Provider 연결용이며 Mock Mode에서는 비워둡니다.
- 실제 `.env`는 Git에서 제외됩니다. `.env.example`만 형식 안내용으로 커밋하세요.

연결 오류가 나면 `.env`가 프로젝트 루트에 있는지, 변수명이 `DATABASE_URL`인지, Supabase **Session pooler** URI의 host·사용자명·비밀번호·포트 `5432`·DB 이름 `postgres`가 맞는지 확인하세요. 비밀번호에 `@`, `:`, `/`, `#` 같은 문자가 있으면 URI 인코딩해야 합니다. Supabase 프로젝트 상태와 연결 허용 정책도 점검하세요. SQLite 형식(`file:...`) URL은 지원하지 않으며 자동 fallback도 없습니다.

## 구현된 사용자 흐름

1. **AI 홈**: 대화로 매출·업무·시장·경쟁사·재고를 조회 → 근거와 자사 영향 확인 → 발주·업무 완료·협업 요청·프로모션 단계 변경·리포트 생성 실행
2. **오늘의 업무**: 자유 문장 입력 → 목표와 마감 해석 → 선행/핵심/후속 업무 제안 → 선택 항목만 PostgreSQL에 저장
3. **시장/트렌드**: 립오일 신호 → 상세 검증 → 발주·소싱·프로모션 업무 생성
4. **재고/발주**: 권장 수량 수정 → 발주 확정 → `PurchaseOrder`, 입고 추적 `Task`, `CalendarEvent` 동시 생성
5. **경쟁사**: B사 할인 → 실구매가 비교 → 대응안 생성 → 오늘 업무 저장
6. **프로모션**: AI 추천 → 기획안 → Pipeline 단계 변경 → 캘린더 연결
7. **캘린더**: 일정 추가·완료, 시간 충돌 탐지, 일정 조정 업무 생성
8. **협업 요청**: 요청 목적·마감·산출물·요청 문구 생성, 복사, 상태 관리
9. **성과 분석**: AI 회고 리포트 생성 → `PerformanceReport`와 `KnowledgeDocument` 동시 저장
10. **지식 저장소**: 과거 문서 검색 → 근거 문서를 표시하는 AI 답변
11. **Global Copilot**: 다른 페이지에서도 같은 데이터와 실행 명령을 사용하는 결론·근거·자사 영향·Action 응답

모든 페이지의 변경 사항은 API를 거쳐 PostgreSQL에 저장되므로 새로고침 후에도 유지됩니다. Sidebar의 **데모 데이터 초기화**로 시드 상태를 복원할 수 있습니다.

### 상품 진단

매출 분석의 **상품 진단** 패널은 재고 커버일수·리드타임·안전재고를 비교하고 동일 카테고리 내 매출 순위와 비교 상품 마진율 중앙값을 표시합니다. 일반 발주·긴급 입고 가정·보류를 독립적으로 비교할 수 있으며, 긴급 납기는 직접 입력해야 합니다. 판매 속도와 납기가 일정하다는 단순 가정으로 계산하고 실제 취소·매출 손실로 해석하지 않습니다. 발주량을 늘려도 도착 전 공백은 줄어들지 않습니다.

**진단 근거로 결정 기록**을 누르면 선택한 가정과 비교 결과가 새 결정 초안의 `검토한 대안`에 첨부됩니다. 판단 근거는 사용자가 직접 작성하며 기존 확정 기록을 덮어쓰지 않습니다. 기존 결정 수량이 있으면 시뮬레이션 초깃값으로 사용합니다. 자료 조회 시각과 재고 자료 수정 시각은 실제 실사 시점과 구분합니다. 상품별 집계기간·일별 실적·채널별 전환 자료가 없으므로 상품별 추세·전환율·기여도를 임의 생성하지 않습니다.

상품 진단 계산 검증: `pnpm.cmd exec tsx --test scripts/product-diagnostics.test.ts`. 이 기능은 기존 상품·재고·업무·결정 자료를 사용하며 DB migration은 추가하지 않습니다.

### 업무 의사결정 기록

홈과 오늘의 업무에서 **검토하고 결정하기**를 누르면 공통 기록 창이 열립니다. 결정 내용과 판단 근거를 입력해 확정하면 업무·작성자·시점·검토 자료를 연결해 저장하고, 지식 저장소의 **의사결정 기록**에서 다시 조회할 수 있습니다. 필요한 업무만 의사결정 대상으로 지정하며 직접 추가·업무 수정 화면에서 바꿀 수 있습니다.

- **초안 저장**: 새로고침 후 이어서 작성할 수 있으며 업무를 완료하지 않습니다.
- **보류**: 재검토 일시를 지정하면 캘린더에 등록하고 업무는 진행중으로 유지합니다.
- **결정 변경**: 확정 기록을 덮어쓰지 않고 **새 결정 작성**으로 이력을 남깁니다.
- **발주**: 결정 확정과 발주 등록을 구분합니다. 확정된 상품·수량에 맞는 최신 결정만 발주할 수 있습니다.
- **기존 완료 업무**: 과거 결정을 임의 생성하지 않고 **결정 기록 없음**으로 표시합니다.

DB 변경은 기존 자료를 보존하는 `20261029052730_task_decisions` migration으로 적용합니다. `pnpm.cmd exec tsx --test scripts/decisions.test.ts scripts/db.test.ts`로 기본 검증을 실행할 수 있습니다.

## 페이지

2026-11 개편으로 메뉴를 MD 하루 흐름 기준 6개로 묶었습니다. 예전 주소(`/calendar`, `/inventory`, `/knowledge` 등)로 들어와도 해당 화면의 탭으로 자동 이동합니다.

| 메뉴 | 경로 | 탭 |
|---|---|---|
| 홈 | `/` | 오늘 결정할 3가지(재고·경쟁사·트렌드), 핵심 숫자, AI 업무 파트너(답하기 전 ‘이렇게 이해했어요’ 표시, 모르는 건 모른다고 답함) |
| 업무 | `/tasks` | 오늘 · 업무 계획/전체 목록 · 캘린더 · 협업 요청 · 업무일지 |
| 매출·재고 | `/sales` | 채널별 매출·재고 · 매출 상세/상품 진단 · 재고/발주/입고 · 상품/브랜드 |
| 시장·경쟁 | `/market` | 요약(영향 순 · 채널별 실구매가 · 대응안) · 트렌드 · 경쟁사 변화 |
| 프로모션 | `/promotions` | 새 기획(시장 조사 → 행사 개요 → 3안 비교 → 확정 → 일정·Figma) · 진행 중인 프로모션 |
| 기록 | `/records` | 결정 기록(2주 뒤 결과 기록) · 성과 리포트 · 지식 문서 |
| 데이터 연결 | `/data` | 데이터별 연결 방식 · 필요한 열 · 바뀌는 화면 안내, 엑셀 양식 받기 |

상단바에는 데이터 기준 시각(샘플 여부 포함), 담당 카테고리·채널 필터, `AI에게 묻기`(Ctrl+K)가 항상 보입니다. 카테고리·채널 선택은 브라우저에 저장됩니다.

### 샘플 데이터 표시 원칙

- 채널별 매출 비중, 채널별 경쟁사 실구매가는 아직 연결된 데이터가 없어 `lib/mock/samples.ts`의 샘플 값을 쓰고 화면에 ‘샘플’로 표시합니다.
- `CONNECTED_SOURCES`가 비어 있는 동안 상단바와 사이드바는 ‘샘플 데이터로 보는 중’으로 표시됩니다. 실제 연결을 붙이면 이 목록과 각 서비스 어댑터를 바꿉니다.
- 결정 결과는 지식 문서(`source: decision-result:<결정 ID>`)로 저장하므로 DB migration이 필요 없습니다.

### 프로모션 기획 흐름

1. **시장 조사**: 주제와 채널만 입력합니다(예산·목표는 외부로 보내지 않음).
2. **행사 개요**: 조사 결과를 근거로 AI가 주제·채널·기간·목표를 제안하고 칸마다 근거 번호를 붙입니다. 근거가 없는 칸은 비워 두고, 예산은 항상 직접 입력합니다.
3. **3안 비교**: 개요를 고쳤으면 이미 확인한 근거 안에서 3안을 다시 만듭니다(참고 모드는 규칙 기반, 웹 조사 모드는 추가 검색 없이 재생성).
4. **조합·확정 → 일정·Figma 시안**: 기존과 같습니다.

이전 방식으로 만든 기획안은 행사 개요가 확정된 것으로 보고 그대로 열립니다.

## 기술 구조

```text
app/
  api/
    ai/task-plan/       # AI 업무 계획 JSON API
    ai/copilot/         # 페이지/내부 데이터 기반 Copilot API
    bootstrap/          # 화면 초기 데이터 집계
    command/            # 상태 변경 Command API
  tasks/ ...            # App Router 페이지 12개
components/
  common/               # Card, Button, Modal, Badge, TaskRow 등
  layout/               # Sidebar, Topbar, Copilot, Notification
features/
  home/ tasks/ sales/ market/ competitors/
  inventory/ products/ promotions/ calendar/
  collaboration/ performance/ knowledge/
lib/
  ai/                   # Provider interface, system prompt, Mock provider
  db/                   # Prisma singleton, 데모 시드 함수
  mock/                 # Beauty Commerce 데모 데이터와 차트 데이터
  services/             # 서비스 계약과 화면 데이터 집계
  store/                # Zustand 비동기 상태
  types/                # TypeScript 도메인 타입
  validation/           # Zod Command 검증
prisma/
  schema.prisma         # PostgreSQL 데이터 모델
  migrations/           # 버전 관리되는 Prisma SQL migrations
  seed.ts               # Demo Seed 진입점
scripts/
  smoke.ps1             # 7개 완료 시나리오 통합 스모크 테스트
  seed-if-empty.ts       # 빈 프로덕션 DB만 Demo Seed
  start-production.sh   # 스키마 반영 후 Next.js 시작
Dockerfile              # 재현 가능한 프로덕션 이미지
render.yaml             # Render Web Service + 외부 Supabase DB
```

## 데이터 모델

`prisma/schema.prisma`에 다음 엔터티가 정의되어 있습니다.

- `Account`(로그인), `User`(업무), `Task`, `TaskGroup`
- `SalesMetric`, `Product`, `Brand`
- `Inventory`, `PurchaseOrder`
- `MarketKeyword`, `MarketTrend`, `Article`, `ArticleFeedback`
- `Competitor`, `CompetitorEvent`
- `Promotion`, `CalendarEvent`, `CollaborationRequest`
- `PerformanceReport`, `KnowledgeDocument`, `Insight`
- `Notification`, `AIConversation`

DB 테이블 준비는 저장소 루트에서 `pnpm db:setup` 한 번으로 실행합니다. Prisma는 `_prisma_migrations` 이력으로 적용한 migration을 기록하므로 이미 반영된 migration은 다시 실행하지 않습니다. 상태 확인은 `pnpm db:migrate:status`를 사용합니다. 이 프로젝트에는 Alembic이 없어서 Prisma Migrate를 사용합니다. 기존 SQLite 파일과 데이터는 변경하거나 이전하지 않습니다.

## Mock 데이터

`lib/mock/data.ts`에 컴포넌트와 분리해 관리합니다. 현재 데모 기준일은 2026-10-21이며, 화면 KPI는 아래 시드 데이터를 집계해 계산합니다.

- 최근 60일 매출·주문·방문자 데이터: 최근 30일과 직전 30일 비교
- 브랜드 6개, 상품 12개, 상품별 최근 30일 매출·판매량·마진
- 재고 12개: 재고일수·일평균 판매·리드타임·안전재고·발주 권장 수량
- 시장 키워드 7개, 시장 신호 4개, 추천 기사 4개
- 경쟁사 4개와 할인·가격·신상품·프로모션 변화 4개
- 프로모션 5개, 통합 일정 8개, 협업 요청 4개, 초기 업무 9개
- 성과 리포트 2개, 근거가 표시되는 지식 문서 6개
- 홈·매출·성과·상품 페이지 KPI는 시드 데이터 집계값을 사용

시드 재생성(업무 데이터를 삭제하고 데모 자료로 다시 채웁니다. Supabase 신규 설정 확인에는 실행하지 마세요):

```bash
pnpm db:seed
```

## 실제 구현과 Mock 구분

### 실제 구현

- Next.js App Router 라우팅과 12개 페이지
- Prisma/PostgreSQL 영속화와 Demo Reset
- Zustand 클라이언트 상태 및 API 동기화
- DB에 저장되는 AI 대화 기록과 페이지 이동 후 즉시 복원
- 대화 안에서 발주·업무 완료·협업 요청·일정 조정·프로모션·성과 리포트 실행
- Task 추가·조회·수정, 선택 저장, 상태 완료/복구
- 이메일·비밀번호 회원가입, scrypt 해시, Credentials 로그인·로그아웃, JWT 세션
- 공용 워크스페이스의 AI 대화 저장·조회
- 발주/입고 업무/캘린더의 트랜잭션성 연결
- 프로모션 Stage·Calendar 연결
- 일정 추가·완료·충돌 탐지
- 협업 요청 생성·상태 변경·문구 복사
- 리포트·지식 문서 동시 저장
- 기사 피드백·저장, CSV Export
- Loading, Error, Empty, Toast, Modal 상태
- 1024px 이상 Desktop 반응형과 키보드 접근 가능한 기본 HTML 컨트롤

### Mock 구현

- 매출, 검색 관심도, 월 검색량, 경쟁사 이벤트와 영향 추정 데이터
- `MockAIProvider`의 Task Planner와 Copilot 응답
- 프로모션 예상 효과와 매출 변화 기여도

Mock이더라도 버튼은 정적 장식이 아니며 실제 DB 상태 또는 화면 상태를 변경합니다.

## 실제 API 연결 위치

- LLM: `lib/ai/provider.ts`의 `AIProvider`를 구현한 `OpenAIProvider`를 추가하고 `lib/ai/index.ts`에서 선택
- 매출: `lib/services/contracts.ts`의 `SalesService`
- 재고/ERP: `InventoryService`
- 검색 관심도·검색량: `TrendService`
- 뉴스: `NewsService`
- 경쟁사 수집: `CompetitorService`
- 캘린더: `CalendarService`

실데이터 Provider는 `/api/bootstrap`이 사용하는 `getDashboardData()`의 반환 구조를 유지하도록 어댑터를 작성하면 UI 변경을 최소화할 수 있습니다.

## 검증

```bash
pnpm typecheck
pnpm lint
pnpm test:db
pnpm build
```

로직 단위 테스트(DB 접속 없음)는 한 번에 실행할 수 있습니다. 마감 문구 해석, AI 업무 계획 분리, 프로모션 일정 추천, 결정·상품 진단을 검증합니다.

```bash
pnpm exec tsx --test scripts/db.test.ts scripts/decisions.test.ts scripts/product-diagnostics.test.ts scripts/due.test.ts scripts/task-planner.test.ts scripts/promotion-schedule.test.ts scripts/report-actions.test.ts scripts/ai-answers.test.ts scripts/purchase-order.test.ts scripts/permissions.test.ts scripts/image.test.ts scripts/approval.test.ts scripts/import.test.ts scripts/competitor.test.ts
```

`test:db`는 실제 DB 접속 없이 설정 검증과 비밀값 비노출을 확인합니다. `pnpm db:validate`도 연결 설정과 스키마만 검사하며 테이블을 생성하지 않습니다.

통합 smoke 스크립트는 테스트 계정으로 로그인한 뒤 업무 데이터를 데모 시드로 **초기화하고** 검증하며, 끝나면 다시 초기화합니다. 공용 Supabase DB에서는 실행하지 말고 격리된 데모 DB에서만 `-AllowReset`을 붙여 실행하세요. 플래그가 없으면 아무것도 바꾸지 않고 종료합니다.

```powershell
$env:SMOKE_EMAIL = "<테스트 계정 이메일>"; $env:SMOKE_PASSWORD = "<테스트 계정 비밀번호>"
pwsh -NoProfile -File .\scripts\smoke.ps1 -AllowReset
```

`-BaseUrl`(또는 `SMOKE_BASE_URL`)로 대상 주소를 바꿀 수 있습니다. Task Planner, 시장 업무 생성, 발주와 입고 추적, 경쟁사 대응, 프로모션·캘린더 연결, 성과 리포트·지식 저장, 근거 문서 답변을 검증합니다.
