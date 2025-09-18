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
import { Collection } from "@/lib/database.types"

export default function Home() {
  const { user, loading: authLoading } = useAuth()
  const { collections, loading: collectionsLoading, getTodayStats, fetchCollections, updateCollection, deleteCollection, createCollection } = useCollections()
  const [showModal, setShowModal] = useState(false)
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null)
  const [activeTab, setActiveTab] = useState("today")
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

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

  const handleEditCollection = (collection: Collection) => {
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
    // 새 탭에서 송품장 페이지 열기
    window.open('/delivery-notes', '_blank')
  }

  // 통계 데이터
  const stats = getTodayStats()

  // 탭별 필터링 (당일 기준)
  const getFilteredCollections = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayCollections = collections.filter(col => col.reception_date === today)
    
    switch (activeTab) {
      case "pending":
        return todayCollections.filter(col => col.status === 'pending')
      case "completed":
        return todayCollections.filter(col => col.status === 'completed')
      case "today":
      default:
        return todayCollections
    }
  }

  const filteredCollections = getFilteredCollections()

  return (
    <MainLayout user={user ? { name: user.name, email: user.email, role: user.role || 'user' } : null}>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">수거관리</h1>
            <p className="text-gray-600">사과 수거 현황을 관리합니다</p>
          </div>
          <Button 
            className="bg-brand hover:bg-green-700"
            onClick={handleOpenModal}
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            접수 등록
          </Button>
        </div>

        {/* 요약 통계 카드들 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                오늘 총 접수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}건</div>
              <p className="text-xs text-gray-500">전일 대비 -</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                대기중
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}건</div>
              <p className="text-xs text-gray-500">처리 대기중</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                완료
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completed}건</div>
              <p className="text-xs text-gray-500">처리 완료</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                총 박스수
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.totalQuantity}박스</div>
              <p className="text-xs text-gray-500">5kg({stats.boxes5kg}) + 10kg({stats.boxes10kg})</p>
            </CardContent>
          </Card>
        </div>

        {/* 접수 목록 영역 */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>접수 목록</CardTitle>
              <Button
                variant="outline"
                onClick={handleDeliveryNotes}
                className="flex items-center gap-2"
              >
                <DocumentTextIcon className="w-4 h-4" />
                송품장 출력
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
                  <TabsTrigger value="today">
                    당일 전체 ({stats.total})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    당일 대기중 ({stats.pending})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    당일 완료 ({stats.completed})
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
