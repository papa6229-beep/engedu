"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { AppShell } from "@/components/layout/AppShell"
import { QuestionCard } from "@/components/features/QuestionCard"
import { saveDailySession, saveWrongNote, deleteWrongNote, getWrongNotes } from "@/lib/supabase"
import { getTodayWeekPlan } from "@/lib/curriculum"
import { getKoreanDateStr } from "@/lib/utils"
import type { Question, VocabItem, Difficulty, WrongNote } from "@/types"

type TabType = "study" | "review" | "vocab"
type StudyPhase = "idle" | "loading" | "studying" | "done" | "error"

const BRAND = "#C96442"

function difficultyFromPct(pct: number): Difficulty {
  if (pct < 40) return "초급"
  if (pct < 70) return "중급"
  return "고급"
}

// 정오답 피드백 배너
function FeedbackBanner({ correct, correctAnswer }: { correct: boolean; correctAnswer: string }) {
  if (correct) {
    return (
      <div className="rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2"
        style={{ background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
        ✓ 정답입니다!
      </div>
    )
  }
  return (
    <div className="rounded-xl px-4 py-3 text-sm font-bold flex items-center gap-2"
      style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" }}>
      ✗ 오답입니다 — 정답은 {correctAnswer}
    </div>
  )
}

export default function TodayPage() {
  const router = useRouter()
  const { curriculum, getLatestLevelTest, getDueReviewNotes, addDailySession, addWrongNote, markReviewed } = useAppStore()

  const todayKr = getKoreanDateStr()
  const weekPlan = curriculum ? getTodayWeekPlan(curriculum) : null
  const levelTest = getLatestLevelTest()
  const partResult = levelTest?.results.find((r) => r.part === weekPlan?.part)
  const pct = partResult ? Math.round((partResult.score / partResult.total) * 100) : 50
  const difficulty = difficultyFromPct(pct)

  const [activeTab, setActiveTab] = useState<TabType>("study")

  // ── [1] 오늘의 문제 ─────────────────────────────────────
  const [studyPhase, setStudyPhase] = useState<StudyPhase>("idle")
  const [questions, setQuestions] = useState<Question[]>([])
  const [studyIdx, setStudyIdx] = useState(0)
  const [studySelected, setStudySelected] = useState<string | null>(null)
  const [studyShowAnswer, setStudyShowAnswer] = useState(false)
  const [studyCorrect, setStudyCorrect] = useState(0)
  const startTime = useRef(Date.now())

  // [2] 로딩 프로그레스 바 (시각적 피드백용)
  const [loadingPct, setLoadingPct] = useState(0)
  useEffect(() => {
    if (studyPhase !== "loading") { setLoadingPct(0); return }
    const iv = setInterval(() => {
      setLoadingPct((p) => (p >= 90 ? 90 : p + Math.random() * 12 + 3))
    }, 450)
    return () => clearInterval(iv)
  }, [studyPhase])

  const loadQuestions = async () => {
    if (!weekPlan) return
    setStudyPhase("loading")
    startTime.current = Date.now()
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part: weekPlan.part, difficulty, count: weekPlan.dailyCount }),
      })
      const data = await res.json()
      if (!res.ok || !data.questions?.length) {
        setStudyPhase("error")
        return
      }
      setLoadingPct(100)
      setTimeout(() => {
        setQuestions(data.questions)
        setStudyIdx(0)
        setStudyCorrect(0)
        setStudySelected(null)
        setStudyShowAnswer(false)
        setStudyPhase("studying")
      }, 300)
    } catch {
      setStudyPhase("error")
    }
  }

  const handleStudySelect = (option: string) => {
    if (studyShowAnswer) return
    setStudySelected(option)
  }

  const handleStudyNext = async () => {
    const q = questions[studyIdx]
    const isCorrect = studySelected === q.answer
    if (!studyShowAnswer) {
      setStudyShowAnswer(true)
      if (isCorrect) {
        setStudyCorrect((c) => c + 1)
      } else {
        // [3] 오답: 로컬 + Supabase 동시 저장
        addWrongNote(q)
        const note: WrongNote = {
          question: q,
          wrongCount: 1,
          lastWrongAt: new Date().toISOString(),
          nextReviewAt: todayKr,
        }
        await saveWrongNote(note)
      }
      return
    }
    if (studyIdx + 1 < questions.length) {
      setStudyIdx((i) => i + 1)
      setStudySelected(null)
      setStudyShowAnswer(false)
    } else {
      setStudyPhase("done")
    }
  }

  // ── [3] 오답 복습 ────────────────────────────────────────
  const [remoteNotes, setRemoteNotes] = useState<WrongNote[] | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  useEffect(() => {
    if (activeTab !== "review") return
    setReviewLoading(true)
    getWrongNotes()
      .then(setRemoteNotes)
      .finally(() => setReviewLoading(false))
  }, [activeTab])

  const localDueNotes = getDueReviewNotes()
  const dueNotes = remoteNotes !== null
    ? [...remoteNotes, ...localDueNotes.filter((n) => !remoteNotes.some((r) => r.question.id === n.question.id))]
    : localDueNotes

  // 복습 세션 스냅샷 (인덱스 안정성)
  const [reviewNotes, setReviewNotes] = useState<WrongNote[]>([])

  const resetReviewSession = (notes: WrongNote[]) => {
    setReviewNotes(notes)
    setReviewIdx(0)
    setReviewDone(false)
    setReviewStage("analyze")
    setPracticeQuestion(null)
    setPracticeSelected(null)
    setPracticeShowAnswer(false)
  }

  useEffect(() => {
    if (!reviewLoading && remoteNotes !== null) {
      resetReviewSession(dueNotes)
    }
  }, [reviewLoading, remoteNotes])
  // remote 없을 때(로컬 전용)도 반영
  useEffect(() => {
    if (remoteNotes === null && !reviewLoading) {
      resetReviewSession(localDueNotes)
    }
  }, [activeTab])

  const [reviewIdx, setReviewIdx] = useState(0)
  const [reviewStage, setReviewStage] = useState<"analyze" | "practice">("analyze")
  const [practiceQuestion, setPracticeQuestion] = useState<Question | null>(null)
  const [practiceLoading, setPracticeLoading] = useState(false)
  const [practiceSelected, setPracticeSelected] = useState<string | null>(null)
  const [practiceShowAnswer, setPracticeShowAnswer] = useState(false)
  const [reviewCorrect, setReviewCorrect] = useState(0)
  const [reviewDone, setReviewDone] = useState(false)

  const handleAnalyzeNext = async () => {
    const note = reviewNotes[reviewIdx]
    setPracticeLoading(true)
    setPracticeQuestion(null)
    setPracticeSelected(null)
    setPracticeShowAnswer(false)
    setReviewStage("practice")
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part: note.question.type, difficulty, count: 1 }),
      })
      const data = await res.json()
      setPracticeQuestion(data.questions?.[0] ?? null)
    } finally {
      setPracticeLoading(false)
    }
  }

  const handlePracticeCheck = () => {
    if (!practiceSelected || practiceShowAnswer) return
    setPracticeShowAnswer(true)
  }

  const handlePracticeNext = async () => {
    if (!practiceQuestion) return
    const note = reviewNotes[reviewIdx]
    const isCorrect = practiceSelected === practiceQuestion.answer
    if (isCorrect) setReviewCorrect((c) => c + 1)

    const isMastered = isCorrect && note.wrongCount >= 3
    markReviewed(note.question.id, isCorrect)

    if (isMastered) {
      await deleteWrongNote(note.question.id)
    } else if (isCorrect) {
      const updated: WrongNote = { ...note, nextReviewAt: getKoreanDateStr(new Date(Date.now() + 3 * 86400000)) }
      await saveWrongNote(updated)
    } else {
      addWrongNote(note.question)
      const updated: WrongNote = { ...note, wrongCount: note.wrongCount + 1, nextReviewAt: getKoreanDateStr(new Date(Date.now() + 86400000)) }
      await saveWrongNote(updated)
    }

    if (reviewIdx + 1 < reviewNotes.length) {
      setReviewIdx((i) => i + 1)
      setReviewStage("analyze")
      setPracticeQuestion(null)
      setPracticeSelected(null)
      setPracticeShowAnswer(false)
    } else {
      setReviewDone(true)
    }
  }

  // ── 오늘의 단어 ─────────────────────────────────────────
  const [vocab, setVocab] = useState<VocabItem[]>([])
  const [vocabPhase, setVocabPhase] = useState<"idle" | "loading" | "done">("idle")

  const loadVocab = async () => {
    if (!weekPlan) return
    setVocabPhase("loading")
    const res = await fetch("/api/today/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ part: weekPlan.part }),
    })
    const data = await res.json()
    setVocab(data.vocab ?? [])
    setVocabPhase("done")
  }

  // ── 완료 처리 ────────────────────────────────────────────
  const [completing, setCompleting] = useState(false)

  const handleComplete = async () => {
    if (!weekPlan) return
    setCompleting(true)
    const session = {
      date: todayKr,   // [4] 한국 시간 기준
      part: weekPlan.part,
      completed: true,
      score: studyCorrect,
      totalQuestions: questions.length,
      durationSec: Math.floor((Date.now() - startTime.current) / 1000),
    }
    addDailySession(session)
    await saveDailySession(session)
    router.push("/dashboard")
  }

  // ── 가드 ─────────────────────────────────────────────────
  if (!curriculum || !weekPlan) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-3">
          <p className="text-lg font-semibold text-warm-800 dark:text-ivory">커리큘럼이 없습니다</p>
          <p className="text-sm text-warm-400">레벨테스트 → 진단리포트를 완료하면 커리큘럼이 생성됩니다.</p>
          <button
            onClick={() => router.push("/level-test")}
            className="mt-4 px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: BRAND }}
          >
            레벨테스트 시작
          </button>
        </div>
      </AppShell>
    )
  }

  const TABS: { key: TabType; label: string; badge?: number }[] = [
    { key: "study", label: "오늘의 문제", badge: weekPlan.dailyCount },
    { key: "review", label: "오답 복습", badge: (reviewNotes.length || dueNotes.length) || undefined },
    { key: "vocab", label: "오늘의 단어" },
  ]

  const studyQ = questions[studyIdx]
  const studyIsCorrect = studySelected === studyQ?.answer

  return (
    <AppShell>
      <div className="space-y-4 pb-8">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-warm-400">
              {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })}
            </p>
            <h1 className="text-xl font-bold text-warm-900 dark:text-ivory mt-0.5">오늘의 학습</h1>
          </div>
          <div className="text-right">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-bold text-white" style={{ background: BRAND }}>
              {weekPlan.part}
            </span>
            <p className="text-xs text-warm-400 mt-1">{difficulty} · {weekPlan.dailyCount}문제</p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-warm-200 dark:border-warm-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
              style={
                activeTab === tab.key
                  ? { color: BRAND, borderBottom: `2px solid ${BRAND}`, marginBottom: -1 }
                  : { color: "#9e9691" }
              }
            >
              {tab.label}
              {tab.badge ? (
                <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded-full" style={{ background: BRAND }}>
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── 오늘의 문제 탭 ── */}
        {activeTab === "study" && (
          <div className="space-y-4">

            {/* idle */}
            {studyPhase === "idle" && (
              <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-8 text-center space-y-4">
                <div className="text-4xl">📚</div>
                <p className="font-semibold text-warm-800 dark:text-ivory">{weekPlan.part} {weekPlan.dailyCount}문제</p>
                <p className="text-sm text-warm-400 leading-relaxed">{weekPlan.focusReason}</p>
                <button onClick={loadQuestions} className="w-full py-3.5 rounded-xl text-sm font-bold text-white" style={{ background: BRAND }}>
                  학습 시작
                </button>
              </div>
            )}

            {/* error */}
            {studyPhase === "error" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-8 text-center space-y-4">
                <div className="text-4xl">⚠️</div>
                <p className="font-semibold text-red-700 dark:text-red-400">문제를 불러오지 못했습니다</p>
                <p className="text-sm text-red-500 dark:text-red-400">잠시 후 다시 시도해주세요.</p>
                <button onClick={loadQuestions} className="w-full py-3.5 rounded-xl text-sm font-bold text-white" style={{ background: BRAND }}>
                  다시 시도
                </button>
              </div>
            )}

            {/* [2] loading — 프로그레스 바 */}
            {studyPhase === "loading" && (
              <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-8 space-y-5">
                <div className="text-center">
                  <p className="text-sm font-semibold text-warm-800 dark:text-ivory leading-relaxed">
                    {weekPlan.part} 문제를 만들고 있어요…
                  </p>
                  <p className="text-xs text-warm-400 mt-1">
                    편입 전문 AI가 최적의 난이도로 출제 중입니다
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="h-2 rounded-full bg-warm-100 dark:bg-warm-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${loadingPct}%`, background: BRAND }}
                    />
                  </div>
                  <p className="text-right text-xs text-warm-400">{Math.round(loadingPct)}%</p>
                </div>
              </div>
            )}

            {/* studying */}
            {studyPhase === "studying" && questions.length > 0 && (
              <div className="space-y-4">
                {/* 진도바 */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-warm-400">
                    <span>{studyIdx + 1} / {questions.length}</span>
                    <span>정답 {studyCorrect}개</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-warm-100 dark:bg-warm-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(studyIdx / questions.length) * 100}%`, background: BRAND }}
                    />
                  </div>
                </div>

                {/* [1] 정오답 피드백 배너 */}
                {studyShowAnswer && studyQ && (
                  <FeedbackBanner correct={studyIsCorrect} correctAnswer={studyQ.answer} />
                )}

                <QuestionCard
                  question={studyQ}
                  selectedOption={studySelected}
                  onSelect={handleStudySelect}
                  showAnswer={studyShowAnswer}
                />

                {studyShowAnswer && studyQ.explanation && (
                  <div className="rounded-xl border-l-4 border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-800/50 px-4 py-3">
                    <p className="text-xs font-semibold text-warm-500 mb-1">해설</p>
                    <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">{studyQ.explanation}</p>
                    {studyQ.trap && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">⚠ {studyQ.trap}</p>
                    )}
                  </div>
                )}

                {/* [1] 버튼: 정답확인=검정, 다음문제=브랜드 */}
                <button
                  onClick={handleStudyNext}
                  disabled={!studySelected}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                  style={{ background: studyShowAnswer ? BRAND : "#1a1a1a" }}
                >
                  {!studyShowAnswer
                    ? "정답 확인"
                    : studyIdx + 1 < questions.length
                      ? "다음 문제 →"
                      : "학습 완료 →"}
                </button>
              </div>
            )}

            {/* done */}
            {studyPhase === "done" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-6 text-center space-y-3">
                  <div className="text-4xl">{studyCorrect === questions.length ? "🎉" : "✅"}</div>
                  <p className="font-bold text-warm-900 dark:text-ivory text-lg">학습 완료!</p>
                  <div className="flex justify-center gap-8 pt-2">
                    <div>
                      <p className="text-2xl font-bold" style={{ color: "#16a34a" }}>{studyCorrect}</p>
                      <p className="text-xs text-warm-400">정답</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold" style={{ color: "#dc2626" }}>{questions.length - studyCorrect}</p>
                      <p className="text-xs text-warm-400">오답</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-warm-700 dark:text-warm-200">
                        {Math.round((studyCorrect / questions.length) * 100)}%
                      </p>
                      <p className="text-xs text-warm-400">정답률</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="w-full py-4 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: BRAND }}
                >
                  {completing ? "저장 중…" : "오늘 학습 완료 →"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 오답 복습 탭 ── */}
        {activeTab === "review" && (
          <div className="space-y-4">
            {/* 로딩 */}
            {reviewLoading && (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-warm-100 dark:bg-warm-700 animate-pulse" />
                ))}
                <p className="text-center text-sm text-warm-400">오답 목록을 불러오는 중…</p>
              </div>
            )}

            {/* 복습 없음 */}
            {!reviewLoading && reviewNotes.length === 0 && (
              <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-8 text-center space-y-3">
                <div className="text-4xl">🎊</div>
                <p className="font-semibold text-warm-800 dark:text-ivory">오늘 복습할 오답이 없습니다</p>
                <p className="text-sm text-warm-400">오늘의 문제에서 틀린 문제가 자동으로 올라옵니다.</p>
              </div>
            )}

            {/* 복습 진행 중 */}
            {!reviewLoading && reviewNotes.length > 0 && !reviewDone && (
              <div className="space-y-4">
                {/* 헤더 */}
                <div className="flex items-center justify-between">
                  <p className="text-xs text-warm-400">오늘 복습할 문제 {reviewNotes.length}개</p>
                  <p className="text-xs text-warm-400">{reviewIdx + 1} / {reviewNotes.length}</p>
                </div>
                <div className="h-1.5 rounded-full bg-warm-100 dark:bg-warm-700 overflow-hidden">
                  <div className="h-full rounded-full transition-all bg-amber-500"
                    style={{ width: `${(reviewIdx / reviewNotes.length) * 100}%` }} />
                </div>

                {/* ── 1단계: 이해 ── */}
                {reviewStage === "analyze" && (() => {
                  const note = reviewNotes[reviewIdx]
                  const q = note.question
                  return (
                    <div className="space-y-4">
                      {/* 단계 레이블 */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: "#6366f1" }}>
                          1단계 · 이해
                        </span>
                        <span className="text-xs text-warm-400">틀린 문제를 다시 확인하세요</span>
                      </div>

                      {/* 오답 횟수 표시 */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-warm-400">오답 횟수</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: note.wrongCount >= 3 ? "#fef2f2" : "#fff7ed", color: note.wrongCount >= 3 ? "#dc2626" : "#d97706" }}>
                          {note.wrongCount}회
                        </span>
                        {note.wrongCount >= 3 && (
                          <span className="text-xs text-green-600">맞히면 완전 학습 ✓</span>
                        )}
                      </div>

                      <QuestionCard
                        question={q}
                        selectedOption={q.answer}
                        onSelect={() => {}}
                        showAnswer={true}
                      />

                      {(q.explanation || q.trap) && (
                        <div className="rounded-xl border-l-4 border-indigo-300 dark:border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-3 space-y-2">
                          {q.explanation && (
                            <>
                              <p className="text-xs font-semibold text-indigo-500">해설</p>
                              <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">{q.explanation}</p>
                            </>
                          )}
                          {q.trap && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ {q.trap}</p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={handleAnalyzeNext}
                        className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
                        style={{ background: "#6366f1" }}
                      >
                        이해했어요 →
                      </button>
                    </div>
                  )
                })()}

                {/* ── 2단계: 적용 ── */}
                {reviewStage === "practice" && (
                  <div className="space-y-4">
                    {/* 단계 레이블 */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: BRAND }}>
                        2단계 · 적용
                      </span>
                      <span className="text-xs text-warm-400">비슷한 문제로 실력을 확인하세요</span>
                    </div>

                    {/* 문제 로딩 */}
                    {practiceLoading && (
                      <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-8 text-center space-y-3">
                        <div className="w-3 h-3 rounded-full animate-pulse mx-auto" style={{ background: BRAND }} />
                        <p className="text-sm text-warm-400">유사 문제 생성 중…</p>
                      </div>
                    )}

                    {!practiceLoading && practiceQuestion && (
                      <>
                        {practiceShowAnswer && (
                          <FeedbackBanner
                            correct={practiceSelected === practiceQuestion.answer}
                            correctAnswer={practiceQuestion.answer}
                          />
                        )}

                        <QuestionCard
                          question={practiceQuestion}
                          selectedOption={practiceSelected}
                          onSelect={(opt) => { if (!practiceShowAnswer) setPracticeSelected(opt) }}
                          showAnswer={practiceShowAnswer}
                        />

                        {practiceShowAnswer && practiceQuestion.explanation && (
                          <div className="rounded-xl border-l-4 border-warm-300 dark:border-warm-600 bg-warm-50 dark:bg-warm-800/50 px-4 py-3">
                            <p className="text-xs font-semibold text-warm-500 mb-1">해설</p>
                            <p className="text-sm text-warm-700 dark:text-warm-300 leading-relaxed">{practiceQuestion.explanation}</p>
                          </div>
                        )}

                        {!practiceShowAnswer ? (
                          <button
                            onClick={handlePracticeCheck}
                            disabled={!practiceSelected}
                            className="w-full py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-40"
                            style={{ background: "#1a1a1a" }}
                          >
                            정답 확인
                          </button>
                        ) : (
                          <button
                            onClick={handlePracticeNext}
                            className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
                            style={{ background: BRAND }}
                          >
                            {reviewIdx + 1 < reviewNotes.length ? "다음 문제 →" : "복습 완료 →"}
                          </button>
                        )}
                      </>
                    )}

                    {!practiceLoading && !practiceQuestion && (
                      <div className="rounded-2xl border border-red-200 bg-red-50 dark:bg-red-900/20 p-5 text-center space-y-3">
                        <p className="text-sm text-red-500">문제 생성에 실패했습니다.</p>
                        <button onClick={handleAnalyzeNext} className="text-xs font-bold px-4 py-2 rounded-lg border border-red-300 text-red-500">
                          다시 시도
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 복습 완료 */}
            {!reviewLoading && reviewDone && (
              <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-6 text-center space-y-3">
                <div className="text-4xl">✅</div>
                <p className="font-bold text-warm-900 dark:text-ivory">복습 완료!</p>
                <p className="text-sm text-warm-400">{reviewNotes.length}문제 중 {reviewCorrect}개 정답</p>
              </div>
            )}
          </div>
        )}

        {/* ── 오늘의 단어 탭 ── */}
        {activeTab === "vocab" && (
          <div className="space-y-3">
            {vocabPhase === "idle" && (
              <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 p-8 text-center space-y-4">
                <div className="text-4xl">📖</div>
                <p className="font-semibold text-warm-800 dark:text-ivory">{weekPlan.part} 핵심 단어 5개</p>
                <button onClick={loadVocab} className="w-full py-3.5 rounded-xl text-sm font-bold text-white" style={{ background: BRAND }}>
                  단어 불러오기
                </button>
              </div>
            )}
            {vocabPhase === "loading" && (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-warm-100 dark:bg-warm-700 animate-pulse" />
                ))}
                <p className="text-center text-sm text-warm-400">단어를 생성 중입니다…</p>
              </div>
            )}
            {vocabPhase === "done" && vocab.map((v, i) => (
              <div key={i} className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-5 py-4 space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-base font-bold text-warm-900 dark:text-ivory">{v.word}</span>
                  <span className="text-sm text-warm-500 dark:text-warm-400">{v.meaning}</span>
                </div>
                <p className="text-sm text-warm-700 dark:text-warm-300 italic leading-relaxed">{v.example}</p>
                <p className="text-xs text-warm-400 leading-relaxed">{v.exampleKr}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
