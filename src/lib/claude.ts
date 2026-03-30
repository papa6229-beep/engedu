import { generateText, gateway } from "ai"
import type { GrammarPart, Difficulty, Question } from "@/types"

// AI Gateway를 통해 Claude 호출 — VERCEL_OIDC_TOKEN으로 자동 인증
const MODEL = gateway("anthropic/claude-sonnet-4.6")

export const GRAMMAR_PARTS: GrammarPart[] = [
  "관계사", "분사구문", "가정법", "시제", "수일치", "병렬구조",
]

export async function generateQuestions(
  part: GrammarPart,
  difficulty: Difficulty,
  count: number,
  targetUniversity?: string
): Promise<Question[]> {
  const universityContext = targetUniversity && targetUniversity !== "기타"
    ? `대학교별 출제 스타일: ${targetUniversity} 스타일로 출제해주세요.`
    : ""

  const prompt = `당신은 한국 편입영어 전문 강사입니다.
아래 조건에 맞는 편입영어 문법 문제를 ${count}개 생성하세요.

조건:
- 파트: ${part}
- 난이도: ${difficulty}
- 형식: 4지선다 빈칸 완성
${universityContext}

각 문제는 반드시 다음 JSON 형식을 따르세요:
{
  "id": 번호,
  "type": "${part}",
  "question": "지시문 (예: 빈칸에 알맞은 것을 고르시오.)",
  "sentence": "영문 문장 (빈칸은 _____ 표시)",
  "options": ["(A) ...", "(B) ...", "(C) ...", "(D) ..."],
  "answer": "(A) ... (정답 보기 전체)",
  "explanation": "왜 이 답이 정답인지 한국어로 상세히 설명 (2~3문장)",
  "trap": "수험생이 자주 헷갈리는 함정 포인트 (1~2문장)",
  "difficulty": "${difficulty}"
}

전체 응답은 JSON 배열로만 출력하세요. 다른 텍스트 없이.
예시: [{"id":1,...}, {"id":2,...}]`

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 4000,
  })

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾을 수 없습니다.")

  const questions = JSON.parse(jsonMatch[0]) as Question[]
  return questions.map((q, i) => ({ ...q, id: i + 1 }))
}

export async function generateDiagnosisComment(
  results: { part: GrammarPart; score: number; total: number }[]
): Promise<string> {
  const summary = results
    .map((r) => `${r.part}: ${r.score}/${r.total}점`)
    .join(", ")

  const prompt = `당신은 편입영어 전문 강사입니다.
학생의 레벨테스트 결과를 분석하고 3~4문장으로 진단 코멘트를 작성하세요.

결과: ${summary}

규칙:
- 잘한 파트와 부족한 파트를 명확히 언급하세요
- 학생이 듣기 좋도록 격려하되 현실적으로 작성하세요
- 반말 금지, 존댓말 사용
- 순수 텍스트만 출력 (마크다운 없음)`

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 500,
  })

  return text.trim()
}

export async function generateCurriculum(
  results: { part: GrammarPart; score: number; total: number }[],
  targetDate: string,
  dailyMinutes: number
): Promise<import("@/types").Curriculum> {
  const today = new Date()
  const target = new Date(targetDate)
  const daysLeft = Math.max(1, Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  const weeksLeft = Math.max(1, Math.floor(daysLeft / 7))

  const summary = results
    .map((r) => `${r.part}: ${Math.round((r.score / r.total) * 100)}%`)
    .join(", ")

  const prompt = `당신은 편입영어 전문 강사입니다.
학생의 레벨테스트 결과를 바탕으로 주차별 커리큘럼을 생성하세요.

레벨테스트 결과: ${summary}
남은 기간: ${weeksLeft}주 (${daysLeft}일)
하루 학습 시간: ${dailyMinutes}분

규칙:
- 취약 파트(60% 미만)에 더 많은 주차를 배정하세요
- 하루 ${dailyMinutes}분 기준 dailyCount를 결정하세요 (30분=5문제, 60분=10문제, 120분=15문제)
- 최대 ${weeksLeft}주 분량만 생성하세요

다음 JSON 배열만 출력하세요:
[
  {
    "weekNum": 1,
    "part": "파트명",
    "dailyCount": 숫자,
    "focusReason": "이 파트를 집중하는 이유 (1문장)"
  }
]`

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 2000,
  })

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("커리큘럼 JSON을 파싱할 수 없습니다.")

  const weeks = JSON.parse(jsonMatch[0]) as import("@/types").WeekPlan[]

  return {
    weeks,
    totalWeeks: weeks.length,
    generatedAt: new Date().toISOString(),
  }
}
