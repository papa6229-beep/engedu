"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { ExamType, DailyMinutes } from "@/types"

const UNIVERSITIES = ["건국대", "홍익대", "중앙대", "경희대", "기타"]
const DAILY_OPTIONS: { label: string; value: DailyMinutes }[] = [
  { label: "30분", value: 30 },
  { label: "1시간", value: 60 },
  { label: "2시간", value: 120 },
  { label: "3시간 이상", value: 180 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { setOnboarding } = useAppStore()

  const [examType, setExamType] = useState<ExamType>("transfer")
  const [targetDate, setTargetDate] = useState("")
  const [dailyMinutes, setDailyMinutes] = useState<DailyMinutes>(60)
  const [targetUniversity, setTargetUniversity] = useState("기타")
  const [error, setError] = useState("")

  const dDay = targetDate
    ? Math.floor((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const handleSubmit = () => {
    if (!targetDate) { setError("목표 시험일을 입력해주세요."); return }
    if (dDay !== null && dDay < 0) { setError("시험일이 오늘보다 이전입니다."); return }
    setOnboarding({
      examType, targetDate, dailyMinutes, targetUniversity,
      completedAt: new Date().toISOString(),
    })
    router.push("/level-test")
  }

  return (
    <div className="min-h-screen bg-ivory dark:bg-warm-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-warm-900 dark:text-ivory font-serif mb-2">
            편입AI튜터
          </h1>
          <p className="text-warm-500 dark:text-warm-400 text-sm">
            맞춤 커리큘럼으로 효율적인 편입 준비
          </p>
        </div>

        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 shadow-sm">
          <CardContent className="pt-6 space-y-6">

            {/* 시험 유형 */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">시험 유형</p>
              <div className="flex gap-2">
                {(["transfer", "civil", "suneung"] as ExamType[]).map((type) => {
                  const labels = { transfer: "편입영어", civil: "공무원영어", suneung: "수능영어" }
                  return (
                    <button
                      key={type}
                      onClick={() => setExamType(type)}
                      disabled={type !== "transfer"}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors
                        ${examType === type
                          ? "bg-copper-50 border-copper-500 text-copper-500 dark:bg-copper-700/20"
                          : "border-warm-200 text-warm-400 dark:border-warm-600"
                        }
                        ${type !== "transfer" ? "opacity-40 cursor-not-allowed" : ""}
                      `}
                    >
                      {labels[type]}
                      {type !== "transfer" && (
                        <span className="block text-[10px] text-warm-300">준비 중</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 목표 시험일 */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">목표 시험일</p>
              <input
                type="date"
                value={targetDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => { setTargetDate(e.target.value); setError("") }}
                className="w-full rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-700 px-3 py-2 text-sm text-warm-900 dark:text-ivory focus:outline-none focus:ring-1 focus:ring-copper-500"
              />
              {dDay !== null && dDay >= 0 && (
                <p className="mt-1 text-xs text-copper-500">
                  D-{dDay} · {Math.ceil(dDay / 7)}주 남음
                </p>
              )}
            </div>

            {/* 하루 학습시간 */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">하루 학습 가능 시간</p>
              <div className="grid grid-cols-2 gap-2">
                {DAILY_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setDailyMinutes(value)}
                    className={`rounded-lg py-2 text-sm border transition-colors
                      ${dailyMinutes === value
                        ? "bg-copper-50 border-copper-500 text-copper-500 dark:bg-copper-700/20"
                        : "border-warm-200 text-warm-600 dark:border-warm-600 dark:text-warm-300 hover:border-warm-400"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 목표 대학 */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">
                목표 대학 <span className="text-warm-300">(선택)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {UNIVERSITIES.map((univ) => (
                  <button
                    key={univ}
                    onClick={() => setTargetUniversity(univ)}
                    className={`rounded-full px-3 py-1 text-sm border transition-colors
                      ${targetUniversity === univ
                        ? "bg-copper-50 border-copper-500 text-copper-500 dark:bg-copper-700/20"
                        : "border-warm-200 text-warm-600 dark:border-warm-600 dark:text-warm-300 hover:border-warm-400"
                      }`}
                  >
                    {univ}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              onClick={handleSubmit}
              className="w-full bg-copper-500 hover:bg-copper-600 text-white font-semibold py-3"
            >
              레벨 테스트 시작 →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
