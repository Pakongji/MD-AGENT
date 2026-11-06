import { z } from "zod";
import { auth } from "@/auth";
import { databaseErrorMessage, logDatabaseError } from "@/lib/db/errors";
import { createWorklogWorkbook } from "@/lib/worklog/excel";
import { getWorklogPeriod, kstDay } from "@/lib/worklog/period";
import { getWorklog } from "@/lib/worklog/report";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await auth())?.user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const query = new URL(request.url).searchParams;
  const period = z.enum(["daily", "weekly", "monthly"]).safeParse(query.get("period") ?? "daily");
  const range = period.success && getWorklogPeriod(period.data, query.get("date") ?? kstDay());
  if (!range) return Response.json({ error: "집계 기간과 기준일을 확인해주세요." }, { status: 400 });

  try {
    const report = await getWorklog(range);
    if (query.get("format") !== "xlsx") {
      return Response.json(report, { headers: { "Cache-Control": "private, no-store" } });
    }
    const buffer = await createWorklogWorkbook(report).xlsx.writeBuffer();
    const name = "MD-" + report.label.replace(" ", "-") + "-" + report.start + (report.start === report.end ? "" : "_" + report.end) + ".xlsx";
    return new Response(new Uint8Array(buffer), { headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": "attachment; filename*=UTF-8''" + encodeURIComponent(name),
      "Cache-Control": "private, no-store",
    } });
  } catch (error) {
    logDatabaseError(error, "업무일지 조회");
    return Response.json({ error: databaseErrorMessage(error, "업무일지를 불러오지 못했습니다.") }, { status: 500 });
  }
}
