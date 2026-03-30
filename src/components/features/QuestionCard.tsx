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
  const isCorrect = (option: string) => option === question.answer
  const isWrong = (option: string) =>
    showAnswer && option === selectedOption && !isCorrect(option)
  const isRight = (option: string) =>
    showAnswer && isCorrect(option)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-5">
        <p className="text-xs text-warm-400 mb-2">{question.question}</p>
        <p className="font-serif-en text-base text-warm-900 dark:text-ivory leading-relaxed">
          {question.sentence}
        </p>
      </div>

      <div className="space-y-2">
        {question.options.map((option) => {
          let style =
            "w-full text-left rounded-xl border px-4 py-3 text-sm transition-all "

          if (!showAnswer) {
            style +=
              selectedOption === option
                ? "border-copper-500 bg-copper-50 text-copper-600 dark:bg-copper-700/20 dark:text-copper-300 font-medium"
                : "border-warm-200 dark:border-warm-700 text-warm-700 dark:text-warm-300 hover:border-warm-400 bg-white dark:bg-warm-800"
          } else if (isRight(option)) {
            style += "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 font-medium"
          } else if (isWrong(option)) {
            style += "border-red-400 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-300"
          } else {
            style += "border-warm-200 dark:border-warm-700 text-warm-500 dark:text-warm-400 bg-white dark:bg-warm-800"
          }

          return (
            <button
              key={option}
              onClick={() => !showAnswer && onSelect(option)}
              disabled={showAnswer}
              className={style}
            >
              <span className="font-serif-en">{option}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
