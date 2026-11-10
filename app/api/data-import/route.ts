import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { assertDatabaseEnvironment } from "@/lib/db/config";
import { databaseErrorMessage, logDatabaseError } from "@/lib/db/errors";
import { denyMessage, hasPermission } from "@/lib/auth/permissions";
import { getDashboardData } from "@/lib/services/data-service";
import { parseInventory, parseSales, type ImportKind } from "@/lib/import/parse";
import { MAX_IMPORT_BYTES, readTable } from "@/lib/import/read-table";
import { applyInventory, applySales } from "@/lib/import/service";

/**
 * 엑셀·CSV 업로드: mode=preview는 읽기만 하고 결과를 돌려주며, mode=apply는 같은 파일로 실제 반영합니다.
 * '데이터 등록' 권한이 필요합니다.
 */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "요청을 확인할 수 없습니다." }, { status: 403 });
  try {
    const email = (await auth())?.user?.email;
    if (!email) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    assertDatabaseEnvironment();
    const account = await prisma.account.findUnique({ where: { email }, select: { id: true, name: true, permissions: true, active: true } });
    if (!account) return NextResponse.json({ error: "로그인을 다시 확인해주세요." }, { status: 401 });
    if (!hasPermission(account, "master")) return NextResponse.json({ error: denyMessage("master") }, { status: 403 });

    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind")) as ImportKind;
    const mode = String(form.get("mode") ?? "preview");
    if (!(file instanceof File)) return NextResponse.json({ error: "파일을 골라주세요." }, { status: 400 });
    if (!["sales", "inventory"].includes(kind)) return NextResponse.json({ error: "지원하지 않는 데이터입니다." }, { status: 400 });
    if (file.size > MAX_IMPORT_BYTES) return NextResponse.json({ error: "5MB 이하 파일만 올릴 수 있어요." }, { status: 400 });

    const table = await readTable(file.name, new Uint8Array(await file.arrayBuffer()));
    const products = await prisma.product.findMany({ select: { id: true, name: true, sku: true } });
    const firstSalesImport = (await prisma.dataImport.count({ where: { kind: "sales" } })) === 0;

    if (kind === "sales") {
      const parsed = parseSales(table, products);
      if (mode === "apply") {
        if (parsed.missing.length) return NextResponse.json({ error: `필요한 열이 없어요: ${parsed.missing.join(", ")}` }, { status: 400 });
        const message = await applySales(prisma, { ...parsed, fileName: file.name, replaceSample: form.get("replaceSample") === "true" }, account);
        return NextResponse.json({ message, data: await getDashboardData(account.id) });
      }
      const dates = parsed.rows.map((row) => row.date).sort();
      const byChannel = new Map<string, number>();
      for (const row of parsed.rows) byChannel.set(row.channel, (byChannel.get(row.channel) ?? 0) + row.revenue);
      return NextResponse.json({ preview: {
        kind, fileName: file.name, headers: table.headers, totalRows: parsed.totalRows, applicable: parsed.rows.length, unmatched: parsed.unmatched, missing: parsed.missing,
        issues: parsed.issues.slice(0, 50), issueCount: parsed.issues.length, period: dates.length ? { start: dates[0], end: dates[dates.length - 1] } : null,
        channels: [...byChannel].map(([channel, revenue]) => ({ channel, revenue })).sort((a, b) => b.revenue - a.revenue),
        sample: parsed.rows.slice(0, 12), firstSalesImport,
      } });
    }

    const parsed = parseInventory(table, products);
    if (mode === "apply") {
      if (parsed.missing.length) return NextResponse.json({ error: `필요한 열이 없어요: ${parsed.missing.join(", ")}` }, { status: 400 });
      const message = await applyInventory(prisma, { ...parsed, fileName: file.name }, account);
      return NextResponse.json({ message, data: await getDashboardData(account.id) });
    }
    const current = await prisma.inventory.findMany({ select: { productId: true, stockQty: true } });
    return NextResponse.json({ preview: {
      kind, fileName: file.name, headers: table.headers, totalRows: parsed.totalRows, applicable: parsed.rows.length, unmatched: 0, missing: parsed.missing,
      issues: parsed.issues.slice(0, 50), issueCount: parsed.issues.length, period: null, channels: [],
      sample: parsed.rows.slice(0, 12).map((row) => ({ ...row, before: current.find((item) => item.productId === row.productId)?.stockQty ?? null })), firstSalesImport,
    } });
  } catch (error) {
    if (error instanceof Error && /파일|시트|엑셀|CSV|줄까지|비어/.test(error.message)) return NextResponse.json({ error: error.message }, { status: 400 });
    logDatabaseError(error, "데이터 업로드");
    return NextResponse.json({ error: databaseErrorMessage(error, "파일을 처리하지 못했어요.") }, { status: 500 });
  }
}
