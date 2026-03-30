"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { QuestionCard } from "@/components/features/QuestionCard"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { GRAMMAR_PARTS } from "@/lib/claude"
import type { GrammarPart, Question, PartResult } from "@/types"

const QUESTIONS_PER_PART = 4

type TestStatus = "loading" | "testing" | "submitting" | "done"

export default function LevelTestPage() {
  const router = useRouter()
  const { onboarding, addLevelTestResult } = useAppStore()

  const [status, setStatus] = useState<TestStatus>("loading")
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [currentIdx, setCurrentIdx] = useState(0)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!onboarding) { router.replace("/onboarding"); return }
    loadQuestions()
  }, [])

  const loadQuestions = async () => {
    setStatus("loading")
    setError("")
    try {
      const allQuestions: Question[] = []
      let idCounter = 1

      for (const part of GRAMMAR_PARTS) {
        const res = await fetch("/api/questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            part,
            difficulty: "중급",
            count: QUESTIONS_PER_PART,
            targetUniversity: onboarding?.targetUniversity,
          }),
        })
        if (!res.ok) throw new Error(`${part} 문제 생성 실패`)
        const { questions: partQs } = await res.json()
        allQuestions.push(...partQs.map((q: Question) => ({ ...q, id: idCounter++, type: part as GrammarPart })))
      }

      setQuestions(allQuestions)
      setStatus("testing")
    } catch {
      setError("문제를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.")
      setStatus("testing")
    }
  }

  const handleSelect = (option: string) => {
    const q = questions[currentIdx]
    setAnswers((prev) => ({ ...prev, [q.id]: option }))

    if (currentIdx < questions.length - 1) {
      setTimeout(() => setCurrentIdx((i) => i + 1), 400)
    }
  }

  const handleSubmit = () => {
    setStatus("submitting")
    const results: PartResult[] = GRAMMAR_PARTS.map((part) => {
      const partQs = questions.filter((q) => q.type === part)
      const score = partQs.filter((q) => answers[q.id] === q.answer).length
      const wrongQuestions = partQs.filter((q) => answers[q.id] !== q.answer)
      return { part, score, total: partQs.length, wrongQuestions }
    })

    addLevelTestResult({ results, testedAt: new Date().toISOString() })
    router.push("/diagnosis")
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-ivory dark:bg-warm-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-4xl animate-pulse">📝</div>
          <p className="text-warm-600 dark:text-warm-300 font-serif">
            AI가 문제를 생성하고 있습니다…
          </p>
          <p className="text-xs text-warm-400">6개 파트 × 4문항 생성 중</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-red-500">{error}</p>
          <Button onClick={loadQuestions} className="bg-copper-500 hover:bg-copper-600 text-white">
            다시 시도
          </Button>
        </div>
      </div>
    )
  }

  const progress = questions.length > 0 ? ((currentIdx + 1) / questions.length) * 100 : 0
  const currentQuestion = questions[currentIdx]
  const isLastQuestion = currentIdx === questions.length - 1
  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id])

  return (
    <div className="min-h-screen bg-ivory dark:bg-warm-900 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-bold text-warm-900 dark:text-ivory font-serif">
              레벨 테스트
            </h1>
            <span className="text-sm text-warm-500">
              {currentIdx + 1} / {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-1.5 bg-warm-200" />
          <p className="mt-1 text-xs text-copper-500 font-medium">
            {currentQuestion?.type}
          </p>
        </div>

        {currentQuestion && (
          <QuestionCard
            question={currentQuestion}
            selectedOption={answers[currentQuestion.id] ?? null}
            onSelect={handleSelect}
            showAnswer={false}
          />
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            disabled={currentIdx === 0}
            className="text-sm text-warm-400 disabled:opacity-30 hover:text-warm-700"
          >
            ← 이전
          </button>

          {isLastQuestion ? (
            <Button
              onClick={handleSubmit}
              disabled={!allAnswered || status === "submitting"}
              className="bg-copper-500 hover:bg-copper-600 text-white font-semibold px-8"
            >
              {status === "submitting" ? "채점 중…" : "채점하기"}
            </Button>
          ) : (
            <button
              onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
              className="text-sm text-warm-500 hover:text-warm-700"
            >
              다음 →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
