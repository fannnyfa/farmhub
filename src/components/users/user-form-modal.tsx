"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { User } from "@/lib/database.types"
import { toast } from "sonner"

interface UserFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null // null이면 새로 생성, User 객체면 수정
  onSave: (userData: {
    id?: string
    email: string
    name: string
    role: 'admin' | 'user'
    status: 'approved' | 'pending' | 'rejected'
  }) => Promise<{ success: boolean; message?: string }>
}

export default function UserFormModal({ 
  open, 
  onOpenChange, 
  user, 
  onSave 
}: UserFormModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'user' as 'admin' | 'user',
    status: 'pending' as 'approved' | 'pending' | 'rejected'
  })

  const isEditMode = !!user

  // 모달이 열릴 때 사용자 정보로 폼 초기화
  useEffect(() => {
    if (open) {
      if (user) {
        // 수정 모드: 기존 사용자 정보 설정
        setFormData({
          email: user.email || '',
          name: user.name || '',
          role: (user.role as 'admin' | 'user') || 'user',
          status: (user.status as 'approved' | 'pending' | 'rejected') || 'pending'
        })
      } else {
        // 생성 모드: 기본값 설정
        setFormData({
          email: '',
          name: '',
          role: 'user',
          status: 'pending'
        })
      }
    }
  }, [open, user])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // 유효성 검사
    if (!formData.email.trim()) {
      toast.error('이메일을 입력해주세요.')
      return
    }
    if (!formData.name.trim()) {
      toast.error('이름을 입력해주세요.')
      return
    }
    
    // 이메일 형식 검사
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      toast.error('올바른 이메일 형식을 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const userData = {
        ...(isEditMode && { id: user.id }),
        email: formData.email.trim(),
        name: formData.name.trim(),
        role: formData.role,
        status: formData.status
      }

      const result = await onSave(userData)
      
      if (result.success) {
        toast.success(isEditMode ? '사용자 정보가 수정되었습니다.' : '새 사용자가 생성되었습니다.')
        onOpenChange(false)
      } else {
        toast.error(result.message || (isEditMode ? '정보 수정에 실패했습니다.' : '사용자 생성에 실패했습니다.'))
      }
    } catch (error) {
      toast.error('처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? '사용자 정보 수정' : '새 사용자 추가'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? '사용자 정보를 수정합니다. 변경할 항목을 선택해주세요.'
              : '새로운 사용자를 시스템에 추가합니다.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일 *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">이름 *</Label>
            <Input
              id="name"
              type="text"
              placeholder="사용자 이름"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">역할</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: 'admin' | 'user') => handleInputChange('role', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">사용자</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">상태</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: 'approved' | 'pending' | 'rejected') => handleInputChange('status', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="approved">활성</SelectItem>
                <SelectItem value="rejected">거부됨</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={loading}
            >
              취소
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
            >
              {loading 
                ? (isEditMode ? '수정 중...' : '생성 중...') 
                : (isEditMode ? '수정' : '생성')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}