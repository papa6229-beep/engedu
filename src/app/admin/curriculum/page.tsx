"use client"
import { useState, useEffect, useCallback } from "react"
import { getSetting, setSetting } from "@/lib/supabase"

const TABS = [
  {
    key: "teacher_principle",
    label: "학습 순서 원칙",
    desc: "파트별 학습 순서, 우선순위 원칙",
    placeholder: `예시:
- 수일치는 모든 문법의 기초. 무조건 1순위
- 관계사와 수일치는 연결고리가 강함. 인접 주차 배치
- 가정법은 시제 개념이 선행되어야 함. 시제 후 배치
- 분사구문은 중급 이상. 기초 파트 후 배치
- 병렬구조는 독립적. 어느 시점에 넣어도 무방
- 마지막 1~2주는 반드시 통합 실전 문제`,
  },
  {
    key: "teacher_university",
    label: "대학별 출제 경향",
    desc: "각 대학의 출제 유형 및 전략",
    placeholder: `예시:
- 중앙대: 관계사 출제 비중 높음. 관계사를 2주로 늘릴 것
- 연세대: 시제+가정법 복합 문제 빈출. 통합 학습 필요
- 한양대: 수일치+병렬구조 동시 출제 경향
- 성균관대: 분사구문 고난도 문제 출제 비중 증가`,
  },
  {
    key: "teacher_trap",
    label: "함정 유형 & 오답 패턴",
    desc: "자주 나오는 함정, 오답 원인 분석",
    placeholder: `예시:
- 관계대명사 vs 관계부사: 선행사가 장소여도 관계부사를 쓸 수 없는 경우가 있음
- 수일치: 집합명사(class, team 등)는 단수 취급 — 학생들이 복수로 착각
- 가정법: if절 생략 도치 구문(Were I to / Had I) 인식 부족
- 분사구문: 독립분사구문과 비인칭독립분사구문 혼동`,
  },
  {
    key: "teacher_style",
    label: "해설 스타일 & 기타 지침",
    desc: "AI 해설 방식, 기타 운영 지침",
    placeholder: `예시:
- 해설은 반드시 오답 선지 이유까지 설명할 것
- 학생이 자주 묻는 질문 패턴 위주로 해설 구성
- 어려운 문법 용어는 한국어 풀이와 함께 제시
- 예문은 실제 편입 기출 스타일로 작성`,
  },
] as const

type TabKey = typeof TABS[number]["key"]

function TabContent({ tabKey, label }: { tabKey: TabKey; label: string }) {
  const tab = TABS.find((t) => t.key === tabKey)!
  const [value, setValue] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    setLoading(true)
    getSetting(tabKey).then((val) => {
      setValue(val)
      setLoading(false)
    })
  }, [tabKey])

  const handleSave = useCallback(async () => {
    setSaving(true)
    await setSetting(tabKey, value)
    setSaving(false)
    setToast(true)
    setTimeout(() => setToast(false), 3000)
  }, [tabKey, value])

  return (
    <div className="space-y-4">
      {/* 안내 */}
      <p className="text-sm text-warm-500 dark:text-warm-400 leading-relaxed">
        {tab.desc} — 여기에 입력한 내용은 커리큘럼 생성 AI 프롬프트에 자동으로 반영됩니다.
      </p>

      {/* 에디터 */}
      <div className="rounded-2xl border border-warm-200 dark:border-warm-700 bg-white dark:bg-warm-800 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-warm-100 dark:border-warm-700 flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="ml-3 text-xs text-warm-400 font-mono">{tabKey}</span>
        </div>

        {loading ? (
          <div className="px-5 py-8 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-4 bg-warm-100 dark:bg-warm-700 rounded animate-pulse"
                style={{ width: i === 4 ? "50%" : "100%" }}
              />
            ))}
          </div>
        ) : (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={16}
            placeholder={tab.placeholder}
            className="w-full px-5 py-4 text-sm text-warm-800 dark:text-warm-200 bg-transparent resize-none outline-none leading-relaxed font-mono placeholder:text-warm-300 dark:placeholder:text-warm-600"
          />
        )}
      </div>

      {/* 저장 */}
      <div className="flex items-center justify-between">
        <p
          className="text-sm text-green-600 dark:text-green-400 transition-opacity duration-300"
          style={{ opacity: toast ? 1 : 0 }}
        >
          저장되었습니다. 다음 커리큘럼 생성부터 반영됩니다.
        </p>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="px-8 py-3 rounded-xl text-sm font-bold text-white transition-opacity disabled:opacity-40"
          style={{ background: "#1a1a1a" }}
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </div>
  )
}

export default function AdminCurriculumPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("teacher_principle")

  return (
    <div className="min-h-screen bg-warm-50 dark:bg-warm-900 px-6 py-10">
      <div className="max-w-3xl mx-auto">

        {/* 헤더 */}
        <div className="mb-8">
          <p className="text-xs font-bold text-warm-400 uppercase tracking-widest mb-1">
            어드민 · 커리큘럼 설정
          </p>
          <h1 className="text-2xl font-bold text-warm-900 dark:text-ivory">
            강사 자료 관리
          </h1>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 border-b border-warm-200 dark:border-warm-700">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2.5 text-sm font-medium transition-colors rounded-t-lg relative"
              style={
                activeTab === tab.key
                  ? { color: "#C96442", borderBottom: "2px solid #C96442" }
                  : { color: "#9e9691" }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        <TabContent key={activeTab} tabKey={activeTab} label={TABS.find((t) => t.key === activeTab)!.label} />

      </div>
    </div>
  )
}
