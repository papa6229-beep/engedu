"use client"
import { useState } from "react"
import { useAppStore } from "@/lib/store"
import { AppShell } from "@/components/layout/AppShell"
import { getPartForDate, getThisWeekDates } from "@/lib/curriculum"
import { getKoreanDateStr } from "@/lib/utils"
import type { GrammarPart } from "@/types"

const BRAND = "#C96442"
const DAYS_KO = ["월", "화", "수", "목", "금", "토", "일"]

const PART_COLORS: Record<GrammarPart, string> = {
  관계사: "#6366f1",
  분사구문: "#0ea5e9",
  가정법: "#8b5cf6",
  시제: "#f59e0b",
  수일치: "#10b981",
  병렬구조: "#f43f5e",
}

function getCalendarGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDow = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1 // 월=0
  const grid: (Date | null)[] = []
  for (let i = 0; i < startDow; i++) grid.push(null)
  for (let d = 1; d <= lastDay.getDate(); d++) grid.push(new Date(year, month, d))
  while (grid.length % 7 !== 0) grid.push(null)
  return grid
}

export default function CalendarPage() {
  const { curriculum, dailySessions } = useAppStore()
  const todayStr = getKoreanDateStr()

  const [current, setCurrent] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const [selected, setSelected] = useState<string | null>(todayStr)

  const grid = getCalendarGrid(current.year, current.month)
  const weekDates = getThisWeekDates()

  const getSessionForDate = (dateStr: string) =>
    dailySessions.find((s) => s.date === dateStr)

  const getPartFor = (dateStr: string): GrammarPart | null =>
    curriculum ? getPartForDate(curriculum, dateStr) : null

  const prevMonth = () =>
    setCurrent((c) => {
      const d = new Date(c.year, c.month - 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const nextMonth = () =>
    setCurrent((c) => {
      const d = new Date(c.year, c.month + 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })

  const selectedSession = selected ? getSessionForDate(selected) : null
  const selectedPart = selected ? getPartFor(selected) : null

  return (
    <AppShell>
      <div className="space-y-5 pb-8">
        {/* 헤더 + 월 이동 */}
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700 text-warm-500">
            ‹
          </button>
          <h2 className="font-bold text-warm-900 dark:text-ivory">
            {current.year}년 {current.month + 1}월
          </h2>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-warm-100 dark:hover:bg-warm-700 text-warm-500">
            ›
          </button>
        </div>

        {/* 달력 */}
        <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 overflow-hidden">
          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 border-b border-warm-100 dark:border-warm-700">
            {DAYS_KO.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-warm-400 py-2">{d}</div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7">
            {grid.map((date, i) => {
              if (!date) return <div key={i} className="h-14" />
              const dateStr = getKoreanDateStr(date)
              const session = getSessionForDate(dateStr)
              const part = getPartFor(dateStr)
              const isToday = dateStr === todayStr
              const isSelected = dateStr === selected
              const isCompleted = session?.completed

              return (
                <button
                  key={dateStr}
                  onClick={() => setSelected(dateStr)}
                  className="h-14 flex flex-col items-center justify-start pt-1.5 gap-0.5 border-r border-b border-warm-100 dark:border-warm-700 transition-colors hover:bg-warm-50 dark:hover:bg-warm-700/40 last:border-r-0"
                  style={isSelected ? { background: "#FFF5F2" } : {}}
                >
                  <span
                    className="text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full"
                    style={
                      isToday
                        ? { background: BRAND, color: "#fff" }
                        : isSelected
                          ? { color: BRAND, fontWeight: 700 }
                          : { color: date.getDay() === 6 ? "#60a5fa" : date.getDay() === 0 ? "#f87171" : undefined }
                    }
                  >
                    {date.getDate()}
                  </span>
                  {part && (
                    <span
                      className="text-[9px] font-bold px-1 rounded"
                      style={{ background: PART_COLORS[part] + "22", color: PART_COLORS[part] }}
                    >
                      {part}
                    </span>
                  )}
                  {isCompleted && <span className="text-[10px]">✅</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* 선택 날짜 상세 */}
        {selected && (
          <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-5 py-4 space-y-3">
            <p className="text-xs font-bold text-warm-400 uppercase tracking-wide">
              {new Date(selected + "T00:00:00").toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "long" })}
            </p>
            {selectedPart ? (
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: PART_COLORS[selectedPart] + "20", color: PART_COLORS[selectedPart] }}
                >
                  {selectedPart}
                </span>
                {selectedSession?.completed ? (
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✅ 완료</span>
                ) : selected <= todayStr ? (
                  <span className="text-xs text-warm-400">미완료</span>
                ) : (
                  <span className="text-xs text-warm-300">예정</span>
                )}
              </div>
            ) : selectedSession ? (
              /* [5] 커리큘럼 외여도 학습 데이터 있으면 표시 */
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: PART_COLORS[selectedSession.part] + "20", color: PART_COLORS[selectedSession.part] }}
                >
                  {selectedSession.part}
                </span>
                {selectedSession.completed
                  ? <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✅ 완료</span>
                  : <span className="text-xs text-warm-400">미완료</span>}
              </div>
            ) : (
              <p className="text-sm text-warm-400">학습 기록이 없습니다.</p>
            )}
            {selectedSession && (
              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-warm-100 dark:border-warm-700">
                <div className="text-center">
                  <p className="text-lg font-bold text-warm-800 dark:text-ivory">{selectedSession.totalQuestions}</p>
                  <p className="text-xs text-warm-400">문제 수</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold" style={{ color: "#16a34a" }}>
                    {Math.round((selectedSession.score / selectedSession.totalQuestions) * 100)}%
                  </p>
                  <p className="text-xs text-warm-400">정답률</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-warm-800 dark:text-ivory">
                    {Math.floor(selectedSession.durationSec / 60)}분
                  </p>
                  <p className="text-xs text-warm-400">학습 시간</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 이번 주 타임라인 */}
        <div>
          <p className="text-xs font-bold text-warm-400 uppercase tracking-wide mb-3">이번 주</p>
          <div className="grid grid-cols-7 gap-1.5">
            {weekDates.map((dateStr, i) => {
              const session = getSessionForDate(dateStr)
              const part = getPartFor(dateStr)
              const isToday = dateStr === todayStr
              const d = new Date(dateStr + "T00:00:00")

              return (
                <button
                  key={dateStr}
                  onClick={() => { setSelected(dateStr); setCurrent({ year: d.getFullYear(), month: d.getMonth() }) }}
                  className="rounded-xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-2 text-center space-y-1 transition-colors hover:border-warm-400"
                  style={isToday ? { borderColor: BRAND } : {}}
                >
                  <p className="text-[10px] font-semibold text-warm-400">{DAYS_KO[i]}</p>
                  <p
                    className="text-sm font-bold"
                    style={{ color: isToday ? BRAND : undefined }}
                  >
                    {d.getDate()}
                  </p>
                  {part && (
                    <p
                      className="text-[8px] font-bold"
                      style={{ color: PART_COLORS[part] }}
                    >
                      {part}
                    </p>
                  )}
                  {session?.completed
                    ? <p className="text-[10px]">✅</p>
                    : dateStr < todayStr
                      ? <p className="text-[10px] text-warm-300">—</p>
                      : <div className="h-3" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </AppShell>
  )
}
