import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 한국 시간 기준 날짜 문자열 (YYYY-MM-DD) — UTC 기준 하루 차이 버그 방지
export function getKoreanDateStr(date?: Date): string {
  return (date ?? new Date()).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
}
