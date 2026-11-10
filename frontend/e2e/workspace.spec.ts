import { test, expect, type Page } from "@playwright/test";
const EMPTY_DASHBOARD = {
  tasks: [], products: [], suppliers: [], supplierProducts: [], members: [], channelStats: [], dataImports: [], inventory: [], purchaseOrders: [], marketKeywords: [], marketTrends: [], articles: [], competitorEvents: [], promotions: [], calendarEvents: [], collaborationRequests: [], performanceReports: [], knowledgeDocuments: [], insights: [], notifications: [], salesMetrics: [], aiConversations: [],
};

async function mockBackend(page: Page, signedIn = true) {
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/session") return route.fulfill({ json: signedIn ? { user: { name: "테스트 MD", email: "md@example.com" }, expires: "2099-01-01" } : null });
    if (path === "/api/bootstrap") return route.fulfill({ json: { ...EMPTY_DASHBOARD, meta: { aiProvider: "mock", lastUpdated: "2026-11-10T00:00:00Z" } } });
    if (path === "/api/promotion-planner") return route.fulfill({ json: { plans: [], liveAvailable: false } });
    if (path === "/api/auth/csrf") return route.fulfill({ json: { csrfToken: "test-csrf" } });
    if (path === "/api/auth/signout") {
      const body = new URLSearchParams(route.request().postData() || "");
      expect(body.get("csrfToken")).toBe("test-csrf");
      signedIn = false;
      return route.fulfill({ json: { url: body.get("callbackUrl") } });
    }
    if (path === "/api/auth/callback/credentials") {
      const body = new URLSearchParams(route.request().postData() || "");
      expect(body.get("csrfToken")).toBe("test-csrf");
      expect(body.get("email")).toBe("md@example.com");
      expect(route.request().headers()["x-auth-return-redirect"]).toBe("1");
      signedIn = true;
      return route.fulfill({ json: { url: body.get("callbackUrl") } });
    }
    return route.fulfill({ json: { error: "테스트에서 사용하지 않는 API입니다." }, status: 404 });
  });
}

test("login uses CSRF and restores the protected deep link", async ({ page }) => {
  await mockBackend(page, false);
  await page.goto("/tasks?tab=worklog");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await page.getByLabel("이메일", { exact: true }).fill("md@example.com");
  await page.getByLabel("비밀번호", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "로그인", exact: true }).click();
  await expect(page).toHaveURL(/\/tasks\?tab=worklog$/);
  await expect(page.getByRole("button", { name: "업무일지", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("all existing workspace pages render and tabs/deep links survive reload", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockBackend(page);
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "주 메뉴" })).toBeVisible();
  for (const path of ["/", "/tasks", "/sales", "/market", "/promotions", "/records", "/registry", "/data"]) {
    await page.locator(`.sidebar a[href="${path}"]`).first().click();
    await expect(page).toHaveURL("http://127.0.0.1:4173" + path);
    await expect(page.getByRole("navigation", { name: "주 메뉴" })).toBeVisible();
    if (!["/", "/data"].includes(path)) await expect(page.locator(".rd-page-tabs")).toBeVisible();
    await expect(page.getByRole("heading", { name: "화면을 불러오고 있습니다.", exact: true })).toHaveCount(0);
    await expect(page.getByText("화면을 불러오지 못했습니다.", { exact: true })).toHaveCount(0);
  }
  await page.goto("/tasks?tab=calendar&month=2026-11");
  await expect(page.getByRole("button", { name: "캘린더", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "업무일지", exact: true }).click();
  await expect(page).toHaveURL(/tab=worklog/);
  await page.reload();
  await expect(page.getByRole("button", { name: "업무일지", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/calendar?month=2026-11");
  await expect(page).toHaveURL(/\/tasks\?tab=calendar&month=2026-11$/);
  expect(errors).toEqual([]);
});

test("logout uses CSRF and the protected workspace returns to login", async ({ page }) => {
  await mockBackend(page);
  await page.goto("/");
  await page.getByRole("button", { name: "로그아웃", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("이메일", { exact: true })).toBeVisible();
  await page.goto("/sales");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
});

test("an unconfigured backend shows an actionable message instead of a blank screen", async ({ page }) => {
  await page.route("**/api/auth/session", (route) => route.fulfill({ status: 503, json: { error: "백엔드 연결이 아직 준비되지 않았습니다." } }));
  await page.goto("/");
  await expect(page).toHaveURL(/\/login\?callbackUrl=/);
  await expect(page.getByRole("alert")).toContainText("백엔드 연결이 아직 준비되지 않았습니다.");
  await expect(page.getByRole("button", { name: "다시 연결" })).toBeVisible();
  await expect(page.getByLabel("이메일", { exact: true })).toBeVisible();
});
