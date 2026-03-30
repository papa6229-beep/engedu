"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useAppStore } from "@/lib/store"
import type { GrammarPart } from "@/types"

const MOCK_LEVEL_TEST = {
  results: [
    { part: "관계사" as GrammarPart, score: 2, total: 4, wrongQuestions: [] },
    { part: "분사구문" as GrammarPart, score: 4, total: 4, wrongQuestions: [] },
    { part: "가정법" as GrammarPart, score: 1, total: 4, wrongQuestions: [] },
    { part: "시제" as GrammarPart, score: 3, total: 4, wrongQuestions: [] },
    { part: "수일치" as GrammarPart, score: 0, total: 4, wrongQuestions: [] },
    { part: "병렬구조" as GrammarPart, score: 4, total: 4, wrongQuestions: [] },
  ],
  testedAt: new Date().toISOString(),
}

const MOCK_CURRICULUM = {
  weeks: [
    { weekNum: 1, part: "수일치" as GrammarPart, dailyCount: 10, focusReason: "0점으로 가장 취약" },
    { weekNum: 2, part: "가정법" as GrammarPart, dailyCount: 10, focusReason: "25%로 집중 필요" },
    { weekNum: 3, part: "관계사" as GrammarPart, dailyCount: 10, focusReason: "50%로 보완 필요" },
  ],
  totalWeeks: 3,
  generatedAt: new Date().toISOString(),
}

const targetDate = (() => {
  const d = new Date()
  d.setMonth(d.getMonth() + 3)
  return d.toISOString().split("T")[0]
})()

export function DevPanel() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { setOnboarding, addLevelTestResult, setCurriculum } = useAppStore()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const seedAll = () => {
    setOnboarding({
      examType: "transfer",
      examSeason: "2026-first",
      targetDate,
      dailyMinutes: 60,
      targetUniversity: "기타",
      completedAt: new Date().toISOString(),
    })
    addLevelTestResult(MOCK_LEVEL_TEST)
    setCurriculum(MOCK_CURRICULUM)
  }

  const pages = [
    { label: "온보딩", href: "/onboarding" },
    { label: "레벨테스트", href: "/level-test", seed: () => setOnboarding({ examType: "transfer", examSeason: "2026-first", targetDate, dailyMinutes: 60, targetUniversity: "기타", completedAt: new Date().toISOString() }) },
    { label: "진단리포트", href: "/diagnosis", seed: () => { setOnboarding({ examType: "transfer", examSeason: "2026-first", targetDate, dailyMinutes: 60, targetUniversity: "기타", completedAt: new Date().toISOString() }); addLevelTestResult(MOCK_LEVEL_TEST) } },
    { label: "대시보드", href: "/dashboard", seed: seedAll },
    { label: "오늘 학습", href: "/today", seed: seedAll },
    { label: "학습 달력", href: "/calendar", seed: seedAll },
    { label: "진도 통계", href: "/progress", seed: seedAll },
    { label: "리포트", href: "/report", seed: seedAll },
  ]

  const adminPages = [
    { label: "커리큘럼 설정", href: "/admin/curriculum" },
    { label: "문제 업로드", href: "/admin/upload" },
  ]

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-1 rounded-xl border border-dashed border-amber-400 bg-amber-50 p-3 shadow-lg text-xs font-mono">
      <div className="flex items-center justify-between mb-1">
        <p className="text-amber-600 font-bold">DEV</p>
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 transition-colors"
          title="다크/라이트 전환"
        >
          {mounted ? (theme === "dark" ? "☀️" : "🌙") : "🌙"}
        </button>
      </div>

      {pages.map(({ label, href, seed }) => (
        <button
          key={href}
          onClick={() => { seed?.(); router.push(href) }}
          className="text-left px-2 py-1 rounded hover:bg-amber-100 text-amber-800 transition-colors"
        >
          → {label}
        </button>
      ))}

      <hr className="border-amber-200 my-1" />
      <p className="text-amber-500 text-[10px] font-bold uppercase tracking-wider px-1">Admin</p>
      {adminPages.map(({ label, href }) => (
        <button
          key={href}
          onClick={() => router.push(href)}
          className="text-left px-2 py-1 rounded hover:bg-amber-100 text-amber-700 transition-colors"
        >
          ⚙ {label}
        </button>
      ))}

      <hr className="border-amber-200 my-1" />
      <button
        onClick={() => { seedAll(); router.push("/dashboard") }}
        className="px-2 py-1 rounded bg-amber-200 hover:bg-amber-300 text-amber-900 font-semibold transition-colors"
      >
        전체 데이터 주입 → 대시보드
      </button>
    </div>
  )
}
