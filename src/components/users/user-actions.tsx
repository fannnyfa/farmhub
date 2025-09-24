"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  EllipsisVerticalIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserIcon,
  PencilIcon,
  TrashIcon
} from "@heroicons/react/24/outline"
import { User } from "@/lib/database.types"
import { toast } from "sonner"

interface UserActionsProps {
  user: User
  currentUserId?: string
  onStatusUpdate: (userId: string, status: 'approved' | 'rejected' | 'pending') => Promise<{ success: boolean; message?: string }>
  onRoleUpdate: (userId: string, role: 'admin' | 'user') => Promise<{ success: boolean; message?: string }>
  onEdit: (user: User) => void
  onDelete: (userId: string) => Promise<{ success: boolean; message?: string }>
}

export default function UserActions({ 
  user, 
  currentUserId,
  onStatusUpdate, 
  onRoleUpdate, 
  onEdit, 
  onDelete 
}: UserActionsProps) {
  const [loading, setLoading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  // 자기 자신은 수정/삭제 불가
  const isSelf = currentUserId === user.id

  const handleStatusUpdate = async (status: 'approved' | 'rejected' | 'pending') => {
    if (loading) return
    
    setLoading(true)
    try {
      const result = await onStatusUpdate(user.id, status)
      if (result.success) {
        const statusText = status === 'approved' ? '승인' : status === 'rejected' ? '거부' : '대기'
        toast.success(`${user.name}님의 상태가 ${statusText}로 변경되었습니다.`)
      } else {
        toast.error(result.message || '상태 변경에 실패했습니다.')
      }
    } catch (error) {
      toast.error('상태 변경 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleUpdate = async (role: 'admin' | 'user') => {
    if (loading || isSelf) return
    
    setLoading(true)
    try {
      const result = await onRoleUpdate(user.id, role)
      if (result.success) {
        const roleText = role === 'admin' ? '관리자' : '사용자'
        toast.success(`${user.name}님의 역할이 ${roleText}로 변경되었습니다.`)
      } else {
        toast.error(result.message || '역할 변경에 실패했습니다.')
      }
    } catch (error) {
      toast.error('역할 변경 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (loading || isSelf) return
    
    setLoading(true)
    try {
      const result = await onDelete(user.id)
      if (result.success) {
        toast.success(`${user.name}님이 삭제되었습니다.`)
      } else {
        toast.error(result.message || '사용자 삭제에 실패했습니다.')
      }
    } catch (error) {
      toast.error('사용자 삭제 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            disabled={loading}
          >
            <EllipsisVerticalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* 상태 변경 */}
          {user.status !== 'approved' && (
            <DropdownMenuItem 
              onClick={() => handleStatusUpdate('approved')}
              className="flex items-center gap-2"
            >
              <CheckCircleIcon className="h-4 w-4 text-green-600" />
              승인
            </DropdownMenuItem>
          )}
          {user.status !== 'rejected' && (
            <DropdownMenuItem 
              onClick={() => handleStatusUpdate('rejected')}
              className="flex items-center gap-2"
            >
              <XCircleIcon className="h-4 w-4 text-red-600" />
              거부
            </DropdownMenuItem>
          )}
          {user.status !== 'pending' && (
            <DropdownMenuItem 
              onClick={() => handleStatusUpdate('pending')}
              className="flex items-center gap-2"
            >
              <ClockIcon className="h-4 w-4 text-orange-600" />
              대기로 변경
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* 역할 변경 (자기 자신 제외) */}
          {!isSelf && user.role !== 'admin' && (
            <DropdownMenuItem 
              onClick={() => handleRoleUpdate('admin')}
              className="flex items-center gap-2"
            >
              <ShieldCheckIcon className="h-4 w-4 text-purple-600" />
              관리자로 변경
            </DropdownMenuItem>
          )}
          {!isSelf && user.role !== 'user' && (
            <DropdownMenuItem 
              onClick={() => handleRoleUpdate('user')}
              className="flex items-center gap-2"
            >
              <UserIcon className="h-4 w-4 text-blue-600" />
              사용자로 변경
            </DropdownMenuItem>
          )}
          
          <DropdownMenuSeparator />
          
          {/* 수정/삭제 */}
          <DropdownMenuItem 
            onClick={() => onEdit(user)}
            className="flex items-center gap-2"
          >
            <PencilIcon className="h-4 w-4" />
            정보 수정
          </DropdownMenuItem>
          
          {!isSelf && (
            <DropdownMenuItem 
              onClick={() => setDeleteDialogOpen(true)}
              className="flex items-center gap-2 text-red-600 focus:text-red-600"
            >
              <TrashIcon className="h-4 w-4" />
              삭제
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{user.name}({user.email})</strong>님을 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없으며, 관련된 모든 데이터가 함께 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}