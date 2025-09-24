"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarDaysIcon, DocumentArrowDownIcon } from "@heroicons/react/24/outline"
import { Collection } from "@/lib/database.types"
import { useAnalytics } from "@/hooks/use-analytics"
import DateSelector from "./date-selector"
import Loading from "@/components/ui/loading"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

export default function DailyRecords() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [records, setRecords] = useState<Collection[]>([])
  const { getDailyRecords, loading } = useAnalytics()

  useEffect(() => {
    if (selectedDate) {
      const dateString = format(selectedDate, "yyyy-MM-dd")
      loadDailyRecords(dateString)
    }
  }, [selectedDate])

  const loadDailyRecords = async (dateString: string) => {
    const data = await getDailyRecords(dateString)
    setRecords(data)
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">완료</Badge>
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-800">대기중</Badge>
      default:
        return <Badge variant="outline">알 수 없음</Badge>
    }
  }

  const getProductDisplay = (productType: string | null, productVariety: string | null) => {
    const variety = productVariety ? ` (${productVariety})` : ''
    return `${productType}${variety}`
  }

  const getQuantityDisplay = (collection: Collection) => {
    if (collection.product_type === '깻잎' && collection.product_variety === '정품') {
      return `${collection.quantity}박스`
    } else if (collection.product_type === '깻잎' && collection.product_variety === '바라') {
      return `${collection.quantity}개 (${collection.box_weight})`
    } else {
      return `${collection.quantity}박스 (${collection.box_weight})`
    }
  }

  const exportData = () => {
    if (records.length === 0) return

    const csvData = records.map(record => ({
      접수일: record.reception_date,
      생산자명: record.producer_name,
      품목: getProductDisplay(record.product_type, record.product_variety),
      수량: getQuantityDisplay(record),
      공판장: record.market,
      상태: record.status === 'completed' ? '완료' : '대기중'
    }))

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `접수기록_${format(selectedDate!, "yyyy-MM-dd")}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <CalendarDaysIcon className="w-5 h-5" />
            날짜별 상세 조회
          </CardTitle>
          {records.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              className="flex items-center gap-2"
            >
              <DocumentArrowDownIcon className="w-4 h-4" />
              CSV 내보내기
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 날짜 선택기 */}
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          placeholder="조회할 날짜를 선택하세요"
        />

        {/* 로딩 표시 */}
        {loading && (
          <div className="flex justify-center py-8">
            <Loading size="md" />
          </div>
        )}

        {/* 결과 표시 */}
        {!loading && selectedDate && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {format(selectedDate, "yyyy년 MM월 dd일 (EEE)", { locale: ko })} 기록
              </h3>
              <span className="text-sm text-gray-500">
                총 {records.length}건
              </span>
            </div>

            {records.length === 0 ? (
              <div className="text-center py-8">
                <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">선택한 날짜에 접수 기록이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <div
                    key={record.id}
                    className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {record.producer_name}
                          </span>
                          {getStatusBadge(record.status)}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                          <span>품목: {getProductDisplay(record.product_type, record.product_variety)}</span>
                          <span>수량: {getQuantityDisplay(record)}</span>
                          <span>공판장: {record.market}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}