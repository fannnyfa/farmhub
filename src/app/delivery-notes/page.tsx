"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DocumentTextIcon,
  CheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  PrinterIcon
} from "@heroicons/react/24/outline"
import { useAuth } from "@/contexts/auth-context"
import { useCollections } from "@/hooks/use-collections"
import Loading from "@/components/ui/loading"
import { groupCompletedCollections, DeliveryNoteGroup } from "@/lib/delivery-note-utils"
import { downloadSelectedDeliveryNotesPDFLib } from "@/lib/pdf-lib-utils"
import { toast } from "sonner"

export default function DeliveryNotesPage() {
  const { user, loading: authLoading } = useAuth()
  const { collections, loading: collectionsLoading } = useCollections()
  const [groups, setGroups] = useState<DeliveryNoteGroup[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // 인증 확인
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // 그룹 데이터 업데이트
  useEffect(() => {
    if (collections.length > 0) {
      const completedGroups = groupCompletedCollections(collections)
      setGroups(completedGroups)
      
      // 기본적으로 아무것도 선택하지 않음 (사용자가 선택)
      setSelectedGroups([])
    }
  }, [collections])

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

  // 뒤로가기
  const handleGoBack = () => {
    router.back()
  }

  // 품목 표시용 헬퍼 함수
  const getProductDisplayName = (productType: string, collections: any[]) => {
    const varieties = collections
      .filter(c => c.product_variety)
      .map(c => c.product_variety)
    
    if (varieties.length > 0) {
      const uniqueVarieties = Array.from(new Set(varieties))
      return `${productType}(${uniqueVarieties.join(', ')})`
    }
    return productType
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (collectionsLoading) {
    return (
      <MainLayout user={user}>
        <div className="min-h-screen flex items-center justify-center">
          <Loading size="lg" />
        </div>
      </MainLayout>
    )
  }

  if (groups.length === 0) {
    return (
      <MainLayout user={user}>
        <div className="space-y-6">
          {/* 페이지 헤더 */}
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={handleGoBack}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              뒤로가기
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">당일 송품장 출력</h1>
              <p className="text-gray-600">오늘 완료된 접수의 송품장을 출력합니다</p>
            </div>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                출력할 송품장이 없습니다
              </h3>
              <p className="text-gray-600">
                오늘 완료된 접수가 없어서 출력할 송품장이 없습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout user={user}>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="flex items-center gap-2"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            뒤로가기
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">당일 송품장 출력</h1>
            <p className="text-gray-600">오늘 완료된 접수의 송품장을 출력합니다</p>
          </div>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {selectedGroups.length}/{groups.length} 선택됨
          </Badge>
        </div>

        {/* 액션 버튼 */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
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
              </div>
              
              <Button 
                className="bg-brand hover:bg-green-700"
                onClick={handlePrintSelected}
                disabled={loading || selectedGroups.length === 0}
                size="lg"
              >
                <PrinterIcon className="w-5 h-5 mr-2" />
                {loading ? "출력중..." : `선택한 ${selectedGroups.length}개 그룹 출력`}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 그룹 리스트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => {
            const groupKey = getGroupKey(group)
            const isSelected = selectedGroups.includes(groupKey)
            const productDisplay = getProductDisplayName(group.productType, group.collections)
            
            return (
              <Card 
                key={groupKey} 
                className={`cursor-pointer transition-all duration-200 ${
                  isSelected 
                    ? 'ring-2 ring-brand bg-green-50 shadow-md' 
                    : 'hover:bg-gray-50 hover:shadow-sm'
                }`}
                onClick={() => handleGroupToggle(group)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => {}} // onClick으로 처리
                        className="pointer-events-none"
                      />
                      <div>
                        <CardTitle className="text-lg">{group.market}</CardTitle>
                        <Badge variant="outline" className="mt-1">
                          {productDisplay}
                        </Badge>
                      </div>
                    </div>
                    {isSelected && (
                      <CheckIcon className="w-6 h-6 text-brand flex-shrink-0" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">접수 건수:</span>
                      <span className="font-medium">{group.collections.length}건</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">총 수량:</span>
                      <span className="font-medium">
                        {group.collections.reduce((sum, c) => sum + (c.quantity || 0), 0)}
                        {group.productType === '깻잎' && group.collections[0]?.product_variety === '정품' ? '' : '박스'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </MainLayout>
  )
}