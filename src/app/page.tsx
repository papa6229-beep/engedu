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
