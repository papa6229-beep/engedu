"use client"
import type { Question } from "@/types"

interface QuestionCardProps {
  question: Question
  selectedOption: string | null
  onSelect: (option: string) => void
  showAnswer?: boolean
}

export function QuestionCard({
  question,
  selectedOption,
  onSelect,
  showAnswer = false,
}: QuestionCardProps) {
  return (
    <div className="space-y-4">
      {/* 문제 지문 */}
      <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-6 py-5">
        <p className="text-xs font-semibold text-warm-400 mb-3">{question.question}</p>
        <p className="text-base leading-relaxed text-warm-900 dark:text-ivory">
          {question.sentence}
        </p>
      </div>

      {/* 보기 */}
      <div className="space-y-2.5">
        {question.options.map((option) => {
          const isSelected = selectedOption === option
          const isCorrect = option === question.answer
          const isWrong = showAnswer && isSelected && !isCorrect
          const isRight = showAnswer && isCorrect

          let containerClass =
            "w-full flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all text-left "

          if (showAnswer) {
            if (isRight)
              containerClass += "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
            else if (isWrong)
              containerClass += "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
            else
              containerClass += "border-warm-200 dark:border-warm-700 text-warm-400 dark:text-warm-500 bg-white dark:bg-warm-800"
          } else {
            if (isSelected)
              containerClass += "border-copper-400 bg-copper-50 text-copper-700 dark:bg-copper-700/20 dark:text-copper-300"
            else
              containerClass += "border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-300 hover:border-warm-400 hover:bg-warm-100/50 dark:hover:bg-warm-700/30 bg-white dark:bg-warm-800 cursor-pointer"
          }

          return (
            <button
              key={option}
              onClick={() => !showAnswer && onSelect(option)}
              disabled={showAnswer}
              className={containerClass}
            >
              {/* 왼쪽 인디케이터 */}
              <span className="shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs transition-all"
                style={
                  showAnswer
                    ? isRight
                      ? { borderColor: "#22c55e", background: "#22c55e", color: "#fff" }
                      : isWrong
                        ? { borderColor: "#f87171", background: "#f87171", color: "#fff" }
                        : { borderColor: "#d6d0ca" }
                    : isSelected
                      ? { borderColor: "#C96442", background: "#C96442", color: "#fff" }
                      : { borderColor: "#d6d0ca" }
                }
              >
                {(isSelected || isRight || isWrong) && "✓"}
              </span>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
