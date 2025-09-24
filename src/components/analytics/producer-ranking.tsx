"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { UserGroupIcon } from "@heroicons/react/24/outline"
import { useAnalytics } from "@/hooks/use-analytics"
import Loading from "@/components/ui/loading"

interface ProducerRanking {
  producer_name: string
  total_collections: number
  total_quantity: number
  avg_quantity: number
  last_collection_date: string
  markets_used: string
}

export default function ProducerRanking() {
  const [rankings, setRankings] = useState<ProducerRanking[]>([])
  const { getProducerRanking, loading } = useAnalytics()

  useEffect(() => {
    loadRankings()
  }, [])

  const loadRankings = async () => {
    const data = await getProducerRanking(6)
    setRankings(data)
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserGroupIcon className="w-5 h-5" />
          생산자 TOP 6 (최근 30일)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loading size="md" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-8">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">최근 30일간 완료된 접수가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map((producer, index) => (
              <div
                key={producer.producer_name}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  index < 3 
                    ? 'bg-gradient-to-r from-gray-50 to-white border-gray-200 shadow-sm' 
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {producer.producer_name}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        마지막 접수: {producer.last_collection_date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-brand">
                      {producer.total_quantity.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">총 수량</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">접수 건수:</span>
                    <span className="font-medium">{producer.total_collections}건</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">평균 수량:</span>
                    <span className="font-medium">{Math.round(producer.avg_quantity)}</span>
                  </div>
                </div>
                
                {producer.markets_used && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <div className="text-xs text-gray-600 mb-1">이용 공판장:</div>
                    <div className="flex flex-wrap gap-1">
                      {producer.markets_used.split(', ').map((market, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {market}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}