# 편입영어 AI 튜터 — Phase 1~2 구현 계획서

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Next.js 앱을 세팅하고 Claude API로 문제를 생성·채점하며, 온보딩 → 레벨테스트 → 진단리포트+커리큘럼 3개 화면이 동작하는 프로토타입을 완성한다.

**Architecture:** Next.js 16 App Router + TypeScript. 모든 Claude API 호출은 서버 사이드 API Route에서만 처리한다. 클라이언트 상태는 Zustand + localStorage persist로 관리한다. 로그인 없음.

**Tech Stack:** Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Zustand, AI SDK (@ai-sdk/anthropic), Recharts, Gowun Batang + Lora (Google Fonts)

---

## 파일 구조

```
D:\english edu\
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # 루트 레이아웃, 폰트, ThemeProvider
│   │   ├── page.tsx                    # 상태에 따라 /onboarding 또는 /dashboard로 리다이렉트
│   │   ├── onboarding/
│   │   │   └── page.tsx                # 화면 01: 온보딩
│   │   ├── level-test/
│   │   │   └── page.tsx                # 화면 02: 레벨 테스트
│   │   ├── diagnosis/
│   │   │   └── page.tsx                # 화면 03: 진단 리포트 + 커리큘럼
│   │   ├── dashboard/
│   │   │   └── page.tsx                # 화면 04: 일일 학습 대시보드 (Plan B)
│   │   ├── report/
│   │   │   └── page.tsx                # 화면 05: 주간 리포트 (Plan B)
│   │   └── api/
│   │       ├── questions/route.ts      # Claude: 문제 생성
│   │       ├── explanation/route.ts    # Claude: 오답 해설
│   │       ├── diagnosis/route.ts      # Claude: 진단 코멘트
│   │       └── curriculum/route.ts     # Claude: 커리큘럼 생성
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx            # 반응형 네비게이션 래퍼
│   │   │   ├── Sidebar.tsx             # PC/태블릿 왼쪽 사이드바
│   │   │   └── BottomTabs.tsx          # 모바일 하단 탭
│   │   └── features/
│   │       ├── QuestionCard.tsx        # 문제 + 4지선다 표시
│   │       ├── ExplanationBox.tsx      # 오답 3단계 해설
│   │       └── RadarChart.tsx          # Recharts 레이더 차트
│   ├── lib/
│   │   ├── store.ts                    # Zustand store (localStorage persist)
│   │   ├── claude.ts                   # Claude API 공통 helper
│   │   └── curriculum.ts              # 커리큘럼 생성 로직
│   └── types/
│       └── index.ts                    # 모든 TypeScript 타입 정의
├── .env.local                          # VERCEL_OIDC_TOKEN (vercel env pull로 자동 생성)
├── next.config.ts
└── tailwind.config.ts
```

---

## Task 1: 프로젝트 세팅

**Files:**
- Create: `D:\english edu\` (프로젝트 루트)
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `.env.local`

- [ ] **Step 1: Next.js 프로젝트 생성**

```bash
cd "D:\english edu"
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-git
```

프롬프트 답변:
- Would you like to use ESLint? → Yes
- Would you like to use Turbopack? → Yes

- [ ] **Step 2: 필요한 패키지 설치**

```bash
npm install zustand ai recharts
npm install -D @types/node
npx shadcn@latest init
```

shadcn init 프롬프트:
- Which style? → Default
- Which color for base color? → Stone
- Use CSS variables? → Yes

shadcn 컴포넌트 설치:

```bash
npx shadcn@latest add button card progress tabs badge separator
```

- [ ] **Step 3: Vercel 프로젝트 연결 및 AI Gateway OIDC 토큰 발급**

AI Gateway를 통해 Claude API를 호출한다 (API 키 불필요, OIDC 토큰 자동 발급).

```bash
# Vercel CLI 설치 (없으면)
npm i -g vercel

# 프로젝트를 Vercel에 연결
vercel link

# AI Gateway를 Vercel 대시보드에서 활성화 후 OIDC 토큰 발급
# 대시보드: https://vercel.com/{팀}/{프로젝트}/settings → AI Gateway → Enable
vercel env pull .env.local
```

`.env.local` 파일이 생성되고 `VERCEL_OIDC_TOKEN`이 자동으로 기록된다.
이 토큰은 약 24시간 유효하며 만료 시 `vercel env pull .env.local --yes`로 재발급.
별도 provider API 키는 필요 없다 — OIDC 토큰이 인증을 처리한다.

- [ ] **Step 4: `tailwind.config.ts` — 폰트와 색상 추가**

```ts
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: {
          DEFAULT: "#FAF9F6",
          50: "#FDFCFA",
          100: "#FAF9F6",
          200: "#F0ECE4",
          300: "#E8E4DC",
        },
        copper: {
          DEFAULT: "#C96442",
          50: "#FDF3EE",
          100: "#F9E0D0",
          500: "#C96442",
          600: "#A8522E",
          700: "#8B3F20",
        },
        warm: {
          900: "#1A1714",
          800: "#2D2A26",
          700: "#4A4540",
          500: "#6B6460",
          400: "#A89F96",
          300: "#C8C2BB",
          200: "#E8E4DC",
          100: "#F5F3EE",
        },
      },
      fontFamily: {
        serif: ["var(--font-gowun)", "Batang", "serif"],
        "serif-en": ["var(--font-lora)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 5: `src/app/layout.tsx` — 루트 레이아웃**

```tsx
import type { Metadata } from "next"
import { Gowun_Batang, Lora } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const gowunBatang = Gowun_Batang({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-gowun",
  display: "swap",
})

const lora = Lora({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
})

export const metadata: Metadata = {
  title: "편입AI튜터",
  description: "편입영어 AI 튜터 — 맞춤 커리큘럼과 실시간 문제 생성",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${gowunBatang.variable} ${lora.variable} font-serif bg-ivory text-warm-900 antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 6: ThemeProvider 컴포넌트 생성**

```bash
npm install next-themes
```

`src/components/theme-provider.tsx`:

```tsx
"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
```

- [ ] **Step 7: `src/app/globals.css` — CSS 변수 추가**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: #FAF9F6;
    --foreground: #1A1714;
    --card: #ffffff;
    --card-foreground: #1A1714;
    --border: #E8E4DC;
    --input: #E8E4DC;
    --ring: #C96442;
    --radius: 0.625rem;
  }

  .dark {
    --background: #1A1714;
    --foreground: #F5F3EE;
    --card: #2D2A26;
    --card-foreground: #F5F3EE;
    --border: #4A4540;
    --input: #4A4540;
    --ring: #C96442;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

- [ ] **Step 8: 개발 서버 실행 확인**

```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속 → Next.js 기본 화면 표시되면 성공.

- [ ] **Step 9: 커밋**

```bash
git init
git add .
git commit -m "feat: initial Next.js project setup with design system"
```

---

## Task 2: TypeScript 타입 정의

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: `src/types/index.ts` 작성**

```ts
// ── 온보딩 ──────────────────────────────────────────────
export type ExamType = "transfer" | "civil" | "suneung"
export type DailyMinutes = 30 | 60 | 120 | 180

export interface OnboardingData {
  examType: ExamType
  targetDate: string        // ISO 날짜 "YYYY-MM-DD"
  dailyMinutes: DailyMinutes
  targetUniversity: string
  completedAt: string       // ISO timestamp
}

// ── 레벨 테스트 ─────────────────────────────────────────
export type GrammarPart =
  | "관계사"
  | "분사구문"
  | "가정법"
  | "시제"
  | "수일치"
  | "병렬구조"

export type Difficulty = "초급" | "중급" | "고급"

export interface Question {
  id: number
  type: GrammarPart
  question: string
  sentence: string
  options: string[]         // ["(A)...", "(B)...", "(C)...", "(D)..."]
  answer: string            // "(A)..."
  explanation: string
  trap: string
  difficulty: Difficulty
}

export interface PartResult {
  part: GrammarPart
  score: number             // 정답 수
  total: number             // 총 문항 수
  wrongQuestions: Question[]
}

export interface LevelTestResult {
  results: PartResult[]
  testedAt: string
}

// ── 커리큘럼 ─────────────────────────────────────────────
export interface WeekPlan {
  weekNum: number
  part: GrammarPart
  dailyCount: number        // 하루 문제 수
  focusReason: string       // 이 파트를 집중하는 이유
}

export interface Curriculum {
  weeks: WeekPlan[]
  totalWeeks: number
  generatedAt: string
}

// ── 일일 세션 ─────────────────────────────────────────────
export interface DailySession {
  date: string              // "YYYY-MM-DD"
  part: GrammarPart
  completed: boolean
  score: number
  totalQuestions: number
  durationSec: number
}

// ── 오답 노트 ─────────────────────────────────────────────
export interface WrongNote {
  question: Question
  wrongCount: number
  lastWrongAt: string
  nextReviewAt: string      // 다음 복습일 "YYYY-MM-DD"
}

// ── 주간 리포트 ───────────────────────────────────────────
export interface WeeklyReport {
  weekStart: string         // "YYYY-MM-DD" (월요일)
  summary: {
    totalQuestions: number
    correctRate: number
    studyDays: number
  }
  partScores: { part: GrammarPart; score: number }[]
  topMistakes: { part: GrammarPart; count: number }[]
  aiComment: string
  generatedAt: string
}

// ── Claude API 요청/응답 ──────────────────────────────────
export interface GenerateQuestionsRequest {
  part: GrammarPart
  difficulty: Difficulty
  count: number
  targetUniversity?: string
}

export interface GenerateQuestionsResponse {
  questions: Question[]
}

export interface DiagnosisRequest {
  results: PartResult[]
  targetDate: string
  dailyMinutes: DailyMinutes
}

export interface DiagnosisResponse {
  comment: string
  curriculum: Curriculum
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

## Task 3: Zustand 스토어 (localStorage)

**Files:**
- Create: `src/lib/store.ts`
- Create: `src/lib/store.test.ts`

- [ ] **Step 1: 테스트 환경 세팅**

```bash
npm install -D jest jest-environment-jsdom @testing-library/jest-dom ts-jest
```

`jest.config.ts` 생성:

```ts
import type { Config } from "jest"

const config: Config = {
  testEnvironment: "jsdom",
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }] },
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterFramework: ["@testing-library/jest-dom"],
}

export default config
```

- [ ] **Step 2: 실패 테스트 작성**

`src/lib/store.test.ts`:

```ts
import { act, renderHook } from "@testing-library/react"
import { useAppStore } from "./store"

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, "localStorage", { value: localStorageMock })

describe("useAppStore", () => {
  beforeEach(() => localStorageMock.clear())

  it("온보딩 데이터를 저장하고 읽는다", () => {
    const { result } = renderHook(() => useAppStore())
    const onboarding = {
      examType: "transfer" as const,
      targetDate: new Date(Date.now() + 86400000 * 180).toISOString().split("T")[0],
      dailyMinutes: 60 as const,
      targetUniversity: "건국대",
      completedAt: new Date().toISOString(),
    }
    act(() => result.current.setOnboarding(onboarding))
    expect(result.current.onboarding).toEqual(onboarding)
  })

  it("레벨테스트 결과를 추가한다", () => {
    const { result } = renderHook(() => useAppStore())
    const testResult = {
      results: [{ part: "관계사" as const, score: 3, total: 4, wrongQuestions: [] }],
      testedAt: new Date().toISOString(),
    }
    act(() => result.current.addLevelTestResult(testResult))
    expect(result.current.levelTests).toHaveLength(1)
    expect(result.current.levelTests[0].results[0].score).toBe(3)
  })

  it("오답을 추가하고 wrongCount를 증가시킨다", () => {
    const { result } = renderHook(() => useAppStore())
    const question = {
      id: 1, type: "관계사" as const, question: "Q", sentence: "S",
      options: ["(A)", "(B)", "(C)", "(D)"], answer: "(A)",
      explanation: "설명", trap: "함정", difficulty: "중급" as const,
    }
    act(() => result.current.addWrongNote(question))
    act(() => result.current.addWrongNote(question)) // 두 번 틀림
    expect(result.current.wrongNotes[0].wrongCount).toBe(2)
  })

  it("isOnboarded는 온보딩 완료 여부를 반환한다", () => {
    const { result } = renderHook(() => useAppStore())
    expect(result.current.isOnboarded()).toBe(false)
    act(() => result.current.setOnboarding({
      examType: "transfer", targetDate: new Date(Date.now() + 86400000 * 180).toISOString().split("T")[0],
      dailyMinutes: 60, targetUniversity: "건국대",
      completedAt: new Date().toISOString(),
    }))
    expect(result.current.isOnboarded()).toBe(true)
  })
})
```

- [ ] **Step 3: 테스트 실행 — 실패 확인**

```bash
npx jest src/lib/store.test.ts
```

Expected: FAIL (store.ts가 없음)

- [ ] **Step 4: `src/lib/store.ts` 구현**

```ts
import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  OnboardingData, LevelTestResult, Curriculum,
  DailySession, WrongNote, WeeklyReport, Question,
} from "@/types"

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
  addDailySession: (session: DailySession) => void
  addWrongNote: (question: Question) => void
  addWeeklyReport: (report: WeeklyReport) => void

  // 계산
  isOnboarded: () => boolean
  hasCompletedLevelTest: () => boolean
  getLatestLevelTest: () => LevelTestResult | null
  getDueReviewNotes: () => WrongNote[]
}

const addDays = (date: Date, days: number): string => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
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

      addDailySession: (session) =>
        set((s) => ({ dailySessions: [...s.dailySessions, session] })),

      addWrongNote: (question) =>
        set((s) => {
          const today = new Date()
          const existing = s.wrongNotes.find((n) => n.question.id === question.id)
          if (existing) {
            return {
              wrongNotes: s.wrongNotes.map((n) =>
                n.question.id === question.id
                  ? {
                      ...n,
                      wrongCount: n.wrongCount + 1,
                      lastWrongAt: today.toISOString(),
                      nextReviewAt: addDays(today, 1),
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
                lastWrongAt: today.toISOString(),
                nextReviewAt: addDays(today, 1),
              },
            ],
          }
        }),

      addWeeklyReport: (report) =>
        set((s) => ({ weeklyReports: [...s.weeklyReports, report] })),

      isOnboarded: () => get().onboarding !== null,

      hasCompletedLevelTest: () => get().levelTests.length > 0,

      getLatestLevelTest: () => {
        const tests = get().levelTests
        return tests.length > 0 ? tests[tests.length - 1] : null
      },

      getDueReviewNotes: () => {
        const today = new Date().toISOString().split("T")[0]
        return get().wrongNotes.filter((n) => n.nextReviewAt <= today)
      },
    }),
    { name: "english-ai-tutor" }
  )
)
```

- [ ] **Step 5: 테스트 실행 — 통과 확인**

```bash
npx jest src/lib/store.test.ts
```

Expected: PASS (4개 테스트)

- [ ] **Step 6: 커밋**

```bash
git add src/lib/store.ts src/lib/store.test.ts jest.config.ts
git commit -m "feat: add Zustand store with localStorage persistence"
```

---

## Task 4: Claude API 라우트 — 문제 생성

**Files:**
- Create: `src/lib/claude.ts`
- Create: `src/app/api/questions/route.ts`
- Create: `src/lib/claude.test.ts`

- [ ] **Step 1: `src/lib/claude.ts` — Claude 공통 helper**

```ts
import { generateText } from "ai"
import type { GrammarPart, Difficulty, Question } from "@/types"

// AI Gateway를 통해 Claude 호출 — VERCEL_OIDC_TOKEN으로 자동 인증
// provider/model 문자열을 그대로 넘기면 AI Gateway로 라우팅됨
const MODEL = "anthropic/claude-sonnet-4.6"

export const GRAMMAR_PARTS: GrammarPart[] = [
  "관계사", "분사구문", "가정법", "시제", "수일치", "병렬구조",
]

export async function generateQuestions(
  part: GrammarPart,
  difficulty: Difficulty,
  count: number,
  targetUniversity?: string
): Promise<Question[]> {
  const universityContext = targetUniversity && targetUniversity !== "기타"
    ? `대학교별 출제 스타일: ${targetUniversity} 스타일로 출제해주세요.`
    : ""

  const prompt = `당신은 한국 편입영어 전문 강사입니다.
아래 조건에 맞는 편입영어 문법 문제를 ${count}개 생성하세요.

조건:
- 파트: ${part}
- 난이도: ${difficulty}
- 형식: 4지선다 빈칸 완성
${universityContext}

각 문제는 반드시 다음 JSON 형식을 따르세요:
{
  "id": 번호,
  "type": "${part}",
  "question": "지시문 (예: 빈칸에 알맞은 것을 고르시오.)",
  "sentence": "영문 문장 (빈칸은 _____ 표시)",
  "options": ["(A) ...", "(B) ...", "(C) ...", "(D) ..."],
  "answer": "(A) ... (정답 보기 전체)",
  "explanation": "왜 이 답이 정답인지 한국어로 상세히 설명 (2~3문장)",
  "trap": "수험생이 자주 헷갈리는 함정 포인트 (1~2문장)",
  "difficulty": "${difficulty}"
}

전체 응답은 JSON 배열로만 출력하세요. 다른 텍스트 없이.
예시: [{"id":1,...}, {"id":2,...}]`

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxTokens: 4000,
  })

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("Claude 응답에서 JSON을 찾을 수 없습니다.")

  const questions = JSON.parse(jsonMatch[0]) as Question[]
  return questions.map((q, i) => ({ ...q, id: i + 1 }))
}

export async function generateDiagnosisComment(
  results: { part: GrammarPart; score: number; total: number }[]
): Promise<string> {
  const summary = results
    .map((r) => `${r.part}: ${r.score}/${r.total}점`)
    .join(", ")

  const prompt = `당신은 편입영어 전문 강사입니다.
학생의 레벨테스트 결과를 분석하고 3~4문장으로 진단 코멘트를 작성하세요.

결과: ${summary}

규칙:
- 잘한 파트와 부족한 파트를 명확히 언급하세요
- 학생이 듣기 좋도록 격려하되 현실적으로 작성하세요
- 반말 금지, 존댓말 사용
- 순수 텍스트만 출력 (마크다운 없음)`

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxTokens: 500,
  })

  return text.trim()
}

export async function generateCurriculum(
  results: { part: GrammarPart; score: number; total: number }[],
  targetDate: string,
  dailyMinutes: number
): Promise<import("@/types").Curriculum> {
  const today = new Date()
  const target = new Date(targetDate)
  const daysLeft = Math.max(1, Math.floor((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
  const weeksLeft = Math.max(1, Math.floor(daysLeft / 7))

  const summary = results
    .map((r) => `${r.part}: ${Math.round((r.score / r.total) * 100)}%`)
    .join(", ")

  const prompt = `당신은 편입영어 전문 강사입니다.
학생의 레벨테스트 결과를 바탕으로 주차별 커리큘럼을 생성하세요.

레벨테스트 결과: ${summary}
남은 기간: ${weeksLeft}주 (${daysLeft}일)
하루 학습 시간: ${dailyMinutes}분

규칙:
- 취약 파트(60% 미만)에 더 많은 주차를 배정하세요
- 하루 ${dailyMinutes}분 기준 dailyCount를 결정하세요 (30분=5문제, 60분=10문제, 120분=15문제)
- 최대 ${weeksLeft}주 분량만 생성하세요

다음 JSON 배열만 출력하세요:
[
  {
    "weekNum": 1,
    "part": "파트명",
    "dailyCount": 숫자,
    "focusReason": "이 파트를 집중하는 이유 (1문장)"
  }
]`

  const { text } = await generateText({
    model: MODEL,
    prompt,
    maxTokens: 2000,
  })

  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("커리큘럼 JSON을 파싱할 수 없습니다.")

  const weeks = JSON.parse(jsonMatch[0]) as import("@/types").WeekPlan[]

  return {
    weeks,
    totalWeeks: weeks.length,
    generatedAt: new Date().toISOString(),
  }
}
```

- [ ] **Step 2: `src/app/api/questions/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { generateQuestions } from "@/lib/claude"
import type { GenerateQuestionsRequest } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const body: GenerateQuestionsRequest = await req.json()
    const { part, difficulty, count, targetUniversity } = body

    if (!part || !difficulty || !count) {
      return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 })
    }

    const questions = await generateQuestions(part, difficulty, count, targetUniversity)
    return NextResponse.json({ questions })
  } catch (err) {
    console.error("[/api/questions]", err)
    return NextResponse.json({ error: "문제 생성 실패" }, { status: 500 })
  }
}
```

- [ ] **Step 3: `src/app/api/diagnosis/route.ts`**

```ts
import { NextRequest, NextResponse } from "next/server"
import { generateDiagnosisComment, generateCurriculum } from "@/lib/claude"
import type { DiagnosisRequest } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const body: DiagnosisRequest = await req.json()
    const { results, targetDate, dailyMinutes } = body

    const [comment, curriculum] = await Promise.all([
      generateDiagnosisComment(results),
      generateCurriculum(results, targetDate, dailyMinutes),
    ])

    return NextResponse.json({ comment, curriculum })
  } catch (err) {
    console.error("[/api/diagnosis]", err)
    return NextResponse.json({ error: "진단 생성 실패" }, { status: 500 })
  }
}
```

- [ ] **Step 4: `src/lib/claude.test.ts` — 파서 테스트**

```ts
// Claude API 자체는 테스트하지 않고, JSON 파싱 로직만 테스트
describe("Claude response parsing", () => {
  it("배열 JSON을 응답에서 추출한다", () => {
    const response = `네, 아래 문제들입니다:\n[{"id":1,"type":"관계사"}]\n감사합니다.`
    const match = response.match(/\[[\s\S]*\]/)
    expect(match).not.toBeNull()
    expect(JSON.parse(match![0])[0].id).toBe(1)
  })

  it("JSON만 있는 응답도 파싱된다", () => {
    const response = `[{"id":1},{"id":2}]`
    const match = response.match(/\[[\s\S]*\]/)
    expect(match).not.toBeNull()
    expect(JSON.parse(match![0])).toHaveLength(2)
  })
})
```

- [ ] **Step 5: 테스트 실행**

```bash
npx jest src/lib/claude.test.ts
```

Expected: PASS

- [ ] **Step 6: API 동작 수동 확인**

개발 서버 실행 후 다음 curl로 테스트:

```bash
curl -X POST http://localhost:3000/api/questions \
  -H "Content-Type: application/json" \
  -d '{"part":"관계사","difficulty":"중급","count":2}'
```

Expected: `{"questions":[{"id":1,"type":"관계사",...},...]}` 형태의 JSON 응답

- [ ] **Step 7: 커밋**

```bash
git add src/lib/claude.ts src/lib/claude.test.ts src/app/api/
git commit -m "feat: add Claude API routes for question generation and diagnosis"
```

---

## Task 5: 반응형 레이아웃 (AppShell)

**Files:**
- Create: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/BottomTabs.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: `src/components/layout/BottomTabs.tsx`**

```tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, XCircle, BarChart2 } from "lucide-react"

const tabs = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/dashboard?tab=study", label: "학습", icon: BookOpen },
  { href: "/dashboard?tab=wrong", label: "오답", icon: XCircle },
  { href: "/report", label: "리포트", icon: BarChart2 },
]

export function BottomTabs() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-warm-200 bg-ivory dark:bg-warm-900 dark:border-warm-700 md:hidden">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href.split("?")[0]
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs transition-colors ${
              active
                ? "text-copper-500 font-semibold"
                : "text-warm-400 hover:text-warm-700 dark:hover:text-warm-200"
            }`}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
```

- [ ] **Step 2: `src/components/layout/Sidebar.tsx`**

```tsx
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { Home, BookOpen, XCircle, BarChart2, BookMarked, Moon, Sun } from "lucide-react"

const navItems = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/dashboard?tab=study", label: "오늘 학습", icon: BookOpen },
  { href: "/dashboard?tab=wrong", label: "오답 노트", icon: XCircle },
  { href: "/report", label: "리포트", icon: BarChart2 },
  { href: "/dashboard?tab=vocab", label: "단어장", icon: BookMarked },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="hidden md:flex md:w-52 md:flex-col md:fixed md:inset-y-0 border-r border-warm-200 bg-warm-100 dark:bg-warm-800 dark:border-warm-700">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="px-4 py-5 border-b border-warm-200 dark:border-warm-700">
          <span className="text-lg font-bold text-copper-500 font-serif">편입AI튜터</span>
        </div>

        <nav className="flex-1 py-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href.split("?")[0]
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors border-l-[3px] ${
                  active
                    ? "text-copper-500 bg-copper-50 border-copper-500 font-semibold dark:bg-copper-700/20"
                    : "text-warm-500 border-transparent hover:text-warm-800 hover:bg-warm-200 dark:hover:bg-warm-700 dark:text-warm-400"
                }`}
              >
                <Icon size={16} strokeWidth={active ? 2.5 : 1.8} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-warm-200 dark:border-warm-700">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-warm-400 hover:text-warm-700 hover:bg-warm-200 dark:hover:bg-warm-700 transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </button>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: lucide-react 설치**

```bash
npm install lucide-react
```

- [ ] **Step 4: `src/components/layout/AppShell.tsx`**

```tsx
import { Sidebar } from "./Sidebar"
import { BottomTabs } from "./BottomTabs"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-ivory dark:bg-warm-900">
      <Sidebar />
      <main className="md:pl-52 pb-16 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>
      <BottomTabs />
    </div>
  )
}
```

- [ ] **Step 5: `src/app/page.tsx` — 진입점 리다이렉트**

```tsx
"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"

export default function RootPage() {
  const router = useRouter()
  const { isOnboarded, hasCompletedLevelTest, curriculum } = useAppStore()

  useEffect(() => {
    if (!isOnboarded()) {
      router.replace("/onboarding")
    } else if (!hasCompletedLevelTest()) {
      router.replace("/level-test")
    } else if (!curriculum) {
      router.replace("/diagnosis")
    } else {
      router.replace("/dashboard")
    }
  }, [])

  return null
}
```

- [ ] **Step 6: 개발 서버에서 리다이렉트 동작 확인**

```bash
npm run dev
```

`http://localhost:3000` 접속 → `/onboarding`으로 리다이렉트 되면 성공.

- [ ] **Step 7: 커밋**

```bash
git add src/components/ src/app/page.tsx
git commit -m "feat: add responsive AppShell with sidebar and bottom tabs"
```

---

## Task 6: 온보딩 화면 (Screen 01)

**Files:**
- Create: `src/app/onboarding/page.tsx`

- [ ] **Step 1: `src/app/onboarding/page.tsx`**

```tsx
"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ExamType, DailyMinutes } from "@/types"

const UNIVERSITIES = ["건국대", "홍익대", "중앙대", "경희대", "기타"]
const DAILY_OPTIONS: { label: string; value: DailyMinutes }[] = [
  { label: "30분", value: 30 },
  { label: "1시간", value: 60 },
  { label: "2시간", value: 120 },
  { label: "3시간 이상", value: 180 },
]

export default function OnboardingPage() {
  const router = useRouter()
  const { setOnboarding } = useAppStore()

  const [examType, setExamType] = useState<ExamType>("transfer")
  const [targetDate, setTargetDate] = useState("")
  const [dailyMinutes, setDailyMinutes] = useState<DailyMinutes>(60)
  const [targetUniversity, setTargetUniversity] = useState("기타")
  const [error, setError] = useState("")

  const dDay = targetDate
    ? Math.floor((new Date(targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const handleSubmit = () => {
    if (!targetDate) { setError("목표 시험일을 입력해주세요."); return }
    if (dDay !== null && dDay < 0) { setError("시험일이 오늘보다 이전입니다."); return }
    setOnboarding({
      examType, targetDate, dailyMinutes, targetUniversity,
      completedAt: new Date().toISOString(),
    })
    router.push("/level-test")
  }

  return (
    <div className="min-h-screen bg-ivory dark:bg-warm-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-warm-900 dark:text-ivory font-serif mb-2">
            편입AI튜터
          </h1>
          <p className="text-warm-500 dark:text-warm-400 text-sm">
            맞춤 커리큘럼으로 효율적인 편입 준비
          </p>
        </div>

        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 shadow-sm">
          <CardContent className="pt-6 space-y-6">

            {/* 시험 유형 */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">시험 유형</p>
              <div className="flex gap-2">
                {(["transfer", "civil", "suneung"] as ExamType[]).map((type) => {
                  const labels = { transfer: "편입영어", civil: "공무원영어", suneung: "수능영어" }
                  return (
                    <button
                      key={type}
                      onClick={() => setExamType(type)}
                      disabled={type !== "transfer"}
                      className={`flex-1 rounded-lg py-2 text-sm font-medium border transition-colors
                        ${examType === type
                          ? "bg-copper-50 border-copper-500 text-copper-500 dark:bg-copper-700/20"
                          : "border-warm-200 text-warm-400 dark:border-warm-600"
                        }
                        ${type !== "transfer" ? "opacity-40 cursor-not-allowed" : ""}
                      `}
                    >
                      {labels[type]}
                      {type !== "transfer" && (
                        <span className="block text-[10px] text-warm-300">준비 중</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 목표 시험일 */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">목표 시험일</p>
              <input
                type="date"
                value={targetDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => { setTargetDate(e.target.value); setError("") }}
                className="w-full rounded-lg border border-warm-200 dark:border-warm-600 bg-white dark:bg-warm-700 px-3 py-2 text-sm text-warm-900 dark:text-ivory focus:outline-none focus:ring-1 focus:ring-copper-500"
              />
              {dDay !== null && dDay >= 0 && (
                <p className="mt-1 text-xs text-copper-500">
                  D-{dDay} · {Math.ceil(dDay / 7)}주 남음
                </p>
              )}
            </div>

            {/* 하루 학습시간 */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">하루 학습 가능 시간</p>
              <div className="grid grid-cols-2 gap-2">
                {DAILY_OPTIONS.map(({ label, value }) => (
                  <button
                    key={value}
                    onClick={() => setDailyMinutes(value)}
                    className={`rounded-lg py-2 text-sm border transition-colors
                      ${dailyMinutes === value
                        ? "bg-copper-50 border-copper-500 text-copper-500 dark:bg-copper-700/20"
                        : "border-warm-200 text-warm-600 dark:border-warm-600 dark:text-warm-300 hover:border-warm-400"
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 목표 대학 */}
            <div>
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-2">
                목표 대학 <span className="text-warm-300">(선택)</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {UNIVERSITIES.map((univ) => (
                  <button
                    key={univ}
                    onClick={() => setTargetUniversity(univ)}
                    className={`rounded-full px-3 py-1 text-sm border transition-colors
                      ${targetUniversity === univ
                        ? "bg-copper-50 border-copper-500 text-copper-500 dark:bg-copper-700/20"
                        : "border-warm-200 text-warm-600 dark:border-warm-600 dark:text-warm-300 hover:border-warm-400"
                      }`}
                  >
                    {univ}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              onClick={handleSubmit}
              className="w-full bg-copper-500 hover:bg-copper-600 text-white font-semibold py-3"
            >
              레벨 테스트 시작 →
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 브라우저에서 온보딩 화면 확인**

```bash
npm run dev
```

`http://localhost:3000/onboarding` → 시험 유형·날짜·시간 선택 화면이 보이면 성공.
날짜 입력 시 D-day 표시, 버튼 클릭 시 `/level-test`로 이동 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/app/onboarding/
git commit -m "feat: add onboarding screen with exam type and schedule setup"
```

---

## Task 7: 레벨 테스트 화면 (Screen 02)

**Files:**
- Create: `src/app/level-test/page.tsx`
- Create: `src/components/features/QuestionCard.tsx`

- [ ] **Step 1: `src/components/features/QuestionCard.tsx`**

```tsx
"use client"
import type { Question } from "@/types"

interface QuestionCardProps {
  question: Question
  selectedOption: string | null
  onSelect: (option: string) => void
  showAnswer?: boolean   // 레벨테스트에서는 false, 일일학습에서는 true
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
```

- [ ] **Step 2: `src/app/level-test/page.tsx`**

```tsx
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
        allQuestions.push(...partQs.map((q: Question) => ({ ...q, id: idCounter++, type: part })))
      }

      setQuestions(allQuestions)
      setStatus("testing")
    } catch (err) {
      setError("문제를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.")
      setStatus("testing")
    }
  }

  const handleSelect = (option: string) => {
    const q = questions[currentIdx]
    setAnswers((prev) => ({ ...prev, [q.id]: option }))

    // 자동으로 다음 문제로 이동 (마지막 문제 제외)
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

  const progress = ((currentIdx + 1) / questions.length) * 100
  const currentQuestion = questions[currentIdx]
  const isLastQuestion = currentIdx === questions.length - 1
  const allAnswered = questions.every((q) => answers[q.id])

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
```

- [ ] **Step 3: 브라우저에서 레벨테스트 확인**

온보딩 완료 후 `/level-test` 접속 → 로딩 화면 → 문제 생성 완료 → 24문항 풀기 → "채점하기" → `/diagnosis`로 이동 확인.

- [ ] **Step 4: 커밋**

```bash
git add src/app/level-test/ src/components/features/QuestionCard.tsx
git commit -m "feat: add level test screen with 24 AI-generated questions"
```

---

## Task 8: 진단 리포트 + 커리큘럼 화면 (Screen 03)

**Files:**
- Create: `src/app/diagnosis/page.tsx`
- Create: `src/components/features/RadarChart.tsx`
- Create: `src/lib/curriculum.ts`
- Create: `src/lib/curriculum.test.ts`

- [ ] **Step 1: `src/lib/curriculum.test.ts`**

```ts
import { getWeakParts, getStrongParts } from "./curriculum"
import type { PartResult } from "@/types"

const mockResults: PartResult[] = [
  { part: "관계사", score: 1, total: 4, wrongQuestions: [] },
  { part: "분사구문", score: 4, total: 4, wrongQuestions: [] },
  { part: "가정법", score: 2, total: 4, wrongQuestions: [] },
  { part: "시제", score: 0, total: 4, wrongQuestions: [] },
  { part: "수일치", score: 3, total: 4, wrongQuestions: [] },
  { part: "병렬구조", score: 4, total: 4, wrongQuestions: [] },
]

describe("curriculum helpers", () => {
  it("취약 파트는 60% 미만을 반환한다", () => {
    const weak = getWeakParts(mockResults)
    expect(weak.map((r) => r.part)).toEqual(["관계사", "가정법", "시제"])
  })

  it("강점 파트는 70% 이상을 반환한다", () => {
    const strong = getStrongParts(mockResults)
    expect(strong.map((r) => r.part)).toEqual(["분사구문", "수일치", "병렬구조"])
  })
})
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
npx jest src/lib/curriculum.test.ts
```

Expected: FAIL

- [ ] **Step 3: `src/lib/curriculum.ts`**

```ts
import type { PartResult } from "@/types"

export const getScorePercent = (result: PartResult): number =>
  Math.round((result.score / result.total) * 100)

export const getWeakParts = (results: PartResult[]): PartResult[] =>
  results.filter((r) => getScorePercent(r) < 60)

export const getStrongParts = (results: PartResult[]): PartResult[] =>
  results.filter((r) => getScorePercent(r) >= 70)

export const getPartLabel = (percent: number): "강점" | "보통" | "취약" => {
  if (percent >= 70) return "강점"
  if (percent >= 40) return "보통"
  return "취약"
}

export const getPartColor = (percent: number): string => {
  if (percent >= 70) return "text-green-600 dark:text-green-400"
  if (percent >= 40) return "text-amber-600 dark:text-amber-400"
  return "text-red-500 dark:text-red-400"
}
```

- [ ] **Step 4: 테스트 실행 — 통과 확인**

```bash
npx jest src/lib/curriculum.test.ts
```

Expected: PASS

- [ ] **Step 5: `src/components/features/RadarChart.tsx`**

```tsx
"use client"
import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { PartResult } from "@/types"
import { getScorePercent } from "@/lib/curriculum"

interface RadarChartProps {
  results: PartResult[]
}

export function RadarChart({ results }: RadarChartProps) {
  const data = results.map((r) => ({
    part: r.part,
    score: getScorePercent(r),
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsRadar data={data}>
        <PolarGrid stroke="#E8E4DC" />
        <PolarAngleAxis
          dataKey="part"
          tick={{ fontSize: 12, fill: "#A89F96", fontFamily: "Gowun Batang, serif" }}
        />
        <Tooltip
          formatter={(value: number) => [`${value}점`, "점수"]}
          contentStyle={{
            background: "#fff",
            border: "1px solid #E8E4DC",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Radar
          name="점수"
          dataKey="score"
          stroke="#C96442"
          fill="#C96442"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 6: `src/app/diagnosis/page.tsx`**

```tsx
"use client"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { RadarChart } from "@/components/features/RadarChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getScorePercent, getPartLabel, getPartColor } from "@/lib/curriculum"

export default function DiagnosisPage() {
  const router = useRouter()
  const { getLatestLevelTest, onboarding, setCurriculum } = useAppStore()

  const [comment, setComment] = useState("")
  const [curriculum, setCurriculumState] = useState<import("@/types").Curriculum | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)

  const levelTest = getLatestLevelTest()

  useEffect(() => {
    if (!levelTest || !onboarding) {
      router.replace("/onboarding")
      return
    }
    loadDiagnosis()
  }, [])

  const loadDiagnosis = async () => {
    try {
      const res = await fetch("/api/diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          results: levelTest!.results,
          targetDate: onboarding!.targetDate,
          dailyMinutes: onboarding!.dailyMinutes,
        }),
      })
      const data = await res.json()
      setComment(data.comment)
      setCurriculumState(data.curriculum)
    } catch {
      setComment("진단 분석 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!curriculum) return
    setConfirming(true)
    setCurriculum(curriculum)
    router.push("/dashboard")
  }

  if (!levelTest) return null

  const targetDate = new Date(onboarding!.targetDate)
  const dDay = Math.floor((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="min-h-screen bg-ivory dark:bg-warm-900 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">

        {/* 헤더 */}
        <div>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-ivory font-serif">
            진단 리포트
          </h1>
          <p className="text-sm text-warm-500 dark:text-warm-400 mt-1">
            D-{dDay} · {onboarding!.targetUniversity}
          </p>
        </div>

        {/* 레이더 차트 */}
        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
          <CardContent className="pt-4">
            <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">파트별 점수</p>
            <RadarChart results={levelTest.results} />
          </CardContent>
        </Card>

        {/* 파트별 점수 목록 */}
        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
          <CardContent className="pt-4">
            <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">상세 결과</p>
            <div className="space-y-2">
              {levelTest.results.map((r) => {
                const pct = getScorePercent(r)
                const label = getPartLabel(pct)
                const colorClass = getPartColor(pct)
                return (
                  <div key={r.part} className="flex items-center gap-3">
                    <span className="w-20 text-sm text-warm-700 dark:text-warm-300 font-serif">
                      {r.part}
                    </span>
                    <div className="flex-1 h-2 bg-warm-200 dark:bg-warm-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-copper-500 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium w-12 text-right ${colorClass}`}>
                      {pct}점
                    </span>
                    <span className={`text-xs w-8 ${colorClass}`}>{label}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI 진단 코멘트 */}
        <Card className="border-copper-100 dark:border-copper-700/30 bg-copper-50 dark:bg-copper-700/10">
          <CardContent className="pt-4">
            <p className="text-xs text-copper-500 uppercase tracking-wide mb-2">AI 진단</p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-copper-100 dark:bg-copper-700/20 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <p className="text-sm text-warm-800 dark:text-warm-200 leading-relaxed font-serif">
                {comment}
              </p>
            )}
          </CardContent>
        </Card>

        {/* 커리큘럼 미리보기 */}
        {!loading && curriculum && (
          <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
            <CardContent className="pt-4">
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">
                맞춤 커리큘럼 — {curriculum.totalWeeks}주 계획
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {curriculum.weeks.map((week) => (
                  <div
                    key={week.weekNum}
                    className="flex items-start gap-3 text-sm"
                  >
                    <Badge
                      variant="outline"
                      className="border-copper-200 text-copper-500 dark:border-copper-600 shrink-0"
                    >
                      {week.weekNum}주차
                    </Badge>
                    <div>
                      <span className="font-medium text-warm-800 dark:text-warm-200 font-serif">
                        {week.part}
                      </span>
                      <span className="text-warm-400 ml-2">
                        일 {week.dailyCount}문제
                      </span>
                      <p className="text-xs text-warm-400 mt-0.5">{week.focusReason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Button
          onClick={handleConfirm}
          disabled={loading || !curriculum || confirming}
          className="w-full bg-copper-500 hover:bg-copper-600 text-white font-semibold py-3 font-serif"
        >
          {confirming ? "저장 중…" : "커리큘럼 확정 → 학습 시작"}
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: 브라우저에서 진단 화면 확인**

레벨테스트 완료 후 `/diagnosis` 접속 → 레이더 차트, AI 코멘트, 커리큘럼 표시 → "커리큘럼 확정" 클릭 → `/dashboard`로 이동 확인.

- [ ] **Step 8: 커밋**

```bash
git add src/app/diagnosis/ src/components/features/RadarChart.tsx src/lib/curriculum.ts src/lib/curriculum.test.ts
git commit -m "feat: add diagnosis report with radar chart and AI curriculum generation"
```

---

## Task 9: 임시 대시보드 + Vercel 배포

**Files:**
- Create: `src/app/dashboard/page.tsx`
- Create: `src/app/report/page.tsx`

- [ ] **Step 1: `src/app/dashboard/page.tsx` — 임시 화면 (Plan B에서 완성)**

```tsx
"use client"
import { useAppStore } from "@/lib/store"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent } from "@/components/ui/card"

export default function DashboardPage() {
  const { onboarding, curriculum, getLatestLevelTest } = useAppStore()
  const levelTest = getLatestLevelTest()

  const today = new Date().toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  })

  const targetDate = onboarding ? new Date(onboarding.targetDate) : null
  const dDay = targetDate
    ? Math.floor((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <p className="text-xs text-warm-400">{today}</p>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-ivory font-serif mt-1">
            오늘도 화이팅!
          </h1>
          {dDay !== null && (
            <p className="text-sm text-copper-500 mt-1">
              D-{dDay} · {onboarding?.targetUniversity}
            </p>
          )}
        </div>

        <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
          <CardContent className="pt-5">
            <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">오늘의 학습</p>
            {curriculum ? (
              <div>
                <p className="text-warm-600 dark:text-warm-300 font-serif text-sm">
                  {curriculum.weeks[0]?.part} — 하루 {curriculum.weeks[0]?.dailyCount}문제
                </p>
                <p className="text-xs text-warm-400 mt-2">
                  🚧 일일 학습 화면은 Phase 3에서 구현됩니다.
                </p>
              </div>
            ) : (
              <p className="text-warm-400 text-sm">커리큘럼을 불러오는 중…</p>
            )}
          </CardContent>
        </Card>

        {levelTest && (
          <Card className="border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800">
            <CardContent className="pt-5">
              <p className="text-xs text-warm-400 uppercase tracking-wide mb-3">마지막 레벨테스트 결과</p>
              <div className="grid grid-cols-3 gap-3">
                {levelTest.results.map((r) => (
                  <div key={r.part} className="text-center">
                    <p className="text-lg font-bold text-copper-500">
                      {Math.round((r.score / r.total) * 100)}
                    </p>
                    <p className="text-xs text-warm-400 font-serif">{r.part}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: `src/app/report/page.tsx` — 임시 화면**

```tsx
"use client"
import { AppShell } from "@/components/layout/AppShell"

export default function ReportPage() {
  return (
    <AppShell>
      <div className="text-center py-20">
        <p className="text-4xl mb-4">📊</p>
        <h1 className="text-xl font-bold text-warm-900 dark:text-ivory font-serif">주간 리포트</h1>
        <p className="text-warm-400 text-sm mt-2">Phase 4에서 구현 예정입니다.</p>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 3: 전체 흐름 최종 확인**

```bash
npm run dev
```

다음 순서로 전체 흐름 테스트:
1. `http://localhost:3000` → `/onboarding` 리다이렉트 확인
2. 온보딩 완료 → `/level-test` 이동
3. 24문항 풀기 → "채점하기" → `/diagnosis` 이동
4. 레이더 차트 + AI 코멘트 확인 → "커리큘럼 확정" → `/dashboard` 이동
5. 대시보드에서 네비게이션 (사이드바/하단 탭) 동작 확인
6. 다크 모드 토글 동작 확인
7. 새로고침 후에도 데이터 유지 확인 (localStorage)

- [ ] **Step 4: Vercel 배포**

```bash
npm install -g vercel
vercel
```

프롬프트:
- Set up and deploy? → Y
- Which scope? → 본인 계정 선택
- Link to existing project? → N
- Project name? → english-ai-tutor (또는 원하는 이름)
- In which directory is your code? → ./ (기본값)
- Environment Variables → 별도 입력 불필요 (AI Gateway OIDC가 자동 처리)

- [ ] **Step 5: 배포 확인**

Vercel이 출력한 URL 접속 → 전체 흐름 동작 확인.

- [ ] **Step 6: 최종 커밋**

```bash
git add .
git commit -m "feat: complete Phase 1-2 prototype — onboarding, level test, diagnosis"
```

---

## 전체 테스트 실행

```bash
npx jest --coverage
```

Expected:
- `store.test.ts` — 4개 통과
- `claude.test.ts` — 2개 통과
- `curriculum.test.ts` — 2개 통과

---

*저장 위치: `docs/superpowers/plans/2026-03-28-phase1-2-setup-and-core.md`*
*다음 계획서: Phase 3-4 (일일 학습 + 오답노트 + 주간 리포트)*
