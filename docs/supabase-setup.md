# Supabase PostgreSQL 설정과 확인

SQLite 데이터를 옮기는 작업은 포함하지 않습니다. Supabase의 새 DB에서 신규 계정과 기록을 저장하며 기존 `prisma/dev.db`는 보존합니다.

## 1. 환경과 유지한 기능

- 확인한 환경: Node.js 24.22.1, pnpm 11.25.0, Next.js 16.4.0, React 19.3.0, Prisma CLI/Client 6.19.0.
- Prisma 6의 `prisma/schema.prisma` 설정을 유지합니다. `prisma.config.ts`는 필요하지 않습니다.
- 이메일·비밀번호 가입, scrypt 해시, Credentials 로그인·로그아웃, JWT 쿠키 세션을 유지합니다. Supabase Auth로 바꾸지 않습니다.
- 로그인 계정은 `Account`입니다. `User`는 기존 업무용 사용자 모델로 로그인 계정과 다릅니다.
- AI 대화는 기존 `AIConversation` 모델에 저장하며 로그인 계정들이 공용 기록을 함께 조회합니다. 기존 대화 API 응답 필드를 유지합니다.
- 업무·상품·재고·프로모션과 대화 모두 기존 공용 워크스페이스 방식입니다. 계정별로 분리하지 않습니다.
- 기존 23개 모델과 초기 PostgreSQL migration을 보존하고 `TaskDecision` 모델을 추가했습니다. 결정 기록은 업무·작성자와 연결되며, 전용 테이블은 RLS를 켜고 Data API 접근 권한을 회수해 앱 서버에서만 사용합니다. 계정별 분리 제안은 적용 대상에서 제외해 `prisma/migration-archive`에 보관합니다.

## 2. 연결 정보 입력

1. Supabase에서 사용할 프로젝트를 엽니다.
2. **Connect → Session pooler → URI** 연결 문자열을 복사합니다. 포트는 **5432**입니다. 호스트·리전은 추측하지 말고 표시된 값을 사용하세요.
3. `[YOUR-PASSWORD]`가 있으면 해당 프로젝트의 **DB 비밀번호**로 교체합니다. Supabase 로그인 비밀번호나 API 키가 아닙니다.
4. 비밀번호 부분의 특수문자는 URL 인코딩합니다. 예: `@` → `%40`, `#` → `%23`, `$` → `%24`. 전체 URI를 인코딩하거나 이미 인코딩된 값을 다시 인코딩하지 마세요.
5. VS Code 프로젝트 루트 `C:\Users\aicam\Documents\New project`의 `package.json` 옆에서 `.env`를 엽니다. 없을 때만 `.env.example`을 복사해 만듭니다. 기존 `.env`를 덮어쓰지 마세요.
6. `DATABASE_URL`의 기존 `file:...` 값을 복사한 실제 URI로 교체하고 저장합니다. 예시 형식은 `.env.example`에 있습니다. 기존 쿼리 옵션도 유지할 수 있습니다. SSL 옵션을 추가할 때는 기존 쿼리 유무에 따라 `?sslmode=require` 또는 `&sslmode=require`를 사용합니다.

Session pooler 한 개를 앱과 migration이 같이 사용하므로 **`DIRECT_URL`은 필요하지 않습니다**. 이번 설정은 Transaction pooler의 6543 포트와 `pgbouncer=true`를 사용하지 않습니다.

`AI_PROVIDER="mock"`, `OPENAI_API_KEY=""`로 둘 수 있습니다. 개발 모드의 `AUTH_SECRET` 대체값은 유지하며, 실제 배포에서는 별도 무작위 비밀값을 설정하세요. Render Blueprint에는 `AUTH_SECRET` 자동 생성과 신뢰 프록시 설정을 준비했습니다.

`.env`는 Git과 Docker 빌드 컨텍스트에서 제외됩니다. `DATABASE_URL`에 `NEXT_PUBLIC_` 접두사를 붙이지 마세요. 연결 문자열이나 비밀번호를 오류 보고에 붙여 넣지 마세요.

Next.js와 DB 명령은 같은 `@next/env` 로더를 사용합니다. `.env.local`, `.env.development.local` 또는 터미널 환경변수에 기존 `DATABASE_URL`이 있으면 우선 적용될 수 있습니다. 변경한 값이 반영되지 않을 때 확인하세요.

## 3. 테이블 생성

VS Code 상단 **터미널 → 새 터미널**을 열고 다음 위치로 이동합니다.

```powershell
cd "C:\Users\aicam\Documents\New project"
```

패키지가 아직 없으면 `pnpm install`을 실행합니다. 개발 서버가 실행 중이면 해당 터미널에서 Ctrl+C로 종료합니다(Windows의 Prisma Client 파일 잠금 방지). `.env` 저장 후 다음 명령 하나로 준비합니다.

```powershell
pnpm db:setup
```

PowerShell에서 `pnpm.ps1` 실행 정책 오류가 나면 `pnpm.cmd db:setup`을 사용하세요. 다른 pnpm 명령도 `.cmd`를 붙일 수 있습니다. 시스템 실행 정책을 바꿀 필요는 없습니다.

환경변수 검사 → 스키마 검사 → Prisma Client 생성 → `migrate deploy` → `migrate status` 순서로 실행합니다. 성공하면 `[DB] 설정이 완료됐습니다.`가 표시됩니다. 실패 시 종료 코드 1로 중단하며, 실패한 단계 이전 작업은 일부 완료됐을 수 있습니다.

다시 실행해도 `_prisma_migrations`에 완료된 migration을 중복 적용하지 않습니다. 자동 시드, 데이터 이전, `migrate reset`, 강제 스키마 초기화는 하지 않습니다.

Supabase **Table Editor → public**에서 `Account`, `Task`, `TaskDecision`, `AIConversation` 등 앱 테이블 24개를 확인하세요. `_prisma_migrations`가 숨겨져 있으면 SQL Editor에서 다음 읽기 전용 쿼리로 확인합니다.

```sql
SELECT migration_name, finished_at, rolled_back_at
FROM public._prisma_migrations
ORDER BY started_at;
```

초기 migration `20261028000000_init_postgresql`과 결정 기록 migration `20261029052730_task_decisions`의 `finished_at`이 채워지고 `rolled_back_at`이 비어 있어야 합니다. 결정 기록 migration은 기존 계정·대화·업무 상태를 보존하면서 컬럼과 테이블을 추가합니다. 과거 결정을 추정해 채우지 않습니다.

## 4. 서비스 실행과 확인

```powershell
pnpm dev
```

Ready 메시지 후 `http://localhost:3000/login`을 엽니다. 이미 서버가 실행 중이었다면 `.env` 변경 후 종료하고 다시 시작하세요.

1. **회원가입**에서 이름, 이메일, 10자 이상 비밀번호를 입력합니다. 기존처럼 가입 후 자동 로그인됩니다.
2. Table Editor의 `Account`에서 새 행을 확인합니다. `passwordHash`는 해시로 저장되며 원문은 저장하지 않습니다. 이 값도 공유하지 마세요.
3. 로그아웃 후 같은 계정으로 다시 로그인합니다. 새로고침 후 세션이 유지되는지 확인합니다. JWT 쿠키 방식이므로 DB에 Session 테이블이 없는 것이 정상입니다.
4. 홈에서 질문하고 새로고침합니다. 대화가 복원되는지, `AIConversation`에 질문·답변이 저장되는지 확인합니다.
5. 다른 계정으로 로그인해 같은 공용 대화와 업무 데이터가 조회되는지 확인합니다. 로그인 계정은 별도이지만 기록은 공유합니다.
6. `/tasks`에서 업무를 직접 추가하고 새로고침합니다. 화면과 `Task` 테이블에 남아 있는지 확인합니다.
7. `pnpm db:migrate:status`로 적용 상태를 확인할 수 있습니다. `/api/health`는 DB 조회 성공 시 `{"status":"ok"}`를 반환합니다.

처음에는 신규 DB라 상품·재고·매출 등이 비어 있는 것이 정상입니다. 기존 SQLite의 계정·업무·대화는 가져오지 않으며 `db:setup`은 데모 자료를 넣지 않습니다.

데모 체험이 필요하면 별도 터미널에서 `pnpm.cmd db:demo:add`를 실행할 수 있습니다. 이 명령은 업무 테이블이 전부 비어 있을 때만 기존 예시 데이터를 추가하며, 가입 계정과 AI 대화는 보존합니다. 이미 업무 데이터가 있으면 변경 없이 건너뜁니다. 전체 추가 작업은 한 트랜잭션으로 실행되어 실패 시 일부 데이터만 남지 않습니다. 실행 후 브라우저를 새로고침하세요.

## 5. 문제 해결과 주의사항

의사결정 업무에는 `검토하고 결정하기` 또는 `결정 기록 보기` 버튼이 표시됩니다. 결정 내용과 판단 근거를 입력해 확정하면 작성자·시점·검토 수치를 함께 보관하고 지식 저장소의 `의사결정 기록`에서 조회할 수 있습니다. 초안은 업무를 완료하지 않습니다. 보류 시 미래의 재검토 일시가 필요하며 캘린더 일정이 생성됩니다. 발주는 결정 확정 후 별도의 `발주 등록` 버튼으로 처리합니다. 확정한 결정을 변경할 때는 `새 결정 작성`으로 이력을 추가합니다.

검증: `pnpm.cmd exec tsx --test scripts/decisions.test.ts scripts/db.test.ts`. 실제 DB 통합 검증은 명시적으로 `DECISION_TEST_ALLOW_DATABASE_WRITES=1`을 설정하고 `pnpm.cmd exec tsx scripts/verify-decisions.ts`를 실행합니다. 이 검증은 고유한 검증용 자료만 만들고 종료 시 제거하며 기존 계정·대화가 바뀌지 않았는지도 확인합니다.

| 증상 | 확인할 사항 |
|---|---|
| DATABASE_URL 누락·SQLite 설정 안내 | 프로젝트 루트 `.env` 저장 여부와 기존 `file:` 값 확인 |
| 예시 값 안내 | 프로젝트 ref·비밀번호·호스트 자리표시자 교체 |
| 인증 실패 / P1000 | DB 비밀번호, pooler 사용자명, 비밀번호 URL 인코딩 |
| 연결 불가 / P1001·P1002 | 프로젝트 일시 중지 여부, 호스트, 포트 5432, 네트워크 제한 |
| SSL 오류 / P1011 | 복사한 URI와 `sslmode=require`, 네트워크 환경 |
| 테이블·컬럼 없음 / P2021·P2022 | `db:setup` 완료 여부, 앱과 명령이 같은 DB를 사용하는지 |
| 기존 테이블 / P3005 | DB를 초기화하지 말고 기존 스키마와 migration 기준점(baseline) 검토 |
| 실패 migration / P3009·P3018 | 실패 이력 검토 후 별도 복구. 무조건 재설정하지 않기 |
| 배포 인증 오류 | `AUTH_SECRET`, 신뢰 프록시의 `AUTH_TRUST_HOST` |
| Client 파일 사용 중 / EPERM·EBUSY | 개발 서버를 Ctrl+C로 종료하고 `db:setup` 재실행 |

연결 오류는 안전한 설명과 Prisma 코드만 기록합니다. 전체 URI, 비밀번호, 원본 쿼리는 출력하지 않습니다. 성공 로그에도 연결 정보가 포함되지 않습니다.

기존 PostgreSQL 초기 migration을 보존했습니다. SQLite용 migration 파일은 현재 저장소에서 발견되지 않았습니다. 대화 분리 제안은 실제 DB에 적용하지 않았으며 `prisma/migration-archive`에 보관합니다. 이 폴더의 SQL은 자동 적용되지 않으며 수동으로도 실행하지 마세요. 기존 공용 대화 모델과 조회 방식을 유지합니다.

기존 자료형은 PostgreSQL `TEXT`, `INTEGER`, `DOUBLE PRECISION`, `BOOLEAN`, `TIMESTAMP(3)`으로 대응합니다. `cuid()`와 `@updatedAt`은 Prisma가 처리하는 기존 동작을 유지합니다. JSON 문자열, 고유 제약조건, 기존 외래키 삭제 규칙도 유지합니다.

**신규 설정 확인에 `pnpm db:seed`, `db:seed-if-empty`, 화면의 데모 초기화, `scripts/smoke.ps1`을 사용하지 마세요.** 기존 초기화 함수는 업무 데이터를 지우고 데모 자료로 다시 채웁니다. 기존 smoke 스크립트에는 로그인 세션 처리가 없으며 마지막에 초기화를 요청합니다.

원격 접속·migration 적용·가입·로그인·공용 기록 저장과 조회는 실제 연결 정보를 입력한 뒤 확인해야 합니다. 정적 검사 통과가 원격 DB 성공을 뜻하지 않습니다.

공식 참고: [Supabase Prisma 연결](https://supabase.com/docs/guides/database/prisma), [Prisma 6의 migration 관리](https://www.prisma.io/docs/orm/v6/prisma-migrate/workflows/development-and-production).
