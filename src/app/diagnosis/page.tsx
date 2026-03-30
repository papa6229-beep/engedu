"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { RadarChart } from "@/components/features/RadarChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getScorePercent, getPartLabel, getPartColor } from "@/lib/curriculum"
import type { Curriculum } from "@/types"

export default function DiagnosisPage() {
  const router = useRouter()
  const { getLatestLevelTest, onboarding, setCurriculum } = useAppStore()

  const [comment, setComment] = useState("")
  const [curriculumData, setCurriculumData] = useState<Curriculum | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const levelTest = getLatestLevelTest()

  useEffect(() => {
    if (!levelTest || !onboarding) {
      router.replace("/onboarding")
      return
    }
    loadDiagnosis()
  }, [])

  const loadDiagnosis = async () => {
    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results: levelTest!.results,
          targetDate: onboarding!.targetDate,
          dailyMinutes: onboarding!.dailyMinutes,
        }),
      })
      const data = await res.json()
      setComment(data.comment)
      setCurriculumData(data.curriculum)
    } catch {
      setComment("진단 분석 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!curriculumData) return
    setConfirming(true)
    setCurriculum(curriculumData)
    router.push("/dashboard")
  }

  if (!levelTest) return null

  const targetDate = new Date(onboarding!.targetDate)
  const dDay = Math.floor((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-ivory dark:bg-warm-900 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-ivory font-serif">
            진단 리포트
          </h1>
          <p className="text-sm text-warm-500 dark:text-warm-400 mt-1">
            D-{dDay} · {onboarding!.targetUniversity}
          </p>
        </div>

        {/* 레이더 차트 */}
        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
          <CardContent className="pt-4">
            <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">파트별 점수</p>
            <RadarChart results={levelTest.results} />
          </CardContent>
        </Card>

        {/* 파트별 점수 목록 */}
        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
          <CardContent className="pt-4">
            <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">상세 결과</p>
            <div className="space-y-2">
              {levelTest.results.map((r) => {
                const pct = getScorePercent(r)
                const label = getPartLabel(pct)
                const colorClass = getPartColor(pct)
                return (
                  <div key={r.part} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-warm-700 dark:text-warm-300 font-serif">
                      {r.part}
                    </span>
                    <div className="flex-1 h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-copper-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-12 text-right ${colorClass}`}>
                      {pct}점
                    </span>
                    <span className={`text-xs w-8 ${colorClass}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI 진단 코멘트 */}
        <Card className="border-copper-100 dark:border-copper-700/30 bg-copper-50 dark:bg-copper-700/10">
          <CardContent className="pt-4">
            <p className="text-xs text-copper-500 uppercase tracking-wide mb-2">AI 진단</p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-copper-100 dark:bg-copper-700/20 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-warm-800 dark:text-warm-200 leading-relaxed font-serif">
                {comment}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 커리큘럼 미리보기 */}
        {!loading && curriculumData && (
          <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
            <CardContent className="pt-4">
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">
                맞춤 커리큘럼 — {curriculumData.totalWeeks}주 계획
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {curriculumData.weeks.map((week) => (
                  <div key={week.weekNum} className="flex items-start gap-3 text-sm">
                    <Badge
                      variant="outline"
                      className="border-copper-200 text-copper-500 dark:border-copper-600 shrink-0"
                    >
                      {week.weekNum}주차
                    </Badge>
                    <div>
                      <span className="font-medium text-warm-800 dark:text-warm-200 font-serif">
                        {week.part}
                      </span>
                      <span className="text-warm-400 ml-2">
                        일 {week.dailyCount}문제
                      </span>
                      <p className="text-xs text-warm-400 mt-0.5">{week.focusReason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleConfirm}
          disabled={loading || !curriculumData || confirming}
          className="w-full bg-copper-500 hover:bg-copper-600 text-white font-semibold py-3 font-serif"
        >
          {confirming ? "저장 중…" : "커리큘럼 확정 → 학습 시작"}
        </Button>
      </div>
    </div>
  )
}
