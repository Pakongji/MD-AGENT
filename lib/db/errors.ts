import { DatabaseConfigurationError } from "./config";

const messages: Record<string, string> = {
  P2034: "다른 요청과 동시에 변경되어 저장하지 못했습니다. 최신 기록을 확인한 뒤 다시 시도해주세요.",
  P1000: "DB 인증에 실패했습니다. Supabase DB 사용자명·비밀번호와 비밀번호의 URL 인코딩을 확인하세요.",
  P1001: "DB 서버에 연결할 수 없습니다. Supabase 프로젝트 실행 상태, Session pooler 호스트·포트 5432, 네트워크 접근 허용을 확인하세요.",
  P1002: "DB 연결 시간이 초과됐습니다. Supabase 상태와 네트워크를 확인한 뒤 다시 시도하세요.",
  P1003: "연결할 데이터베이스가 없습니다. 연결 문자열의 DB 이름을 확인하세요.",
  P1010: "DB 접근 권한이 없습니다. 연결 계정의 데이터베이스 및 스키마 권한을 확인하세요.",
  P1011: "DB의 TLS/SSL 연결에 실패했습니다. Supabase 연결 문자열과 SSL 설정을 확인하세요.",
  P1012: "Prisma 스키마 또는 환경변수 설정이 올바르지 않습니다. DATABASE_URL이 PostgreSQL 형식인지 확인하세요.",
  P1013: "DB 연결 문자열 형식이 올바르지 않습니다. 특히 비밀번호의 특수문자를 URL 인코딩했는지 확인하세요.",
  P1017: "DB 연결이 종료됐습니다. Supabase 상태와 연결 제한을 확인한 뒤 다시 시도하세요.",
  P2021: "필요한 DB 테이블이 없습니다. 프로젝트 루트에서 pnpm db:setup을 실행하세요.",
  P2022: "DB 컬럼이 현재 코드와 다릅니다. 프로젝트 루트에서 pnpm db:setup을 실행하세요.",
  P2024: "DB 연결 풀의 대기 시간이 초과됐습니다. 연결 수와 Supabase pooler 제한을 확인하세요.",
  P3005: "DB에 기존 테이블이 있어 초기 migration을 적용하지 않았습니다. 데이터를 삭제하지 말고 기존 스키마와 migration 기준점(baseline)을 검토하세요.",
  P3009: "이전에 실패한 migration이 있습니다. 실패 이력을 검토한 뒤 복구해야 합니다. reset 명령을 실행하지 마세요.",
  P3018: "Migration 적용 중 오류가 발생했습니다. Supabase의 기존 테이블·권한과 _prisma_migrations의 실패 이력을 확인하세요. reset 명령을 실행하지 마세요.",
  P3019: "Migration의 DB 종류가 현재 PostgreSQL 설정과 다릅니다. 기존 이력을 보존하고 PostgreSQL migration 경로를 확인하세요.",
};

function findError(error: unknown, seen = new Set<unknown>()): { configuration?: DatabaseConfigurationError; code?: string; type?: string } {
  if (error instanceof DatabaseConfigurationError) return { configuration: error };
  if (!error || typeof error !== "object" || seen.has(error)) return {};
  seen.add(error);
  const record = error as Record<string, unknown>;
  for (const candidate of [record.code, record.errorCode]) {
    if (typeof candidate === "string" && /^P\d{4}$/.test(candidate)) return { code: candidate };
  }
  for (const nested of [record.cause, record.err]) {
    const found = findError(nested, seen);
    if (found.configuration || found.code || found.type) return found;
  }
  return typeof record.type === "string" ? { type: record.type } : {};
}

export function databaseErrorMessage(error: unknown, fallback = "DB 요청을 처리하지 못했습니다. 연결 설정과 서버 상태를 확인하세요.") {
  const found = findError(error);
  if (found.configuration) return found.configuration.message;
  if (found.code && messages[found.code]) return messages[found.code];
  if (found.type === "MissingSecret") return "프로덕션 인증에 필요한 AUTH_SECRET 환경변수를 설정하세요.";
  if (found.type === "UntrustedHost") return "배포 환경의 인증 호스트 설정을 확인하세요. 신뢰하는 프록시 환경에서는 AUTH_TRUST_HOST=true를 설정하세요.";
  return fallback;
}

/** Never log raw Prisma/Auth errors: they can contain credentials or query data. */
export function logDatabaseError(error: unknown, context: string) {
  const code = findError(error).code;
  console.error(`[${context}] ${databaseErrorMessage(error)}${code ? ` (${code})` : ""}`);
}
