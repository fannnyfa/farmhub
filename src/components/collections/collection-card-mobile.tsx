"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline"
import { Collection, CollectionInsert } from "@/lib/database.types"
import { toast } from "sonner"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface CollectionCardMobileProps {
  collection: Collection
  onEdit: (collection: Collection) => void
  onUpdate: (id: string, updates: Partial<CollectionInsert>) => Promise<{ success: boolean }>
  onDelete: (id: string) => Promise<{ success: boolean }>
}

export default function CollectionCardMobile({ 
  collection, 
  onEdit, 
  onUpdate, 
  onDelete 
}: CollectionCardMobileProps) {
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (newStatus: 'pending' | 'completed') => {
    setLoading(true)
    try {
      const result = await onUpdate(collection.id, { status: newStatus })
      
      if (result.success) {
        toast.success(`접수가 ${newStatus === 'completed' ? '완료' : '대기중'}으로 변경되었습니다.`)
      } else {
        toast.error("상태 변경에 실패했습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`${collection.producer_name}님의 접수를 삭제하시겠습니까?`)) {
      return
    }

    setLoading(true)
    try {
      const result = await onDelete(collection.id)
      
      if (result.success) {
        toast.success("접수가 삭제되었습니다.")
      } else {
        toast.error("접수 삭제에 실패했습니다.")
      }
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            완료
          </Badge>
        )
      case 'pending':
      default:
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
            <ClockIcon className="w-3 h-3 mr-1" />
            대기중
          </Badge>
        )
    }
  }

  const getProductBadge = (productType: string | null, productVariety: string | null) => {
    const variety = productVariety ? ` (${productVariety})` : ''
    return (
      <Badge variant="outline" className="text-xs">
        {productType}{variety}
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), 'MM/dd (EEE)', { locale: ko })
    } catch {
      return dateString
    }
  }

  const getQuantityDisplay = () => {
    if (collection.product_type === '깻잎' && collection.product_variety === '정품') {
      return `${collection.quantity || 0}장`
    } else if (collection.product_type === '깻잎' && collection.product_variety === '바라') {
      const weight = collection.box_weight || ''
      return `${collection.quantity || 0}장 (${weight})`
    } else {
      const weight = collection.box_weight || ''
      return `${collection.quantity || 0}박스 (${weight})`
    }
  }

  return (
    <Card className="w-full shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getStatusBadge(collection.status)}
              <span className="text-xs text-gray-500 flex items-center">
                <CalendarIcon className="w-3 h-3 mr-1" />
                {formatDate(collection.reception_date)}
              </span>
            </div>
            <h3 className="font-semibold text-lg text-gray-900">
              {collection.producer_name}
            </h3>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* 품목 정보 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">품목</span>
            {getProductBadge(collection.product_type, collection.product_variety)}
          </div>

          {/* 수량 정보 */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">수량</span>
            <span className="font-medium text-gray-900">
              {getQuantityDisplay()}
            </span>
          </div>

          {/* 공판장 정보 */}
          <div className="flex items-start justify-between">
            <span className="text-sm text-gray-600 flex items-center">
              <MapPinIcon className="w-3 h-3 mr-1" />
              공판장
            </span>
            <div className="text-right">
              <div className="font-medium text-gray-900 text-sm">{collection.market}</div>
            </div>
          </div>

          {/* 액션 버튼 영역 */}
          <div className="pt-4 mt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-2">
              {/* 상태 변경 버튼 */}
              {collection.status === 'pending' ? (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('completed')}
                  className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                  disabled={loading}
                >
                  <CheckCircleIcon className="w-3 h-3 mr-1" />
                  완료
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => handleStatusChange('pending')}
                  className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                  disabled={loading}
                >
                  <ClockIcon className="w-3 h-3 mr-1" />
                  대기
                </Button>
              )}
              
              {/* 수정 버튼 */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(collection)}
                className="h-8 text-xs"
                disabled={loading}
              >
                <PencilIcon className="w-3 h-3 mr-1" />
                수정
              </Button>

              {/* 삭제 버튼 */}
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDelete}
                className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={loading}
              >
                <TrashIcon className="w-3 h-3 mr-1" />
                삭제
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}