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
      <body
        className={`${gowunBatang.variable} ${lora.variable} font-serif bg-ivory text-warm-900 antialiased`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
