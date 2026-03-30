import { NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"

const EXTRACTION_PROMPT = `당신은 한국 편입영어 기출문제 분석 전문가입니다.
업로드된 PDF에서 영어 문법/어휘 문제들을 빠짐없이 모두 추출하세요.

[추출 기준]
- school: PDF 제목·헤더·워터마크에서 학교명 추출 (없으면 "미상")
- year: 연도 숫자 (없으면 null)
- part: 문제 유형을 아래 중 하나로 분류
  관계사 / 분사구문 / 가정법 / 시제 / 수일치 / 병렬구조 / 어휘 / 독해 / 기타
- question: 지시문 (예: "빈칸에 알맞은 것을 고르시오.")
- sentence: 영문 지문 — 빈칸은 _____ 로 표시, 밑줄 문제는 해당 부분을 (A)(B)(C)(D) 표기 그대로 유지
- options: 보기 배열 ["(A) ...", "(B) ...", "(C) ...", "(D) ..."]
- answer: 정답 옵션 전체 문자열 (예: "(B) whose")
  ※ PDF에 정답 표기가 없으면 빈 문자열 ""
- difficulty: 문장 복잡도·문법 난이도 기준으로 초급 / 중급 / 고급

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이.
{
  "school": "학교명",
  "year": 연도또는null,
  "questions": [
    {
      "part": "관계사",
      "question": "빈칸에 알맞은 것을 고르시오.",
      "sentence": "The man _____ called was my father.",
      "options": ["(A) who", "(B) whose", "(C) whom", "(D) which"],
      "answer": "(A) who",
      "difficulty": "초급"
    }
  ]
}`

export async function POST(req: NextRequest) {
  try {
    const { publicUrl, fileName } = await req.json() as { publicUrl: string; fileName: string }

    // Supabase Storage에서 PDF 다운로드
    const pdfRes = await fetch(publicUrl)
    if (!pdfRes.ok) throw new Error(`PDF 다운로드 실패: ${pdfRes.status}`)
    const buffer = await pdfRes.arrayBuffer()

    // Claude API — PDF를 document로 전달
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-6"),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "file" as const,
              data: new Uint8Array(buffer),
              mimeType: "application/pdf",
            },
            {
              type: "text" as const,
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
      maxOutputTokens: 8000,
    })

    // JSON 파싱
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("JSON 파싱 실패 — Claude 응답에서 JSON을 찾을 수 없습니다.")

    const result = JSON.parse(jsonMatch[0]) as {
      school: string
      year: number | null
      questions: {
        part: string
        question: string
        sentence: string
        options: string[]
        answer: string
        difficulty: string
      }[]
    }

    return NextResponse.json({ ...result, sourceFile: fileName })
  } catch (err) {
    console.error("[extract-questions]", err)
    const message = err instanceof Error ? err.message : "알 수 없는 오류"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
