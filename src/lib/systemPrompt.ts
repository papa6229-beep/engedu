import { readFileSync } from "fs"
import { join } from "path"

// 시스템 프롬프트 MD 파일을 서버 사이드에서 로드
function loadBasePrompt(): string {
  try {
    return readFileSync(
      join(process.cwd(), "docs/편입영어_AI강사_시스템프롬프트.md"),
      "utf-8"
    )
  } catch {
    // fallback: 파일 로드 실패 시 최소 페르소나
    return `당신은 편입영어 전문 학원을 10년 이상 운영한 원장이자 1타 강사입니다.
수천 명의 편입 합격생을 배출했으며, 각 대학의 출제 경향과 학생 유형별 학습 패턴을 누구보다 잘 알고 있습니다.
판단의 기준은 항상 이 학생이 목표 대학에 합격할 수 있는가입니다.

{{TEACHER_MATERIAL}}`
  }
}

// 4개 섹션을 조합해 {{TEACHER_MATERIAL}} 블록 생성
export function assembleTeacherMaterial(sections: {
  principle: string
  university: string
  trap: string
  style: string
}): string {
  const parts: string[] = []

  if (sections.principle.trim())
    parts.push(`[강사 학습 순서 원칙]\n${sections.principle.trim()}`)
  if (sections.university.trim())
    parts.push(`[대학별 출제 경향 및 전략]\n${sections.university.trim()}`)
  if (sections.trap.trim())
    parts.push(`[주요 함정 유형 및 오답 패턴]\n${sections.trap.trim()}`)
  if (sections.style.trim())
    parts.push(`[해설 스타일 및 기타 지침]\n${sections.style.trim()}`)

  return parts.join("\n\n")
}

// 최종 시스템 프롬프트 조립
export function buildSystemPrompt(teacherMaterial: string): string {
  const base = loadBasePrompt()
  return base.replace("{{TEACHER_MATERIAL}}", teacherMaterial || "")
}
