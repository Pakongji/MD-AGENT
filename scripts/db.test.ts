import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import { assertDatabaseEnvironment } from "../lib/db/config";
import { databaseErrorMessage, logDatabaseError } from "../lib/db/errors";

// Synthetic credentials only. No test connects to a database.
const validUrl = "postgresql://postgres.demo:synthetic%40password@aws-0-demo.pooler.supabase.com:5432/postgres";

test("Session pooler URI is accepted unchanged, with optional SSL parameters", () => {
  for (const url of [validUrl, `${validUrl}?sslmode=require`, validUrl.replace("postgresql:", "postgres:")]) {
    assert.doesNotThrow(() => assertDatabaseEnvironment({ DATABASE_URL: url }));
  }
});

test("invalid configuration fails before DB access", () => {
  const cases = [undefined, "", "file:./dev.db", "not-a-uri", "https://example.com/db", validUrl.replace("synthetic%40password", "[YOUR-PASSWORD]"), validUrl.replace(":5432", ":6543"), `${validUrl}?pgbouncer=true`, validUrl.replace("synthetic%40password", ""), `${validUrl}#fragment`];
  for (const url of cases) assert.throws(() => assertDatabaseEnvironment({ DATABASE_URL: url }));
});

test("configuration errors never echo credentials", () => {
  const secret = "synthetic-private-value";
  assert.throws(() => assertDatabaseEnvironment({ DATABASE_URL: `https://demo:${secret}@example.com/db` }), (error) => {
    const text = databaseErrorMessage(error);
    assert.equal(text.includes(secret), false);
    assert.equal(text.includes("https://"), false);
    return true;
  });
});

test("wrapped Prisma/Auth errors log safe diagnoses without raw messages or metadata", () => {
  const lines: string[] = [];
  const original = console.error;
  console.error = (...args) => { lines.push(args.join(" ")); };
  try {
    logDatabaseError({ cause: { err: { errorCode: "P1000", message: validUrl, meta: { password: "synthetic-secret" } } } }, "test");
    logDatabaseError(new Error(validUrl), "test");
  } finally { console.error = original; }
  assert.equal(lines.length, 2);
  assert.ok(lines[0].includes("P1000"));
  for (const text of lines) {
    assert.equal(text.includes(validUrl), false);
    assert.equal(text.includes("synthetic-secret"), false);
  }
});

test("migration/schema problems provide recovery guidance", () => {
  assert.ok(databaseErrorMessage({ code: "P2021" }).includes("db:setup"));
  assert.ok(databaseErrorMessage({ code: "P3005" }).includes("baseline"));
  assert.ok(databaseErrorMessage({ code: "P3009" }).includes("reset"));
});

test("db:setup refuses invalid configuration before invoking Prisma", () => {
  const root = resolve(__dirname, "..");
  const localRequire = createRequire(resolve(root, "package.json"));
  const value = "https://demo:synthetic-private-value@example.com/db";
  const result = spawnSync(process.execPath, [localRequire.resolve("tsx/cli"), resolve(root, "scripts/db.ts"), "setup"], {
    cwd: root, env: { ...process.env, DATABASE_URL: value }, encoding: "utf8", windowsHide: true,
  });
  assert.equal(result.status, 1);
  const output = `${result.stdout}${result.stderr}`;
  assert.equal(output.includes(value), false);
  assert.equal(output.includes("synthetic-private-value"), false);
  assert.equal(output.includes("[DB] Prisma"), false);
  assert.ok(output.includes("DATABASE_URL"));
});
