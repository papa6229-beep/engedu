import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 60 // 60초 타임아웃 (두 번의 Claude 호출)
import { generateDiagnosisComment, generateCurriculum } from "@/lib/claude"
import { getSettings } from "@/lib/supabase"
import { assembleTeacherMaterial, buildSystemPrompt } from "@/lib/systemPrompt"
import type { PartResult } from "@/types"

interface DiagnosisRequestBody {
  results: PartResult[]
  targetDate: string
  dailyMinutes: number
}

export async function POST(req: NextRequest) {
  try {
    const body: DiagnosisRequestBody = await req.json()
    const { results, targetDate, dailyMinutes } = body

    // 강사 자료 4개 키 일괄 로드
    const settings = await getSettings([
      "teacher_principle",
      "teacher_university",
      "teacher_trap",
      "teacher_style",
    ])

    const teacherMaterial = assembleTeacherMaterial({
      principle: settings.teacher_principle,
      university: settings.teacher_university,
      trap: settings.teacher_trap,
      style: settings.teacher_style,
    })

    const systemPrompt = buildSystemPrompt(teacherMaterial)

    const [sentences, curriculum] = await Promise.all([
      generateDiagnosisComment(results, systemPrompt),
      generateCurriculum(results, targetDate, dailyMinutes, teacherMaterial, systemPrompt),
    ])

    return NextResponse.json({ sentences, curriculum })
  } catch (err) {
    console.error("[/api/diagnosis]", err)
    return NextResponse.json({ error: "진단 생성 실패" }, { status: 500 })
  }
}
