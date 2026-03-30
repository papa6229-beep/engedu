import { NextRequest, NextResponse } from "next/server"
import { generateQuestions } from "@/lib/claude"
import type { GenerateQuestionsRequest } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const body: GenerateQuestionsRequest = await req.json()
    const { part, difficulty, count, targetUniversity } = body

    if (!part || !difficulty || !count) {
      return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 })
    }

    const questions = await generateQuestions(part, difficulty, count, targetUniversity)
    return NextResponse.json({ questions })
  } catch (err) {
    console.error("[/api/questions]", err)
    return NextResponse.json({ error: "문제 생성 실패" }, { status: 500 })
  }
}
