import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

const isConfigured = supabaseUrl.startsWith("https://") && supabaseAnonKey.length > 0

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

export async function getSetting(key: string): Promise<string> {
  if (!supabase) return ""
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .single()
  if (error || !data) return ""
  return data.value as string
}

export async function setSetting(key: string, value: string): Promise<void> {
  if (!supabase) return
  await supabase
    .from("settings")
    .upsert({ key, value, updated_at: new Date().toISOString() })
}

export async function saveDailySession(session: import("@/types").DailySession): Promise<void> {
  if (!supabase) return
  await supabase.from("daily_sessions").upsert(
    {
      user_id: "local",
      date: session.date,
      part: session.part,
      questions_done: session.totalQuestions,
      correct_count: session.score,
      completed: session.completed,
      duration_sec: session.durationSec,
    },
    { onConflict: "user_id,date" }
  )
}

export async function getDailySessions(): Promise<import("@/types").DailySession[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from("daily_sessions")
    .select("*")
    .eq("user_id", "local")
    .order("date", { ascending: false })
  if (error || !data) return []
  return data.map((row) => ({
    date: row.date as string,
    part: row.part as import("@/types").GrammarPart,
    completed: row.completed as boolean,
    score: row.correct_count as number,
    totalQuestions: row.questions_done as number,
    durationSec: row.duration_sec as number,
  }))
}

export async function saveWrongNote(note: import("@/types").WrongNote): Promise<void> {
  if (!supabase) return
  await supabase.from("wrong_notes").upsert(
    {
      user_id: "local",
      question_id: note.question.id,
      question_data: note.question,
      wrong_count: note.wrongCount,
      last_wrong_at: note.lastWrongAt,
      next_review_at: note.nextReviewAt,
    },
    { onConflict: "user_id,question_id" }
  )
}

export async function getWrongNotes(): Promise<import("@/types").WrongNote[]> {
  if (!supabase) return []
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
  const { data, error } = await supabase
    .from("wrong_notes")
    .select("*")
    .eq("user_id", "local")
    .lte("next_review_at", today)
  if (error || !data) return []
  return data.map((row) => ({
    question: row.question_data as import("@/types").Question,
    wrongCount: row.wrong_count as number,
    lastWrongAt: row.last_wrong_at as string,
    nextReviewAt: row.next_review_at as string,
  }))
}

export async function deleteWrongNote(questionId: number): Promise<void> {
  if (!supabase) return
  await supabase
    .from("wrong_notes")
    .delete()
    .eq("user_id", "local")
    .eq("question_id", questionId)
}

export async function getSettings(keys: string[]): Promise<Record<string, string>> {
  const empty = Object.fromEntries(keys.map((k) => [k, ""]))
  if (!supabase) return empty
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", keys)
  if (error || !data) return empty
  const map = Object.fromEntries(data.map((row) => [row.key, row.value as string]))
  return Object.fromEntries(keys.map((k) => [k, map[k] ?? ""]))
}
