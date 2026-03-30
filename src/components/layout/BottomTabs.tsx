"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, BookOpen, CalendarDays, BarChart2 } from "lucide-react"

const tabs = [
  { href: "/dashboard", label: "홈", icon: Home },
  { href: "/today", label: "오늘", icon: BookOpen },
  { href: "/calendar", label: "달력", icon: CalendarDays },
  { href: "/progress", label: "통계", icon: BarChart2 },
]

export function BottomTabs() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-warm-200 bg-ivory dark:bg-warm-900 dark:border-warm-700 md:hidden">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href
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
