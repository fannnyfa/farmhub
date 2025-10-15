"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlusIcon, DocumentTextIcon } from "@heroicons/react/24/outline"
import { useAuth } from "@/contexts/auth-context"
import { useCollections } from "@/hooks/use-collections"
import Loading from "@/components/ui/loading"
import CollectionFormModalV2 from "@/components/collections/collection-form-modal-v2"
import CollectionTableV2 from "@/components/collections/collection-table-v2"
import { CollectionWithUser } from "@/lib/database.types"
import { getKoreanToday, getKoreanTomorrow, getKoreanDayAfterTomorrow, getDateDisplayText } from "@/lib/date-utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const { collections, loading: collectionsLoading, getTodayStats, getDateStats, fetchCollections, updateCollection, deleteCollection, createCollection } = useCollections()
  const [showModal, setShowModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<CollectionWithUser | null>(null)
  const [activeTab, setActiveTab] = useState("today")
  const [currentDate, setCurrentDate] = useState(getKoreanToday())
  const [selectedDate, setSelectedDate] = useState(getKoreanToday()) // 선택된 날짜 상태 추가
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  // 날짜 자동 갱신을 위한 useEffect
  useEffect(() => {
    const checkDate = () => {
      const newDate = getKoreanToday()
      if (newDate !== currentDate) {
        setCurrentDate(newDate)
        // 날짜가 바뀌면 데이터를 다시 불러옴
        if (user) {
          fetchCollections()
        }
      }
    }

    // 매분마다 날짜 확인 (자정을 지나면서 날짜가 바뀔 때를 감지)
    const interval = setInterval(checkDate, 60000) // 1분마다 체크

    return () => clearInterval(interval)
  }, [currentDate, user, fetchCollections])

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

  const handleOpenModal = () => {
    setEditingCollection(null)
    setShowModal(true)
  }

  const handleEditCollection = (collection: CollectionWithUser) => {
    setEditingCollection(collection)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingCollection(null)
  }

  // 모달 성공 후 콜백 - 훅에서 이미 상태 업데이트를 처리하므로 별도 처리 불필요
  const handleModalSuccess = () => {
    // 상태는 useCollections 훅에서 자동 업데이트됨
  }

  // 송품장 출력 페이지로 이동
  const handleDeliveryNotes = () => {
    // 현재 페이지에서 송품장 페이지로 이동
    router.push('/delivery-notes')
  }

  // 통계 데이터 (선택된 날짜 기준)
  const stats = getDateStats(selectedDate)

  // 탭별 필터링 (선택된 날짜 기준)
  const getFilteredCollections = () => {
    const selectedDateCollections = collections.filter(col => col.reception_date === selectedDate)
    
    switch (activeTab) {
      case "pending":
        return selectedDateCollections.filter(col => col.status === 'pending')
      case "completed":
        return selectedDateCollections.filter(col => col.status === 'completed')
      case "today":
      default:
        return selectedDateCollections
    }
  }

  const filteredCollections = getFilteredCollections()

  return (
    <MainLayout user={user ? { name: user.name, email: user.email, role: user.role || 'user' } : null}>
      <div className="flex flex-col gap-6">
        {/* 페이지 헤더 - 모든 화면에서 최상단 */}
        <div className="order-1 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">수거관리</h1>
              <p className="text-sm sm:text-base text-gray-600">팀 전체 수거 현황을 실시간으로 공유하고 관리합니다</p>
            </div>
            <Button 
              className="bg-brand hover:bg-green-700 w-full sm:w-auto"
              onClick={handleOpenModal}
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              접수 등록
            </Button>
          </div>

          {/* 날짜 선택 영역 */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Label htmlFor="selected-date" className="text-sm font-medium text-gray-700">
                조회 날짜:
              </Label>
              <Input
                id="selected-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
              <span className="text-sm text-gray-600">
                {getDateDisplayText(selectedDate)}
              </span>
            </div>
            
            {/* 빠른 날짜 선택 버튼 */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(getKoreanToday())}
                className={selectedDate === getKoreanToday() ? "bg-brand text-white" : ""}
              >
                오늘
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(getKoreanTomorrow())}
                className={selectedDate === getKoreanTomorrow() ? "bg-brand text-white" : ""}
              >
                내일
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedDate(getKoreanDayAfterTomorrow())}
                className={selectedDate === getKoreanDayAfterTomorrow() ? "bg-brand text-white" : ""}
              >
                모레
              </Button>
            </div>
          </div>
        </div>

        {/* 접수 목록 영역 - 모바일에서 2순위, PC에서 3순위 */}
        <div className="order-2 md:order-3">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg sm:text-xl">접수 목록</CardTitle>
                <Button
                  variant="outline"
                  onClick={handleDeliveryNotes}
                  className="flex items-center gap-2 w-full sm:w-auto"
                  size="sm"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                  <span className="sm:hidden">송품장</span>
                  <span className="hidden sm:inline">송품장 출력</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {collectionsLoading ? (
                <div className="flex justify-center py-12">
                  <Loading size="md" />
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="today" className="text-xs sm:text-sm">
                      <span className="sm:hidden">전체 ({stats.total})</span>
                      <span className="hidden sm:inline">선택일 전체 ({stats.total})</span>
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs sm:text-sm">
                      <span className="sm:hidden">대기 ({stats.pending})</span>
                      <span className="hidden sm:inline">선택일 대기중 ({stats.pending})</span>
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs sm:text-sm">
                      <span className="sm:hidden">완료 ({stats.completed})</span>
                      <span className="hidden sm:inline">선택일 완료 ({stats.completed})</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={activeTab} className="mt-6">
                    <CollectionTableV2
                      collections={filteredCollections}
                      onEdit={handleEditCollection}
                      onUpdate={updateCollection}
                      onDelete={deleteCollection}
                    />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 요약 통계 카드들 - 모바일에서 3순위, PC에서 2순위 */}
        <div className="order-3 md:order-2 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                선택일 총 접수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}건</div>
              <p className="text-xs text-gray-500 hidden sm:block">{getDateDisplayText(selectedDate)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                대기중
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.pending}건</div>
              <p className="text-xs text-gray-500 hidden sm:block">처리 대기중</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.completed}건</div>
              <p className="text-xs text-gray-500 hidden sm:block">처리 완료</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500">
                완료율
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.completionRate}%</div>
              <p className="text-xs text-gray-500 hidden sm:block">완료 {stats.completed}건 / 전체 {stats.total}건</p>
            </CardContent>
          </Card>
        </div>

        {/* 접수 등록/수정 모달 */}
        <CollectionFormModalV2
          open={showModal}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
          editData={editingCollection || undefined}
          onCreateCollection={createCollection}
          onUpdateCollection={updateCollection}
        />

      </div>
    </MainLayout>
  )
}
