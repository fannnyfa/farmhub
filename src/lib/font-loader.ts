// 웹폰트를 Base64로 변환하여 PDF에 임베드하는 유틸리티
import jsPDF from 'jspdf'

export interface FontData {
  name: string
  data: string
  loaded: boolean
}

// Google Fonts에서 Noto Sans KR을 동적으로 로드
export const loadNotoSansKR = async (): Promise<FontData | null> => {
  try {
    // Google Fonts CSS URL
    const fontCssUrl = 'https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&display=swap'
    
    // CSS 파일 로드
    const cssResponse = await fetch(fontCssUrl)
    const cssText = await cssResponse.text()
    
    // CSS에서 폰트 URL 추출 (woff2 형식)
    const fontUrlMatch = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/)
    
    if (!fontUrlMatch) {
      throw new Error('폰트 URL을 찾을 수 없습니다')
    }
    
    const fontUrl = fontUrlMatch[1]
    
    // 폰트 파일 다운로드
    const fontResponse = await fetch(fontUrl)
    const fontBuffer = await fontResponse.arrayBuffer()
    
    // ArrayBuffer를 Base64로 변환
    const base64 = arrayBufferToBase64(fontBuffer)
    
    return {
      name: 'NotoSansKR',
      data: base64,
      loaded: true
    }
  } catch (error) {
    console.error('Noto Sans KR 폰트 로드 실패:', error)
    return null
  }
}

// ArrayBuffer를 Base64 문자열로 변환
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// 캐시된 폰트 데이터
let cachedFont: FontData | null = null
let fontLoadPromise: Promise<FontData | null> | null = null

// 폰트 로드 (캐시 지원)
export const getCachedNotoSansKR = async (): Promise<FontData | null> => {
  if (cachedFont) {
    return cachedFont
  }
  
  if (!fontLoadPromise) {
    fontLoadPromise = loadNotoSansKR()
  }
  
  const result = await fontLoadPromise
  if (result) {
    cachedFont = result
  }
  
  return result
}

// PDF에 폰트 등록
export const registerFontToPDF = (pdf: jsPDF, fontData: FontData): boolean => {
  try {
    const fileName = `${fontData.name}.ttf`
    
    // VFS에 폰트 파일 추가
    pdf.addFileToVFS(fileName, fontData.data)
    
    // 폰트 등록 (normal, bold)
    pdf.addFont(fileName, fontData.name, 'normal')
    pdf.addFont(fileName, fontData.name, 'bold')
    
    return true
  } catch (error) {
    console.error('PDF 폰트 등록 실패:', error)
    return false
  }
}