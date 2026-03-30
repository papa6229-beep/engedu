"use client"
import { useState, useEffect } from "react"
import { useAppStore } from "@/lib/store"
import { AppShell } from "@/components/layout/AppShell"
import { getKoreanDateStr } from "@/lib/utils"
import type { DailySession, GrammarPart } from "@/types"

const BRAND = "#C96442"
const PARTS: GrammarPart[] = ["관계사", "분사구문", "가정법", "시제", "수일치", "병렬구조"]

function scoreColor(pct: number) {
  if (pct >= 70) return "#16a34a"
  if (pct >= 40) return "#d97706"
  return "#dc2626"
}

function getWeekStart(offset = 0): string {
  const d = new Date()
  const dow = d.getDay() === 0 ? 6 : d.getDay() - 1
  d.setDate(d.getDate() - dow - offset * 7)
  return getKoreanDateStr(d)
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00")
  d.setDate(d.getDate() + 6)
  return getKoreanDateStr(d)
}

function weekAccuracy(sessions: DailySession[], start: string, end: string): number {
  const ws = sessions.filter((s) => s.date >= start && s.date <= end && s.completed && s.totalQuestions > 0)
  if (!ws.length) return 0
  return Math.round(ws.reduce((acc, s) => acc + s.score / s.totalQuestions, 0) / ws.length * 100)
}

export default function ProgressPage() {
  const { dailySessions, wrongNotes, levelTests } = useAppStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const completedSessions = dailySessions.filter((s) => s.completed)

  // 요약 카드 데이터
  const totalDays = completedSessions.length

  const ws0 = getWeekStart(0)
  const we0 = getWeekEnd(ws0)
  const thisWeekAcc = weekAccuracy(dailySessions, ws0, we0)

  const wrongCount = wrongNotes.length

  // 파트별 정답률 (daily sessions 기준)
  const latestTest = levelTests[levelTests.length - 1]
  const partStats = PARTS.map((part) => {
    const sessions = completedSessions.filter((s) => s.part === part && s.totalQuestions > 0)
    if (sessions.length > 0) {
      const acc = Math.round(sessions.reduce((a, s) => a + s.score / s.totalQuestions, 0) / sessions.length * 100)
      return { part, accuracy: acc, sessions: sessions.length }
    }
    // 레벨테스트 기반 fallback
    const r = latestTest?.results.find((r) => r.part === part)
    if (r) return { part, accuracy: Math.round((r.score / r.total) * 100), sessions: 0 }
    return { part, accuracy: 0, sessions: 0 }
  })

  // [7] 주간 데이터 (최근 4주) — 데이터 없는 주는 null
  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const start = getWeekStart(3 - i)
    const end = getWeekEnd(start)
    const d = new Date(start + "T00:00:00")
    const acc = weekAccuracy(dailySessions, start, end)
    return {
      week: `${d.getMonth() + 1}/${d.getDate()}`,
      accuracy: acc > 0 ? acc : null as number | null,
    }
  })

  // recharts 동적 임포트 (SSR 회피)
  const [ChartComponents, setChartComponents] = useState<{
    LineChart: React.ElementType
    Line: React.ElementType
    XAxis: React.ElementType
    YAxis: React.ElementType
    CartesianGrid: React.ElementType
    Tooltip: React.ElementType
    ResponsiveContainer: React.ElementType
  } | null>(null)

  useEffect(() => {
    import("recharts").then((m) => {
      setChartComponents({
        LineChart: m.LineChart,
        Line: m.Line,
        XAxis: m.XAxis,
        YAxis: m.YAxis,
        CartesianGrid: m.CartesianGrid,
        Tooltip: m.Tooltip,
        ResponsiveContainer: m.ResponsiveContainer,
      })
    })
  }, [])

  return (
    <AppShell>
      <div className="space-y-5 pb-8">
        <h1 className="text-xl font-bold text-warm-900 dark:text-ivory">진도 & 통계</h1>

        {/* 요약 카드 3개 */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "총 학습일", value: `${totalDays}일`, color: BRAND },
            { label: "이번 주 정답률", value: `${thisWeekAcc}%`, color: scoreColor(thisWeekAcc) },
            { label: "오답 누적", value: `${wrongCount}개`, color: wrongCount > 20 ? "#dc2626" : "#d97706" },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-4 text-center"
            >
              <p className="text-xl font-bold" style={{ color }}>{value}</p>
              <p className="text-[11px] text-warm-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* 파트별 정답률 */}
        <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-5 py-4 space-y-3">
          <p className="text-xs font-bold text-warm-400 uppercase tracking-wide">파트별 정답률</p>
          {partStats.map(({ part, accuracy, sessions }) => (
            <div key={part} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-warm-700 dark:text-warm-300 font-medium">{part}</span>
                <div className="flex items-center gap-2">
                  {/* [7] 데이터 출처 태그 */}
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
                    style={sessions > 0
                      ? { background: "#dcfce7", color: "#16a34a" }
                      : { background: "#f5f5f4", color: "#a8a29e" }}
                  >
                    {sessions > 0 ? "학습 기준" : "레벨테스트 기준"}
                  </span>
                  <span className="font-bold" style={{ color: scoreColor(accuracy) }}>{accuracy}%</span>
                </div>
              </div>
              <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${accuracy}%`, background: scoreColor(accuracy) }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 주간 정답률 그래프 */}
        <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-5 py-4 space-y-3">
          <p className="text-xs font-bold text-warm-400 uppercase tracking-wide">주간 정답률 변화</p>
          {mounted && ChartComponents ? (
            <div className="h-44">
              <ChartComponents.ResponsiveContainer width="100%" height="100%">
                <ChartComponents.LineChart data={weeklyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <ChartComponents.CartesianGrid strokeDasharray="3 3" stroke="#e5e0da" />
                  <ChartComponents.XAxis
                    dataKey="week"
                    tick={{ fontSize: 11, fill: "#9e9691" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartComponents.YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#9e9691" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ChartComponents.Tooltip
                    formatter={(v: number) => [`${v}%`, "정답률"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e0da" }}
                  />
                  <ChartComponents.Line
                    type="monotone"
                    dataKey="accuracy"
                    stroke={BRAND}
                    strokeWidth={2.5}
                    connectNulls={false}
                    dot={{ r: 4, fill: BRAND }}
                    activeDot={{ r: 6 }}
                  />
                </ChartComponents.LineChart>
              </ChartComponents.ResponsiveContainer>
            </div>
          ) : (
            // 데이터 폴백 (로딩 전 또는 recharts 없을 때)
            <div className="space-y-2">
              {weeklyData.map(({ week, accuracy }) => (
                <div key={week} className="flex items-center gap-3">
                  <span className="text-xs text-warm-400 w-10">{week}</span>
                  <div className="flex-1 h-2 rounded-full bg-warm-100 dark:bg-warm-700 overflow-hidden">
                    {accuracy !== null && (
                      <div className="h-full rounded-full" style={{ width: `${accuracy}%`, background: BRAND }} />
                    )}
                  </div>
                  <span className="text-xs font-semibold text-warm-600 dark:text-warm-300 w-10 text-right">
                    {accuracy !== null ? `${accuracy}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          )}
          {weeklyData.every((w) => w.accuracy === 0) && (
            <p className="text-xs text-warm-400 text-center pt-2">아직 학습 데이터가 없습니다.</p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
