import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import type { GrammarPart, Difficulty, Question, PartResult, VocabItem } from "@/types"

const MODEL = anthropic("claude-sonnet-4-6")

// 정답 위치를 무작위로 섞어 (A) 편향 제거
function shuffleOptions(q: Question): Question {
  const letters = ["(A)", "(B)", "(C)", "(D)"]
  const texts = q.options.map((o) => o.replace(/^\([A-D]\)\s*/, ""))
  const correctText = q.answer.replace(/^\([A-D]\)\s*/, "")
  // Fisher-Yates shuffle
  const shuffled = [...texts]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  const newOptions = shuffled.map((text, i) => `${letters[i]} ${text}`)
  const newAnswerIdx = shuffled.findIndex((t) => t === correctText)
  const newAnswer = newAnswerIdx >= 0 ? `${letters[newAnswerIdx]} ${correctText}` : q.answer
  return { ...q, options: newOptions, answer: newAnswer }
}

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

중요: 정답이 (A), (B), (C), (D)에 고르게 분포되도록 출제할 것. 같은 세트에서 정답이 동일한 번호에 연속으로 몰리지 않도록 할 것.

각 문제는 반드시 다음 JSON 형식을 따르세요:
{
  "id": 번호,
  "type": "${part}",
  "question": "지시문",
  "sentence": "영문 문장 (빈칸은 _____ 표시)",
  "options": ["(A) ...", "(B) ...", "(C) ...", "(D) ..."],
  "answer": "정답 선택지 전체 (예: (B) has been)",
  "explanation": "왜 이 답이 정답인지 한국어로 상세히 설명 (2~3문장)",
  "trap": "수험생이 자주 헷갈리는 함정 포인트 (1~2문장)",
  "difficulty": "${difficulty}",
  "subType": "세부 출제 유형 (예: 소유격 관계대명사 whose)",
  "discriminationPower": "상|중|하",
  "commonMistake": "자주 하는 실수 설명 (1문장)",
  "relatedPart": ["연관 파트명"],
  "studyDays": 숫자
}

전체 응답은 JSON 배열로만 출력하세요. 다른 텍스트 없이.`

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxOutputTokens: 4000,
  })

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾을 수 없습니다.")

  const questions = JSON.parse(jsonMatch[0]) as Question[]
  return questions.map((q, i) => shuffleOptions({ ...q, id: i + 1 }))
}

// 진단 코멘트 — 문장 배열로 반환
export async function generateDiagnosisComment(
  results: PartResult[],
  systemPrompt?: string
): Promise<string[]> {
  const scoreSummary = results
    .map((r) => `${r.part}: ${r.score}/${r.total}점 (${Math.round((r.score / r.total) * 100)}%)`)
    .join("\n")

  const wrongAnalysis = results.flatMap((r) => r.wrongQuestions).map((q) => ({
    part: q.type,
    subType: q.subType,
    difficulty: q.difficulty,
    commonMistake: q.commonMistake,
    relatedParts: q.relatedPart,
  }))

  const difficultyDist = wrongAnalysis.reduce<Record<string, number>>((acc, q) => {
    acc[q.difficulty] = (acc[q.difficulty] ?? 0) + 1
    return acc
  }, {})

  const subTypeCounts = wrongAnalysis.reduce<Record<string, number>>((acc, q) => {
    acc[q.subType] = (acc[q.subType] ?? 0) + 1
    return acc
  }, {})
  const topSubTypes = Object.entries(subTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => `${type}(${count}회)`)
    .join(", ")

  const mistakePatterns = [...new Set(wrongAnalysis.map((q) => q.commonMistake))].slice(0, 4).join(" / ")

  const relatedCounts = wrongAnalysis.flatMap((q) => q.relatedParts).reduce<Record<string, number>>((acc, p) => {
    acc[p] = (acc[p] ?? 0) + 1
    return acc
  }, {})
  const topRelated = Object.entries(relatedCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([p]) => p)
    .join(", ")

  const prompt = `당신은 편입영어 전문 강사입니다.
단순 점수 읽기가 아니라 오답 패턴과 세부유형을 분석해서 강사 수준의 진단을 내려주세요.

[파트별 점수]
${scoreSummary}

[자주 틀린 세부 유형 TOP5]
${topSubTypes || "없음"}

[난이도별 오답 분포]
초급: ${difficultyDist["초급"] ?? 0}개, 중급: ${difficultyDist["중급"] ?? 0}개, 고급: ${difficultyDist["고급"] ?? 0}개

[반복되는 실수 패턴]
${mistakePatterns || "없음"}

[연관 파트 (함께 보완 필요)]
${topRelated || "없음"}

규칙:
- 점수만 나열하지 말고, 어떤 유형에서 왜 틀리는지 패턴 중심으로 분석하세요
- 잘한 파트와 취약 파트를 명확히 언급하되, 틀린 세부유형을 구체적으로 짚어주세요
- 연관 파트 간 학습 연결고리를 언급하세요
- 격려하되 현실적으로, 4~5문장으로 작성하세요
- 각 문장은 완결된 하나의 생각을 담으세요
- 반말 금지, 존댓말 사용

반드시 다음 JSON 형식으로만 응답하세요. 다른 텍스트 없이.
{
  "sentences": [
    "첫 번째 문장.",
    "두 번째 문장.",
    "세 번째 문장.",
    "네 번째 문장.",
    "다섯 번째 문장."
  ]
}`

  const { text } = await generateText({
    model: MODEL,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    prompt,
    maxOutputTokens: 1500,
  })

  // 마크다운 코드 펜스 제거 후 JSON 추출
  const stripped = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()
  const jsonMatch = stripped.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return [stripped]

  try {
    const parsed = JSON.parse(jsonMatch[0]) as { sentences: string[] }
    return Array.isArray(parsed.sentences) ? parsed.sentences : [stripped]
  } catch {
    // JSON 파싱 실패 시 텍스트에서 문장 직접 추출 시도
    const lines = stripped.split(/\n/).map(l => l.trim()).filter(l => l.length > 10 && !l.startsWith("{") && !l.startsWith("}") && !l.startsWith("[") && !l.startsWith("]") && !l.startsWith('"sentences"'))
    const sentences = lines.map(l => l.replace(/^["]\s*/, "").replace(/["]\s*,?\s*$/, "").trim()).filter(l => l.length > 10)
    return sentences.length > 0 ? sentences : [stripped]
  }
}

// 커리큘럼 생성 — 강사 자료 2레이어 주입
export async function generateCurriculum(
  results: PartResult[],
  targetDate: string,
  dailyMinutes: number,
  teacherMaterial: string = "",
  systemPrompt?: string
): Promise<import("@/types").Curriculum> {
  const today = new Date()
  const target = new Date(targetDate)
  const daysLeft = Math.max(1, Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  const weeksLeft = Math.max(1, Math.floor(daysLeft / 7))

  const scoreSummary = results
    .map((r) => `${r.part}: ${Math.round((r.score / r.total) * 100)}%`)
    .join(", ")

  const studyDaysMap = results.reduce<Record<string, number>>((acc, r) => {
    if (r.wrongQuestions.length > 0) {
      const avg = Math.round(r.wrongQuestions.reduce((s, q) => s + q.studyDays, 0) / r.wrongQuestions.length)
      acc[r.part] = avg
    } else {
      acc[r.part] = 2
    }
    return acc
  }, {})

  const relatedMap = results.reduce<Record<string, string[]>>((acc, r) => {
    const related = r.wrongQuestions.flatMap((q) => q.relatedPart)
    const unique = [...new Set(related)]
    if (unique.length > 0) acc[r.part] = unique
    return acc
  }, {})

  const studyDaysSummary = Object.entries(studyDaysMap)
    .map(([part, days]) => `${part}: ${days}일`)
    .join(", ")

  const relatedSummary = Object.entries(relatedMap)
    .map(([part, related]) => `${part} → 연관: ${related.join(", ")}`)
    .join("\n")

  // 레이어 2: 강사 자료 동적 주입
  const teacherMaterialSection = teacherMaterial.trim()
    ? `\n[강사 추가 자료]\n${teacherMaterial.trim()}\n`
    : ""

  const prompt = `당신은 편입영어 전문 학원 10년 경력 1타 강사입니다.
커리큘럼을 짤 때 반드시 아래 원칙을 따르세요.

[학습 순서 원칙]
- 수일치는 모든 문법의 기초. 무조건 1순위
- 관계사와 수일치는 연결고리가 강함. 인접 주차 배치
- 가정법은 시제 개념이 선행되어야 함. 시제 후 배치
- 분사구문은 중급 이상. 기초 파트 후 배치
- 병렬구조는 독립적. 어느 시점에 넣어도 무방
- 마지막 1~2주는 반드시 통합 실전 문제

[난이도 원칙]
- 초반: 개념 정리 위주, 문제 쉽게
- 중반: 세부 유형 심화
- 후반: 실전 난이도, 복합 문장
${teacherMaterialSection}
[학생 데이터]
파트별 점수: ${scoreSummary}
파트별 평균 학습 필요 일수: ${studyDaysSummary}
연관 파트: ${relatedSummary || "없음"}

남은 기간: ${weeksLeft}주 (${daysLeft}일)
하루 학습 시간: ${dailyMinutes}분

규칙:
- 취약 파트(60% 미만)에 더 많은 주차를 배정하세요
- studyDays가 긴 파트는 2주 이상 배정하세요
- 연관 파트는 인접한 주차에 배치하세요
- 하루 ${dailyMinutes}분 기준 dailyCount를 결정하세요 (30분=5문제, 60분=10문제, 120분=15문제)
- 최대 ${Math.min(weeksLeft, 12)}주 분량만 생성하세요 (12주 초과 금지)
- focusReason은 반드시 1문장으로 간결하게 작성하세요 (50자 이내)

다음 JSON 배열만 출력하세요. 마크다운 코드블록 없이 순수 JSON만:
[
  {
    "weekNum": 1,
    "part": "파트명",
    "dailyCount": 숫자,
    "focusReason": "이유 (1문장)"
  }
]`

  const { text } = await generateText({
    model: MODEL,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    prompt,
    maxOutputTokens: 4096,
  })

  // 마크다운 코드펜스 제거
  const stripped = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim()

  // 완전한 JSON 배열 추출 시도
  const jsonMatch = stripped.match(/\[[\s\S]*\]/)
  let weeks: import("@/types").WeekPlan[]

  if (jsonMatch) {
    try {
      weeks = JSON.parse(jsonMatch[0]) as import("@/types").WeekPlan[]
    } catch {
      // JSON 잘린 경우: 완전한 객체만 추출
      const partialMatches = stripped.matchAll(/\{\s*"weekNum"\s*:\s*(\d+)[\s\S]*?"focusReason"\s*:\s*"([^"]+)"\s*\}/g)
      const extracted: import("@/types").WeekPlan[] = []
      for (const m of partialMatches) {
        try {
          extracted.push(JSON.parse(m[0]))
        } catch { /* skip malformed */ }
      }
      if (extracted.length === 0) throw new Error("커리큘럼 JSON을 파싱할 수 없습니다.")
      weeks = extracted
    }
  } else {
    // 배열 괄호 없이 객체들만 있는 경우
    const partialMatches = stripped.matchAll(/\{\s*"weekNum"\s*:\s*(\d+)[\s\S]*?"focusReason"\s*:\s*"([^"]+)"\s*\}/g)
    const extracted: import("@/types").WeekPlan[] = []
    for (const m of partialMatches) {
      try { extracted.push(JSON.parse(m[0])) } catch { /* skip */ }
    }
    if (extracted.length === 0) throw new Error("커리큘럼 JSON을 파싱할 수 없습니다.")
    weeks = extracted
  }

  return {
    weeks,
    totalWeeks: weeks.length,
    generatedAt: new Date().toISOString(),
  }
}

// 오늘의 단어 생성
export async function generateVocabulary(
  part: GrammarPart,
  count: number = 5,
  systemPrompt?: string
): Promise<VocabItem[]> {
  const prompt = `당신은 편입영어 전문 강사입니다.
${part} 파트 학습과 연관된 핵심 영어 단어 ${count}개를 생성하세요.
편입시험에 자주 출제되는 어휘 중심으로 선택하세요.

각 단어는 반드시 다음 JSON 형식을 따르세요:
{
  "word": "영단어",
  "meaning": "품사 + 한국어 뜻 (예: n. 일치, v. 동의하다)",
  "example": "편입영어 스타일 영문 예문 (단어가 포함된 실제 시험 스타일)",
  "exampleKr": "예문 한국어 해석"
}

JSON 배열만 출력하세요. 다른 텍스트 없이.`

  const { text } = await generateText({
    model: MODEL,
    ...(systemPrompt ? { system: systemPrompt } : {}),
    prompt,
    maxOutputTokens: 1000,
  })

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("단어 JSON 파싱 실패")
  return JSON.parse(jsonMatch[0]) as VocabItem[]
}
