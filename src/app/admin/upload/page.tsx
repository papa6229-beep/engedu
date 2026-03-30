"use client"
import { useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"

const PARTS = ["관계사", "분사구문", "가정법", "시제", "수일치", "병렬구조", "어휘", "독해", "기타"]
const DIFFICULTIES = ["초급", "중급", "고급"]

interface ExtractedQuestion {
  tempId: string
  part: string
  question: string
  sentence: string
  options: string[]
  answer: string
  difficulty: string
}

type Step = "idle" | "uploading" | "extracting" | "review" | "saving" | "done"

export default function AdminUploadPage() {
  const [step, setStep] = useState<Step>("idle")
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [school, setSchool] = useState("")
  const [year, setYear] = useState<number | null>(null)
  const [questions, setQuestions] = useState<ExtractedQuestion[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── 파일 처리 ──────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("PDF 파일만 업로드 가능합니다.")
      return
    }
    if (file.size > 20 * 1024 * 1024) {
      setError("파일 크기는 20MB 이하여야 합니다.")
      return
    }
    if (!supabase) {
      setError("Supabase 설정을 확인해주세요.")
      return
    }

    setError(null)
    setStep("uploading")

    // 1. Supabase Storage 업로드
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${Date.now()}_${safeName}`
    const { error: uploadErr } = await supabase.storage.from("exam-pdfs").upload(path, file)

    if (uploadErr) {
      setError(`업로드 실패: ${uploadErr.message}`)
      setStep("idle")
      return
    }

    const { data: { publicUrl } } = supabase.storage.from("exam-pdfs").getPublicUrl(path)

    // 2. 문제 추출 API 호출
    setStep("extracting")
    try {
      const res = await fetch("/api/admin/extract-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicUrl, fileName: path }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? "추출 실패")
      }
      const data = await res.json()
      setSchool(data.school ?? "")
      setYear(data.year ?? null)
      setQuestions(
        (data.questions ?? []).map((q: Omit<ExtractedQuestion, "tempId">) => ({
          ...q,
          tempId: crypto.randomUUID(),
          options: Array.isArray(q.options) ? q.options : ["", "", "", ""],
        }))
      )
      setStep("review")
    } catch (e) {
      setError(e instanceof Error ? e.message : "문제 추출 중 오류가 발생했습니다.")
      setStep("idle")
    }
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // ── 문제 편집 ──────────────────────────────────────────
  const updateQ = (tempId: string, key: keyof ExtractedQuestion, value: string) =>
    setQuestions((prev) => prev.map((q) => q.tempId === tempId ? { ...q, [key]: value } : q))

  const updateOption = (tempId: string, idx: number, value: string) =>
    setQuestions((prev) => prev.map((q) =>
      q.tempId === tempId
        ? { ...q, options: q.options.map((o, i) => (i === idx ? value : o)) }
        : q
    ))

  const deleteQ = (tempId: string) => {
    setQuestions((prev) => prev.filter((q) => q.tempId !== tempId))
    if (expandedId === tempId) setExpandedId(null)
  }

  // ── 저장 ──────────────────────────────────────────────
  const handleSave = async () => {
    if (!supabase || questions.length === 0) return
    setStep("saving")

    const rows = questions.map((q) => ({
      school,
      year,
      part: q.part,
      question: q.question,
      sentence: q.sentence,
      options: q.options,
      answer: q.answer,
      difficulty: q.difficulty,
    }))

    const { error: insertErr } = await supabase.from("questions").insert(rows)
    if (insertErr) {
      setError(`저장 실패: ${insertErr.message}`)
      setStep("review")
      return
    }
    setSavedCount(questions.length)
    setStep("done")
  }

  const reset = () => {
    setStep("idle")
    setError(null)
    setSchool("")
    setYear(null)
    setQuestions([])
    setExpandedId(null)
  }

  // ── 렌더 ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-900 px-6 py-10">
      <div className="max-w-4xl mx-auto">

        {/* 헤더 */}
        <div className="mb-8">
          <p className="text-xs font-bold text-warm-400 uppercase tracking-widest mb-1">
            어드민 · 문제 업로드
          </p>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-ivory">
            기출문제 PDF 업로드
          </h1>
          <p className="text-sm text-warm-500 dark:text-warm-400 mt-1">
            PDF를 올리면 AI가 문제를 자동으로 추출합니다
          </p>
        </div>

        {/* 에러 */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 flex items-start gap-3">
            <span className="text-red-500 font-bold text-sm shrink-0">⚠</span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* ── Step: idle ── */}
        {step === "idle" && (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            className={`rounded-2xl border-2 border-dashed flex flex-col items-center justify-center py-20 cursor-pointer transition-colors ${
              isDragging
                ? "border-copper-400 bg-copper-50 dark:bg-copper-700/10"
                : "border-warm-300 dark:border-warm-600 hover:border-copper-400 hover:bg-copper-50/50 dark:hover:bg-copper-700/5"
            }`}
          >
            <div className="text-4xl mb-4">📄</div>
            <p className="text-base font-bold text-warm-800 dark:text-warm-200 mb-1">
              PDF를 드래그하거나 클릭해서 선택
            </p>
            <p className="text-xs text-warm-400">최대 20MB · PDF 형식만 지원</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
          </div>
        )}

        {/* ── Step: uploading / extracting ── */}
        {(step === "uploading" || step === "extracting") && (
          <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 flex flex-col items-center justify-center py-20 gap-5">
            <div className="w-12 h-12 rounded-full border-4 border-copper-200 border-t-copper-500 animate-spin" />
            <div className="text-center">
              <p className="text-base font-bold text-warm-800 dark:text-warm-200">
                {step === "uploading" ? "파일 업로드 중…" : "AI가 문제를 분석 중…"}
              </p>
              <p className="text-xs text-warm-400 mt-1">
                {step === "extracting" ? "PDF에서 문제를 추출하고 있습니다. 잠시만 기다려주세요." : ""}
              </p>
            </div>
          </div>
        )}

        {/* ── Step: review ── */}
        {step === "review" && (
          <div className="space-y-5">
            {/* 메타 정보 */}
            <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 px-5 py-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">학교명</label>
                <input
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  className="rounded-lg border border-warm-200 dark:border-warm-600 bg-warm-50 dark:bg-warm-700 px-3 py-1.5 text-sm font-medium text-warm-800 dark:text-warm-200 outline-none focus:border-copper-400 w-36"
                  placeholder="예: 중앙대"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-warm-400 uppercase tracking-widest">연도</label>
                <input
                  type="number"
                  value={year ?? ""}
                  onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                  className="rounded-lg border border-warm-200 dark:border-warm-600 bg-warm-50 dark:bg-warm-700 px-3 py-1.5 text-sm font-medium text-warm-800 dark:text-warm-200 outline-none focus:border-copper-400 w-24"
                  placeholder="예: 2024"
                />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm font-bold text-copper-500">{questions.length}문제</span>
                <span className="text-xs text-warm-400">추출됨</span>
              </div>
            </div>

            {/* 문제 목록 */}
            <div className="space-y-2">
              {questions.map((q, idx) => (
                <QuestionCard
                  key={q.tempId}
                  index={idx}
                  q={q}
                  isExpanded={expandedId === q.tempId}
                  onToggle={() => setExpandedId(expandedId === q.tempId ? null : q.tempId)}
                  onUpdate={(key, val) => updateQ(q.tempId, key, val)}
                  onUpdateOption={(i, val) => updateOption(q.tempId, i, val)}
                  onDelete={() => deleteQ(q.tempId)}
                />
              ))}
            </div>

            {/* 저장 버튼 */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={reset}
                className="text-sm text-warm-400 hover:text-warm-600 transition-colors"
              >
                ← 다시 업로드
              </button>
              <button
                onClick={handleSave}
                disabled={questions.length === 0}
                className="px-8 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-opacity"
                style={{ background: "#1a1a1a" }}
              >
                {questions.length}문제 저장
              </button>
            </div>
          </div>
        )}

        {/* ── Step: saving ── */}
        {step === "saving" && (
          <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 rounded-full border-4 border-copper-200 border-t-copper-500 animate-spin" />
            <p className="text-sm font-bold text-warm-700 dark:text-warm-300">Supabase에 저장 중…</p>
          </div>
        )}

        {/* ── Step: done ── */}
        {step === "done" && (
          <div className="rounded-2xl border border-green-200 dark:border-green-700/40 bg-green-50 dark:bg-green-900/20 flex flex-col items-center justify-center py-20 gap-4">
            <div className="text-4xl">✅</div>
            <div className="text-center">
              <p className="text-base font-bold text-green-700 dark:text-green-400">
                {savedCount}문제가 저장되었습니다
              </p>
              <p className="text-xs text-warm-500 mt-1">Supabase questions 테이블에 추가됐어요</p>
            </div>
            <button
              onClick={reset}
              className="mt-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "#1a1a1a" }}
            >
              다른 파일 업로드
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 문제 카드 컴포넌트 ────────────────────────────────────
function QuestionCard({
  index,
  q,
  isExpanded,
  onToggle,
  onUpdate,
  onUpdateOption,
  onDelete,
}: {
  index: number
  q: ExtractedQuestion
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (key: keyof ExtractedQuestion, value: string) => void
  onUpdateOption: (i: number, value: string) => void
  onDelete: () => void
}) {
  const partColor = (part: string) => {
    const map: Record<string, string> = {
      관계사: "#3b82f6", 분사구문: "#8b5cf6", 가정법: "#ec4899",
      시제: "#f59e0b", 수일치: "#ef4444", 병렬구조: "#22c55e",
      어휘: "#06b6d4", 독해: "#64748b", 기타: "#94a3b8",
    }
    return map[part] ?? "#94a3b8"
  }

  return (
    <div className="rounded-xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 overflow-hidden">
      {/* 헤더 행 */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-xs font-mono text-warm-400 w-6 shrink-0">{index + 1}</span>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${partColor(q.part)}20`, color: partColor(q.part) }}
        >
          {q.part}
        </span>
        <p className="flex-1 text-sm text-warm-700 dark:text-warm-300 truncate min-w-0">
          {q.sentence || <span className="text-warm-300 italic">문장 없음</span>}
        </p>
        <span className="text-xs text-warm-400 shrink-0 hidden sm:block">{q.difficulty}</span>
        {q.answer && (
          <span className="text-xs font-bold text-copper-600 shrink-0 hidden sm:block">
            {q.answer.split(" ")[0]}
          </span>
        )}
        <button
          onClick={onToggle}
          className="text-xs font-medium text-warm-400 hover:text-copper-500 transition-colors shrink-0 px-2 py-1 rounded"
        >
          {isExpanded ? "접기" : "수정"}
        </button>
        <button
          onClick={onDelete}
          className="text-xs text-warm-300 hover:text-red-400 transition-colors shrink-0"
        >
          ✕
        </button>
      </div>

      {/* 편집 폼 */}
      {isExpanded && (
        <div className="border-t border-warm-100 dark:border-warm-700 px-4 py-4 space-y-3 bg-warm-50 dark:bg-warm-900/30">
          {/* 파트 · 난이도 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-1 block">파트</label>
              <select
                value={q.part}
                onChange={(e) => onUpdate("part", e.target.value)}
                className="w-full rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-800 dark:text-warm-200 outline-none focus:border-copper-400"
              >
                {PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-1 block">난이도</label>
              <select
                value={q.difficulty}
                onChange={(e) => onUpdate("difficulty", e.target.value)}
                className="w-full rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-800 dark:text-warm-200 outline-none focus:border-copper-400"
              >
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* 지시문 */}
          <div>
            <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-1 block">지시문</label>
            <input
              value={q.question}
              onChange={(e) => onUpdate("question", e.target.value)}
              className="w-full rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-800 dark:text-warm-200 outline-none focus:border-copper-400"
            />
          </div>

          {/* 문장 */}
          <div>
            <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-1 block">문장 (빈칸: _____)</label>
            <textarea
              value={q.sentence}
              onChange={(e) => onUpdate("sentence", e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-800 dark:text-warm-200 outline-none focus:border-copper-400 resize-none font-mono"
            />
          </div>

          {/* 보기 */}
          <div>
            <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-1 block">보기</label>
            <div className="grid grid-cols-2 gap-2">
              {(q.options.length > 0 ? q.options : ["", "", "", ""]).map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) => onUpdateOption(i, e.target.value)}
                  placeholder={`(${String.fromCharCode(65 + i)}) ...`}
                  className="rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm text-warm-800 dark:text-warm-200 outline-none focus:border-copper-400 font-mono"
                />
              ))}
            </div>
          </div>

          {/* 정답 */}
          <div>
            <label className="text-[10px] font-bold text-warm-400 uppercase tracking-widest mb-1 block">정답</label>
            <input
              value={q.answer}
              onChange={(e) => onUpdate("answer", e.target.value)}
              placeholder="(A) ..."
              className="w-full rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-800 px-3 py-2 text-sm font-mono text-warm-800 dark:text-warm-200 outline-none focus:border-copper-400"
            />
          </div>
        </div>
      )}
    </div>
  )
}
