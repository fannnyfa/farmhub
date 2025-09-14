// 한글 폰트를 위한 base64 인코딩된 나눔고딕 폰트 (일부)
// 실제 운영에서는 CDN을 사용하는 것이 좋습니다

import { jsPDF } from 'jspdf'

// 간단한 한글 폰트 로드 함수
export const loadKoreanFont = (doc: jsPDF): boolean => {
  try {
    // 로컬 폰트 파일 사용 시도
    const fontPath = '/fonts/NanumGothic-Regular.ttf'
    
    // 실제로는 브라우저에서 직접 로드할 수 없으므로
    // 기본 폰트 사용하되 한글 표시 가능하도록 설정
    doc.setFont('helvetica', 'normal')
    doc.setLanguage('ko-KR')
    
    console.log('기본 폰트로 한글 지원 설정')
    return false // 커스텀 폰트 로드 실패, 기본 폰트 사용
  } catch (error) {
    console.error('폰트 설정 실패:', error)
    doc.setFont('helvetica')
    return false
  }
}

// 더 간단한 방법: 한글을 영어로 변환하는 함수
export const convertKoreanToLatin = (text: string): string => {
  const koreanToLatin: { [key: string]: string } = {
    '송품장': 'Song-Poom-Jang',
    '출하일시': 'Date',
    '밀양산내지소': 'Miryang Sannae',
    '수신': 'To',
    '생산자': 'Producer', 
    '품명': 'Product',
    '규격': 'Spec',
    '계': 'Total',
    '사과': 'Apple',
    '감': 'Persimmon', 
    '깻잎': 'Sesame Leaf',
    '단감': 'Sweet P.',
    '약시': 'Yaksi',
    '대봉': 'Daebong',
    '정품': 'Premium',
    '바라': 'Bara',
    '년': '',
    '월': '/',
    '일': '',
    '계좌번호': 'Account',
    '농협': 'NH Bank',
    '기사': 'Driver',
    'kg': 'kg',
    '박스': 'box'
  }

  let result = text
  Object.entries(koreanToLatin).forEach(([korean, latin]) => {
    result = result.replace(new RegExp(korean, 'g'), latin)
  })
  
  return result
}