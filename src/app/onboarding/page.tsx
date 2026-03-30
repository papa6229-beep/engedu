"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ExamType, DailyMinutes, ExamSeason } from "@/types"
import { EXAM_SEASON_LABELS, EXAM_SEASON_DATES } from "@/types"

const DAILY_OPTIONS: { label: string; sub: string; value: DailyMinutes }[] = [
  { label: "30분", sub: "5문제/일", value: 30 },
  { label: "1시간", sub: "10문제/일", value: 60 },
  { label: "2시간", sub: "15문제/일", value: 120 },
  { label: "3시간+", sub: "20문제/일", value: 180 },
]

const SEASONS: ExamSeason[] = ["2026-first", "2026-second", "undecided"]

// 색상 토큰 — 디자인 요구사항 그대로
const C = {
  label: "#1a1a1a",
  desc: "#555555",
  inactive: "#999999",
  disabledBtn: "#aaaaaa",
}

export default function OnboardingPage() {
  const router = useRouter()
  const { setOnboarding, resetAll } = useAppStore()

  const [examType, setExamType] = useState<ExamType>("transfer")
  const [examSeason, setExamSeason] = useState<ExamSeason>("2026-first")
  const [dailyMinutes, setDailyMinutes] = useState<DailyMinutes>(60)

  const handleDevSkip = () => {
    setOnboarding({
      examType: "transfer",
      examSeason: "2026-first",
      targetDate: EXAM_SEASON_DATES["2026-first"],
      dailyMinutes: 60,
      targetUniversity: "기타",
      completedAt: new Date().toISOString(),
    })
    router.push("/level-test")
  }

  const handleSubmit = () => {
    setOnboarding({
      examType,
      examSeason,
      targetDate: EXAM_SEASON_DATES[examSeason],
      dailyMinutes,
      targetUniversity: "기타",
      completedAt: new Date().toISOString(),
    })
    router.push("/level-test")
  }

  return (
    <div className="min-h-screen bg-ivory dark:bg-warm-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* 타이틀 */}
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-warm-900 dark:text-ivory mb-2">
            편입AI튜터
          </h1>
          <p className="text-sm font-medium text-warm-500 dark:text-warm-400">
            맞춤 커리큘럼으로 효율적인 편입 준비
          </p>
        </div>

        {/* 진행 흐름 */}
        <div className="mb-8 flex items-center justify-center gap-2 text-sm font-semibold">
          <span className="text-copper-500 underline underline-offset-4 decoration-copper-400">
            ① 레벨테스트
          </span>
          <span style={{ color: C.inactive }}>→</span>
          <span style={{ color: C.inactive }} className="font-medium">② 맞춤진단</span>
          <span style={{ color: C.inactive }}>→</span>
          <span style={{ color: C.inactive }} className="font-medium">③ 커리큘럼 시작</span>
        </div>

        {process.env.NODE_ENV === "development" && (
          <button
            onClick={handleDevSkip}
            className="w-full mb-4 rounded-lg border border-dashed border-warm-300 py-2 text-xs text-warm-400 hover:border-copper-400 hover:text-copper-500 transition-colors"
          >
            [DEV] 기본값으로 건너뛰기
          </button>
        )}

        <button
          onClick={() => {
            if (confirm("모든 학습 데이터를 초기화할까요?\n레벨테스트, 커리큘럼, 학습 기록, 오답 노트가 모두 삭제됩니다.")) {
              resetAll()
            }
          }}
          className="w-full mb-4 rounded-lg border border-dashed border-red-200 py-2 text-xs text-red-300 hover:border-red-400 hover:text-red-500 transition-colors"
        >
          모든 데이터 초기화
        </button>

        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 shadow-sm">
          <CardContent className="pt-7 pb-7 space-y-10">

            {/* 시험 유형 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: C.label }}>
                시험 유형
              </p>
              <div className="flex gap-2">
                {(["transfer", "civil", "suneung"] as ExamType[]).map((type) => {
                  const labels = { transfer: "편입영어", civil: "공무원영어", suneung: "수능영어" }
                  const active = examType === type
                  const disabled = type !== "transfer"
                  return (
                    <button
                      key={type}
                      onClick={() => !disabled && setExamType(type)}
                      disabled={disabled}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold border transition-colors ${
                        active
                          ? "bg-copper-50 border-copper-400 text-copper-600 dark:bg-copper-700/20"
                          : "border-warm-200 dark:border-warm-600"
                      } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
                      style={!active ? { color: disabled ? C.disabledBtn : C.label } : undefined}
                    >
                      {labels[type]}
                      {disabled && (
                        <span className="block text-[10px] font-medium mt-0.5" style={{ color: C.disabledBtn }}>
                          준비 중
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 목표 시험 시즌 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.label }}>
                목표 시험 시즌
              </p>
              <p className="text-xs font-medium mb-3" style={{ color: C.desc }}>
                선택한 시즌까지 맞춤 학습 일정을 만들어드려요
              </p>
              <div className="flex gap-2">
                {SEASONS.map((season) => {
                  const active = examSeason === season
                  return (
                    <button
                      key={season}
                      onClick={() => setExamSeason(season)}
                      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold border transition-colors ${
                        active
                          ? "bg-copper-50 border-copper-400 text-copper-600 dark:bg-copper-700/20"
                          : "border-warm-200 dark:border-warm-600 hover:border-warm-400"
                      }`}
                      style={!active ? { color: C.label } : undefined}
                    >
                      {EXAM_SEASON_LABELS[season]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 하루 학습 시간 */}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: C.label }}>
                하루 학습 가능 시간
              </p>
              <p className="text-xs font-medium mb-3" style={{ color: C.desc }}>
                시간에 따라 주차별 하루 문제 수가 결정됩니다
              </p>
              <div className="grid grid-cols-4 gap-2">
                {DAILY_OPTIONS.map(({ label, sub, value }) => {
                  const active = dailyMinutes === value
                  return (
                    <button
                      key={value}
                      onClick={() => setDailyMinutes(value)}
                      className={`rounded-lg py-2.5 text-center border transition-colors ${
                        active
                          ? "bg-copper-50 border-copper-400 text-copper-600 dark:bg-copper-700/20"
                          : "border-warm-200 dark:border-warm-600 hover:border-warm-400"
                      }`}
                    >
                      <p className="text-sm font-bold" style={!active ? { color: C.label } : undefined}>
                        {label}
                      </p>
                      <p className="text-[10px] font-medium mt-0.5" style={{ color: C.desc }}>
                        {sub}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={handleSubmit}
              className="w-full bg-warm-900 hover:bg-warm-800 dark:bg-ivory dark:hover:bg-warm-100 dark:text-warm-900 text-white font-bold py-3 text-base rounded-xl"
            >
              레벨 테스트 시작 →
            </Button>

          </CardContent>
        </Card>
      </div>
    </div>
  )
}
