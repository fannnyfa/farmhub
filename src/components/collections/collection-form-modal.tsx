"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { CollectionInsert } from "@/lib/database.types"
import { useCollections } from "@/hooks/use-collections"
import { toast } from "sonner"
import Loading from "@/components/ui/loading"

interface CollectionFormModalProps {
  open: boolean
  onClose: () => void
  editData?: CollectionInsert & { id?: string }
}

export default function CollectionFormModal({ 
  open, 
  onClose, 
  editData 
}: CollectionFormModalProps) {
  const [formData, setFormData] = useState<CollectionInsert>({
    producer_name: "",
    market_name: "",
    box_count_5kg: 0,
    box_count_10kg: 0,
    collection_date: new Date().toISOString().split('T')[0],
    notes: "",
  })

  const { createCollection, updateCollection, markets, loading } = useCollections()

  // 편집 모드일 때 기존 데이터로 폼 초기화
  useEffect(() => {
    if (editData) {
      setFormData({
        producer_name: editData.producer_name || "",
        market_name: editData.market_name || "",
        box_count_5kg: editData.box_count_5kg || 0,
        box_count_10kg: editData.box_count_10kg || 0,
        collection_date: editData.collection_date || new Date().toISOString().split('T')[0],
        notes: editData.notes || "",
      })
    }
  }, [editData])

  // 모달이 닫힐 때 폼 초기화
  useEffect(() => {
    if (!open) {
      setFormData({
        producer_name: "",
        market_name: "",
        box_count_5kg: 0,
        box_count_10kg: 0,
        collection_date: new Date().toISOString().split('T')[0],
        notes: "",
      })
    }
  }, [open])

  const handleInputChange = (
    field: keyof CollectionInsert,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검증
    if (!formData.producer_name.trim()) {
      toast.error("생산자명을 입력해주세요.")
      return
    }

    if (!formData.market_name.trim()) {
      toast.error("공판장을 선택해주세요.")
      return
    }

    const totalBoxes = (formData.box_count_5kg || 0) + (formData.box_count_10kg || 0)
    if (totalBoxes === 0) {
      toast.error("박스 수량을 입력해주세요.")
      return
    }

    try {
      let result

      if (editData?.id) {
        // 수정 모드
        result = await updateCollection(editData.id, formData)
      } else {
        // 등록 모드
        result = await createCollection(formData)
      }

      if (result.success) {
        toast.success(editData ? "접수가 수정되었습니다." : "접수가 등록되었습니다.")
        onClose()
      } else {
        toast.error(editData ? "접수 수정에 실패했습니다." : "접수 등록에 실패했습니다.")
      }
    } catch (err) {
      console.error("접수 처리 오류:", err)
      toast.error("오류가 발생했습니다.")
    }
  }

  const totalBoxes = (formData.box_count_5kg || 0) + (formData.box_count_10kg || 0)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editData ? "접수 수정" : "접수 등록"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 생산자명 */}
          <div className="space-y-2">
            <Label htmlFor="producer_name">생산자명 *</Label>
            <Input
              id="producer_name"
              value={formData.producer_name}
              onChange={(e) => handleInputChange("producer_name", e.target.value)}
              placeholder="생산자명을 입력하세요"
              required
              disabled={loading}
            />
          </div>

          {/* 공판장 선택 */}
          <div className="space-y-2">
            <Label htmlFor="market_name">공판장 *</Label>
            <Select 
              value={formData.market_name} 
              onValueChange={(value) => handleInputChange("market_name", value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="공판장을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {markets.map((market) => (
                  <SelectItem key={market.id} value={market.name}>
                    {market.name}
                    {market.location && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({market.location})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 박스 수량 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="box_count_5kg">5kg 박스</Label>
              <Input
                id="box_count_5kg"
                type="number"
                min="0"
                value={formData.box_count_5kg || ""}
                onChange={(e) => handleInputChange("box_count_5kg", parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="box_count_10kg">10kg 박스</Label>
              <Input
                id="box_count_10kg"
                type="number"
                min="0"
                value={formData.box_count_10kg || ""}
                onChange={(e) => handleInputChange("box_count_10kg", parseInt(e.target.value) || 0)}
                placeholder="0"
                disabled={loading}
              />
            </div>
          </div>

          {/* 총 박스 수 표시 */}
          {totalBoxes > 0 && (
            <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
              총 박스 수: <span className="font-medium">{totalBoxes}박스</span>
            </div>
          )}

          {/* 수거 예정일 */}
          <div className="space-y-2">
            <Label htmlFor="collection_date">수거 예정일</Label>
            <Input
              id="collection_date"
              type="date"
              value={formData.collection_date}
              onChange={(e) => handleInputChange("collection_date", e.target.value)}
              disabled={loading}
            />
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="추가 메모가 있으시면 입력하세요"
              rows={3}
              disabled={loading}
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-brand hover:bg-green-700"
              disabled={loading}
            >
              {loading ? (
                <Loading size="sm" className="mr-2" />
              ) : null}
              {editData ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}