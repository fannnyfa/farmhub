// 브라우저 개발자 도구에서 실행할 데이터베이스 수정 스크립트 (Fetch API 버전)
// F12 → Console 탭에서 이 코드를 복사해서 실행하세요

console.log('🔧 깻잎 바라 무게 제약조건 수정 시작...');

// Supabase 설정
const SUPABASE_URL = 'https://ixnwpdhumwdfnlhmkksk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml4bndwZGh1bXdkZm5saG1ra3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc2NTM3MjMsImV4cCI6MjA3MzIyOTcyM30.-xUSHe5krSUvGhJ3wB6IG7cxa3w0pt5rjvJIPd5eZII';

// SQL 실행 함수
async function executeSQL(sql, description) {
  console.log(`🔄 ${description}...`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ sql: sql })
    });
    
    if (response.ok) {
      console.log(`✅ ${description} 완료`);
      return await response.json();
    } else {
      const error = await response.text();
      console.error(`❌ ${description} 실패:`, error);
      return null;
    }
  } catch (error) {
    console.error(`❌ ${description} 오류:`, error);
    return null;
  }
}

// 수정 작업 실행
async function fixDatabase() {
  console.log('🚀 데이터베이스 수정 시작...');
  
  // 1단계: 기존 제약조건 제거
  const step1 = await executeSQL(`
    DO $$ 
    BEGIN
        IF EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'collections_box_weight_check'
        ) THEN
            ALTER TABLE public.collections DROP CONSTRAINT collections_box_weight_check;
            RAISE NOTICE 'box_weight 제약조건 제거 완료';
        END IF;
    END $$;
  `, '기존 제약조건 제거');
  
  if (step1 === null) {
    console.log('⚠️ RPC 함수가 없습니다. 직접 SQL을 실행해야 합니다.');
    console.log('📋 다음 SQL들을 Supabase 대시보드에서 순서대로 실행해주세요:');
    console.log('');
    console.log('1️⃣ 제약조건 제거:');
    console.log(`DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collections_box_weight_check') THEN
        ALTER TABLE public.collections DROP CONSTRAINT collections_box_weight_check;
    END IF;
END $$;`);
    console.log('');
    console.log('2️⃣ 컬럼 타입 변경:');
    console.log('ALTER TABLE public.collections ALTER COLUMN box_weight TYPE VARCHAR(20);');
    console.log('');
    console.log('3️⃣ 새 제약조건 추가:');
    console.log(`ALTER TABLE public.collections 
ADD CONSTRAINT collections_box_weight_check 
CHECK (box_weight IN ('5kg', '10kg', '3kg', '3.5kg', '4kg', '4.5kg') OR box_weight IS NULL);`);
    return;
  }
  
  // 2단계: 컬럼 타입 확장
  await executeSQL(
    'ALTER TABLE public.collections ALTER COLUMN box_weight TYPE VARCHAR(20);',
    '컬럼 타입 확장'
  );
  
  // 3단계: 새로운 제약조건 추가
  await executeSQL(`
    ALTER TABLE public.collections 
    ADD CONSTRAINT collections_box_weight_check 
    CHECK (box_weight IN ('5kg', '10kg', '3kg', '3.5kg', '4kg', '4.5kg') OR box_weight IS NULL);
  `, '새로운 제약조건 추가');
  
  console.log('🎉 데이터베이스 수정 완료!');
  console.log('💡 이제 깻잎 바라에서 3kg, 3.5kg, 4kg, 4.5kg 등록이 가능합니다!');
}

// 실행
fixDatabase();