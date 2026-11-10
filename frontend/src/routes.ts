export const workspacePaths = ["/", "/tasks", "/sales", "/market", "/promotions", "/records", "/registry", "/data"] as const;

export function legacyRedirect(pathname: string, params: URLSearchParams): string | null {
  const redirects: Record<string, string> = {
    "/collaboration": "/tasks?tab=collab", "/inventory": "/sales?tab=inventory",
    "/products": "/sales?tab=products", "/performance": "/records?tab=reports",
    "/knowledge": "/records?tab=knowledge", "/competitors": "/market?tab=competitors",
  };
  if (pathname === "/calendar") {
    const month = params.get("month");
    return "/tasks?tab=calendar" + (month && /^\d{4}-\d{2}$/.test(month) ? `&month=${month}` : "");
  }
  if (pathname === "/sales" && params.get("tab") === "master") return "/registry";
  if (pathname === "/promotions" && ["planner", "promotions"].includes(params.get("tab") || "")) {
    const next = new URLSearchParams(params);
    next.set("tab", params.get("tab") === "planner" ? "plan" : "pipeline");
    return "/promotions?" + next;
  }
  return redirects[pathname] || null;
}
