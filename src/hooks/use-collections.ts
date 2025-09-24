"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import { Collection, CollectionInsert, CollectionWithUser, Market, MarketRegion } from "@/lib/database.types"
import { useAuth } from "@/contexts/auth-context"
import { getKoreanToday } from "@/lib/date-utils"

export function useCollections() {
  const [collections, setCollections] = useState<CollectionWithUser[]>([])
  const [markets, setMarkets] = useState<Market[]>([])
  const [marketRegions, setMarketRegions] = useState<MarketRegion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user } = useAuth()
  const supabase = createClient()

  // 공판장 목록 불러오기
  const fetchMarkets = async () => {
    if (!supabase) {
      console.warn('Supabase 클라이언트를 사용할 수 없습니다.')
      return
    }
    
    try {
      const { data, error: fetchError } = await supabase
        .from('markets')
        .select('*')
        .eq('is_active', true)
        .order('location')
        .order('name')

      if (fetchError) {
        console.error('공판장 조회 오류:', fetchError)
        return
      }

      setMarkets(data || [])
    } catch (err) {
      console.error('공판장 조회 중 오류:', err)
    }
  }

  // 지역별 공판장 불러오기
  const fetchMarketRegions = async () => {
    if (!supabase) {
      console.warn('Supabase 클라이언트를 사용할 수 없습니다.')
      return
    }
    
    try {
      const { data, error: fetchError } = await supabase
        .from('market_regions')
        .select('*')
        .order('region')
        .order('market_name')

      if (fetchError) {
        console.error('지역별 공판장 조회 오류:', fetchError)
        return
      }

      setMarketRegions(data || [])
    } catch (err) {
      console.error('지역별 공판장 조회 중 오류:', err)
    }
  }

  // 접수 목록 불러오기 (전체 팀 데이터 공유)
  const fetchCollections = async () => {
    if (!user || !supabase) {
      if (!supabase) console.warn('Supabase 클라이언트를 사용할 수 없습니다.')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const { data, error: fetchError } = await supabase
        .from('collections')
        .select(`
          *,
          users!collections_user_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })

      if (fetchError) {
        setError('접수 목록을 불러올 수 없습니다.')
        console.error('접수 조회 오류:', fetchError)
        return
      }

      setCollections(data || [])
    } catch (err) {
      setError('접수 목록 조회 중 오류가 발생했습니다.')
      console.error('접수 조회 중 오류:', err)
    } finally {
      setLoading(false)
    }
  }

  // 새 접수 등록
  const createCollection = async (collectionData: Omit<CollectionInsert, 'user_id'>) => {
    if (!user) {
      setError('사용자 정보가 없습니다.')
      return { success: false }
    }

    if (!supabase) {
      setError('데이터베이스 연결을 사용할 수 없습니다.')
      return { success: false }
    }

    try {
      setLoading(true)
      setError(null)

      console.log('접수 생성 시작:')
      console.log('- Supabase 클라이언트:', !!supabase)
      console.log('- 사용자 정보:', user)
      console.log('- 전송할 데이터:', collectionData)
      console.log('- box_weight 값:', collectionData.box_weight)

      const { data, error: createError } = await supabase
        .from('collections')
        .insert({
          ...collectionData,
          user_id: user.id,
          status: collectionData.status || 'pending', // 기본값: 대기중
        })
        .select()
        .single()

      if (createError) {
        setError('접수 등록 중 오류가 발생했습니다.')
        console.error('접수 생성 오류 상세:')
        console.error('- 에러 객체:', createError)
        console.error('- 메시지:', createError?.message)
        console.error('- 상세:', createError?.details)
        console.error('- 힌트:', createError?.hint)
        console.error('- 코드:', createError?.code)
        console.error('- 전송 데이터:', collectionData)
        console.error('- 전체 에러:', JSON.stringify(createError, null, 2))
        return { success: false, error: createError?.message || '알 수 없는 오류' }
      }

      // 즉시 상태 업데이트 (새 데이터를 맨 앞에 추가)
      setCollections(prev => [data, ...prev])
      return { success: true, data }

    } catch (err) {
      setError('접수 등록 중 오류가 발생했습니다.')
      console.error('접수 생성 중 오류 상세:')
      console.error('- 에러 객체:', err)
      console.error('- 메시지:', err instanceof Error ? err.message : String(err))
      console.error('- 스택:', err instanceof Error ? err.stack : undefined)
      console.error('- 전송 데이터:', collectionData)
      console.error('- 전체 에러:', JSON.stringify(err, Object.getOwnPropertyNames(err)))
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    } finally {
      setLoading(false)
    }
  }

  // 접수 수정
  const updateCollection = async (id: string, updates: Partial<CollectionInsert>) => {
    if (!supabase) {
      setError('데이터베이스 연결을 사용할 수 없습니다.')
      return { success: false }
    }
    
    try {
      setLoading(true)
      setError(null)

      const { data, error: updateError } = await supabase
        .from('collections')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {
        setError('접수 수정 중 오류가 발생했습니다.')
        console.error('접수 수정 오류:', updateError)
        return { success: false }
      }

      // 즉시 상태 업데이트 (해당 항목만 업데이트)
      setCollections(prev => prev.map(item => 
        item.id === id ? data : item
      ))
      return { success: true, data }

    } catch (err) {
      setError('접수 수정 중 오류가 발생했습니다.')
      console.error('접수 수정 중 오류:', err)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  // 접수 삭제
  const deleteCollection = async (id: string) => {
    if (!supabase) {
      setError('데이터베이스 연결을 사용할 수 없습니다.')
      return { success: false }
    }
    
    try {
      setLoading(true)
      setError(null)

      const { error: deleteError } = await supabase
        .from('collections')
        .delete()
        .eq('id', id)

      if (deleteError) {
        setError('접수 삭제 중 오류가 발생했습니다.')
        console.error('접수 삭제 오류:', deleteError)
        return { success: false }
      }

      // 즉시 상태 업데이트 (해당 항목 제거)
      setCollections(prev => prev.filter(item => item.id !== id))
      return { success: true }

    } catch (err) {
      setError('접수 삭제 중 오류가 발생했습니다.')
      console.error('접수 삭제 중 오류:', err)
      return { success: false }
    } finally {
      setLoading(false)
    }
  }

  // 오늘 통계 계산
  const getTodayStats = () => {
    // 한국 시간대(KST) 기준으로 오늘 날짜 계산
    const today = getKoreanToday()
    const todayCollections = collections.filter(
      col => col.reception_date === today
    )

    const total = todayCollections.length
    const completed = todayCollections.filter(col => col.status === 'completed').length
    const pending = todayCollections.filter(col => col.status === 'pending').length

    // 완료율 계산 (전체가 0일 때는 0%로 표시)
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    return {
      total,
      pending,
      completed,
      completionRate, // 완료율 추가
      totalQuantity: todayCollections.reduce((sum, col) => sum + (col.quantity || 0), 0),
      boxes5kg: todayCollections.filter(col => col.box_weight === '5kg').reduce((sum, col) => sum + (col.quantity || 0), 0),
      boxes10kg: todayCollections.filter(col => col.box_weight === '10kg').reduce((sum, col) => sum + (col.quantity || 0), 0),
    }
  }

  useEffect(() => {
    if (user) {
      fetchCollections()
      fetchMarkets()
      fetchMarketRegions()
    }
  }, [user])

  return {
    collections,
    markets,
    marketRegions,
    loading,
    error,
    supabase,
    createCollection,
    updateCollection,
    deleteCollection,
    fetchCollections,
    fetchMarkets,
    fetchMarketRegions,
    getTodayStats,
  }
}