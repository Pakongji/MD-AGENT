import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/services/data-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getDashboardData());
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "데이터를 불러오지 못했습니다. DB 초기화를 확인해주세요." }, { status: 500 });
  }
}
