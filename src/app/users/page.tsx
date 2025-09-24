"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import MainLayout from "@/components/layout/main-layout"
import Loading from "@/components/ui/loading"
import UserStatsCards from "@/components/users/user-stats-cards"
import UserList from "@/components/users/user-list"
import UserFormModal from "@/components/users/user-form-modal"
import { useUserManagement } from "@/hooks/use-user-management"
import { User } from "@/lib/database.types"

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isFormModalOpen, setIsFormModalOpen] = useState(false)

  const {
    loading,
    users,
    stats,
    fetchUsers,
    fetchUserStats,
    updateUserStatus,
    updateUserRole,
    updateUser,
    deleteUser,
    createUser
  } = useUserManagement()

  useEffect(() => {
    // 로딩 중이거나 사용자가 없으면 대기
    if (authLoading) return

    // 로그인하지 않은 경우 로그인 페이지로
    if (!user) {
      router.push("/login")
      return
    }

    // admin이 아닌 경우 메인 페이지로 리다이렉트
    if (user.role !== 'admin') {
      router.push("/")
      return
    }
  }, [user, authLoading, router])

  // 데이터 로드
  useEffect(() => {
    if (user && user.role === 'admin') {
      fetchUsers()
      fetchUserStats()
    }
  }, [user])

  // 새 사용자 생성
  const handleCreateNew = () => {
    setEditingUser(null)
    setIsFormModalOpen(true)
  }

  // 사용자 수정
  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsFormModalOpen(true)
  }

  // 사용자 저장 (생성/수정)
  const handleSave = async (userData: {
    id?: string
    email: string
    name: string
    role: 'admin' | 'user'
    status: 'approved' | 'pending' | 'rejected'
  }) => {
    if (userData.id) {
      // 수정 모드
      const { id, ...updateData } = userData
      const result = await updateUser(id, updateData)
      if (result.success) {
        await fetchUserStats() // 통계 재조회
      }
      return result
    } else {
      // 생성 모드
      return await createUser(userData)
    }
  }

  // 로딩 중이거나 권한 검증 중일 때
  if (authLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading size="lg" />
      </div>
    )
  }

  return (
    <MainLayout user={user ? { name: user.name, email: user.email, role: user.role || 'user' } : null}>
      <div className="space-y-6">
        {/* 페이지 헤더 */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">팀 사용자관리</h1>
            <p className="text-sm sm:text-base text-gray-600">팀 협업 시스템의 사용자를 관리합니다</p>
          </div>
        </div>

        {/* 사용자 통계 카드들 */}
        <UserStatsCards stats={stats} loading={loading} />

        {/* 사용자 목록 */}
        <UserList
          users={users}
          loading={loading}
          currentUserId={user.id}
          onStatusUpdate={updateUserStatus}
          onRoleUpdate={updateUserRole}
          onEdit={handleEdit}
          onDelete={deleteUser}
          onCreateNew={handleCreateNew}
        />

        {/* 사용자 폼 모달 */}
        <UserFormModal
          open={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
          user={editingUser}
          onSave={handleSave}
        />
      </div>
    </MainLayout>
  )
}