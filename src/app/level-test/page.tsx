"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { QuestionCard } from "@/components/features/QuestionCard"
import { LEVEL_TEST_QUESTIONS } from "@/lib/levelTestQuestions"
import { GRAMMAR_PARTS } from "@/lib/claude"
import type { PartResult } from "@/types"

export default function LevelTestPage() {
  const router = useRouter()
  const { onboarding, addLevelTestResult } = useAppStore()

  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!onboarding) router.replace("/onboarding")
  }, [])

  const questions = LEVEL_TEST_QUESTIONS
  const currentQuestion = questions[currentIdx]
  const progress = ((currentIdx + 1) / questions.length) * 100
  const isLastQuestion = currentIdx === questions.length - 1
  const currentAnswer = answers[currentQuestion?.id]
  const allAnswered = questions.every((q) => answers[q.id])

  const handleSelect = (option: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: option }))
  }

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx((i) => i + 1)
    }
  }

  const handleSubmit = () => {
    setSubmitting(true)
    const results: PartResult[] = GRAMMAR_PARTS.map((part) => {
      const partQs = questions.filter((q) => q.type === part)
      const score = partQs.filter((q) => answers[q.id] === q.answer).length
      const wrongQuestions = partQs.filter((q) => answers[q.id] !== q.answer)
      return { part, score, total: partQs.length, wrongQuestions }
    })
    addLevelTestResult({ results, testedAt: new Date().toISOString() })
    router.push("/diagnosis")
  }

  return (
    <div className="min-h-screen flex flex-col bg-ivory dark:bg-warm-900">
      {/* 상단 헤더 + 프로그레스 */}
      <div className="px-4 pt-5 pb-3 max-w-xl mx-auto w-full">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-warm-900 dark:text-ivory">
            레벨 테스트
          </h1>
          <span className="text-sm font-medium text-warm-500">
            {currentIdx + 1} / {questions.length}
          </span>
        </div>

        {/* 프로그레스 바 — 6px, 브랜드 컬러 */}
        <div className="w-full h-[6px] rounded-full bg-warm-200 dark:bg-warm-700 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: "#C96442" }}
          />
        </div>

      </div>

      {/* 문제 영역 — 세로 중앙 정렬 */}
      <div className="flex-1 flex flex-col justify-center px-4 pb-28 max-w-xl mx-auto w-full">
        {currentQuestion && (
          <div className="space-y-2">
            {/* 파트 뱃지 */}
            <span className="inline-block text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: "#FDF1EB", color: "#C96442" }}>
              {currentQuestion.type}
            </span>
            <QuestionCard
              question={currentQuestion}
              selectedOption={currentAnswer ?? null}
              onSelect={handleSelect}
              showAnswer={false}
            />
          </div>
        )}
      </div>

      {/* 하단 고정 네비게이션 */}
      <div className="fixed bottom-0 left-0 right-0 bg-ivory dark:bg-warm-900 border-t border-warm-100 dark:border-warm-800 px-4 py-4">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="shrink-0 text-sm font-medium text-warm-400 disabled:opacity-30 hover:text-warm-700 px-2"
          >
            ← 이전
          </button>

          {isLastQuestion ? (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="flex-1 rounded-xl py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-30"
              style={{ background: "#1a1a1a" }}
            >
              {submitting ? "채점 중…" : "채점하기"}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!currentAnswer}
              className="flex-1 rounded-xl py-3.5 text-base font-bold text-white transition-opacity disabled:opacity-30"
              style={{ background: "#1a1a1a" }}
            >
              다음 →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
