"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ShieldCheckIcon,
  UserIcon
} from "@heroicons/react/24/outline"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import Loading from "@/components/ui/loading"
import UserStatusBadge from "./user-status-badge"
import UserActions from "./user-actions"
import { User } from "@/lib/database.types"

interface UserWithStats extends User {
  collections_count?: number
  last_active?: string
}

interface UserListProps {
  users: UserWithStats[]
  loading: boolean
  currentUserId?: string
  onStatusUpdate: (userId: string, status: 'approved' | 'rejected' | 'pending') => Promise<{ success: boolean; message?: string }>
  onRoleUpdate: (userId: string, role: 'admin' | 'user') => Promise<{ success: boolean; message?: string }>
  onEdit: (user: User) => void
  onDelete: (userId: string) => Promise<{ success: boolean; message?: string }>
  onCreateNew: () => void
}

export default function UserList({
  users,
  loading,
  currentUserId,
  onStatusUpdate,
  onRoleUpdate,
  onEdit,
  onDelete,
  onCreateNew
}: UserListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [filteredUsers, setFilteredUsers] = useState<UserWithStats[]>([])

  // 필터링 로직
  useEffect(() => {
    let filtered = users

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 상태 필터링
    if (statusFilter !== "all") {
      filtered = filtered.filter(user => user.status === statusFilter)
    }

    // 역할 필터링
    if (roleFilter !== "all") {
      filtered = filtered.filter(user => user.role === roleFilter)
    }

    setFilteredUsers(filtered)
  }, [users, searchTerm, statusFilter, roleFilter])

  const getRoleBadge = (role: string | null) => {
    if (role === 'admin') {
      return (
        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
          <ShieldCheckIcon className="w-3 h-3 mr-1" />
          관리자
        </Badge>
      )
    }
    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        <UserIcon className="w-3 h-3 mr-1" />
        사용자
      </Badge>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    try {
      return format(new Date(dateString), "yyyy.MM.dd", { locale: ko })
    } catch {
      return '-'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5" />
            사용자 목록
          </CardTitle>
          <Button onClick={onCreateNew} className="flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />
            새 사용자 추가
          </Button>
        </div>

        {/* 필터링 및 검색 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="approved">활성</SelectItem>
              <SelectItem value="pending">대기중</SelectItem>
              <SelectItem value="rejected">거부됨</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="역할" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 역할</SelectItem>
              <SelectItem value="admin">관리자</SelectItem>
              <SelectItem value="user">사용자</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loading size="md" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">
              {users.length === 0 ? '등록된 사용자가 없습니다.' : '조건에 맞는 사용자가 없습니다.'}
            </p>
            {users.length === 0 && (
              <Button onClick={onCreateNew} variant="outline" className="mt-2">
                첫 번째 사용자 추가하기
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors"
              >
                {/* 모바일 레이아웃 */}
                <div className="flex flex-col sm:hidden space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    <UserActions
                      user={user}
                      currentUserId={currentUserId}
                      onStatusUpdate={onStatusUpdate}
                      onRoleUpdate={onRoleUpdate}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <UserStatusBadge status={user.status} />
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>가입일: {formatDate(user.created_at)}</div>
                    <div>수거건수: {user.collections_count || 0}건</div>
                  </div>
                </div>

                {/* 데스크톱 레이아웃 */}
                <div className="hidden sm:flex sm:items-center sm:justify-between">
                  <div className="flex-1 grid grid-cols-5 gap-4 items-center">
                    <div className="col-span-2">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <UserStatusBadge status={user.status} />
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="text-sm text-gray-600 text-center">
                      {user.collections_count || 0}건
                    </div>
                    <div className="text-sm text-gray-500 text-center">
                      {formatDate(user.created_at)}
                    </div>
                  </div>
                  <div className="ml-4">
                    <UserActions
                      user={user}
                      currentUserId={currentUserId}
                      onStatusUpdate={onStatusUpdate}
                      onRoleUpdate={onRoleUpdate}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 결과 요약 */}
        {!loading && filteredUsers.length > 0 && (
          <div className="mt-4 text-sm text-gray-500 text-center border-t pt-4">
            총 {users.length}명 중 {filteredUsers.length}명 표시
          </div>
        )}
      </CardContent>
    </Card>
  )
}