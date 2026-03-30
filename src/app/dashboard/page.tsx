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
