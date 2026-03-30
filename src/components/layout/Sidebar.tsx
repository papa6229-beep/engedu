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
