"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { User } from '@/lib/database.types'

interface UserStats {
  totalUsers: number
  pendingUsers: number
  approvedUsers: number
  adminUsers: number
}

interface UserWithStats extends User {
  collections_count?: number
  last_active?: string
}

export function useUserManagement() {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [stats, setStats] = useState<UserStats>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    adminUsers: 0
  })
  
  const supabase = createClient()
  
  if (!supabase) {
    throw new Error('Supabase client could not be initialized')
  }

  // 사용자 목록 조회
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          collections:collections(count)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('사용자 목록 조회 오류:', error)
        return
      }

      // 사용자별 수거 건수 계산
      const usersWithStats = data?.map(user => ({
        ...user,
        collections_count: user.collections?.[0]?.count || 0
      })) || []

      setUsers(usersWithStats)
    } catch (err) {
      console.error('사용자 목록 조회 중 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 사용자 통계 조회
  const fetchUserStats = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role, status')

      if (error) {
        console.error('사용자 통계 조회 오류:', error)
        return
      }

      const stats = data?.reduce((acc, user) => {
        acc.totalUsers++
        if (user.status === 'pending') acc.pendingUsers++
        if (user.status === 'approved') acc.approvedUsers++
        if (user.role === 'admin') acc.adminUsers++
        return acc
      }, {
        totalUsers: 0,
        pendingUsers: 0,
        approvedUsers: 0,
        adminUsers: 0
      }) || {
        totalUsers: 0,
        pendingUsers: 0,
        approvedUsers: 0,
        adminUsers: 0
      }

      setStats(stats)
    } catch (err) {
      console.error('사용자 통계 조회 중 오류:', err)
    }
  }

  // 사용자 상태 변경 (승인/거부)
  const updateUserStatus = async (userId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('사용자 상태 변경 오류:', error)
        return { success: false, message: '사용자 상태 변경 중 오류가 발생했습니다.' }
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, status: newStatus }
          : user
      ))

      // 통계 재조회
      await fetchUserStats()

      return { success: true }
    } catch (err) {
      console.error('사용자 상태 변경 중 오류:', err)
      return { success: false, message: '사용자 상태 변경 중 오류가 발생했습니다.' }
    }
  }

  // 사용자 역할 변경
  const updateUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          role: newRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('사용자 역할 변경 오류:', error)
        return { success: false, message: '사용자 역할 변경 중 오류가 발생했습니다.' }
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, role: newRole }
          : user
      ))

      // 통계 재조회
      await fetchUserStats()

      return { success: true }
    } catch (err) {
      console.error('사용자 역할 변경 중 오류:', err)
      return { success: false, message: '사용자 역할 변경 중 오류가 발생했습니다.' }
    }
  }

  // 사용자 정보 수정
  const updateUser = async (userId: string, updateData: Partial<User>) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) {
        console.error('사용자 정보 수정 오류:', error)
        return { success: false, message: '사용자 정보 수정 중 오류가 발생했습니다.' }
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.map(user => 
        user.id === userId 
          ? { ...user, ...updateData }
          : user
      ))

      return { success: true }
    } catch (err) {
      console.error('사용자 정보 수정 중 오류:', err)
      return { success: false, message: '사용자 정보 수정 중 오류가 발생했습니다.' }
    }
  }

  // 사용자 삭제
  const deleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('사용자 삭제 오류:', error)
        return { success: false, message: '사용자 삭제 중 오류가 발생했습니다.' }
      }

      // 로컬 상태 업데이트
      setUsers(prev => prev.filter(user => user.id !== userId))

      // 통계 재조회
      await fetchUserStats()

      return { success: true }
    } catch (err) {
      console.error('사용자 삭제 중 오류:', err)
      return { success: false, message: '사용자 삭제 중 오류가 발생했습니다.' }
    }
  }

  // 새 사용자 생성
  const createUser = async (userData: {
    email: string
    name: string
    role: 'admin' | 'user'
    status: 'approved' | 'pending' | 'rejected'
  }) => {
    try {
      // 중복 이메일 확인
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single()

      if (existingUser) {
        return { success: false, message: '이미 존재하는 이메일입니다.' }
      }

      const { error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          name: userData.name,
          password_hash: 'hashed_password', // 임시값
          role: userData.role,
          status: userData.status
        })

      if (error) {
        console.error('사용자 생성 오류:', error)
        return { success: false, message: '사용자 생성 중 오류가 발생했습니다.' }
      }

      // 목록과 통계 재조회
      await fetchUsers()
      await fetchUserStats()

      return { success: true }
    } catch (err) {
      console.error('사용자 생성 중 오류:', err)
      return { success: false, message: '사용자 생성 중 오류가 발생했습니다.' }
    }
  }

  return {
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
  }
}