import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  OnboardingData, LevelTestResult, Curriculum,
  DailySession, WrongNote, WeeklyReport, Question,
} from "@/types"
import { getKoreanDateStr } from "@/lib/utils"

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
  addDailySession: (session: DailySession) => void       // upsert by date
  addWrongNote: (question: Question) => void
  markReviewed: (questionId: number, correct: boolean) => void
  addWeeklyReport: (report: WeeklyReport) => void
  resetAll: () => void

  // 계산
  isOnboarded: () => boolean
  hasCompletedLevelTest: () => boolean
  getLatestLevelTest: () => LevelTestResult | null
  getDueReviewNotes: () => WrongNote[]
  getTodaySession: () => DailySession | null
}

const addDays = (date: Date, days: number): string => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return getKoreanDateStr(d)
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

      // 같은 날짜 세션이 있으면 덮어쓰기 (upsert by date)
      addDailySession: (session) =>
        set((s) => ({
          dailySessions: s.dailySessions.some((d) => d.date === session.date)
            ? s.dailySessions.map((d) => d.date === session.date ? session : d)
            : [...s.dailySessions, session],
        })),

      addWrongNote: (question) =>
        set((s) => {
          const now = new Date()
          const existing = s.wrongNotes.find((n) => n.question.id === question.id)
          if (existing) {
            return {
              wrongNotes: s.wrongNotes.map((n) =>
                n.question.id === question.id
                  ? {
                      ...n,
                      wrongCount: n.wrongCount + 1,
                      lastWrongAt: now.toISOString(),
                      nextReviewAt: addDays(now, 1), // 재오답: 내일 복습
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
                lastWrongAt: now.toISOString(),
                nextReviewAt: getKoreanDateStr(now), // 신규 오답: 오늘 바로 복습 가능
              },
            ],
          }
        }),

      // 복습 후 다음 복습일 업데이트 (맞으면 간격 늘리기, 틀리면 내일)
      // wrongCount >= 3 이고 맞으면 완전 학습으로 삭제
      markReviewed: (questionId, correct) =>
        set((s) => {
          const today = new Date()
          const note = s.wrongNotes.find((n) => n.question.id === questionId)
          if (correct && note && note.wrongCount >= 3) {
            return { wrongNotes: s.wrongNotes.filter((n) => n.question.id !== questionId) }
          }
          return {
            wrongNotes: s.wrongNotes.map((n) => {
              if (n.question.id !== questionId) return n
              const days = correct ? 3 : 1
              return { ...n, nextReviewAt: addDays(today, days) }
            }),
          }
        }),

      addWeeklyReport: (report) =>
        set((s) => ({ weeklyReports: [...s.weeklyReports, report] })),

      resetAll: () => set({
        onboarding: null,
        levelTests: [],
        curriculum: null,
        dailySessions: [],
        wrongNotes: [],
        weeklyReports: [],
      }),

      isOnboarded: () => get().onboarding !== null,

      hasCompletedLevelTest: () => get().levelTests.length > 0,

      getLatestLevelTest: () => {
        const tests = get().levelTests
        return tests.length > 0 ? tests[tests.length - 1] : null
      },

      getDueReviewNotes: () => {
        const today = getKoreanDateStr()
        return get().wrongNotes.filter((n) => n.nextReviewAt <= today)
      },

      getTodaySession: () => {
        const today = getKoreanDateStr()
        return get().dailySessions.find((s) => s.date === today) ?? null
      },
    }),
    { name: "english-ai-tutor" }
  )
)
