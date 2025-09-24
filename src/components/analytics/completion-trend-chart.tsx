"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartBarIcon } from "@heroicons/react/24/outline"
import { useAnalytics } from "@/hooks/use-analytics"
import Loading from "@/components/ui/loading"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface DailyTrend {
  reception_date: string
  completed_count: number
  total_quantity: number
  unique_producers: number
  unique_markets: number
}

export default function CompletionTrendChart() {
  const [trendData, setTrendData] = useState<DailyTrend[]>([])
  const [chartType, setChartType] = useState<'line' | 'bar'>('line')
  const { getDailyTrend, loading } = useAnalytics()

  useEffect(() => {
    loadTrendData()
  }, [])

  const loadTrendData = async () => {
    const data = await getDailyTrend()
    setTrendData(data)
  }

  // 차트용 데이터 변환
  const chartData = trendData.map(item => ({
    ...item,
    date: format(new Date(item.reception_date), "MM/dd", { locale: ko }),
    fullDate: format(new Date(item.reception_date), "MM월 dd일 (EEE)", { locale: ko }),
    완료건수: item.completed_count,
    총수량: item.total_quantity,
    생산자수: item.unique_producers,
    공판장수: item.unique_markets
  }))


  interface TooltipProps {
    active?: boolean
    payload?: Array<{
      payload: {
        fullDate: string
        완료건수: number
        총수량: number
        생산자수: number
      }
    }>
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.fullDate}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-blue-600">완료 건수:</span> {data.완료건수}건
            </p>
            <p className="text-sm">
              <span className="text-green-600">총 수량:</span> {data.총수량.toLocaleString()}
            </p>
            <p className="text-sm">
              <span className="text-purple-600">생산자 수:</span> {data.생산자수}명
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5" />
            완료 건수 트렌드 (최근 30일)
          </CardTitle>
          <div className="flex gap-2">
            <button
              onClick={() => setChartType('line')}
              className={`px-3 py-1 rounded text-sm ${
                chartType === 'line' 
                  ? 'bg-brand text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              선 그래프
            </button>
            <button
              onClick={() => setChartType('bar')}
              className={`px-3 py-1 rounded text-sm ${
                chartType === 'bar' 
                  ? 'bg-brand text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              막대 그래프
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loading size="md" />
          </div>
        ) : trendData.length === 0 ? (
          <div className="text-center py-8">
            <ChartBarIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">최근 30일간 완료된 접수가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 차트 */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={12}
                      tick={{ fill: '#666' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: '#666' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line 
                      type="monotone" 
                      dataKey="완료건수" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                    />
                  </LineChart>
                ) : (
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      fontSize={12}
                      tick={{ fill: '#666' }}
                    />
                    <YAxis 
                      fontSize={12}
                      tick={{ fill: '#666' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="완료건수" 
                      fill="#3b82f6"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}