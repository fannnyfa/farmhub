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
        }
      }
    )

    // 한글 인식 개선을 위한 다중 시도 방식
    try {
      // 2차 인식: 다른 언어 모드로 시도
      const korEngResult = await Tesseract.recognize(
        imageData,
        'kor+eng', // 한글+영어 조합
        {
          logger: (m) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('2차 OCR 진행:', m)
            }
          }
        }
      )

      // 더 좋은 결과가 있으면 사용
      if (korEngResult.data.confidence > result.data.confidence && korEngResult.data.text.trim()) {
        console.log('2차 인식 결과 채택 - 신뢰도:', korEngResult.data.confidence + '%')
        result.data = korEngResult.data
      }
    } catch (secondError) {
      console.warn('2차 인식 실패, 기본 결과 사용:', secondError)
    }

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
  // 고해상도 캔버스 생성 (4배 스케일로 증가)
  const scale = 4
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')
  
  if (!tempCtx) {
    return getCanvasImageData(canvas)
  }

  // 고해상도 캔버스 크기 설정
  tempCanvas.width = canvas.width * scale
  tempCanvas.height = canvas.height * scale

  // 고품질 스케일링 설정
  tempCtx.imageSmoothingEnabled = true // 부드러운 스케일링으로 변경
  tempCtx.imageSmoothingQuality = 'high' // 최고 품질 설정
  tempCtx.scale(scale, scale)

  // 흰색 배경으로 초기화 (OCR 인식 개선)
  tempCtx.fillStyle = 'white'
  tempCtx.fillRect(0, 0, canvas.width, canvas.height)

  // 원본 이미지를 고해상도로 복사
  tempCtx.drawImage(canvas, 0, 0)

  // 이미지 데이터 가져오기
  const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height)
  const data = imageData.data
  const width = tempCanvas.width
  const height = tempCanvas.height

  console.log('이미지 전처리 시작:', { width, height, scale })

  // 1단계: 글자 굵기 정규화 (한글 특화)
  const normalizedData = normalizeStrokeWidth(data, width, height)

  // 2단계: 가우시안 블러로 노이즈 제거 (약하게 적용)
  const blurredData = applyGaussianBlur(normalizedData, width, height, 0.5)

  // 3단계: 한글 특화 적응형 임계값 이진화
  const binaryData = applyKoreanAdaptiveThreshold(blurredData, width, height)

  // 4단계: 한글 글자 구조 최적화 모폴로지
  const morphologyData = applyKoreanMorphology(binaryData, width, height)

  // 5단계: 대비 향상 및 샤프닝
  const enhancedData = enhanceContrastAndSharpness(morphologyData)

  // 6단계: 한글 글자 연결성 개선
  const connectedData = improveKoreanConnectivity(enhancedData, width, height)

  // 처리된 데이터 적용
  for (let i = 0; i < data.length; i += 4) {
    data[i] = connectedData[i]         // Red
    data[i + 1] = connectedData[i + 1] // Green
    data[i + 2] = connectedData[i + 2] // Blue
    // Alpha는 그대로 유지
  }

  tempCtx.putImageData(imageData, 0, 0)
  console.log('이미지 전처리 완료')

  return getCanvasImageData(tempCanvas)
}

/**
 * 한글 글자 굵기 정규화 (새로운 알고리즘)
 */
function normalizeStrokeWidth(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data)
  const threshold = 128
  
  // 글자와 배경 구분
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      
      if (gray < threshold) { // 글자 부분
        // 주변 8방향의 글자 밀도 계산
        let strokeCount = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nidx = ((y + dy) * width + (x + dx)) * 4
            const ngray = (data[nidx] + data[nidx + 1] + data[nidx + 2]) / 3
            if (ngray < threshold) strokeCount++
          }
        }
        
        // 글자 굵기 정규화 (너무 얇거나 두꺼운 부분 조정)
        let normalizedValue = 0
        if (strokeCount >= 3) { // 충분히 연결된 글자
          normalizedValue = Math.max(0, gray - 30) // 더 진하게
        } else if (strokeCount >= 1) { // 중간 연결
          normalizedValue = gray
        } else { // 노이즈 가능성
          normalizedValue = Math.min(255, gray + 50) // 더 흐리게
        }
        
        result[idx] = normalizedValue
        result[idx + 1] = normalizedValue
        result[idx + 2] = normalizedValue
      }
    }
  }
  
  return result
}

/**
 * 가우시안 블러 적용 (노이즈 제거) - 강도 조절 가능
 */
function applyGaussianBlur(data: Uint8ClampedArray, width: number, height: number, intensity: number = 1.0): Uint8ClampedArray {
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
      const blurred_r = r / weightSum
      const blurred_g = g / weightSum
      const blurred_b = b / weightSum
      
      // 강도에 따른 블렌딩
      result[idx] = data[idx] * (1 - intensity) + blurred_r * intensity
      result[idx + 1] = data[idx + 1] * (1 - intensity) + blurred_g * intensity
      result[idx + 2] = data[idx + 2] * (1 - intensity) + blurred_b * intensity
    }
  }

  return result
}

/**
 * 한글 특화 적응형 임계값 이진화
 */
function applyKoreanAdaptiveThreshold(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data)
  const blockSize = 21 // 한글용 블록 크기 증가
  const c = 15 // 한글용 상수 조정

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3

      // 주변 영역의 가중 평균 계산 (중앙에 더 높은 가중치)
      let sum = 0, weightSum = 0
      const halfBlock = Math.floor(blockSize / 2)

      for (let by = Math.max(0, y - halfBlock); by <= Math.min(height - 1, y + halfBlock); by++) {
        for (let bx = Math.max(0, x - halfBlock); bx <= Math.min(width - 1, x + halfBlock); bx++) {
          const bidx = (by * width + bx) * 4
          const distance = Math.sqrt((bx - x) * (bx - x) + (by - y) * (by - y))
          const weight = Math.exp(-distance / 5) // 가우시안 가중치
          
          sum += ((data[bidx] + data[bidx + 1] + data[bidx + 2]) / 3) * weight
          weightSum += weight
        }
      }

      const threshold = (sum / weightSum) - c
      const binaryValue = gray > threshold ? 255 : 0

      result[idx] = binaryValue
      result[idx + 1] = binaryValue
      result[idx + 2] = binaryValue
    }
  }

  return result
}

/**
 * 기존 적응형 임계값 이진화 (호환성 유지)
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
 * 한글 특화 모폴로지 연산
 */
function applyKoreanMorphology(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  // 한글 특성에 맞는 연결성 개선
  const result = new Uint8ClampedArray(data)

  // 1차: 수직/수평 연결 강화 (한글 자음/모음 특성)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      const current = data[idx]
      
      if (current === 255) { // 배경 픽셀
        // 수직 연결 검사 (ㅏ, ㅓ, ㅣ 등)
        const top = data[((y - 1) * width + x) * 4]
        const bottom = data[((y + 1) * width + x) * 4]
        if (top === 0 && bottom === 0) {
          result[idx] = 0
          result[idx + 1] = 0
          result[idx + 2] = 0
        }
        
        // 수평 연결 검사 (ㅡ, ㅜ, ㅗ 등)
        const left = data[(y * width + (x - 1)) * 4]
        const right = data[(y * width + (x + 1)) * 4]
        if (left === 0 && right === 0) {
          result[idx] = 0
          result[idx + 1] = 0
          result[idx + 2] = 0
        }
      }
    }
  }

  // 2차: 대각선 연결 강화 (ㅅ, ㅈ, ㅊ 등)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4
      
      if (result[idx] === 255) { // 배경 픽셀
        const topLeft = data[((y - 1) * width + (x - 1)) * 4]
        const topRight = data[((y - 1) * width + (x + 1)) * 4]
        const bottomLeft = data[((y + 1) * width + (x - 1)) * 4]
        const bottomRight = data[((y + 1) * width + (x + 1)) * 4]
        
        // 대각선 패턴 연결
        if ((topLeft === 0 && bottomRight === 0) || (topRight === 0 && bottomLeft === 0)) {
          result[idx] = 128 // 중간 톤으로 연결
          result[idx + 1] = 128
          result[idx + 2] = 128
        }
      }
    }
  }

  return result
}

/**
 * 대비 향상 및 샤프닝
 */
function enhanceContrastAndSharpness(data: Uint8ClampedArray): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data)
  const contrast = 1.5 // 대비 증가
  const sharpness = 0.3 // 샤프닝 강도
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3
    
    // 대비 향상
    let enhanced = (gray - 128) * contrast + 128
    
    // 샤프닝 효과 추가
    enhanced = enhanced + (enhanced - gray) * sharpness
    
    enhanced = Math.min(255, Math.max(0, enhanced))
    
    result[i] = enhanced
    result[i + 1] = enhanced
    result[i + 2] = enhanced
  }
  
  return result
}

/**
 * 한글 글자 연결성 개선
 */
function improveKoreanConnectivity(data: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const result = new Uint8ClampedArray(data)
  
  // 끊어진 글자 연결점 찾기 및 복원
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      const idx = (y * width + x) * 4
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3
      
      if (gray > 200) { // 밝은 부분 (끊어진 가능성)
        // 주변 5x5 영역에서 글자 패턴 분석
        let darkPixels = 0
        let totalPixels = 0
        
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const nidx = ((y + dy) * width + (x + dx)) * 4
            const ngray = (data[nidx] + data[nidx + 1] + data[nidx + 2]) / 3
            if (ngray < 128) darkPixels++
            totalPixels++
          }
        }
        
        // 주변에 충분한 글자가 있으면 연결점으로 판단
        const density = darkPixels / totalPixels
        if (density > 0.4) {
          result[idx] = 64 // 연결점으로 표시
          result[idx + 1] = 64
          result[idx + 2] = 64
        }
      }
    }
  }
  
  return result
}

/**
 * 기존 모폴로지 연산 (호환성 유지)
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