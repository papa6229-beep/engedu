import { NextRequest, NextResponse } from "next/server"
import { generateDiagnosisComment, generateCurriculum } from "@/lib/claude"
import type { DiagnosisRequest } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const body: DiagnosisRequest = await req.json()
    const { results, targetDate, dailyMinutes } = body

    const [comment, curriculum] = await Promise.all([
      generateDiagnosisComment(results),
      generateCurriculum(results, targetDate, dailyMinutes),
    ])

    return NextResponse.json({ comment, curriculum })
  } catch (err) {
    console.error("[/api/diagnosis]", err)
    return NextResponse.json({ error: "진단 생성 실패" }, { status: 500 })
  }
}
