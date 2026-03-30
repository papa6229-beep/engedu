import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  OnboardingData, LevelTestResult, Curriculum,
  DailySession, WrongNote, WeeklyReport, Question,
} from "@/types"

interface AppState {
  // 데이터
  onboarding: OnboardingData | null
  levelTests: LevelTestResult[]
  curriculum: Curriculum | null
  dailySessions: DailySession[]
  wrongNotes: WrongNote[]
  weeklyReports: WeeklyReport[]

  // 액션
  setOnboarding: (data: OnboardingData) => void
  addLevelTestResult: (result: LevelTestResult) => void
  setCurriculum: (curriculum: Curriculum) => void
  addDailySession: (session: DailySession) => void
  addWrongNote: (question: Question) => void
  addWeeklyReport: (report: WeeklyReport) => void

  // 계산
  isOnboarded: () => boolean
  hasCompletedLevelTest: () => boolean
  getLatestLevelTest: () => LevelTestResult | null
  getDueReviewNotes: () => WrongNote[]
}

const addDays = (date: Date, days: number): string => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboarding: null,
      levelTests: [],
      curriculum: null,
      dailySessions: [],
      wrongNotes: [],
      weeklyReports: [],

      setOnboarding: (data) => set({ onboarding: data }),

      addLevelTestResult: (result) =>
        set((s) => ({ levelTests: [...s.levelTests, result] })),

      setCurriculum: (curriculum) => set({ curriculum }),

      addDailySession: (session) =>
        set((s) => ({ dailySessions: [...s.dailySessions, session] })),

      addWrongNote: (question) =>
        set((s) => {
          const today = new Date()
          const existing = s.wrongNotes.find((n) => n.question.id === question.id)
          if (existing) {
            return {
              wrongNotes: s.wrongNotes.map((n) =>
                n.question.id === question.id
                  ? {
                      ...n,
                      wrongCount: n.wrongCount + 1,
                      lastWrongAt: today.toISOString(),
                      nextReviewAt: addDays(today, 1),
                    }
                  : n
              ),
            }
          }
          return {
            wrongNotes: [
              ...s.wrongNotes,
              {
                question,
                wrongCount: 1,
                lastWrongAt: today.toISOString(),
                nextReviewAt: addDays(today, 1),
              },
            ],
          }
        }),

      addWeeklyReport: (report) =>
        set((s) => ({ weeklyReports: [...s.weeklyReports, report] })),

      isOnboarded: () => get().onboarding !== null,

      hasCompletedLevelTest: () => get().levelTests.length > 0,

      getLatestLevelTest: () => {
        const tests = get().levelTests
        return tests.length > 0 ? tests[tests.length - 1] : null
      },

      getDueReviewNotes: () => {
        const today = new Date().toISOString().split("T")[0]
        return get().wrongNotes.filter((n) => n.nextReviewAt <= today)
      },
    }),
    { name: "english-ai-tutor" }
  )
)
