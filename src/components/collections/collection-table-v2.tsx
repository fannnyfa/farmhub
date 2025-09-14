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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline"
import { Collection, CollectionInsert } from "@/lib/database.types"
import { toast } from "sonner"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

interface CollectionTableProps {
  collections: Collection[]
  onEdit: (collection: Collection) => void
  onUpdate: (id: string, updates: Partial<CollectionInsert>) => Promise<{ success: boolean }>
  onDelete: (id: string) => Promise<{ success: boolean }>
}

export default function CollectionTableV2({ collections, onEdit, onUpdate, onDelete }: CollectionTableProps) {
  const [loading, setLoading] = useState(false)

  const handleStatusChange = async (collection: Collection, newStatus: 'pending' | 'completed') => {
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
        <p className="text-gray-500">접수된 내역이 없습니다.</p>
        <p className="text-sm text-gray-400 mt-2">
          우측 상단의 '접수 등록' 버튼을 눌러 새로운 접수를 등록해보세요.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>생산자명</TableHead>
            <TableHead>품목</TableHead>
            <TableHead className="text-center">수량</TableHead>
            <TableHead className="text-center">무게</TableHead>
            <TableHead>지역/공판장</TableHead>
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
                  ? collection.quantity || 0
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
                  <div className="font-medium">{collection.region}</div>
                  <div className="text-gray-500">{collection.market}</div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {formatDate(collection.reception_date)}
              </TableCell>
              <TableCell className="text-center">
                {getStatusBadge(collection.status)}
              </TableCell>
              <TableCell className="text-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-8 h-8 p-0"
                      disabled={loading}
                    >
                      <EllipsisVerticalIcon className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {/* 상태 변경 */}
                    {collection.status === 'pending' ? (
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(collection, 'completed')}
                        className="text-green-600"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        완료 처리
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => handleStatusChange(collection, 'pending')}
                        className="text-orange-600"
                      >
                        <ClockIcon className="w-4 h-4 mr-2" />
                        대기중으로 변경
                      </DropdownMenuItem>
                    )}
                    
                    {/* 수정 */}
                    <DropdownMenuItem onClick={() => onEdit(collection)}>
                      <PencilIcon className="w-4 h-4 mr-2" />
                      수정
                    </DropdownMenuItem>

                    {/* 삭제 */}
                    <DropdownMenuItem
                      onClick={() => handleDelete(collection)}
                      className="text-red-600"
                    >
                      <TrashIcon className="w-4 h-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}