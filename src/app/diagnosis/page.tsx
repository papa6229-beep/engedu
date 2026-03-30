"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { RadarChart } from "@/components/features/RadarChart"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getScorePercent, getPartLabel, getPartColor } from "@/lib/curriculum"
import type { Curriculum, GrammarPart } from "@/types"

export default function DiagnosisPage() {
  const router = useRouter()
  const { getLatestLevelTest, onboarding, setCurriculum } = useAppStore()

  const [sentences, setSentences] = useState<string[]>([])
  const [curriculumData, setCurriculumData] = useState<Curriculum | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingPct, setLoadingPct] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
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
    setLoading(true)
    setErrorMsg(null)
    setLoadingPct(0)

    // 진행바: 최대 90%까지 자동 증가, 완료 시 100%
    const iv = setInterval(() => {
      setLoadingPct((p) => (p >= 88 ? 88 : p + Math.random() * 8 + 2))
    }, 600)

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
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "서버 오류")
      }
      clearInterval(iv)
      setLoadingPct(100)
      setSentences(data.sentences ?? [])
      setCurriculumData(data.curriculum)
    } catch (e) {
      clearInterval(iv)
      setLoadingPct(0)
      setErrorMsg(e instanceof Error ? e.message : "진단 생성 중 오류가 발생했습니다. 다시 시도해주세요.")
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

  if (!levelTest || !onboarding) return null

  const targetDate = new Date(onboarding!.targetDate)
  const dDay = Math.floor((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  // 파트별 강점/취약 맵
  const partLabelMap = levelTest.results.reduce<Record<GrammarPart, "강점" | "보통" | "취약">>((acc, r) => {
    acc[r.part] = getPartLabel(getScorePercent(r))
    return acc
  }, {} as Record<GrammarPart, "강점" | "보통" | "취약">)

  const weeks = curriculumData?.weeks ?? []
  const lastAlone = weeks.length % 3 === 1

  return (
    <div className="min-h-screen bg-ivory dark:bg-warm-900 px-4 py-8 md:px-8 md:py-10">
      {/* 상단 진행바 */}
      {loading && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-warm-200 dark:bg-warm-700">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${loadingPct}%`, background: "#C96442" }}
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto space-y-6">

        {/* 헤더 */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-warm-900 dark:text-ivory">
              진단 리포트
            </h1>
            <p className="text-sm text-warm-500 dark:text-warm-400 mt-1">
              {loading ? "AI가 레벨테스트 결과를 분석 중입니다…" : "레벨테스트 결과를 분석해 맞춤 커리큘럼을 생성했습니다"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-warm-400">목표까지</p>
            <p className="text-2xl font-bold text-copper-500">D-{dDay}</p>
          </div>
        </div>

        {/* 메인 2컬럼 그리드 — 높이 동일하게 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:items-stretch">

          {/* 왼쪽: 레이더 차트 */}
          <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 flex flex-col">
            <CardContent className="pt-5 pb-5 flex flex-col flex-1">
              <p className="text-xs font-bold text-warm-400 uppercase tracking-widest mb-4">
                파트별 점수
              </p>
              <div className="flex-1 flex items-center">
                <RadarChart results={levelTest.results} />
              </div>
            </CardContent>
          </Card>

          {/* 오른쪽: 상세 점수 바 */}
          <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 flex flex-col">
            <CardContent className="pt-5 pb-5 flex flex-col flex-1">
              <p className="text-xs font-bold text-warm-400 uppercase tracking-widest mb-4">
                상세 결과
              </p>
              <div className="flex flex-col justify-center flex-1 space-y-4">
                {levelTest.results.map((r) => {
                  const pct = getScorePercent(r)
                  const label = getPartLabel(pct)
                  const colorClass = getPartColor(pct)
                  const barColor = pct >= 75 ? "#22c55e" : pct >= 50 ? "#C96442" : "#f87171"
                  return (
                    <div key={r.part}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-semibold text-warm-800 dark:text-warm-200">
                          {r.part}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${colorClass}`}>{label}</span>
                          <span className={`text-sm font-bold ${colorClass}`}>
                            {r.score}/{r.total}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: barColor }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI 진단 코멘트 — 왼쪽 브랜드 컬러 세로선 */}
        <div
          className="rounded-2xl border border-copper-100 dark:border-copper-700/30 bg-copper-50 dark:bg-copper-700/10 overflow-hidden flex"
        >
          {/* 4px 브랜드 컬러 세로선 */}
          <div className="w-1 shrink-0" style={{ background: "#C96442" }} />
          <div className="flex-1 px-5 py-5">
            <p className="text-xs font-bold text-copper-500 uppercase tracking-widest mb-3">
              AI 진단
            </p>
            {loading ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full animate-pulse" style={{ background: "#C96442" }} />
                  <span className="text-xs text-copper-500 font-medium">
                    {loadingPct < 40 ? "오답 패턴 분석 중…" : loadingPct < 75 ? "커리큘럼 설계 중…" : "마무리 중…"}
                  </span>
                  <span className="text-xs text-warm-400 ml-auto">{Math.round(loadingPct)}%</span>
                </div>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-4 bg-copper-100 dark:bg-copper-700/20 rounded animate-pulse"
                    style={{ width: i === 4 ? "60%" : "100%" }}
                  />
                ))}
              </div>
            ) : errorMsg ? (
              <div className="space-y-3">
                <p className="text-sm text-red-500">{errorMsg}</p>
                <button
                  onClick={loadDiagnosis}
                  className="text-xs font-bold px-4 py-2 rounded-lg border border-copper-300 text-copper-500 hover:bg-copper-50 dark:hover:bg-copper-700/20 transition-colors"
                >
                  다시 시도
                </button>
              </div>
            ) : (
              <div className="space-y-0">
                {sentences.map((sentence, i) => (
                  <p
                    key={i}
                    className="text-sm text-warm-800 dark:text-warm-200"
                    style={{ lineHeight: 1.8 }}
                  >
                    {sentence}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 맞춤 커리큘럼 */}
        {!loading && !errorMsg && curriculumData && (
          <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
            <CardContent className="pt-5 pb-5">
              <p className="text-xs font-bold text-warm-400 uppercase tracking-widest mb-4">
                맞춤 커리큘럼 — {curriculumData.totalWeeks}주 계획
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {weeks.map((week, idx) => {
                  const partLabel = partLabelMap[week.part as GrammarPart]
                  const isWeak = partLabel === "취약"
                  const isStrong = partLabel === "강점"
                  const isLastAndAlone = lastAlone && idx === weeks.length - 1

                  return (
                    <div
                      key={week.weekNum}
                      className={`rounded-xl border border-warm-200 dark:border-warm-700 bg-warm-50 dark:bg-warm-700/30 px-4 py-3 ${
                        isLastAndAlone ? "col-span-full" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            isWeak
                              ? "border-red-300 text-red-500 dark:border-red-700 dark:text-red-400"
                              : isStrong
                                ? "border-green-300 text-green-600 dark:border-green-700 dark:text-green-400"
                                : "border-copper-200 text-copper-500 dark:border-copper-600"
                          }`}
                        >
                          {week.weekNum}주차
                        </Badge>
                        <span className="text-sm font-bold text-warm-900 dark:text-ivory">
                          {week.part}
                        </span>
                      </div>
                      <p className="text-xs text-warm-500 dark:text-warm-400">
                        일 {week.dailyCount}문제
                      </p>
                      <p className="text-xs text-warm-400 dark:text-warm-500 mt-1 leading-relaxed">
                        {week.focusReason}
                      </p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="flex justify-end">
          <button
            onClick={handleConfirm}
            disabled={loading || !!errorMsg || !curriculumData || confirming}
            className="px-10 py-3.5 rounded-xl text-base font-bold text-white transition-opacity disabled:opacity-40"
            style={{ background: "#1a1a1a" }}
          >
            {confirming ? "저장 중…" : "커리큘럼 확정 → 학습 시작"}
          </button>
        </div>

      </div>
    </div>
  )
}
