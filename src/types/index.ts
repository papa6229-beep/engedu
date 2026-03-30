// ── 온보딩 ──────────────────────────────────────────────
export type ExamType = "transfer" | "civil" | "suneung"
export type DailyMinutes = 30 | 60 | 120 | 180

export interface OnboardingData {
  examType: ExamType
  targetDate: string        // ISO 날짜 "YYYY-MM-DD"
  dailyMinutes: DailyMinutes
  targetUniversity: string
  completedAt: string       // ISO timestamp
}

// ── 레벨 테스트 ─────────────────────────────────────────
export type GrammarPart =
  | "관계사"
  | "분사구문"
  | "가정법"
  | "시제"
  | "수일치"
  | "병렬구조"

export type Difficulty = "초급" | "중급" | "고급"

export interface Question {
  id: number
  type: GrammarPart
  question: string
  sentence: string
  options: string[]         // ["(A)...", "(B)...", "(C)...", "(D)..."]
  answer: string            // "(A)..."
  explanation: string
  trap: string
  difficulty: Difficulty
}

export interface PartResult {
  part: GrammarPart
  score: number             // 정답 수
  total: number             // 총 문항 수
  wrongQuestions: Question[]
}

export interface LevelTestResult {
  results: PartResult[]
  testedAt: string
}

// ── 커리큘럼 ─────────────────────────────────────────────
export interface WeekPlan {
  weekNum: number
  part: GrammarPart
  dailyCount: number        // 하루 문제 수
  focusReason: string       // 이 파트를 집중하는 이유
}

export interface Curriculum {
  weeks: WeekPlan[]
  totalWeeks: number
  generatedAt: string
}

// ── 일일 세션 ─────────────────────────────────────────────
export interface DailySession {
  date: string              // "YYYY-MM-DD"
  part: GrammarPart
  completed: boolean
  score: number
  totalQuestions: number
  durationSec: number
}

// ── 오답 노트 ─────────────────────────────────────────────
export interface WrongNote {
  question: Question
  wrongCount: number
  lastWrongAt: string
  nextReviewAt: string      // 다음 복습일 "YYYY-MM-DD"
}

// ── 주간 리포트 ───────────────────────────────────────────
export interface WeeklyReport {
  weekStart: string         // "YYYY-MM-DD" (월요일)
  summary: {
    totalQuestions: number
    correctRate: number
    studyDays: number
  }
  partScores: { part: GrammarPart; score: number }[]
  topMistakes: { part: GrammarPart; count: number }[]
  aiComment: string
  generatedAt: string
}

// ── Claude API 요청/응답 ──────────────────────────────────
export interface GenerateQuestionsRequest {
  part: GrammarPart
  difficulty: Difficulty
  count: number
  targetUniversity?: string
}

export interface GenerateQuestionsResponse {
  questions: Question[]
}

export interface DiagnosisRequest {
  results: PartResult[]
  targetDate: string
  dailyMinutes: DailyMinutes
}

export interface DiagnosisResponse {
  comment: string
  curriculum: Curriculum
}
