import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { loadEnvConfig } from "@next/env";
import { assertDatabaseEnvironment, DatabaseConfigurationError } from "../lib/db/config";
import { logDatabaseError } from "../lib/db/errors";

const root = resolve(__dirname, "..");
const localRequire = createRequire(resolve(root, "package.json"));

function runPrisma(args: string[], label: string) {
  console.log(`[DB] ${label}...`);
  const result = spawnSync(process.execPath, [localRequire.resolve("prisma/build/index.js"), ...args], {
    cwd: root,
    env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" },
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    // Only extract a public error code. Raw stdout/stderr can include the DB URI.
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    if (args[0] === "generate" && /\b(?:EPERM|EBUSY)\b/.test(output)) {
      console.error("[DB] Prisma Client 파일을 다른 프로세스가 사용 중입니다. 실행 중인 개발 서버를 Ctrl+C로 종료한 뒤 pnpm db:setup을 다시 실행하세요.");
      return false;
    }
    const code = output.match(/\bP\d{4}\b/)?.[0];
    logDatabaseError({ code }, label);
    return false;
  }
  console.log(`[DB] ${label} 완료`);
  return true;
}

function main() {
  const action = process.argv[2] ?? "setup";
  if (!["setup", "deploy", "status", "validate"].includes(action)) {
    throw new DatabaseConfigurationError("지원하지 않는 DB 명령입니다. db:setup, db:migrate:deploy, db:migrate:status, db:validate를 사용하세요.");
  }
  let envError = false;
  loadEnvConfig(root, process.env.NODE_ENV !== "production", { info() {}, error() { envError = true; } });
  if (envError) throw new DatabaseConfigurationError(".env 파일을 읽지 못했습니다. 파일 위치·접근 권한·문법을 확인하세요.");
  assertDatabaseEnvironment();

  const steps: Array<[string[], string]> = action === "setup"
    ? [[["validate"], "Prisma 스키마 검사"], [["generate"], "Prisma Client 생성"], [["migrate", "deploy"], "미적용 migration 적용"], [["migrate", "status"], "Migration 적용 상태 확인"]]
    : action === "deploy"
      ? [[["migrate", "deploy"], "미적용 migration 적용"]]
      : action === "status"
        ? [[["migrate", "status"], "Migration 적용 상태 확인"]]
        : [[["validate"], "Prisma 스키마 검사"]];
  for (const [args, label] of steps) {
    if (!runPrisma(args, label)) { process.exitCode = 1; return; }
  }
  console.log(action === "setup"
    ? "[DB] 설정이 완료됐습니다. pnpm dev로 서버를 시작하세요. 기존 SQLite는 변경하지 않았고 데모 데이터도 추가하지 않았습니다."
    : action === "validate" ? "[DB] 정적 검사만 완료했습니다. DB 접속이나 테이블 생성은 하지 않았습니다." : "[DB] 요청한 작업이 완료됐습니다.");
}

try { main(); } catch (error) { logDatabaseError(error, "DB 설정"); process.exitCode = 1; }
