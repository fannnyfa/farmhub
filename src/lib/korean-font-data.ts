// 사용자 제공 나눔고딕 폰트를 위한 한글 폰트 로딩 유틸리티

// 사용자 제공 나눔고딕 폰트 로드 (우선순위 1)
export const loadNanumGothicFont = async (): Promise<ArrayBuffer | null> => {
  try {
    console.log('📁 사용자 제공 나눔고딕 폰트 로드 시도...')
    const response = await fetch('/fonts/NanumGothic.ttf')
    
    if (!response.ok) {
      throw new Error(`나눔고딕 폰트 로드 실패: ${response.status}`)
    }
    
    const arrayBuffer = await response.arrayBuffer()
    console.log('✅ 나눔고딕 폰트 로드 성공! 크기:', arrayBuffer.byteLength, 'bytes')
    
    return arrayBuffer
  } catch (error) {
    console.error('❌ 나눔고딕 폰트 로드 실패:', error)
    return null
  }
}

// 웹폰트 백업 (나눔고딕 실패시 대체용)
export const loadWebFont = async (): Promise<ArrayBuffer | null> => {
  try {
    console.log('🌐 웹폰트 백업 로드 시도: Noto Sans KR')
    const response = await fetch('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400&subset=korean&display=swap')
    
    if (!response.ok) {
      throw new Error(`CSS 로드 실패: ${response.status}`)
    }
    
    const cssText = await response.text()
    console.log('📄 CSS 로드 성공, 길이:', cssText.length)
    
    // CSS에서 폰트 URL 추출
    const fontUrlMatches = cssText.match(/url\([^)]+\)/g)
    console.log('🔗 발견된 폰트 URL 수:', fontUrlMatches?.length || 0)
    
    if (!fontUrlMatches || fontUrlMatches.length === 0) {
      throw new Error('폰트 URL을 찾을 수 없습니다')
    }
    
    // 첫 번째 폰트 URL 사용 (보통 woff2)
    const fontUrl = fontUrlMatches[0].replace(/url\(|\)/g, '').replace(/['"]/g, '')
    console.log('📥 폰트 다운로드 시도:', fontUrl.substring(0, 100) + '...')
    
    const fontResponse = await fetch(fontUrl)
    if (!fontResponse.ok) {
      throw new Error(`폰트 다운로드 실패: ${fontResponse.status}`)
    }
    
    const arrayBuffer = await fontResponse.arrayBuffer()
    console.log('✅ 웹폰트 백업 로드 성공! 크기:', arrayBuffer.byteLength, 'bytes')
    
    return arrayBuffer
  } catch (error) {
    console.error('❌ 웹폰트 백업 로드 실패:', error)
    return null
  }
}