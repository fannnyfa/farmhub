"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Collection } from '@/lib/database.types'

interface ProducerRanking {
  producer_name: string
  total_collections: number
  total_quantity: number
  avg_quantity: number
  last_collection_date: string
  markets_used: string
}

interface MarketRanking {
  market: string
  total_collections: number
  total_quantity: number
  unique_producers: number
  avg_quantity: number
  last_collection_date: string
}

interface DailyTrend {
  reception_date: string
  completed_count: number
  total_quantity: number
  unique_producers: number
  unique_markets: number
}

interface ProductStats {
  product_type: string
  product_variety: string | null
  total_collections: number
  total_quantity: number
  avg_quantity: number
  unique_producers: number
  unique_markets: number
}

export function useAnalytics() {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  
  if (!supabase) {
    throw new Error('Supabase client could not be initialized')
  }

  // 특정 날짜의 상세 기록 조회
  const getDailyRecords = async (date: string): Promise<Collection[]> => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .eq('reception_date', date)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('일별 기록 조회 오류:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('일별 기록 조회 중 오류:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  // 생산자 랭킹 조회 (최근 30일)
  const getProducerRanking = async (limit: number = 6): Promise<ProducerRanking[]> => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('producer_ranking')
        .select('*')
        .limit(limit)

      if (error) {
        console.error('생산자 랭킹 조회 오류:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('생산자 랭킹 조회 중 오류:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  // 공판장 랭킹 조회 (최근 30일)
  const getMarketRanking = async (limit: number = 6): Promise<MarketRanking[]> => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('market_ranking')
        .select('*')
        .limit(limit)

      if (error) {
        console.error('공판장 랭킹 조회 오류:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('공판장 랭킹 조회 중 오류:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  // 일별 완료 건수 트렌드 조회 (최근 30일)
  const getDailyTrend = async (): Promise<DailyTrend[]> => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('daily_completion_trend')
        .select('*')
        .order('reception_date', { ascending: true })

      if (error) {
        console.error('일별 트렌드 조회 오류:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('일별 트렌드 조회 중 오류:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  // 제품별 통계 조회
  const getProductStats = async (): Promise<ProductStats[]> => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('product_stats')
        .select('*')
        .order('total_quantity', { ascending: false })

      if (error) {
        console.error('제품별 통계 조회 오류:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('제품별 통계 조회 중 오류:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  // 날짜 범위별 조회 (커스텀 기간)
  const getDataByDateRange = async (startDate: string, endDate: string): Promise<Collection[]> => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('*')
        .gte('reception_date', startDate)
        .lte('reception_date', endDate)
        .order('reception_date', { ascending: false })
        .order('created_at', { ascending: false })

      if (error) {
        console.error('날짜 범위별 조회 오류:', error)
        return []
      }

      return data || []
    } catch (err) {
      console.error('날짜 범위별 조회 중 오류:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    getDailyRecords,
    getProducerRanking,
    getMarketRanking,
    getDailyTrend,
    getProductStats,
    getDataByDateRange
  }
}