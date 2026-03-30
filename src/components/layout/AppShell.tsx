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
