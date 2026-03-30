"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Home, BookOpen, CalendarDays, BarChart2, FileText, Moon, Sun, RotateCcw } from "lucide-react"
import { useAppStore } from "@/lib/store"

const navItems = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/today", label: "오늘 학습", icon: BookOpen },
  { href: "/calendar", label: "학습 달력", icon: CalendarDays },
  { href: "/progress", label: "진도 & 통계", icon: BarChart2 },
  { href: "/report", label: "리포트", icon: FileText },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { resetAll } = useAppStore()

  const handleReset = () => {
    if (confirm("모든 학습 데이터를 초기화할까요?\n레벨테스트, 커리큘럼, 학습 기록, 오답 노트가 모두 삭제됩니다.")) {
      resetAll()
      router.push("/onboarding")
    }
  }

  return (
    <aside className="hidden md:flex md:w-52 md:flex-col md:fixed md:inset-y-0 border-r border-warm-200 bg-warm-100 dark:bg-warm-800 dark:border-warm-700">
      <div className="flex flex-col flex-1 overflow-y-auto">
        <div className="px-4 py-5 border-b border-warm-200 dark:border-warm-700">
          <span className="text-lg font-bold text-copper-500">편입AI튜터</span>
        </div>

        <nav className="flex-1 py-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
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

        <div className="p-3 border-t border-warm-200 dark:border-warm-700 space-y-1">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-warm-400 hover:text-warm-700 hover:bg-warm-200 dark:hover:bg-warm-700 transition-colors"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            {theme === "dark" ? "라이트 모드" : "다크 모드"}
          </button>
          <button
            onClick={handleReset}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <RotateCcw size={16} />
            데이터 초기화
          </button>
        </div>
      </div>
    </aside>
  )
}
