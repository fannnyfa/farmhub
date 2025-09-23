// 브라우저 개발자 도구에서 실행할 데이터베이스 수정 스크립트
// F12 → Console 탭에서 이 코드를 복사해서 실행하세요

console.log('🔧 깻잎 바라 무게 제약조건 수정 시작...');
console.log('❗ 문제: 5kg가 중복되어 3kg,3.5kg,4kg,4.5kg 등록 불가');
console.log('🎯 목표: 중복 제거하여 모든 무게 등록 가능하게 만들기');

// Supabase 클라이언트 가져오기 (이미 로드된 상태)
const supabaseClient = window.__SUPABASE_CLIENT__ || 
  (typeof createClient !== 'undefined' ? createClient() : null);

if (!supabaseClient) {
  console.error('❌ Supabase 클라이언트를 찾을 수 없습니다.');
  console.log('💡 페이지를 새로고침한 후 다시 시도해주세요.');
} else {
  console.log('✅ Supabase 클라이언트 확인됨');
  
  // 1단계: 기존 제약조건 제거
  console.log('1️⃣ 기존 제약조건 제거 중...');
  
  supabaseClient.rpc('exec_sql', {
    sql: `
      DO $$ 
      BEGIN
          IF EXISTS (
              SELECT 1 FROM pg_constraint WHERE conname = 'collections_box_weight_check'
          ) THEN
              ALTER TABLE public.collections DROP CONSTRAINT collections_box_weight_check;
              RAISE NOTICE 'box_weight 제약조건 제거 완료';
          END IF;
      END $$;
    `
  }).then(result => {
    console.log('✅ 제약조건 제거 완료:', result);
    
    // 2단계: 컬럼 타입 확장
    console.log('2️⃣ 컬럼 타입 확장 중...');
    return supabaseClient.rpc('exec_sql', {
      sql: 'ALTER TABLE public.collections ALTER COLUMN box_weight TYPE VARCHAR(20);'
    });
  }).then(result => {
    console.log('✅ 컬럼 타입 확장 완료:', result);
    
    // 3단계: 새로운 제약조건 추가
    console.log('3️⃣ 새로운 제약조건 추가 중...');
    return supabaseClient.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.collections 
        ADD CONSTRAINT collections_box_weight_check 
        CHECK (
            box_weight IN ('5kg', '10kg', '3kg', '3.5kg', '4kg', '4.5kg')
            OR box_weight IS NULL
        );
      `
    });
  }).then(result => {
    console.log('✅ 새로운 제약조건 추가 완료:', result);
    console.log('🎉 데이터베이스 수정 완료! 이제 3kg, 3.5kg, 4kg, 4.5kg 등록 가능합니다.');
    console.log('💡 깻잎 바라 등록을 테스트해보세요!');
  }).catch(error => {
    console.error('❌ 오류 발생:', error);
    console.log('💡 다른 방법을 시도해보겠습니다...');
    
    // 대안: 직접 SQL 실행
    console.log('🔄 대안 방법으로 SQL 직접 실행...');
    
    // SQL을 단계별로 실행
    const queries = [
      // 제약조건 제거
      `DO $$ 
       BEGIN
           IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collections_box_weight_check') THEN
               ALTER TABLE public.collections DROP CONSTRAINT collections_box_weight_check;
           END IF;
       END $$;`,
      
      // 컬럼 타입 변경
      `ALTER TABLE public.collections ALTER COLUMN box_weight TYPE VARCHAR(20);`,
      
      // 새 제약조건 추가
      `ALTER TABLE public.collections 
       ADD CONSTRAINT collections_box_weight_check 
       CHECK (box_weight IN ('5kg', '10kg', '3kg', '3.5kg', '4kg', '4.5kg') OR box_weight IS NULL);`
    ];
    
    queries.forEach((query, index) => {
      console.log(`실행할 SQL ${index + 1}:`);
      console.log(query);
      console.log('---');
    });
    
    console.log('💡 위 SQL들을 Supabase 대시보드의 SQL Editor에서 하나씩 실행해주세요.');
    console.log('');
    console.log('🌐 Supabase 대시보드: https://supabase.com/dashboard/project/ixnwpdhumwdfnlhmkksk');
    console.log('📊 SQL Editor 경로: 왼쪽 메뉴 → SQL Editor → New query');
    console.log('');
    console.log('📋 복사할 전체 SQL:');
    console.log('='.repeat(60));
    console.log(`
-- 깻잎 바라 무게 제약조건 최종 수정
ALTER TABLE public.collections DROP CONSTRAINT IF EXISTS collections_box_weight_check;

ALTER TABLE public.collections 
    ADD CONSTRAINT collections_box_weight_check 
    CHECK (
        box_weight IN ('5kg', '10kg', '3kg', '3.5kg', '4kg', '4.5kg')
        OR box_weight IS NULL
    );

COMMENT ON COLUMN public.collections.box_weight IS '박스 중량: 사과/감(5kg,10kg), 깻잎 바라(3kg,3.5kg,4kg,4.5kg,5kg 모든 무게 지원)';
    `);
    console.log('='.repeat(60));
  });
}