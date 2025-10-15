import { CollectionInsert } from './database.types'

export interface FieldMatch {
  field: keyof CollectionInsert
  value: string | number
  confidence: number
  source: string
}

/**
 * 인식된 텍스트를 폼 필드에 매칭하는 스마트 매칭 함수
 * @param recognizedText OCR로 인식된 텍스트
 * @returns 매칭된 필드들의 배열
 */
export function matchTextToFields(recognizedText: string): FieldMatch[] {
  const matches: FieldMatch[] = []
  const lines = recognizedText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line)

  // 각 라인별로 패턴 매칭
  lines.forEach(line => {
    const lineMatches = analyzeTextLine(line)
    matches.push(...lineMatches)
  })

  // 전체 텍스트에서 한 번 더 매칭 (줄바꿈으로 분리된 정보 처리)
  const globalMatches = analyzeTextLine(recognizedText.replace(/\n/g, ' '))
  matches.push(...globalMatches)

  // 중복 제거 및 신뢰도 순 정렬
  const uniqueMatches = removeDuplicates(matches)
  return uniqueMatches.sort((a, b) => b.confidence - a.confidence)
}

/**
 * 단일 텍스트 라인을 분석하여 필드 매칭
 */
function analyzeTextLine(line: string): FieldMatch[] {
  const matches: FieldMatch[] = []

  // 1. 생산자명 패턴 (한글 이름)
  const namePatterns = [
    /^([가-힣]{2,4})$/,           // 순수 한글 이름
    /([가-힣]{2,4})\s*님?/,       // 이름 + 님
    /생산자\s*:?\s*([가-힣]{2,4})/, // "생산자: 김철수"
  ]

  namePatterns.forEach(pattern => {
    const match = line.match(pattern)
    if (match) {
      matches.push({
        field: 'producer_name',
        value: match[1] || match[0],
        confidence: 0.9,
        source: line
      })
    }
  })

  // 2. 품목 패턴
  const productPatterns = [
    { pattern: /사과/, value: '사과', confidence: 0.95 },
    { pattern: /감(?!사)/, value: '감', confidence: 0.9 }, // "감사"는 제외
    { pattern: /깻잎|께잎/, value: '깻잎', confidence: 0.9 },
  ]

  productPatterns.forEach(({ pattern, value, confidence }) => {
    if (pattern.test(line)) {
      matches.push({
        field: 'product_type',
        value,
        confidence,
        source: line
      })
    }
  })

  // 3. 품종 패턴 (감, 깻잎)
  const varietyPatterns = [
    { pattern: /단감/, value: '단감', confidence: 0.9 },
    { pattern: /약시/, value: '약시', confidence: 0.9 },
    { pattern: /대봉/, value: '대봉', confidence: 0.9 },
    { pattern: /정품/, value: '정품', confidence: 0.85 },
    { pattern: /바라/, value: '바라', confidence: 0.85 },
  ]

  varietyPatterns.forEach(({ pattern, value, confidence }) => {
    if (pattern.test(line)) {
      matches.push({
        field: 'product_variety',
        value,
        confidence,
        source: line
      })
    }
  })

  // 4. 무게 패턴
  const weightPatterns = [
    { pattern: /10\s*kg|10키로/, value: '10kg', confidence: 0.95 },
    { pattern: /5\s*kg|5키로/, value: '5kg', confidence: 0.95 },
    { pattern: /3\.?5\s*kg/, value: '3.5kg', confidence: 0.9 },
    { pattern: /4\.?5\s*kg/, value: '4.5kg', confidence: 0.9 },
    { pattern: /3\s*kg/, value: '3kg', confidence: 0.9 },
    { pattern: /4\s*kg/, value: '4kg', confidence: 0.9 },
  ]

  weightPatterns.forEach(({ pattern, value, confidence }) => {
    if (pattern.test(line)) {
      matches.push({
        field: 'box_weight',
        value,
        confidence,
        source: line
      })
    }
  })

  // 5. 수량 패턴
  const quantityPatterns = [
    /(\d+)\s*박스/,              // "50박스"
    /(\d+)\s*개/,                // "30개"
    /수량\s*:?\s*(\d+)/,         // "수량: 50"
    /^(\d+)$/,                   // 순수 숫자만 (낮은 신뢰도)
  ]

  quantityPatterns.forEach((pattern, index) => {
    const match = line.match(pattern)
    if (match) {
      const confidence = index === quantityPatterns.length - 1 ? 0.6 : 0.85
      matches.push({
        field: 'quantity',
        value: parseInt(match[1]),
        confidence,
        source: line
      })
    }
  })

  // 6. 공판장 패턴
  const marketPatterns = [
    { pattern: /부산청과/, value: '부산청과', region: '남구', confidence: 0.95 },
    { pattern: /반여농협공판장|반여농협/, value: '반여농협공판장', region: '해운대구', confidence: 0.95 },
    { pattern: /항도청과/, value: '항도청과', region: '서구', confidence: 0.95 },
    { pattern: /중앙청과/, value: '중앙청과', region: '동구', confidence: 0.95 },
    { pattern: /엄궁농협공판장|엄궁농협/, value: '엄궁농협공판장', region: '엄궁동', confidence: 0.95 },
    { pattern: /동부청과/, value: '동부청과', region: '동래구', confidence: 0.95 },
  ]

  marketPatterns.forEach(({ pattern, value, region, confidence }) => {
    if (pattern.test(line)) {
      matches.push(
        {
          field: 'market',
          value,
          confidence,
          source: line
        },
        {
          field: 'region',
          value: region,
          confidence: confidence * 0.9, // 지역은 공판장보다 약간 낮은 신뢰도
          source: line
        }
      )
    }
  })

  return matches
}

/**
 * 중복된 매칭 제거 (같은 필드에 대해 가장 높은 신뢰도만 유지)
 */
function removeDuplicates(matches: FieldMatch[]): FieldMatch[] {
  const fieldMap = new Map<keyof CollectionInsert, FieldMatch>()

  matches.forEach(match => {
    const existing = fieldMap.get(match.field)
    if (!existing || match.confidence > existing.confidence) {
      fieldMap.set(match.field, match)
    }
  })

  return Array.from(fieldMap.values())
}

/**
 * 매칭 결과를 사용자 친화적인 메시지로 변환
 */
export function generateMatchMessage(match: FieldMatch): string {
  const fieldNames: Partial<Record<keyof CollectionInsert, string>> = {
    producer_name: '생산자명',
    reception_date: '접수일',
    product_type: '품목',
    product_variety: '품종',
    quantity: '수량',
    box_weight: '무게',
    region: '지역',
    market: '공판장',
    user_id: '사용자ID',
    status: '상태',
  }

  const fieldName = fieldNames[match.field] || match.field
  const confidenceText = match.confidence >= 0.9 ? '확실' : 
                        match.confidence >= 0.7 ? '추정' : '가능성'

  return `${fieldName}: ${match.value} (${confidenceText})`
}

/**
 * 매칭된 필드들을 폼 데이터 형태로 변환
 */
export function matchesToFormData(matches: FieldMatch[]): Partial<CollectionInsert> {
  const formData: Partial<CollectionInsert> = {}

  matches.forEach(match => {
    if (match.confidence >= 0.6) { // 신뢰도 60% 이상만 적용
      // TypeScript-safe property assignment
      if (match.field in formData || match.field === 'producer_name' || match.field === 'reception_date' || 
          match.field === 'product_type' || match.field === 'product_variety' || match.field === 'quantity' || 
          match.field === 'box_weight' || match.field === 'region' || match.field === 'market' || 
          match.field === 'user_id' || match.field === 'status') {
        formData[match.field] = match.value as never
      }
    }
  })

  return formData
}