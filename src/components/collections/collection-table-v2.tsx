"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline"
import { Collection, CollectionInsert, CollectionWithUser } from "@/lib/database.types"
import { toast } from "sonner"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import CollectionCardMobile from "./collection-card-mobile"

interface CollectionTableProps {
  collections: CollectionWithUser[]
  onEdit: (collection: CollectionWithUser) => void
  onUpdate: (id: string, updates: Partial<CollectionInsert>) => Promise<{ success: boolean }>
  onDelete: (id: string) => Promise<{ success: boolean }>
}

export default function CollectionTableV2({ collections, onEdit, onUpdate, onDelete }: CollectionTableProps) {
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (collection: CollectionWithUser, newStatus: 'pending' | 'completed') => {
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

  const handleDelete = async (collection: Collection) => {
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

  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">팀에서 접수된 내역이 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">
          팀원 누구나 &apos;접수 등록&apos; 버튼을 눌러 새로운 접수를 등록할 수 있습니다.
        </p>
      </div>
    )
  }

  return (
    <>
      {/* 모바일/태블릿 카드 레이아웃 */}
      <div className="block md:hidden">
        <div className="space-y-4">
          {collections.map((collection) => (
            <CollectionCardMobile
              key={collection.id}
              collection={collection}
              onEdit={onEdit}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>

      {/* 데스크톱 테이블 레이아웃 */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>생산자명</TableHead>
                <TableHead>품목</TableHead>
                <TableHead className="text-center">수량</TableHead>
                <TableHead className="text-center">무게</TableHead>
                <TableHead>공판장</TableHead>
                <TableHead className="text-center">등록자</TableHead>
                <TableHead className="text-center">접수일</TableHead>
                <TableHead className="text-center">상태</TableHead>
                <TableHead className="text-center">액션</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell className="font-medium">
                    {collection.producer_name}
                  </TableCell>
                  <TableCell>
                    {getProductBadge(collection.product_type, collection.product_variety)}
                  </TableCell>
                  <TableCell className="text-center">
                    {collection.product_type === '깻잎' && collection.product_variety === '정품' 
                      ? `${collection.quantity || 0}박스`
                      : collection.product_type === '깻잎' && collection.product_variety === '바라'
                      ? `${collection.quantity || 0}개`
                      : `${collection.quantity || 0}박스`
                    }
                  </TableCell>
                  <TableCell className="text-center">
                    {collection.product_type === '깻잎' && collection.product_variety === '정품' ? (
                      <span className="text-xs text-gray-500">-</span>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {collection.box_weight}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">{collection.market}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">
                      <div className="font-medium text-gray-700">
                        {collection.users?.name || '알 수 없음'}
                      </div>
                      <div className="text-xs text-gray-500 hidden lg:block">
                        {collection.users?.email}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {formatDate(collection.reception_date)}
                  </TableCell>
                  <TableCell className="text-center">
                    {getStatusBadge(collection.status)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 min-w-[180px]">
                      {/* 상태 변경 버튼 */}
                      {collection.status === 'pending' ? (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(collection, 'completed')}
                          className="h-7 text-xs px-2 bg-green-600 hover:bg-green-700 text-white"
                          disabled={loading}
                        >
                          <CheckCircleIcon className="w-3 h-3 mr-1" />
                          <span className="hidden lg:inline">완료</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(collection, 'pending')}
                          className="h-7 text-xs px-2 bg-orange-600 hover:bg-orange-700 text-white"
                          disabled={loading}
                        >
                          <ClockIcon className="w-3 h-3 mr-1" />
                          <span className="hidden lg:inline">대기</span>
                        </Button>
                      )}
                      
                      {/* 수정 버튼 */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onEdit(collection)}
                        className="h-7 text-xs px-2"
                        disabled={loading}
                      >
                        <PencilIcon className="w-3 h-3 mr-1" />
                        <span className="hidden lg:inline">수정</span>
                      </Button>

                      {/* 삭제 버튼 */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(collection)}
                        className="h-7 text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        disabled={loading}
                      >
                        <TrashIcon className="w-3 h-3 mr-1" />
                        <span className="hidden lg:inline">삭제</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}