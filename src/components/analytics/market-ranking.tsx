"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BuildingStorefrontIcon } from "@heroicons/react/24/outline"
import { useAnalytics } from "@/hooks/use-analytics"
import Loading from "@/components/ui/loading"

interface MarketRanking {
  market: string
  total_collections: number
  total_quantity: number
  unique_producers: number
  avg_quantity: number
  last_collection_date: string
}

export default function MarketRanking() {
  const [rankings, setRankings] = useState<MarketRanking[]>([])
  const { getMarketRanking, loading } = useAnalytics()

  useEffect(() => {
    loadRankings()
  }, [])

  const loadRankings = async () => {
    const data = await getMarketRanking(6)
    setRankings(data)
  }


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BuildingStorefrontIcon className="w-5 h-5" />
          공판장 TOP 6 (최근 30일)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loading size="md" />
          </div>
        ) : rankings.length === 0 ? (
          <div className="text-center py-8">
            <BuildingStorefrontIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">최근 30일간 완료된 접수가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rankings.map((market, index) => (
              <div
                key={market.market}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  index < 3 
                    ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200 shadow-sm' 
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {market.market}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        마지막 접수: {market.last_collection_date}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">
                      {market.total_collections.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">완료 건수</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {market.total_quantity.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">총 수량</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {market.unique_producers}
                    </div>
                    <div className="text-xs text-gray-500">생산자 수</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {Math.round(market.avg_quantity)}
                    </div>
                    <div className="text-xs text-gray-500">평균 수량</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}