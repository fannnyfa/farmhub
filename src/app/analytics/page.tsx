"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MainLayout from "@/components/layout/main-layout"
import { useAuth } from "@/contexts/auth-context"
import Loading from "@/components/ui/loading"
import DailyRecords from "@/components/analytics/daily-records"
import ProducerRanking from "@/components/analytics/producer-ranking"
import MarketRanking from "@/components/analytics/market-ranking"
import CompletionTrendChart from "@/components/analytics/completion-trend-chart"

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    // 페이지 로딩 시뮬레이션
    const timer = setTimeout(() => setLoading(false), 500)
    return () => clearTimeout(timer)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (loading) {
    return (
      <MainLayout user={user ? { name: user.name, email: user.email, role: user.role || 'user' } : null}>
        <div className="min-h-screen flex items-center justify-center">
          <Loading size="lg" />
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout user={user ? { name: user.name, email: user.email, role: user.role || 'user' } : null}>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">데이터 분석</h1>
            <p className="text-sm sm:text-base text-gray-600">수거 데이터 통계 및 트렌드 분석</p>
          </div>
        </div>

        {/* 메인 분석 대시보드 */}
        <div className="space-y-6">
          {/* 날짜별 상세 조회 - 가로 전체 차지 */}
          <DailyRecords />

          {/* 30일 트렌드 차트 - 가로 전체 차지 */}
          <CompletionTrendChart />

          {/* 하단 랭킹들 - 2열 그리드 유지 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 생산자 TOP 6 */}
            <ProducerRanking />

            {/* 공판장 TOP 6 */}
            <MarketRanking />
          </div>
        </div>

      </div>
    </MainLayout>
  )
}