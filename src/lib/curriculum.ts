import type { PartResult } from "@/types"

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
