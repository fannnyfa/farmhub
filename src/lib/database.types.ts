export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      collections: {
        Row: {
          box_weight: string | null
          created_at: string | null
          id: string
          market: string | null
          producer_name: string
          product_type: string | null
          product_variety: string | null
          quantity: number | null
          reception_date: string | null
          region: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          box_weight?: string | null
          created_at?: string | null
          id?: string
          market?: string | null
          producer_name: string
          product_type?: string | null
          product_variety?: string | null
          quantity?: number | null
          reception_date?: string | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          box_weight?: string | null
          created_at?: string | null
          id?: string
          market?: string | null
          producer_name?: string
          product_type?: string | null
          product_variety?: string | null
          quantity?: number | null
          reception_date?: string | null
          region?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      markets: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          location: string | null
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          location?: string | null
          name?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          password_hash: string
          remember_token: string | null
          role: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          password_hash: string
          remember_token?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          password_hash?: string
          remember_token?: string | null
          role?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      daily_collection_stats: {
        Row: {
          box_weight: string | null
          completed_count: number | null
          pending_count: number | null
          product_type: string | null
          reception_date: string | null
          total_collections: number | null
          total_quantity: number | null
        }
        Relationships: []
      }
      market_regions: {
        Row: {
          id: string | null
          market_name: string | null
          region: string | null
        }
        Insert: {
          id?: string | null
          market_name?: string | null
          region?: string | null
        }
        Update: {
          id?: string | null
          market_name?: string | null
          region?: string | null
        }
        Relationships: []
      }
      market_stats: {
        Row: {
          collection_count: number | null
          last_collection_date: string | null
          market: string | null
          product_type: string | null
          region: string | null
          total_quantity: number | null
        }
        Relationships: []
      }
      producer_stats: {
        Row: {
          collection_count: number | null
          last_collection_date: string | null
          producer_name: string | null
          product_type: string | null
          total_quantity: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// 타입 별칭 정의
export type User = Database['public']['Tables']['users']['Row']
export type Collection = Database['public']['Tables']['collections']['Row']
export type Market = Database['public']['Tables']['markets']['Row']
export type DailyStats = Database['public']['Views']['daily_collection_stats']['Row']
export type ProducerStats = Database['public']['Views']['producer_stats']['Row']
export type MarketStats = Database['public']['Views']['market_stats']['Row']
export type MarketRegion = Database['public']['Views']['market_regions']['Row']

export type CollectionInsert = Database['public']['Tables']['collections']['Insert']
export type CollectionUpdate = Database['public']['Tables']['collections']['Update']

// 추가 타입 정의
export type ProductType = '사과' | '감' | '깻잎'
export type BoxWeight = string
export type ProductVariety = {
  사과: null
  감: '단감' | '약시' | '대봉'
  깻잎: '정품' | '바라'
}

// 사용자 정보가 포함된 Collection 타입
export interface CollectionWithUser extends Collection {
  users?: {
    name: string
    email: string
  } | null
}