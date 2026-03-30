"use client"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent } from "@/components/ui/card"
import { getTodayWeekPlan, getThisWeekDates } from "@/lib/curriculum"
import { getKoreanDateStr } from "@/lib/utils"
import type { GrammarPart } from "@/types"

const BRAND = "#C96442"

function scoreColor(pct: number) {
  if (pct >= 70) return "#16a34a"
  if (pct >= 40) return "#d97706"
  return "#dc2626"
}

const PART_COLORS: Record<GrammarPart, string> = {
  관계사: "#6366f1", 분사구문: "#0ea5e9", 가정법: "#8b5cf6",
  시제: "#f59e0b", 수일치: "#10b981", 병렬구조: "#f43f5e",
}

export default function DashboardPage() {
  const router = useRouter()
  const { onboarding, curriculum, dailySessions } = useAppStore()

  const today = new Date()
  const todayStr = getKoreanDateStr()                         // [4] 한국 시간 기준
  const todayLabel = today.toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" })

  const targetDate = onboarding ? new Date(onboarding.targetDate) : null
  const dDay = targetDate ? Math.floor((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  const weekPlan = curriculum ? getTodayWeekPlan(curriculum) : null
  const weekDates = getThisWeekDates()

  const isSunday = today.getDay() === 0
  const thisWeekSessions = weekDates.map((d) => dailySessions.find((s) => s.date === d))
  const weekAccuracies = thisWeekSessions.map((s) =>
    s && s.totalQuestions > 0 ? Math.round((s.score / s.totalQuestions) * 100) : null
  )
  const todaySession = dailySessions.find((s) => s.date === todayStr)
  const isTodayDone = todaySession?.completed

  // [6] 전체 커리큘럼 진행 현황
  const isWeekCompleted = (weekNum: number): boolean => {
    if (!curriculum) return false
    const start = new Date(curriculum.generatedAt)
    const ws = new Date(start); ws.setDate(start.getDate() + (weekNum - 1) * 7)
    const we = new Date(ws); we.setDate(ws.getDate() + 6)
    const wsStr = getKoreanDateStr(ws)
    const weStr = getKoreanDateStr(we)
    return dailySessions.some((s) => s.date >= wsStr && s.date <= weStr && s.completed)
  }

  const currentWeekNum = weekPlan?.weekNum ?? 1
  const totalWeeks = curriculum?.totalWeeks ?? 0
  const completedWeeks = curriculum?.weeks.filter((w) => isWeekCompleted(w.weekNum)).length ?? 0
  const progressPct = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0

  return (
    <AppShell>
      <div className="space-y-5 pb-6">
        {/* 헤더 */}
        <div>
          <p className="text-xs text-warm-400">{todayLabel}</p>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-ivory mt-1">
            {isTodayDone ? "오늘도 수고했어요! 🎉" : "오늘도 화이팅!"}
          </h1>
          {dDay !== null && (
            <p className="text-sm mt-1" style={{ color: BRAND }}>
              D-{dDay} · {onboarding?.targetUniversity}
            </p>
          )}
        </div>

        {/* 일요일 배너 */}
        {isSunday && (
          <button
            onClick={() => router.push("/level-test")}
            className="w-full rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 text-left flex items-center gap-3"
          >
            <span className="text-xl">📊</span>
            <div>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">이번 주 미니 레벨 체크를 해보세요</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">실력 변화를 확인하고 커리큘럼을 업데이트하세요</p>
            </div>
            <span className="ml-auto text-amber-400">›</span>
          </button>
        )}

        {/* 오늘의 학습 시작하기 */}
        {curriculum && weekPlan && (
          <button
            onClick={() => router.push("/today")}
            className="w-full rounded-2xl p-5 text-left text-white transition-opacity active:opacity-80"
            style={{ background: `linear-gradient(135deg, ${BRAND}, #a84e35)` }}
          >
            <p className="text-xs font-semibold opacity-80 mb-1">{weekPlan.part} · {weekPlan.dailyCount}문제</p>
            <p className="text-lg font-bold">
              {isTodayDone ? "오늘 학습 다시 보기" : "오늘의 학습 시작하기"} →
            </p>
            <p className="text-xs opacity-70 mt-1">{weekPlan.focusReason}</p>
          </button>
        )}

        {/* 이번 주 학습 현황 */}
        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
          <CardContent className="pt-4">
            <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">이번 주 학습 현황</p>
            <div className="grid grid-cols-7 gap-1">
              {["월", "화", "수", "목", "금", "토", "일"].map((day, i) => {
                const session = thisWeekSessions[i]
                const dateStr = weekDates[i]
                const isToday = dateStr === todayStr
                return (
                  <div key={day} className="flex flex-col items-center gap-1">
                    <p className="text-[10px] text-warm-400">{day}</p>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors"
                      style={
                        session?.completed
                          ? { background: "#16a34a", borderColor: "#16a34a", color: "#fff" }
                          : isToday
                            ? { borderColor: BRAND, color: BRAND }
                            : { borderColor: "#e5e0da", color: "#c8c1b8" }
                      }
                    >
                      {session?.completed ? "✓" : new Date(dateStr + "T00:00:00").getDate()}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 이번 주 정답률 미니 그래프 */}
        {weekAccuracies.some((v) => v !== null) && (
          <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
            <CardContent className="pt-4">
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">이번 주 정답률</p>
              <div className="flex items-end gap-1.5 h-12">
                {weekAccuracies.map((acc, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full rounded-t relative" style={{ height: acc !== null ? `${Math.max(4, acc * 0.4)}px` : "4px" }}>
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-t"
                        style={{ height: "100%", background: acc !== null ? scoreColor(acc) : "#e5e0da", opacity: acc !== null ? 1 : 0.3 }}
                      />
                    </div>
                    {acc !== null && (
                      <p className="text-[9px] font-bold" style={{ color: scoreColor(acc) }}>{acc}%</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {["월", "화", "수", "목", "금", "토", "일"].map((d) => (
                  <p key={d} className="flex-1 text-center text-[10px] text-warm-300">{d}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* [6] 전체 커리큘럼 진행 현황 */}
        {curriculum && curriculum.weeks.length > 0 && (
          <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-warm-400 uppercase tracking-wide">전체 커리큘럼 진행</p>
                <p className="text-xs font-semibold text-warm-600 dark:text-warm-300">
                  {totalWeeks}주 중 {completedWeeks}주 완료 ({progressPct}%)
                </p>
              </div>
              {/* 전체 진도 바 */}
              <div className="h-1.5 rounded-full bg-warm-100 dark:bg-warm-700 overflow-hidden mb-4">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%`, background: BRAND }}
                />
              </div>
              {/* 주차 카드 가로 스크롤 */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                {curriculum.weeks.map((w) => {
                  const done = isWeekCompleted(w.weekNum)
                  const isCurrent = w.weekNum === currentWeekNum
                  const partColor = PART_COLORS[w.part]

                  return (
                    <div
                      key={w.weekNum}
                      className="flex-shrink-0 w-24 rounded-xl border p-2.5 text-center space-y-1"
                      style={
                        done
                          ? { background: "#f0fdf4", borderColor: "#bbf7d0" }
                          : isCurrent
                            ? { borderColor: BRAND, borderWidth: 2 }
                            : { borderColor: "#e5e0da" }
                      }
                    >
                      {isCurrent && !done && (
                        <div
                          className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full whitespace-nowrap inline-block"
                          style={{ background: BRAND }}
                        >
                          진행중
                        </div>
                      )}
                      <p className="text-[10px] text-warm-400">{w.weekNum}주차</p>
                      <p
                        className="text-xs font-bold"
                        style={{ color: done ? "#16a34a" : isCurrent ? BRAND : partColor }}
                      >
                        {done ? "✓" : w.part}
                      </p>
                      {done && <p className="text-[10px] text-green-600">{w.part}</p>}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
