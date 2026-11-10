import { randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { assertDatabaseEnvironment } from "@/lib/db/config";
import { databaseErrorMessage, logDatabaseError } from "@/lib/db/errors";
import { denyMessage, hasPermission, normalizePermissions, ROLES } from "@/lib/auth/permissions";

const roleKeys = ROLES.map((role) => role.key) as [string, ...string[]];
const accountFields = { id: true, name: true, email: true, role: true, permissions: true, active: true, lastLoginAt: true, createdAt: true } as const;

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), name: z.string().trim().min(2).max(60), email: z.string().trim().email().max(254), role: z.enum(roleKeys), permissions: z.array(z.string()).max(20) }),
  z.object({ action: z.literal("update"), id: z.string().min(1), name: z.string().trim().min(2).max(60), role: z.enum(roleKeys), permissions: z.array(z.string()).max(20), active: z.boolean() }),
  z.object({ action: z.literal("reset-password"), id: z.string().min(1) }),
]);

/** 사람이 옮겨 적기 쉬운 임시 비밀번호(헷갈리는 0/O, 1/l 제외). 관리자에게 한 번만 보여주고 저장하지 않습니다. */
function temporaryPassword() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const pick = (set: string, count: number) => Array.from({ length: count }, () => set[randomInt(set.length)]).join("");
  return `${pick(letters, 4)}-${pick(digits, 4)}-${pick(letters, 4)}`;
}

async function currentAdmin() {
  const email = (await auth())?.user?.email;
  if (!email) return { error: NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  assertDatabaseEnvironment();
  const me = await prisma.account.findUnique({ where: { email }, select: { id: true, permissions: true, active: true } });
  if (!me) return { error: NextResponse.json({ error: "로그인을 다시 확인해주세요." }, { status: 401 }) };
  if (!hasPermission(me, "users")) return { error: NextResponse.json({ error: denyMessage("users") }, { status: 403 }) };
  return { me };
}

/** 사용자 관리 권한이 있는 활성 계정이 최소 1명 남는지 확인합니다. */
async function wouldLeaveNoAdmin(targetId: string, next: { permissions: string[]; active: boolean }) {
  if (next.active && next.permissions.includes("users")) return false;
  const others = await prisma.account.count({ where: { id: { not: targetId }, active: true, permissions: { has: "users" } } });
  return others === 0;
}

export async function GET() {
  try {
    const { error } = await currentAdmin();
    if (error) return error;
    const accounts = await prisma.account.findMany({ select: accountFields, orderBy: [{ active: "desc" }, { createdAt: "asc" }] });
    return NextResponse.json({ accounts });
  } catch (error) {
    logDatabaseError(error, "사용자 목록");
    return NextResponse.json({ error: databaseErrorMessage(error, "사용자 목록을 불러오지 못했습니다.") }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "요청을 확인할 수 없습니다." }, { status: 403 });
  try {
    const { me, error } = await currentAdmin();
    if (error) return error;
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "이름·이메일·역할을 확인해주세요." }, { status: 400 });
    const command = parsed.data;

    if (command.action === "create") {
      const password = temporaryPassword();
      const account = await prisma.account.create({ data: {
        name: command.name, email: command.email.toLowerCase(), role: command.role,
        permissions: normalizePermissions(command.permissions), passwordHash: await hashPassword(password),
      }, select: accountFields });
      return NextResponse.json({ message: `${account.name}님을 등록했습니다. 임시 비밀번호를 전달해주세요.`, account, temporaryPassword: password }, { status: 201 });
    }

    if (command.action === "update") {
      const permissions = normalizePermissions(command.permissions);
      if (command.id === me.id && (!command.active || !permissions.includes("users"))) {
        return NextResponse.json({ error: "내 계정의 사용 중지나 사용자 관리 권한 해제는 다른 관리자가 해야 합니다." }, { status: 400 });
      }
      if (await wouldLeaveNoAdmin(command.id, { permissions, active: command.active })) {
        return NextResponse.json({ error: "사용자 관리 권한을 가진 사용자가 최소 1명은 있어야 합니다." }, { status: 400 });
      }
      const account = await prisma.account.update({ where: { id: command.id }, data: { name: command.name, role: command.role, permissions, active: command.active }, select: accountFields });
      return NextResponse.json({ message: `${account.name}님의 ${account.active ? "권한을 저장했습니다" : "사용을 중지했습니다"}.`, account });
    }

    const password = temporaryPassword();
    const account = await prisma.account.update({ where: { id: command.id }, data: { passwordHash: await hashPassword(password) }, select: accountFields });
    return NextResponse.json({ message: `${account.name}님의 비밀번호를 재설정했습니다. 새 임시 비밀번호를 전달해주세요.`, account, temporaryPassword: password });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") return NextResponse.json({ error: "이미 등록된 이메일입니다." }, { status: 409 });
    logDatabaseError(error, "사용자 관리");
    return NextResponse.json({ error: databaseErrorMessage(error, "요청을 처리하지 못했습니다.") }, { status: 500 });
  }
}
