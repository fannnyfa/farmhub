#!/usr/bin/env node

/**
 * Supabase TypeScript 타입 생성 스크립트
 * 데이터베이스 스키마에서 최신 타입을 생성합니다.
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// 환경 변수 체크
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 환경 변수가 설정되지 않았습니다.');
    console.error('NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인하세요.');
    process.exit(1);
}

// 프로젝트 루트 경로
const projectRoot = path.resolve(__dirname, '..');
const typesPath = path.join(projectRoot, 'src/lib/database.types.ts');

console.log('🔄 Supabase TypeScript 타입을 생성하는 중...');

// supabase CLI를 사용해서 타입 생성
const command = `npx supabase gen types typescript --project-id=${supabaseUrl.split('//')[1].split('.')[0]} > ${typesPath}`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error('❌ 타입 생성 중 오류가 발생했습니다:', error);
        
        // fallback: 수동으로 기본 타입 파일 생성
        console.log('📝 기본 타입 파일을 생성합니다...');
        createFallbackTypes();
        return;
    }

    if (stderr) {
        console.warn('⚠️  경고:', stderr);
    }

    console.log('✅ TypeScript 타입이 성공적으로 생성되었습니다!');
    console.log(`📁 위치: ${typesPath}`);
    
    // 타입 파일 후처리
    postProcessTypes();
});

function createFallbackTypes() {
    const fallbackContent = `export type Json =
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
      get_current_user: {
        Args: {}
        Returns: {
          id: string
          email: string
          name: string
          role: string
          status: string
        }[]
      }
      is_admin: {
        Args: {}
        Returns: boolean
      }
      is_approved_user: {
        Args: {}
        Returns: boolean
      }
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
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

// 추가 타입 정의
export type ProductType = '사과' | '감' | '깻잎'
export type BoxWeight = string
export type UserRole = 'admin' | 'user'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type CollectionStatus = 'pending' | 'completed'
export type ProductVariety = {
  사과: null
  감: '단감' | '약시' | '대봉'
  깻잎: '정품' | '바라'
}`;

    fs.writeFileSync(typesPath, fallbackContent);
    console.log('✅ 기본 타입 파일이 생성되었습니다!');
}

function postProcessTypes() {
    try {
        const content = fs.readFileSync(typesPath, 'utf8');
        
        // 타입에 추가적인 별칭과 유틸리티 타입 추가
        const additionalTypes = `
// 추가 타입 정의
export type ProductType = '사과' | '감' | '깻잎'
export type BoxWeight = string
export type UserRole = 'admin' | 'user'
export type UserStatus = 'pending' | 'approved' | 'rejected'
export type CollectionStatus = 'pending' | 'completed'
export type ProductVariety = {
  사과: null
  감: '단감' | '약시' | '대봉'
  깻잎: '정품' | '바라'
}

// 유틸리티 타입
export type CollectionWithUser = Collection & {
  user?: Pick<User, 'id' | 'name' | 'email'>
}

export type CollectionFormData = Omit<CollectionInsert, 'id' | 'created_at' | 'updated_at' | 'user_id'>
`;

        // 기존 내용에 추가 타입 추가
        const updatedContent = content + additionalTypes;
        fs.writeFileSync(typesPath, updatedContent);
        
        console.log('✅ 타입 파일 후처리가 완료되었습니다!');
    } catch (error) {
        console.warn('⚠️  타입 파일 후처리 중 오류:', error.message);
    }
}