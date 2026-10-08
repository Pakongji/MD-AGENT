import { NextResponse } from "next/server";
import { z } from "zod";
import { getAIProvider } from "@/lib/ai";

const bodySchema = z.object({ input: z.string().min(3).max(3000) });

export async function POST(request: Request) {
  try {
    const { input } = bodySchema.parse(await request.json());
    const provider = getAIProvider();
    return NextResponse.json({ provider: provider.name, result: await provider.planTasks(input) });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "업무 내용을 3자 이상 입력해주세요." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "업무 계획을 만들지 못했습니다." }, { status: 500 });
  }
}
