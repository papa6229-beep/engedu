import type { PartResult, Curriculum, WeekPlan, GrammarPart } from "@/types"
import { getKoreanDateStr } from "@/lib/utils"

export const getScorePercent = (result: PartResult): number =>
  Math.round((result.score / result.total) * 100)

export const getWeakParts = (results: PartResult[]): PartResult[] =>
  results.filter((r) => getScorePercent(r) < 60)

export const getStrongParts = (results: PartResult[]): PartResult[] =>
  results.filter((r) => getScorePercent(r) >= 70)

export const getPartLabel = (percent: number): "강점" | "보통" | "취약" => {
  if (percent >= 70) return "강점"
  if (percent >= 40) return "보통"
  return "취약"
}

export const getPartColor = (percent: number): string => {
  if (percent >= 70) return "text-green-600 dark:text-green-400"
  if (percent >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-red-500 dark:text-red-400"
}

// 오늘 날짜 기준 현재 커리큘럼 주차 반환
export function getTodayWeekPlan(curriculum: Curriculum): WeekPlan | null {
  if (!curriculum.weeks.length) return null
  const start = new Date(curriculum.generatedAt)
  const today = new Date()
  const daysDiff = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const weekNum = Math.max(1, Math.floor(daysDiff / 7) + 1)
  const clamped = Math.min(weekNum, curriculum.totalWeeks)
  return curriculum.weeks.find((w) => w.weekNum === clamped) ?? curriculum.weeks[0]
}

// 특정 날짜의 커리큘럼 파트 반환
export function getPartForDate(curriculum: Curriculum, dateStr: string): GrammarPart | null {
  if (!curriculum.weeks.length) return null
  const start = new Date(curriculum.generatedAt)
  const target = new Date(dateStr)
  const daysDiff = Math.floor((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 0) return null
  const weekNum = Math.min(Math.floor(daysDiff / 7) + 1, curriculum.totalWeeks)
  return curriculum.weeks.find((w) => w.weekNum === weekNum)?.part ?? null
}

// 이번 주 월~일 날짜 배열 (YYYY-MM-DD)
export function getThisWeekDates(): string[] {
  const today = new Date()
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1 // 월=0
  const monday = new Date(today)
  monday.setDate(today.getDate() - dow)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return getKoreanDateStr(d)
  })
}
