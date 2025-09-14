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
import { CollectionInsert, ProductType, BoxWeight, MarketRegion } from "@/lib/database.types"
import { createClient } from "@/lib/supabase"
import { toast } from "sonner"
import Loading from "@/components/ui/loading"

interface CollectionFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  editData?: CollectionInsert & { id?: string }
  onCreateCollection: (data: Omit<CollectionInsert, 'user_id'>) => Promise<{ success: boolean; data?: any }>
  onUpdateCollection: (id: string, data: Partial<CollectionInsert>) => Promise<{ success: boolean; data?: any }>
}

// 품종 옵션 정의
const productVarieties = {
  '사과': null,
  '감': ['단감', '약시', '대봉'],
  '깻잎': ['정품', '바라']
}

export default function CollectionFormModalV2({ 
  open, 
  onClose, 
  onSuccess,
  editData,
  onCreateCollection,
  onUpdateCollection
}: CollectionFormModalProps) {
  const [formData, setFormData] = useState<CollectionInsert>({
    producer_name: "",
    reception_date: new Date().toISOString().split('T')[0],
    product_type: "사과",
    product_variety: null,
    quantity: 1,
    box_weight: "10",
    region: "",
    market: "",
  })

  const [marketRegions, setMarketRegions] = useState<MarketRegion[]>([])
  const [availableMarkets, setAvailableMarkets] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  
  const supabase = createClient()

  // 지역별 공판장 데이터 불러오기
  useEffect(() => {
    const fetchMarketRegions = async () => {
      try {
        const { data, error } = await supabase
          .from('market_regions')
          .select('*')
          .order('region', { ascending: true })
          .order('market_name', { ascending: true })

        if (error) {
          console.error('공판장 지역 조회 오류:', error)
          return
        }

        setMarketRegions(data || [])
      } catch (err) {
        console.error('공판장 지역 조회 중 오류:', err)
      }
    }

    if (open) {
      fetchMarketRegions()
    }
  }, [open, supabase])

  // 선택된 지역에 따라 사용 가능한 공판장 업데이트
  useEffect(() => {
    if (formData.region) {
      const markets = marketRegions
        .filter(mr => mr.region === formData.region)
        .map(mr => mr.market_name)
        .filter(Boolean) as string[]
      
      setAvailableMarkets(markets)
      
      // 선택된 공판장이 새 지역에 없으면 초기화
      if (!markets.includes(formData.market || '')) {
        setFormData(prev => ({ ...prev, market: "" }))
      }
    } else {
      setAvailableMarkets([])
      setFormData(prev => ({ ...prev, market: "" }))
    }
  }, [formData.region, marketRegions])

  // 품목 변경 시 품종 초기화
  useEffect(() => {
    if (formData.product_type === '사과') {
      setFormData(prev => ({ ...prev, product_variety: null }))
    } else {
      setFormData(prev => ({ ...prev, product_variety: "" }))
    }
  }, [formData.product_type])

  // 편집 모드일 때 기존 데이터로 폼 초기화
  useEffect(() => {
    if (editData) {
      setFormData({
        producer_name: editData.producer_name || "",
        reception_date: editData.reception_date || new Date().toISOString().split('T')[0],
        product_type: editData.product_type as ProductType || "사과",
        product_variety: editData.product_variety || null,
        quantity: editData.quantity || 1,
        box_weight: editData.box_weight || "10kg",
        region: editData.region || "",
        market: editData.market || "",
      })
    }
  }, [editData])

  // 모달이 닫힐 때 폼 초기화
  useEffect(() => {
    if (!open) {
      setFormData({
        producer_name: "",
        reception_date: new Date().toISOString().split('T')[0],
        product_type: "사과",
        product_variety: null,
        quantity: 1,
        box_weight: "10kg",
        region: "",
        market: "",
      })
    }
  }, [open])

  const handleInputChange = (field: keyof CollectionInsert, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 유효성 검증
    if (!formData.producer_name?.trim()) {
      toast.error("생산자명을 입력해주세요.")
      return
    }

    if (!formData.region?.trim()) {
      toast.error("지역을 선택해주세요.")
      return
    }

    if (!formData.market?.trim()) {
      toast.error("공판장을 선택해주세요.")
      return
    }

    if (!formData.quantity || formData.quantity <= 0) {
      toast.error("수량을 입력해주세요.")
      return
    }

    // 품종 유효성 검증
    if (formData.product_type !== '사과' && !formData.product_variety) {
      toast.error("품종을 선택해주세요.")
      return
    }

    try {
      setLoading(true)
      let result

      if (editData?.id) {
        // 수정 모드
        result = await onUpdateCollection(editData.id, formData)
      } else {
        // 등록 모드
        result = await onCreateCollection(formData)
      }

      if (result.success) {
        toast.success(editData ? "접수가 수정되었습니다." : "접수가 등록되었습니다.")
        onSuccess?.()
        onClose()
      } else {
        toast.error(editData ? "접수 수정에 실패했습니다." : "접수 등록에 실패했습니다.")
      }
    } catch (err) {
      console.error("접수 처리 오류:", err)
      toast.error("오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  const uniqueRegions = [...new Set(marketRegions.map(mr => mr.region).filter(Boolean))]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? "접수 수정" : "접수 등록"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. 생산자 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">1. 생산자 정보</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="producer_name">생산자명 *</Label>
                <Input
                  id="producer_name"
                  value={formData.producer_name}
                  onChange={(e) => handleInputChange("producer_name", e.target.value)}
                  placeholder="생산자명"
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reception_date">접수일 선택 *</Label>
                <Input
                  id="reception_date"
                  type="date"
                  value={formData.reception_date}
                  onChange={(e) => handleInputChange("reception_date", e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* 2. 품목 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">2. 품목 정보</h3>
            
            {/* 품목 선택 */}
            <div className="space-y-2">
              <Label>품목 *</Label>
              <div className="flex gap-4">
                {['사과', '감', '깻잎'].map((product) => (
                  <label key={product} className="flex items-center space-x-2">
                    <input
                      type="radio"
                      name="product_type"
                      value={product}
                      checked={formData.product_type === product}
                      onChange={(e) => handleInputChange("product_type", e.target.value)}
                      className="text-brand focus:ring-brand"
                      disabled={loading}
                    />
                    <span>{product}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 세부 품종 선택 (조건부) */}
            {formData.product_type !== '사과' && (
              <div className="space-y-2">
                <Label>세부 품종 *</Label>
                <div className="flex gap-4">
                  {productVarieties[formData.product_type as keyof typeof productVarieties]?.map((variety: string) => (
                    <label key={variety} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="product_variety"
                        value={variety}
                        checked={formData.product_variety === variety}
                        onChange={(e) => handleInputChange("product_variety", e.target.value)}
                        className="text-brand focus:ring-brand"
                        disabled={loading}
                      />
                      <span>{variety}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* 품목별 수량 및 무게 입력 방식 */}
            {formData.product_type === '깻잎' && formData.product_variety === '정품' ? (
              // 깻잎 정품: 수량만
              <div className="space-y-2">
                <Label htmlFor="quantity">수량 *</Label>
                <input
                  id="quantity"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.quantity || ""}
                  onChange={(e) => handleInputChange("quantity", parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                  placeholder="수량 입력"
                  disabled={loading}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            ) : formData.product_type === '깻잎' && formData.product_variety === '바라' ? (
              // 깻잎 바라: 수량 + 무게 직접입력
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">수량 *</Label>
                  <input
                    id="quantity"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.quantity || ""}
                    onChange={(e) => handleInputChange("quantity", parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                    placeholder="수량 입력"
                    disabled={loading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="box_weight">무게 (kg) *</Label>
                  <input
                    id="box_weight"
                    type="text"
                    inputMode="decimal"
                    value={formData.box_weight || ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9.]/g, '')
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        handleInputChange("box_weight", value)
                      }
                    }}
                    placeholder="1.5"
                    disabled={loading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>
            ) : (
              // 사과, 감: 수량 직접입력 + 박스무게 선택
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">수량 (박스) *</Label>
                  <input
                    id="quantity"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={formData.quantity || ""}
                    onChange={(e) => handleInputChange("quantity", parseInt(e.target.value.replace(/\D/g, '')) || 0)}
                    placeholder="박스 수량 입력"
                    disabled={loading}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>박스당 무게 *</Label>
                  <div className="flex gap-4">
                    {['10kg', '5kg'].map((weight) => (
                      <label key={weight} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="box_weight"
                          value={weight}
                          checked={formData.box_weight === weight}
                          onChange={(e) => handleInputChange("box_weight", e.target.value)}
                          className="text-brand focus:ring-brand"
                          disabled={loading}
                        />
                        <span>{weight}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. 공판장 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">3. 공판장 정보</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* 지역 선택 */}
              <div className="space-y-2">
                <Label htmlFor="region">지역 *</Label>
                <Select 
                  value={formData.region || ""} 
                  onValueChange={(value) => handleInputChange("region", value)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="지역 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {uniqueRegions.map((region) => (
                      <SelectItem key={region} value={region}>
                        {region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 공판장 선택 */}
              <div className="space-y-2">
                <Label htmlFor="market">공판장 *</Label>
                <Select 
                  value={formData.market || ""} 
                  onValueChange={(value) => handleInputChange("market", value)}
                  disabled={loading || !formData.region}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="공판장 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMarkets.map((market) => (
                      <SelectItem key={market} value={market}>
                        {market}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>


          {/* 총 정보 요약 */}
          {formData.quantity && formData.box_weight && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">접수 요약</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>품목: {formData.product_type} {formData.product_variety && `(${formData.product_variety})`}</p>
                <p>
                  {formData.product_type === '깻잎' && formData.product_variety === '정품' 
                    ? `수량: ${formData.quantity}`
                    : formData.product_type === '깻잎' && formData.product_variety === '바라'
                    ? `수량: ${formData.quantity} × ${formData.box_weight}kg`
                    : `박스: ${formData.quantity}박스 × ${formData.box_weight}`
                  }
                </p>
                <p>공판장: {formData.region} {formData.market}</p>
              </div>
            </div>
          )}

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