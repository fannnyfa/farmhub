"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { createClient } from "@/lib/supabase"
import { User } from "@/lib/database.types"

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
  signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; message?: string }>
  signOut: () => Promise<{ success: boolean }>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    // Supabase 클라이언트가 없으면 로딩 완료 처리
    if (!supabase) {
      setLoading(false)
      setError('Supabase 연결을 사용할 수 없습니다. 환경 설정을 확인해주세요.')
      return
    }
    
    // 초기 사용자 상태 확인
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Supabase 클라이언트가 없으면 로컬 저장소만 확인
      if (!supabase) {
        const storedUser = localStorage.getItem('farmhub-user')
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser)
            setUser(userData)
          } catch (parseError) {
            localStorage.removeItem('farmhub-user')
            setUser(null)
          }
        }
        setLoading(false)
        return
      }
      
      // 저장된 사용자 정보 확인
      const storedUser = localStorage.getItem('farmhub-user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          
          // 데이터베이스에서 최신 사용자 정보 확인
          const { data: currentUser, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.id)
            .single()

          if (fetchError || !currentUser) {
            // 저장된 사용자 정보가 유효하지 않음
            localStorage.removeItem('farmhub-user')
            document.cookie = 'auth-token=; path=/; max-age=0'
            setUser(null)
          } else {
            setUser(currentUser)
          }
        } catch (parseError) {
          console.error('저장된 사용자 정보 파싱 오류:', parseError)
          localStorage.removeItem('farmhub-user')
          document.cookie = 'auth-token=; path=/; max-age=0'
          setUser(null)
        }
      }
    } catch (err) {
      console.error('사용자 확인 오류:', err)
      setError('사용자 정보 확인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      setError(null)

      if (!supabase) {
        setError('데이터베이스 연결을 사용할 수 없습니다.')
        return { success: false }
      }

      // 사용자 정보 조회
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (userError || !userData) {
        setError('존재하지 않는 사용자입니다.')
        return { success: false }
      }

      if (userData.status === 'pending') {
        setError('관리자 승인 대기중입니다.')
        return { success: false }
      }

      if (userData.status === 'rejected') {
        setError('계정이 거부되었습니다.')
        return { success: false }
      }

      // 간단한 비밀번호 확인
      if (password !== 'password') {
        setError('비밀번호가 올바르지 않습니다.')
        return { success: false }
      }

      // 로그인 성공
      setUser(userData)
      localStorage.setItem('farmhub-user', JSON.stringify(userData))
      document.cookie = `auth-token=true; path=/; max-age=${60 * 60 * 24 * 7}` // 7일

      return { success: true }

    } catch (err) {
      console.error('로그인 오류:', err)
      setError('로그인 중 오류가 발생했습니다.')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true)
      setError(null)

      if (!supabase) {
        setError('데이터베이스 연결을 사용할 수 없습니다.')
        return { success: false }
      }

      // 중복 이메일 확인
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingUser) {
        setError('이미 존재하는 이메일입니다.')
        return { success: false }
      }

      // 새 사용자 생성
      const { error: createError } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: 'hashed_password',
          name,
          role: 'user',
          status: 'pending'
        })

      if (createError) {
        setError('계정 생성 중 오류가 발생했습니다.')
        return { success: false }
      }

      return { 
        success: true, 
        message: '계정이 생성되었습니다. 관리자 승인을 기다려주세요.' 
      }

    } catch (err) {
      console.error('회원가입 오류:', err)
      setError('회원가입 중 오류가 발생했습니다.')
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      setUser(null)
      localStorage.removeItem('farmhub-user')
      document.cookie = 'auth-token=; path=/; max-age=0' // 쿠키 삭제
      return { success: true }
    } catch (err) {
      console.error('로그아웃 오류:', err)
      setError('로그아웃 중 오류가 발생했습니다.')
      return { success: false }
    }
  }

  const refreshUser = async () => {
    await checkUser()
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}