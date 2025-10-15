import Tesseract from 'tesseract.js'

/**
 * 이미지에서 텍스트를 인식하는 OCR 함수
 * @param imageData - Canvas에서 추출한 이미지 데이터 (base64 또는 File)
 * @returns 인식된 텍스트 문자열
 */
export async function recognizeText(imageData: string | File): Promise<string> {
  try {
    console.log('한글 이름 OCR 시작...')
    
    const result = await Tesseract.recognize(
      imageData,
      'kor', // 한글 전용 모드
      {
        logger: (m) => {
          // OCR 진행상황 로그 (개발 중에만)
          if (process.env.NODE_ENV === 'development') {
            console.log('OCR 진행:', m)
          }
        },
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_WORD, // 단일 단어 모드 (이름 최적화)
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, // LSTM 엔진만 사용 (정확도 향상)
        tessedit_char_whitelist: '가-힣', // 한글만 허용 (노이즈 제거)
        preserve_interword_spaces: '0', // 단어 간 공백 제거
        // 한글 인식 최적화 설정
        user_defined_dpi: '300', // 높은 DPI 설정
        tessedit_create_hocr: '0', // HOCR 출력 비활성화 (속도 향상)
        tessedit_create_tsv: '0', // TSV 출력 비활성화
        tessedit_create_pdf: '0', // PDF 출력 비활성화
      }
    )

    console.log('한글 OCR 완료')
    console.log('신뢰도:', result.data.confidence + '%')
    console.log('인식된 텍스트:', result.data.text)
    
    // 한글 이름 패턴 후처리 및 가이드 텍스트 필터링
    let cleanedText = result.data.text
      .replace(/[^가-힣]/g, '') // 한글이 아닌 문자 모두 제거
      .trim()
    
    // 가이드 텍스트 패턴 제거 (혹시라도 남아있을 경우)
    const guidePatterns = [
      '이영역에', '이름을', '크게', '작성하세요', '작성해주세요',
      '예시', '김철수예시', '생산자명', '입력'
    ]
    
    guidePatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(new RegExp(pattern, 'g'), '')
    })
    
    // 연속된 같은 글자 제거 (OCR 오류 방지)
    cleanedText = cleanedText.replace(/(.)\1{2,}/g, '$1')
    
    // 2-4글자 한글 이름만 추출
    const nameMatch = cleanedText.match(/[가-힣]{2,4}/)
    const finalText = nameMatch ? nameMatch[0] : cleanedText
    
    console.log('원본 OCR 결과:', result.data.text)
    console.log('1차 정제:', cleanedText)
    console.log('최종 이름:', finalText)
    
    return finalText
  } catch (error) {
    console.error('한글 OCR 인식 실패:', error)
    throw new Error('이름 인식에 실패했습니다.')
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
 * 한글 이름 인식을 위한 고급 이미지 전처리 함수
 * @param canvas - 원본 캔버스
 * @returns 처리된 이미지 데이터
 */
export function preprocessImage(canvas: HTMLCanvasElement): string {
  // 고해상도 캔버스 생성 (2배 스케일)
  const scale = 2
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  
  if (!tempCtx) {
    return getCanvasImageData(canvas)
  }

  // 고해상도 캔버스 크기 설정
  tempCanvas.width = canvas.width * scale
  tempCanvas.height = canvas.height * scale

  // 고품질 스케일링 설정
  tempCtx.imageSmoothingEnabled = false // 픽셀 아트 스타일로 선명하게
  tempCtx.scale(scale, scale)

  // 원본 이미지를 고해상도로 복사
  tempCtx.drawImage(canvas, 0, 0)

  // 이미지 데이터 가져오기
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  const data = imageData.data
  const width = tempCanvas.width
  const height = tempCanvas.height

  console.log('이미지 전처리 시작:', { width, height, scale })

  // 1단계: 가우시안 블러로 노이즈 제거
  const blurredData = applyGaussianBlur(data, width, height)

  // 2단계: 적응형 임계값 이진화
  const binaryData = applyAdaptiveThreshold(blurredData, width, height)

  // 3단계: 모폴로지 연산으로 글자 두께 최적화
  const morphologyData = applyMorphology(binaryData, width, height)

  // 4단계: 대비 향상
  const enhancedData = enhanceContrast(morphologyData)

  // 처리된 데이터 적용
  for (let i = 0; i < data.length; i += 4) {
    data[i] = enhancedData[i]         // Red
    data[i + 1] = enhancedData[i + 1] // Green
    data[i + 2] = enhancedData[i + 2] // Blue
    // Alpha는 그대로 유지
  }

  tempCtx.putImageData(imageData, 0, 0)
  console.log('이미지 전처리 완료')

  return getCanvasImageData(tempCanvas)
}

/**
 * 가우시안 블러 적용 (노이즈 제거)
 */
function applyGaussianBlur(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data)
  const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1] // 3x3 가우시안 커널
  const kernelSize = 3
  const half = Math.floor(kernelSize / 2)

  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let r = 0, g = 0, b = 0, weightSum = 0

      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const px = x + kx - half
          const py = y + ky - half
          const idx = (py * width + px) * 4
          const weight = kernel[ky * kernelSize + kx]

          r += data[idx] * weight
          g += data[idx + 1] * weight
          b += data[idx + 2] * weight
          weightSum += weight
        }
      }

      const idx = (y * width + x) * 4
      result[idx] = r / weightSum
      result[idx + 1] = g / weightSum
      result[idx + 2] = b / weightSum
    }
  }

  return result
}

/**
 * 적응형 임계값 이진화
 */
function applyAdaptiveThreshold(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data)
  const blockSize = 15 // 적응형 블록 크기
  const c = 10 // 상수

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3

      // 주변 영역의 평균 계산
      let sum = 0, count = 0
      const halfBlock = Math.floor(blockSize / 2)

      for (let by = Math.max(0, y - halfBlock); by <= Math.min(height - 1, y + halfBlock); by++) {
        for (let bx = Math.max(0, x - halfBlock); bx <= Math.min(width - 1, x + halfBlock); bx++) {
          const bidx = (by * width + bx) * 4
          sum += (data[bidx] + data[bidx + 1] + data[bidx + 2]) / 3
          count++
        }
      }

      const threshold = (sum / count) - c
      const binaryValue = gray > threshold ? 255 : 0

      result[idx] = binaryValue
      result[idx + 1] = binaryValue
      result[idx + 2] = binaryValue
    }
  }

  return result
}

/**
 * 모폴로지 연산 (글자 두께 최적화)
 */
function applyMorphology(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  // 단순 확장 연산으로 글자를 약간 두껍게 만듦
  const result = new Uint8ClampedArray(data)

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      
      // 주변 8방향 검사
      let hasBlack = false
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nidx = ((y + dy) * width + (x + dx)) * 4
          if (data[nidx] === 0) { // 검은색 픽셀 발견
            hasBlack = true
            break
          }
        }
        if (hasBlack) break
      }

      if (hasBlack) {
        result[idx] = 0     // 검은색으로
        result[idx + 1] = 0
        result[idx + 2] = 0
      }
    }
  }

  return result
}

/**
 * 대비 향상
 */
function enhanceContrast(data: Uint8ClampedArray): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data)
  const contrast = 1.2 // 대비 증가 계수

  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3
    const enhanced = Math.min(255, Math.max(0, (gray - 128) * contrast + 128))
    
    result[i] = enhanced
    result[i + 1] = enhanced
    result[i + 2] = enhanced
  }

  return result
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