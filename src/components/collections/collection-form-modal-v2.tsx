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
import { Collection, CollectionInsert, ProductType } from "@/lib/database.types"
import { toast } from "sonner"
import Loading from "@/components/ui/loading"
import { getKoreanToday } from "@/lib/date-utils"

interface ApiResponse {
  success: boolean
  data?: Collection
  error?: string
}

interface CollectionFormModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  editData?: CollectionInsert & { id?: string }
  onCreateCollection: (data: Omit<CollectionInsert, 'user_id'>) => Promise<ApiResponse>
  onUpdateCollection: (id: string, data: Partial<CollectionInsert>) => Promise<ApiResponse>
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
    reception_date: getKoreanToday(),
    product_type: "사과",
    product_variety: null,
    quantity: 0,
    box_weight: "10",
    region: "",
    market: "",
  })

  const [loading, setLoading] = useState(false)

  // 공판장 목록 (하드코딩) - 왼쪽 세로, 오른쪽 세로 순서
  const markets = [
    "부산청과",
    "항도청과", 
    "엄궁농협공판장",
    "반여농협공판장",
    "중앙청과",
    "동부청과"
  ]

  // 품목 변경 시 품종 초기화
  useEffect(() => {
    if (formData.product_type === '사과') {
      setFormData(prev => ({ ...prev, product_variety: null }))
    } else if (formData.product_type === '깻잎') {
      setFormData(prev => ({ 
        ...prev, 
        product_variety: "정품",
        region: "엄궁동",
        market: "엄궁농협공판장"
      }))
    } else if (formData.product_type === '감') {
      setFormData(prev => ({ 
        ...prev, 
        product_variety: "단감",
        region: "엄궁동",
        market: "엄궁농협공판장"
      }))
    } else {
      setFormData(prev => ({ ...prev, product_variety: "" }))
    }
  }, [formData.product_type])

  // 감 품종별 박스무게 자동 설정
  useEffect(() => {
    if (formData.product_type === '감' && formData.product_variety === '약시') {
      setFormData(prev => ({ ...prev, box_weight: "5kg" }))
    }
  }, [formData.product_type, formData.product_variety])

  // 깻잎 품종별 박스무게 초기화 (최초 선택 시에만)
  useEffect(() => {
    if (formData.product_type === '깻잎' && formData.product_variety === '바라' && !formData.box_weight) {
      setFormData(prev => ({ ...prev, box_weight: "5kg" }))
    }
  }, [formData.product_type, formData.product_variety])

  // 편집 모드일 때 기존 데이터로 폼 초기화
  useEffect(() => {
    if (editData) {
      setFormData({
        producer_name: editData.producer_name || "",
        reception_date: editData.reception_date || getKoreanToday(),
        product_type: editData.product_type as ProductType || "사과",
        product_variety: editData.product_variety || null,
        quantity: editData.quantity || 0,
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
        reception_date: getKoreanToday(),
        product_type: "사과",
        product_variety: null,
        quantity: 0,
        box_weight: "10kg",
        region: "",
        market: "",
      })
    }
  }, [open])

  const handleInputChange = (field: keyof CollectionInsert, value: string | number | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  // 유효성 검증 함수
  const validateForm = () => {
    if (!formData.producer_name?.trim()) {
      toast.error("생산자명을 입력해주세요.")
      return false
    }

    if (!formData.market?.trim()) {
      toast.error("공판장을 선택해주세요.")
      return false
    }

    if (!formData.quantity || formData.quantity <= 0) {
      toast.error("수량을 입력해주세요.")
      return false
    }

    // 품종 유효성 검증
    if (formData.product_type !== '사과' && !formData.product_variety) {
      toast.error("품종을 선택해주세요.")
      return false
    }

    // 박스무게 유효성 검증
    if (!formData.box_weight || formData.box_weight.trim() === '') {
      if (formData.product_type === '깻잎' && formData.product_variety === '바라') {
        toast.error("무게를 입력해주세요.")
      } else {
        toast.error("박스무게를 선택해주세요.")
      }
      return false
    }

    return true
  }

  // 공통 제출 로직
  const submitCollection = async (status: 'pending' | 'completed') => {
    try {
      setLoading(true)
      let result

      const dataToSubmit = { ...formData, status }

      if (editData?.id) {
        // 수정 모드
        result = await onUpdateCollection(editData.id, dataToSubmit)
      } else {
        // 등록 모드
        result = await onCreateCollection(dataToSubmit)
      }

      if (result.success) {
        const message = editData 
          ? "접수가 수정되었습니다." 
          : status === 'completed' 
            ? "접수가 등록되고 완료 처리되었습니다."
            : "접수가 등록되었습니다."
        toast.success(message)
        onSuccess?.()
        onClose()
      } else {
        const errorMessage = result.error || (editData ? "접수 수정에 실패했습니다." : "접수 등록에 실패했습니다.")
        toast.error(errorMessage)
        console.error("폼 제출 실패:")
        console.error("- 결과:", result)
        console.error("- 에러 메시지:", result.error)
        console.error("- 폼 데이터:", dataToSubmit)
      }
    } catch (err) {
      console.error("접수 처리 오류 상세:")
      console.error("- 에러 객체:", err)
      console.error("- 메시지:", err instanceof Error ? err.message : String(err))
      console.error("- 스택:", err instanceof Error ? err.stack : undefined)
      console.error("- 폼 데이터:", formData)
      console.error("- 전체 에러:", JSON.stringify(err, Object.getOwnPropertyNames(err)))
      toast.error(`오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoading(false)
    }
  }

  // 대기중 상태로 등록
  const handleSubmitPending = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    await submitCollection('pending')
  }

  // 완료 상태로 등록
  const handleSubmitCompleted = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    await submitCollection('completed')
  }


  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editData ? "접수 수정" : "접수 등록"}
          </DialogTitle>
        </DialogHeader>

        <form className="space-y-6">
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
                  value={formData.reception_date || ''}
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
              <div className="grid grid-cols-3 gap-3">
                {['사과', '감', '깻잎'].map((product) => (
                  <button
                    key={product}
                    type="button"
                    onClick={() => handleInputChange("product_type", product)}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                      formData.product_type === product
                        ? 'border-brand bg-green-50 text-brand'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    disabled={loading}
                  >
                    {product}
                  </button>
                ))}
              </div>
            </div>

            {/* 세부 품종 선택 (조건부) */}
            {formData.product_type !== '사과' && (
              <div className="space-y-2">
                <Label>세부 품종 *</Label>
                <div className="grid grid-cols-3 gap-3">
                  {productVarieties[formData.product_type as keyof typeof productVarieties]?.map((variety: string) => (
                    <button
                      key={variety}
                      type="button"
                      onClick={() => handleInputChange("product_variety", variety)}
                      className={`p-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                        formData.product_variety === variety
                          ? 'border-brand bg-green-50 text-brand'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      disabled={loading}
                    >
                      {variety}
                    </button>
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
              // 깻잎 바라: 수량 + 무게 선택
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
                  <Label htmlFor="box_weight">무게 선택 *</Label>
                  <Select 
                    value={formData.box_weight || ""} 
                    onValueChange={(value) => handleInputChange("box_weight", value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="무게 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {['3kg', '3.5kg', '4kg', '4.5kg', '5kg'].map((weight) => (
                        <SelectItem key={weight} value={weight}>
                          {weight}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <div className="grid grid-cols-2 gap-3">
                    {['10kg', '5kg'].map((weight) => (
                      <button
                        key={weight}
                        type="button"
                        onClick={() => handleInputChange("box_weight", weight)}
                        className={`p-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                          formData.box_weight === weight
                            ? 'border-brand bg-green-50 text-brand'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        disabled={loading}
                      >
                        {weight}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. 공판장 정보 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">3. 공판장 선택</h3>
            
            <div className="space-y-2">
              <Label>공판장 *</Label>
              <div className="grid grid-cols-2 gap-3">
                {markets.map((market) => (
                  <button
                    key={market}
                    type="button"
                    onClick={() => {
                      handleInputChange("market", market)
                      // 공판장에 따른 지역 설정
                      const regionMap: Record<string, string> = {
                        "부산청과": "남구",
                        "항도청과": "서구",
                        "엄궁농협공판장": "엄궁동",
                        "반여농협공판장": "해운대구",
                        "중앙청과": "동구",
                        "동부청과": "동래구"
                      }
                      handleInputChange("region", regionMap[market] || "")
                    }}
                    className={`p-3 text-sm font-medium rounded-lg border-2 transition-all duration-200 ${
                      formData.market === market
                        ? 'border-brand bg-green-50 text-brand'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    disabled={loading}
                  >
                    {market}
                  </button>
                ))}
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
                    ? `수량: ${formData.quantity} × ${formData.box_weight.replace(/kg/g, '')}kg`
                    : `박스: ${formData.quantity}박스 × ${formData.box_weight}`
                  }
                </p>
                <p>공판장: {formData.market}</p>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="space-y-3 pt-4">
            {/* 편집 모드: 기존과 동일한 버튼 배치 */}
            {editData ? (
              <div className="flex gap-2">
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
                  type="button"
                  onClick={handleSubmitPending}
                  className="flex-1 bg-brand hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? (
                    <Loading size="sm" className="mr-2" />
                  ) : null}
                  수정
                </Button>
              </div>
            ) : (
              /* 등록 모드: 3개 버튼 배치 */
              <div className="space-y-2">
                {/* 등록 버튼들 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    type="button"
                    onClick={handleSubmitPending}
                    variant="outline"
                    className="w-full border-brand text-brand hover:bg-brand hover:text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loading size="sm" className="mr-2" />
                    ) : null}
                    <span className="sm:hidden">등록 (대기)</span>
                    <span className="hidden sm:inline">등록</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmitCompleted}
                    className="w-full bg-brand hover:bg-green-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loading size="sm" className="mr-2" />
                    ) : null}
                    <span className="sm:hidden">등록 + 완료</span>
                    <span className="hidden sm:inline">등록 + 완료</span>
                  </Button>
                </div>
                {/* 취소 버튼 */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="w-full"
                  disabled={loading}
                >
                  취소
                </Button>
              </div>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}