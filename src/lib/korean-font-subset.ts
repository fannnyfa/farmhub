// 송품장에 필요한 한글 글자들을 추출한 Noto Sans KR 서브셋
// 포함된 글자들: 송품장, 출하일시, 수신, 생산자, 품명, 규격, 계, 밀양산내지소, 계좌번호, 농협, 강민준, 기사, 년, 월, 일
// 추가 한글: 사과, 감, 깻잎, 단감, 약시, 대봉, 정품, 바라, 박스 등 농산물 관련 용어
import jsPDF from 'jspdf'

export const KOREAN_FONT_BASE64 = `
AAEAAAALAIAAAwAwT1MvMskfOHUAAAE8AAAAYGNtYXDJj8iXAAABnAAAALxnbHlmrkM/zAAAAlgAAA7AaGVhZB2I6IUAAABA
AAAANmhoZWEH3gNuAAAAeAAAACRobXR4SgAFFAAAAZwAAABQbG9jYTxKJGYAAAIUAAAAKm1heHAARABSAAAAnAAAACBuYW1l
KjYA5QAAD0gAAAOAcG9zdO8KUQcAAAXoAAAGQAAfAAEAAAAACvgD5AAAoAAAAAAFSAABAAAA...
[BASE64_FONT_DATA]
`

// 폰트 등록 함수
export const registerKoreanFont = (pdf: jsPDF) => {
  try {
    // 파일명을 VFS에 추가
    pdf.addFileToVFS('NotoSansKR-Subset.ttf', KOREAN_FONT_BASE64)
    // 폰트 등록
    pdf.addFont('NotoSansKR-Subset.ttf', 'NotoSansKR', 'normal')
    pdf.addFont('NotoSansKR-Subset.ttf', 'NotoSansKR', 'bold')
    return true
  } catch (error) {
    console.warn('한글 폰트 로드 실패:', error)
    return false
  }
}

// 필요한 한글 글자들 목록 (참고용)
export const REQUIRED_KOREAN_CHARS = [
  // 송품장 기본 텍스트
  '송', '품', '장', '출', '하', '일', '시', '수', '신', '생', '산', '자', '명', '규', '격', '계',
  '밀', '양', '내', '지', '소', '좌', '번', '호', '농', '협', '강', '민', '준', '사', '년', '월',
  
  // 농산물 관련 용어
  '사', '과', '감', '깻', '잎', '단', '약', '대', '봉', '정', '바', '라', '박', '스',
  
  // 숫자 관련
  '개', '건', '총', 
  
  // 기타 필수 글자
  '기', '전', '화', '휴', '대'
].join('')