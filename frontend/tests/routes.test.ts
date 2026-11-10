import { test } from "node:test";
import assert from "node:assert/strict";
import { legacyRedirect, workspacePaths } from "../src/routes";
import { safeReturnPath, signInResult, authJson } from "../src/auth-protocol";
import { readFileSync } from "node:fs";

const origin = "https://md-agent.pages.dev";

test("all existing navigation entries have a frontend route", () => {
  const source = readFileSync(new URL("../../lib/navigation.ts", import.meta.url), "utf8");
  const hrefs = [...source.matchAll(/href: "([^"]+)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length >= 8);
  for (const href of hrefs) {
    assert.ok((workspacePaths as readonly string[]).includes(href), href);
  }
});

test("old deep links retain their destination and calendar month", () => {
  assert.equal(legacyRedirect("/calendar", new URLSearchParams("month=2026-11")), "/tasks?tab=calendar&month=2026-11");
  assert.equal(legacyRedirect("/calendar", new URLSearchParams("month=invalid")), "/tasks?tab=calendar");
  assert.equal(legacyRedirect("/sales", new URLSearchParams("tab=master")), "/registry");
  assert.equal(legacyRedirect("/inventory", new URLSearchParams()), "/sales?tab=inventory");
  assert.equal(legacyRedirect("/promotions", new URLSearchParams("tab=planner&topic=test")), "/promotions?tab=plan&topic=test");
});

test("login callback paths cannot leave the current site", () => {
  for (const value of ["https://evil.example", "//evil.example", "/\\evil.example", null]) assert.equal(safeReturnPath(value, origin), "/");
  assert.equal(safeReturnPath("/tasks?tab=worklog", origin), "/tasks?tab=worklog");
});

test("credential failures stay failures even if Auth.js returns HTTP 200", () => {
  const result = signInResult(origin + "/login?error=CredentialsSignin&code=account_inactive", origin, 200);
  assert.equal(result.ok, false);
  assert.equal(result.code, "account_inactive");
  assert.equal(result.url, null);
  assert.throws(() => signInResult("https://evil.example/", origin, 200));
});

test("a null Auth.js session is a normal signed-out response", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(null));
  assert.equal(await authJson("/api/auth/session"), null);
});
