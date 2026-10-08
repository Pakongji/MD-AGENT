# MD AI Agent

매출·재고·시장·경쟁사 데이터를 **변화 → AI 해석 → 자사 영향 → MD 판단 → 실행**으로 연결하는 Beauty Commerce용 MD 업무 파트너 MVP입니다.

단순 BI 화면이 아니라 모든 핵심 신호를 실제 업무, 발주, 프로모션, 캘린더, 협업 요청, 성과 리포트와 지식 저장으로 연결합니다. API 키가 없어도 `MockAIProvider`로 전체 흐름이 동작합니다.

## 빠른 시작

### 요구 환경

- Node.js 20.9 이상
- pnpm 10 이상 권장

### 설치 및 실행

```bash
pnpm install
copy .env.example .env
pnpm db:setup
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

macOS/Linux에서는 환경 파일 복사만 아래처럼 실행하면 됩니다.

```bash
cp .env.example .env
```

### 프로덕션 실행

```bash
pnpm build
pnpm start
```

### Docker 실행

```bash
docker build -t md-ai-agent .
docker volume create md-ai-agent-data
docker run --rm -p 3000:3000 \
  -v md-ai-agent-data:/var/data \
  -e DATABASE_URL=file:/var/data/md-agent.db \
  md-ai-agent
```

컨테이너 시작 시 스키마를 반영하고, 빈 데이터베이스에만 Demo Seed를 생성합니다. 이후 재시작에서는 기존 업무·발주·프로모션 데이터가 유지됩니다.

### Render 배포

루트의 `render.yaml`은 싱가포르 리전의 Docker Web Service와 1GB 영속 디스크를 정의합니다. Git 원격 저장소를 Render Blueprint에 연결하면 커밋마다 자동 배포됩니다.

- DB 파일: `/var/data/md-agent.db`
- Health check: `/api/health`
- AI Provider: `mock`
- `OPENAI_API_KEY`: Mock Mode에서는 빈 값으로 등록 가능

SQLite 영속 디스크 때문에 단일 인스턴스로 동작합니다. 수평 확장이 필요할 때는 Prisma datasource를 PostgreSQL로 전환하세요.

## 환경 변수

```env
DATABASE_URL="file:./dev.db"
AI_PROVIDER="mock"
OPENAI_API_KEY=""
```

- `DATABASE_URL`: Prisma SQLite 경로입니다. 현재 설정에서는 `prisma/dev.db`가 생성됩니다.
- `AI_PROVIDER`: 현재 구현된 값은 `mock`입니다.
- `OPENAI_API_KEY`: 향후 실제 Provider 연결용이며 Mock Mode에서는 비워둡니다.

## 구현된 사용자 흐름

1. **오늘의 업무**: 자유 문장 입력 → 목표와 마감 해석 → 선행/핵심/후속 업무 제안 → 선택 항목만 SQLite에 저장
2. **시장/트렌드**: 립오일 신호 → 상세 검증 → 발주·소싱·프로모션 업무 생성
3. **재고/발주**: 권장 수량 수정 → 발주 확정 → `PurchaseOrder`, 입고 추적 `Task`, `CalendarEvent` 동시 생성
4. **경쟁사**: B사 할인 → 실구매가 비교 → 대응안 생성 → 오늘 업무 저장
5. **프로모션**: AI 추천 → 기획안 → Pipeline 단계 변경 → 캘린더 연결
6. **캘린더**: 일정 추가·완료, 시간 충돌 탐지, 일정 조정 업무 생성
7. **협업 요청**: 요청 목적·마감·산출물·요청 문구 생성, 복사, 상태 관리
8. **성과 분석**: AI 회고 리포트 생성 → `PerformanceReport`와 `KnowledgeDocument` 동시 저장
9. **지식 저장소**: 과거 문서 검색 → 근거 문서를 표시하는 AI 답변
10. **Global Copilot**: 현재 페이지와 내부 데모 데이터를 반영한 결론·근거·자사 영향·Action 응답

모든 페이지의 변경 사항은 API를 거쳐 SQLite에 저장되므로 새로고침 후에도 유지됩니다. Sidebar의 **데모 데이터 초기화**로 시드 상태를 복원할 수 있습니다.

## 페이지

| 경로 | 기능 |
|---|---|
| `/` | 홈 요약, 오늘의 결정, 중요 신호, 일정, AI 가능 업무 |
| `/tasks` | Today Task List, AI Task Planner, 수정·완료 |
| `/sales` | KPI, 매출 차트, 변화 기여도, 상품 Drill-down |
| `/market` | 3분 아침 리포트, 검색 관심도·월 검색량 분리, 트렌드 분석 |
| `/competitors` | 오늘 변화, 실구매가 비교, 대응안, 과거 이력 |
| `/inventory` | 재고 위험, 수량 조정, 발주, 입고 추적, CSV Export |
| `/products` | 브랜드 Portfolio, Lifecycle, 상품 리스크, 소싱 업무 |
| `/promotions` | AI 추천, 기획안, 6단계 Pipeline, 캘린더 연결 |
| `/calendar` | 통합 월간 일정, 충돌 탐지, 일정 추가·완료 |
| `/collaboration` | AI 요청서, 문구 복사, 담당자·마감·상태 관리 |
| `/performance` | KPI, 기여 요인, 주·월간 회고, AI Report |
| `/knowledge` | 문서 검색·추가, 근거 기반 AI 답변 |

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
  schema.prisma         # SQLite 데이터 모델
  seed.ts               # Demo Seed 진입점
scripts/
  smoke.ps1             # 7개 완료 시나리오 통합 스모크 테스트
  seed-if-empty.ts       # 빈 프로덕션 DB만 Demo Seed
  start-production.sh   # 스키마 반영 후 Next.js 시작
Dockerfile              # 재현 가능한 프로덕션 이미지
render.yaml             # Render Web Service + 영속 디스크
```

## 데이터 모델

`prisma/schema.prisma`에 다음 엔터티가 정의되어 있습니다.

- `User`, `Task`, `TaskGroup`
- `SalesMetric`, `Product`, `Brand`
- `Inventory`, `PurchaseOrder`
- `MarketKeyword`, `MarketTrend`, `Article`, `ArticleFeedback`
- `Competitor`, `CompetitorEvent`
- `Promotion`, `CalendarEvent`, `CollaborationRequest`
- `PerformanceReport`, `KnowledgeDocument`, `Insight`
- `Notification`, `AIConversation`

PostgreSQL 전환 시 `datasource db`의 provider와 `DATABASE_URL`을 변경하고 migration을 생성하면 됩니다. 모델과 서비스/API 계층은 DB 구현과 UI 사이에 분리되어 있습니다.

## Mock 데이터

`lib/mock/data.ts`에 컴포넌트와 분리해 관리합니다.

- A 립밤, B 쿠션, C 저자극 세럼, D 클렌저, A 글로우 립오일
- A/B/C 경쟁사와 할인·신상품 이벤트
- 립오일, 립플럼퍼, 쿠션, 저자극 세럼 키워드
- 검색 관심도, 월 검색량, 연령 비중, 관련 니즈
- 프로모션, 일정, 협업 요청, 과거 성과·회의 문서

시드 재생성:

```bash
pnpm db:seed
```

## 실제 구현과 Mock 구분

### 실제 구현

- Next.js App Router 라우팅과 12개 페이지
- Prisma/SQLite 영속화와 Demo Reset
- Zustand 클라이언트 상태 및 API 동기화
- Task CRUD, 선택 저장, 상태 완료/복구
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
- 사용자/인증

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
pnpm build
```

프로덕션 서버가 `localhost:3000`에서 실행 중일 때 Windows PowerShell 7에서:

```powershell
pwsh -NoProfile -File .\scripts\smoke.ps1
```

스모크 테스트는 Task Planner, 시장 업무 생성, 발주와 입고 추적, 경쟁사 대응, 프로모션·캘린더 연결, 성과 리포트·지식 저장, 근거 문서 답변을 검증하고 마지막에 데모 데이터를 자동 복원합니다.
