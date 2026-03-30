import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { DevPanel } from "@/components/DevPanel"

export const metadata: Metadata = {
  title: "편입AI튜터",
  description: "편입영어 AI 튜터 — 맞춤 커리큘럼과 실시간 문제 생성",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"
        />
      </head>
      <body className="bg-ivory text-warm-900 antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
          {process.env.NODE_ENV === "development" && <DevPanel />}
        </ThemeProvider>
      </body>
    </html>
  )
}
