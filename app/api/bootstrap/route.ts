import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/services/data-service";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { databaseErrorMessage, logDatabaseError } from "@/lib/db/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const account = session.user.email ? await prisma.account.findUnique({ where: { email: session.user.email }, select: { id: true } }) : null;
    return NextResponse.json(await getDashboardData(account?.id));
  } catch (error) {
    logDatabaseError(error, "업무 데이터 조회");
    return NextResponse.json({ error: databaseErrorMessage(error, "데이터를 불러오지 못했습니다.") }, { status: 500 });
  }
}
