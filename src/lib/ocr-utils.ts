import Tesseract from 'tesseract.js'

/**
 * 이미지에서 텍스트를 인식하는 OCR 함수
 * @param imageData - Canvas에서 추출한 이미지 데이터 (base64 또는 File)
 * @returns 인식된 텍스트 문자열
 */
export async function recognizeText(imageData: string | File): Promise<string> {
  try {
    console.log('OCR 시작...')
    
    const result = await Tesseract.recognize(
      imageData,
      'kor+eng', // 한글 + 영어 동시 인식
      {
        logger: (m) => {
          // OCR 진행상황 로그 (개발 중에만)
          if (process.env.NODE_ENV === 'development') {
            console.log('OCR 진행:', m)
          }
        },
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // 단일 블록 텍스트로 인식
        tessedit_char_whitelist: '가-힣a-zA-Z0-9 .,kg개박스', // 허용할 문자 범위
      }
    )

    console.log('OCR 완료, 신뢰도:', result.data.confidence)
    console.log('인식된 텍스트:', result.data.text)
    
    return result.data.text.trim()
  } catch (error) {
    console.error('OCR 인식 실패:', error)
    throw new Error('텍스트 인식에 실패했습니다.')
  }
}

/**
 * 캔버스에서 이미지 데이터를 추출하는 헬퍼 함수
 * @param canvas - HTML Canvas 엘리먼트
 * @returns base64 이미지 데이터
 */
export function getCanvasImageData(canvas: HTMLCanvasElement): string {
  // PNG 형태로 base64 데이터 추출
  return canvas.toDataURL('image/png')
}

/**
 * 이미지 전처리 함수 - OCR 인식률 향상을 위해
 * @param canvas - 원본 캔버스
 * @returns 처리된 이미지 데이터
 */
export function preprocessImage(canvas: HTMLCanvasElement): string {
  // 새로운 캔버스 생성하여 이미지 전처리
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  
  if (!tempCtx) {
    return getCanvasImageData(canvas)
  }

  // 캔버스 크기 설정
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height

  // 원본 이미지를 임시 캔버스에 복사
  tempCtx.drawImage(canvas, 0, 0)

  // 이미지 데이터 가져오기
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  const data = imageData.data

  // 흑백 변환 및 대비 향상
  for (let i = 0; i < data.length; i += 4) {
    // RGB 평균값 계산 (그레이스케일)
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3
    
    // 임계값을 이용한 이진화 (흑백 처리)
    const threshold = 128
    const binaryValue = gray > threshold ? 255 : 0
    
    data[i] = binaryValue     // Red
    data[i + 1] = binaryValue // Green
    data[i + 2] = binaryValue // Blue
    // Alpha는 그대로 유지
  }

  // 처리된 이미지 데이터를 다시 캔버스에 적용
  tempCtx.putImageData(imageData, 0, 0)

  return getCanvasImageData(tempCanvas)
}

/**
 * OCR 워커 초기화 함수 (사전 로딩)
 */
export async function initializeOCR(): Promise<void> {
  try {
    console.log('OCR 모델 사전 로딩 시작...')
    
    // 더미 이미지로 OCR 모델 사전 로딩
    const dummyCanvas = document.createElement('canvas')
    dummyCanvas.width = 100
    dummyCanvas.height = 50
    
    const ctx = dummyCanvas.getContext('2d')
    if (ctx) {
      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, 100, 50)
      ctx.fillStyle = 'black'
      ctx.font = '16px Arial'
      ctx.fillText('Test', 10, 30)
    }

    await Tesseract.recognize(
      getCanvasImageData(dummyCanvas),
      'kor+eng'
    )
    
    console.log('OCR 모델 사전 로딩 완료')
  } catch (error) {
    console.warn('OCR 모델 사전 로딩 실패:', error)
  }
}