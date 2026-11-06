export class DatabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigurationError";
  }
}

/** Validate server-side configuration without connecting or exposing its value. */
export function assertDatabaseEnvironment(env: Record<string, string | undefined> = process.env) {
  const value = env.DATABASE_URL;
  if (!value?.trim()) {
    throw new DatabaseConfigurationError("DATABASE_URL이 없습니다. 프로젝트 루트의 .env에 Supabase Connect → Session pooler 연결 문자열을 입력하세요.");
  }
  if (value.startsWith("file:")) {
    throw new DatabaseConfigurationError("DATABASE_URL이 아직 SQLite(file:) 설정입니다. Supabase Session pooler의 PostgreSQL 연결 문자열로 변경하세요. SQLite로 자동 전환하지 않습니다.");
  }
  if (/\[[^\]]+\]|YOUR[-_]|PROJECT[-_]REF|REPLACE_ME/i.test(value)) {
    throw new DatabaseConfigurationError("DATABASE_URL에 예시 값이 남아 있습니다. Supabase Connect → Session pooler에서 실제 연결 문자열을 복사하세요.");
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DatabaseConfigurationError("DATABASE_URL 형식이 올바르지 않습니다. PostgreSQL URI를 사용하고 비밀번호의 특수문자는 URL 인코딩하세요.");
  }
  if (!["postgresql:", "postgres:"].includes(url.protocol)) {
    throw new DatabaseConfigurationError("DATABASE_URL은 postgresql:// 또는 postgres:// 형식이어야 합니다.");
  }
  if (!url.hostname || !url.username || !url.password || url.pathname.length <= 1 || url.hash) {
    throw new DatabaseConfigurationError("DATABASE_URL의 호스트·사용자명·비밀번호·DB 이름을 확인하세요. 비밀번호의 @, :, /, #, $, % 등 특수문자는 URL 인코딩하세요.");
  }
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port && url.port !== "5432") {
    throw new DatabaseConfigurationError("Supabase Session pooler의 포트 5432를 사용하세요. Transaction pooler(6543)는 이번 migration 설정에서 지원하지 않습니다.");
  }
  if (url.searchParams.get("pgbouncer") === "true") {
    throw new DatabaseConfigurationError("Session pooler 연결 문자열을 그대로 사용하세요. 이번 설정에는 Transaction pooler용 pgbouncer=true가 필요하지 않습니다.");
  }
}
