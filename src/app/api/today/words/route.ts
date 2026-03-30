import { NextRequest, NextResponse } from "next/server"
import { generateVocabulary } from "@/lib/claude"
import type { GrammarPart } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const { part } = (await req.json()) as { part: GrammarPart }
    if (!part) return NextResponse.json({ error: "part 누락" }, { status: 400 })
    const vocab = await generateVocabulary(part, 5)
    return NextResponse.json({ vocab })
  } catch (err) {
    console.error("[/api/today/words]", err)
    return NextResponse.json({ error: "단어 생성 실패" }, { status: 500 })
  }
}
