import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { assertDatabaseEnvironment } from "@/lib/db/config";
import { logDatabaseError } from "@/lib/db/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    assertDatabaseEnvironment();
    await prisma.user.count();

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    logDatabaseError(error, "DB 상태 확인");
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
