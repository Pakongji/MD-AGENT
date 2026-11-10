import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { assertDatabaseEnvironment } from "@/lib/db/config";
import { databaseErrorMessage, logDatabaseError } from "@/lib/db/errors";
import { impactPeriods } from "@/lib/services/competitor";

type Period = { start: string; end: string };
const kst = (ymd: string, endOfDay = false) => new Date(`${ymd}T${endOfDay ? "23:59:59.999" : "00:00:00"}+09:00`);

/**
 * 경쟁사 행사 결과 확인: 행사 전·중·후 같은 길이 기간의 하루 평균 매출을 비교합니다.
 * 전체는 일별 매출 합계, 채널별은 업로드한 매출 원장이 있을 때만 계산합니다. 자료가 없는 날은 '자료 일수'로 알려줍니다.
 */
export async function GET(request: Request) {
  try {
    if (!(await auth())?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    assertDatabaseEnvironment();
    const id = new URL(request.url).searchParams.get("eventId");
    const event = id ? await prisma.competitorEvent.findUnique({ where: { id }, include: { competitor: true } }) : null;
    if (!event) return NextResponse.json({ error: "경쟁사 변화를 찾지 못했어요." }, { status: 404 });
    const periods = impactPeriods({ startAt: event.startAt.toISOString(), endAt: event.endAt.toISOString() });

    async function total(period: Period) {
      const rows = await prisma.salesMetric.findMany({ where: { date: { gte: kst(period.start), lte: kst(period.end, true) } }, select: { date: true, revenue: true } });
      const dayKeys = new Set(rows.map((row) => row.date.toISOString().slice(0, 10)));
      const revenue = rows.reduce((sum, row) => sum + row.revenue, 0);
      return { ...period, dataDays: dayKeys.size, dailyRevenue: dayKeys.size ? Math.round(revenue / dayKeys.size) : null };
    }
    async function byChannel(period: Period) {
      const rows = await prisma.salesRecord.groupBy({ by: ["channel"], where: { date: { gte: kst(period.start), lte: kst(period.end, true) } }, _sum: { revenue: true } });
      const days = await prisma.salesRecord.findMany({ where: { date: { gte: kst(period.start), lte: kst(period.end, true) } }, distinct: ["date"], select: { date: true } });
      return { dataDays: days.length, channels: rows.map((row) => ({ channel: row.channel, dailyRevenue: days.length ? Math.round((row._sum.revenue ?? 0) / days.length) : null })) };
    }
    const [before, during, after] = await Promise.all([total(periods.before), total(periods.during), total(periods.after)]);
    const hasChannelData = (await prisma.salesRecord.count()) > 0;
    const channels = hasChannelData ? await Promise.all([byChannel(periods.before), byChannel(periods.during), byChannel(periods.after)]) : null;
    return NextResponse.json({ event: { id: event.id, title: event.title, competitor: event.competitor.name, startAt: event.startAt, endAt: event.endAt, impactEstimate: event.impactEstimate }, days: periods.days, total: { before, during, after }, channels });
  } catch (error) {
    logDatabaseError(error, "경쟁사 결과 확인");
    return NextResponse.json({ error: databaseErrorMessage(error, "결과를 계산하지 못했어요.") }, { status: 500 });
  }
}
