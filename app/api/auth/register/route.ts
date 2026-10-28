import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(60),
  email: z.string().trim().email().max(254),
  password: z.string().min(10).max(128),
});

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "요청을 확인할 수 없습니다." }, { status: 403 });
  }

  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "이름, 이메일 또는 비밀번호 형식을 확인해주세요." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  try {
    await prisma.account.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
    return NextResponse.json({ message: "회원가입이 완료됐습니다." }, { status: 201 });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "이미 가입된 이메일입니다." }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ error: "회원가입을 처리하지 못했습니다." }, { status: 500 });
  }
}