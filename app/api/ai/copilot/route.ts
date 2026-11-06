import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import { understandQuestion } from "@/lib/ai/intent";
import { prisma } from "@/lib/db/prisma";
import { getDashboardData } from "@/lib/services/data-service";
import { auth } from "@/auth";
import { databaseErrorMessage, logDatabaseError } from "@/lib/db/errors";

const bodySchema = z.object({ question: z.string().min(2).max(1000), page: z.string().max(100).default("/") });

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    const input = bodySchema.parse(await request.json());
    const provider = getAIProvider();
    const data = await getDashboardData();
    const understood = understandQuestion(input.question, [...new Set(data.products.map((item) => item.category))], data.products.map((item) => item.name));
    const answer = { ...(await provider.answer(input.question, input.page, data)), understood };
    const conversation = await prisma.aIConversation.create({ data: { question: input.question, answer: JSON.stringify(answer), context: input.page } });
    return NextResponse.json({ provider: provider.name, answer, conversation });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "질문을 2자 이상 입력해주세요." }, { status: 400 });
    logDatabaseError(error, "AI 대화 저장");
    return NextResponse.json({ error: databaseErrorMessage(error, "답변을 만들지 못했습니다.") }, { status: 500 });
  }
}
