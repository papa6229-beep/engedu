"use client"
import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts"
import type { PartResult } from "@/types"
import { getScorePercent } from "@/lib/curriculum"

interface RadarChartProps {
  results: PartResult[]
}

export function RadarChart({ results }: RadarChartProps) {
  const data = results.map((r) => ({
    part: r.part,
    score: getScorePercent(r),
    fullMark: 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <RechartsRadar data={data}>
        <PolarGrid stroke="#E8E4DC" />
        <PolarAngleAxis
          dataKey="part"
          tick={{ fontSize: 12, fill: "#A89F96", fontFamily: "Gowun Batang, serif" }}
        />
        <Tooltip
          formatter={(value) => [`${value}점`, "점수"]}
          contentStyle={{
            background: "#fff",
            border: "1px solid #E8E4DC",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Radar
          name="점수"
          dataKey="score"
          stroke="#C96442"
          fill="#C96442"
          fillOpacity={0.15}
          strokeWidth={2}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}
