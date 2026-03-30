"use client"
import { AppShell } from "@/components/layout/AppShell"

export default function ReportPage() {
  return (
    <AppShell>
      <div className="text-center py-20">
        <p className="text-4xl mb-4">📊</p>
        <h1 className="text-xl font-bold text-warm-900 dark:text-ivory">주간 리포트</h1>
        <p className="text-warm-400 text-sm mt-2">학습을 시작하면 주간 리포트가 자동으로 생성됩니다.</p>
      </div>
    </AppShell>
  )
}
