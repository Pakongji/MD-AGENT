import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai";
import { prisma } from "@/lib/db/prisma";
import { getDashboardData } from "@/lib/services/data-service";

const bodySchema = z.object({ question: z.string().min(2).max(1000), page: z.string().max(100).default("/") });

export async function POST(request: Request) {
  try {
    const input = bodySchema.parse(await request.json());
    const provider = getAIProvider();
    const answer = await provider.answer(input.question, input.page, await getDashboardData());
    const conversation = await prisma.aIConversation.create({ data: { question: input.question, answer: JSON.stringify(answer), context: input.page } });
    return NextResponse.json({ provider: provider.name, answer, conversation });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "질문을 2자 이상 입력해주세요." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "답변을 만들지 못했습니다." }, { status: 500 });
  }
}
