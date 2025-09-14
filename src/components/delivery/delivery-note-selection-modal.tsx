"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { DocumentTextIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline"
import { Collection } from "@/lib/database.types"
import { groupCompletedCollections, DeliveryNoteGroup } from "@/lib/delivery-note-utils"
import { downloadSelectedDeliveryNotesPDFLib } from "@/lib/pdf-lib-utils"
import { toast } from "sonner"

interface DeliveryNoteSelectionModalProps {
  open: boolean
  onClose: () => void
  collections: Collection[]
}

export default function DeliveryNoteSelectionModal({
  open,
  onClose,
  collections
}: DeliveryNoteSelectionModalProps) {
  const [groups, setGroups] = useState<DeliveryNoteGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // 모달이 열릴 때마다 그룹 데이터 업데이트
  useEffect(() => {
    if (open) {
      const completedGroups = groupCompletedCollections(collections)
      setGroups(completedGroups)
      setSelectedGroups([]) // 선택 초기화
    }
  }, [open, collections])

  // 그룹 고유 키 생성
  const getGroupKey = (group: DeliveryNoteGroup) => {
    return `${group.market}-${group.productType}`
  }

  // 개별 그룹 선택/해제
  const handleGroupToggle = (group: DeliveryNoteGroup) => {
    const groupKey = getGroupKey(group)
    setSelectedGroups(prev => 
      prev.includes(groupKey) 
        ? prev.filter(key => key !== groupKey)
        : [...prev, groupKey]
    )
  }

  // 전체 선택
  const handleSelectAll = () => {
    const allKeys = groups.map(getGroupKey)
    setSelectedGroups(allKeys)
  }

  // 전체 해제
  const handleDeselectAll = () => {
    setSelectedGroups([])
  }

  // 선택된 그룹들 PDF 출력
  const handlePrintSelected = async () => {
    if (selectedGroups.length === 0) {
      toast.error("출력할 그룹을 선택해주세요.")
      return
    }

    setLoading(true)
    try {
      const selectedGroupData = groups.filter(group => 
        selectedGroups.includes(getGroupKey(group))
      )

      console.log('📋 송품장 생성 시작:', selectedGroupData.length, '개 그룹')
      const result = await downloadSelectedDeliveryNotesPDFLib(selectedGroupData)
      console.log('📋 송품장 생성 결과:', result)
      
      if (result.success) {
        toast.success(result.message)
        onClose()
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      console.error('송품장 출력 오류:', error)
      toast.error('송품장 출력 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 품목 표시용 헬퍼 함수
  const getProductDisplayName = (productType: string, collections: Collection[]) => {
    const varieties = collections
      .filter(c => c.product_variety)
      .map(c => c.product_variety)
    
    if (varieties.length > 0) {
      const uniqueVarieties = Array.from(new Set(varieties))
      return `${productType}(${uniqueVarieties.join(', ')})`
    }
    return productType
  }

  if (groups.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5" />
              송품장 출력
            </DialogTitle>
            <DialogDescription>
              오늘 출력 가능한 완료된 접수가 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              닫기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5" />
            당일 송품장 출력 선택
          </DialogTitle>
          <DialogDescription>
            오늘 완료된 접수의 송품장 그룹을 선택해주세요. (공판장별-품목별 그룹화)
          </DialogDescription>
        </DialogHeader>

        {/* 전체/해제 버튼 */}
        <div className="flex gap-2 py-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSelectAll}
            disabled={selectedGroups.length === groups.length}
          >
            <CheckIcon className="w-4 h-4 mr-1" />
            전체 선택
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDeselectAll}
            disabled={selectedGroups.length === 0}
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            선택 해제
          </Button>
          <div className="flex-1" />
          <Badge variant="secondary" className="self-center">
            {selectedGroups.length}/{groups.length} 선택됨
          </Badge>
        </div>

        {/* 그룹 리스트 */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {groups.map((group) => {
            const groupKey = getGroupKey(group)
            const isSelected = selectedGroups.includes(groupKey)
            const productDisplay = getProductDisplayName(group.productType, group.collections)
            
            return (
              <Card 
                key={groupKey} 
                className={`cursor-pointer transition-colors ${
                  isSelected ? 'ring-2 ring-brand bg-green-50' : 'hover:bg-gray-50'
                }`}
                onClick={() => handleGroupToggle(group)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => {}} // onClick으로 처리
                      className="pointer-events-none"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {group.market}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {productDisplay}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {group.collections.length}건 • 총 {group.collections.reduce((sum, c) => sum + (c.quantity || 0), 0)}
                        {group.productType === '깻잎' && group.collections[0]?.product_variety === '정품' ? '' : '박스'}
                      </p>
                    </div>
                    {isSelected && (
                      <CheckIcon className="w-5 h-5 text-brand" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            취소
          </Button>
          <Button 
            className="bg-brand hover:bg-green-700"
            onClick={handlePrintSelected}
            disabled={loading || selectedGroups.length === 0}
          >
            <DocumentTextIcon className="w-4 h-4 mr-2" />
            {loading ? "출력중..." : `선택한 ${selectedGroups.length}개 그룹 출력`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}