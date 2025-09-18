import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { Collection } from '@/lib/database.types'
import { DeliveryNoteGroup } from './delivery-note-utils'
import { loadNanumGothicFont, loadWebFont } from './korean-font-data'

// 운임료 체계 정의
const shippingRates = {
  사과: { 
    '10kg': 1000, 
    '5kg': 600 
  },
  감: { 
    '10kg': 1100,   // 단감, 대봉, 약시 모두 동일
    '5kg': 700 
  },
  깻잎: { 
    정품: 600,      // 무게 상관없이
    바라: 1000      // 무게 상관없이
  }
} as const

// 운임료 계산 결과 타입
interface ShippingCalculation {
  productType: string
  variety?: string
  weight?: string
  quantity: number
  unitRate: number
  totalAmount: number
  displayText: string
}

// 운임료 계산 함수
const calculateShippingFees = (collections: Collection[]): { 
  calculations: ShippingCalculation[], 
  totalAmount: number 
} => {
  console.log('🚛 운임료 계산 시작 - 컬렉션 개수:', collections.length)
  const calculations: ShippingCalculation[] = []
  
  // 컬렉션을 품목별/규격별로 그룹화
  const groupedData: { [key: string]: { quantity: number, collections: Collection[] } } = {}
  
  collections.forEach(collection => {
    const productType = collection.product_type
    if (!productType) return
    
    let groupKey = ''
    let unitRate = 0
    let displayText = ''
    
    if (productType === '깻잎') {
      // 깻잎은 품종별로 계산 (무게 상관없이)
      const variety = collection.product_variety || '정품'
      groupKey = `${productType}-${variety}`
      unitRate = shippingRates.깻잎[variety as '정품' | '바라'] || 0
      displayText = `${productType} ${variety}`
    } else {
      // 사과, 감은 무게별로 계산
      const weight = collection.box_weight || '10kg'
      groupKey = `${productType}-${weight}`
      
      if (productType === '사과') {
        unitRate = shippingRates.사과[weight as '10kg' | '5kg'] || 0
      } else if (productType === '감') {
        unitRate = shippingRates.감[weight as '10kg' | '5kg'] || 0
      }
      
      displayText = `${productType} ${weight}`
    }
    
    if (!groupedData[groupKey]) {
      groupedData[groupKey] = { quantity: 0, collections: [] }
    }
    
    groupedData[groupKey].quantity += collection.quantity || 0
    groupedData[groupKey].collections.push(collection)
    
    // 첫 번째 컬렉션의 정보를 사용하여 계산 정보 저장
    if (groupedData[groupKey].collections.length === 1) {
      calculations.push({
        productType,
        variety: productType === '깻잎' ? collection.product_variety || undefined : undefined,
        weight: productType !== '깻잎' ? collection.box_weight || undefined : undefined,
        quantity: 0, // 나중에 업데이트
        unitRate,
        totalAmount: 0, // 나중에 업데이트
        displayText
      })
    }
  })
  
  // 계산 결과 업데이트
  Object.entries(groupedData).forEach(([groupKey, data]) => {
    const calculation = calculations.find(calc => {
      if (calc.productType === '깻잎') {
        return `${calc.productType}-${calc.variety}` === groupKey
      } else {
        return `${calc.productType}-${calc.weight}` === groupKey
      }
    })
    
    if (calculation) {
      calculation.quantity = data.quantity
      calculation.totalAmount = data.quantity * calculation.unitRate
    }
  })
  
  // 총 운임료 계산
  const totalAmount = calculations.reduce((sum, calc) => sum + calc.totalAmount, 0)
  
  console.log('🚛 운임료 계산 완료:', {
    calculationsCount: calculations.length,
    calculations: calculations,
    totalAmount: totalAmount
  })
  
  return { calculations, totalAmount }
}

// 날짜 포맷팅 함수
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
}

// PDFLib을 사용한 한글 송품장 생성 - 기존 스타일 복원 + 운임료 올바른 위치
export const generateDeliveryNotePDFLib = async (group: DeliveryNoteGroup): Promise<void> => {
  console.log('🏷️ [PDF-LIB 함수 호출됨] generateDeliveryNotePDFLib 시작 - 그룹:', group.market, group.productType)
  
  try {
    // PDF 문서 생성
    const pdfDoc = await PDFDocument.create()
    
    // FontKit 등록 (커스텀 폰트 사용을 위해 필요)
    pdfDoc.registerFontkit(fontkit)
    
    // A4 페이지 추가
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 크기 (포인트 단위)
    const { width, height } = page.getSize()
    
    // 폰트 로드 전략: 한글 폰트 우선, 실패시 영어 대체
    let font = null
    let useKoreanFont = false
    
    // 기본 폰트 먼저 로드 (항상 성공)
    const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    try {
      // 1순위: 사용자 제공 나눔고딕 폰트 로드 시도
      console.log('📁 사용자 제공 나눔고딕 폰트 로드 시도...')
      const nanumBuffer = await loadNanumGothicFont()
      
      if (nanumBuffer && nanumBuffer.byteLength > 1000) {
        font = await pdfDoc.embedFont(nanumBuffer)
        useKoreanFont = true
        console.log('✅ 사용자 제공 나눔고딕 폰트 로드 성공!')
      } else {
        throw new Error('나눔고딕 폰트 로드 실패, 백업폰트 시도...')
      }
    } catch (error) {
      console.log('⚠️ 나눔고딕 실패, 웹폰트 백업 시도:', error)
      
      try {
        // 2순위: 웹폰트 백업
        const webFontBuffer = await loadWebFont()
        
        if (webFontBuffer && webFontBuffer.byteLength > 1000) {
          font = await pdfDoc.embedFont(webFontBuffer)
          useKoreanFont = true
          console.log('✅ 웹폰트 백업 로드 성공!')
        } else {
          throw new Error('웹폰트 백업도 실패')
        }
      } catch (webError) {
        console.error('❌ 모든 한글 폰트 로드 실패:', webError)
        console.log('영어 대체 모드로 전환합니다.')
        font = fallbackFont
        useKoreanFont = false
      }
    }
    
    // 안전한 텍스트 처리 함수
    const getSafeText = (text: string): string => {
      if (useKoreanFont) {
        return text // 한글 폰트가 있으면 그대로 사용
      } else {
        // 한글 폰트가 없으면 완전 영어 대체
        const koreanToEnglish: { [key: string]: string } = {
          '송 품 장': 'DELIVERY NOTE',
          '출하일시': 'Delivery Date', 
          '밀양산내지소': 'Miryang Branch',
          '수신': 'To',
          '생산자': 'Producer',
          '품명': 'Product',
          '규격': 'Spec',
          '계': 'Total',
          '계좌번호': 'Account',
          '농협': 'NH Bank',
          '강민준 기사': 'Driver: Min Jun Kang',
          'H.P': 'Mobile',
          // 농산물 관련
          '사과': 'Apple',
          '감': 'Persimmon', 
          '깻잎': 'Perilla Leaf',
          '단감': 'Sweet Persimmon',
          '약시': 'Yak-si',
          '대봉': 'Dae-bong',
          '정품': 'Premium',
          '바라': 'Bara'
        }
        
        // 정확히 매치되는 경우
        if (koreanToEnglish[text]) {
          return koreanToEnglish[text]
        }
        
        // 한글이 포함된 경우 한글 제거 후 영문/숫자만 유지
        if (/[가-힣]/.test(text)) {
          const result = text.replace(/[가-힣]/g, ' ').replace(/\s+/g, ' ').trim()
          return result || 'N/A'
        }
        
        return text
      }
    }
    
    // 수학적 중앙 정렬을 위한 헬퍼 함수
    const getCenterX = (text: string, fontSize: number, startX: number, width: number): number => {
      const textWidth = font.widthOfTextAtSize(text, fontSize)
      return startX + (width - textWidth) / 2
    }
    
    // 레이아웃 상수
    const margin = 40
    const contentWidth = width - (margin * 2)
    const deliveryDate = group.collections[0]?.reception_date || new Date().toISOString().split('T')[0]
    
    let yPos = height - 60
    
    // 제목
    const title = getSafeText('송 품 장')
    const titleFontSize = 26
    const titleX = getCenterX(title, titleFontSize, 0, width)
    page.drawText(title, {
      x: titleX,
      y: yPos,
      size: titleFontSize,
      font,
      color: rgb(0, 0, 0)
    })
    yPos -= 50
    
    const fontSize = 14
    
    // 출하일시 및 밀양산내지소
    page.drawText(`${getSafeText('출하일시')}: ${useKoreanFont ? formatDate(deliveryDate) : deliveryDate}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    const officeText = getSafeText('밀양산내지소')
    const officeWidth = font.widthOfTextAtSize(officeText, fontSize)
    page.drawText(officeText, {
      x: width - margin - officeWidth,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    yPos -= 20
    
    // 수신
    page.drawText(`${getSafeText('수신')}: ${getSafeText(group.market)}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    yPos -= 25
    
    // 흑백 프린트 최적화 색상 팔레트 (배경색 제거)
    const designColors = {
      primary: rgb(0, 0, 0),              // 검은색 (강조용)
      secondary: rgb(1, 1, 1),            // 흰색 배경 (배경색 제거)
      border: rgb(0, 0, 0),               // 검은색 테두리
      text: rgb(0, 0, 0),                 // 검은 텍스트
      alternateRow: rgb(1, 1, 1),         // 흰색 (음영 제거)
      headerText: rgb(0, 0, 0)            // 검은 헤더 텍스트
    }
    
    // 통합 테이블 설정 - 데이터, 운임료, 계좌정보를 하나의 테이블로 통합
    const tableStartY = yPos
    const rowHeight = 20  // 15 → 18 → 20으로 증가 (글자 크기에 맞춰 조정)
    const headerHeight = 24  // 20 → 22 → 24로 증가 (글자 크기에 맞춰 조정)
    
    // 컬럼 너비 계산 (8개 컬럼 - 2x4 구조)
    const colWidths = [
      contentWidth * 0.125,  // 생산자 12.5%
      contentWidth * 0.175,  // 품명 17.5%
      contentWidth * 0.1,    // 규격 10%
      contentWidth * 0.1,    // 계 10%
      contentWidth * 0.125,  // 생산자 12.5%
      contentWidth * 0.175,  // 품명 17.5%
      contentWidth * 0.1,    // 규격 10%
      contentWidth * 0.1     // 계 10%
    ]
    
    const tableWidth = contentWidth
    const maxDataRows = 20  // 운임료와 계좌정보를 위한 공간 확보
    
    // 운임료 계산
    const shippingInfo = calculateShippingFees(group.collections)
    const shippingRows = shippingInfo.calculations.filter(c => c.quantity > 0).length
    const totalTableRows = maxDataRows + 1 + 1  // 데이터행 + 운임료통합행 + 계좌정보
    
    console.log('🏗️ 통합 테이블 구조 설계:', {
      dataRows: maxDataRows,
      shippingUnifiedRow: 1,
      accountInfoRow: 1,
      totalRows: totalTableRows
    })
    
    // 테이블 전체 외곽선 먼저 그리기
    const totalTableHeight = (totalTableRows + 1) * rowHeight  // +1 for header
    page.drawRectangle({
      x: margin,
      y: tableStartY - totalTableHeight,
      width: tableWidth,
      height: totalTableHeight,
      borderColor: designColors.border,
      borderWidth: 1
    })
    
    // 테이블 헤더 그리기
    const headerY = tableStartY
    
    // 헤더 배경
    page.drawRectangle({
      x: margin,
      y: headerY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: designColors.secondary,
      borderColor: designColors.border,
      borderWidth: 0.5
    })
    
    // 헤더 텍스트 및 세로선
    const headers = ['생산자', '품명', '규격', '계', '생산자', '품명', '규격', '계'].map(h => getSafeText(h))
    let xPos = margin
    const headerTextSize = 13
    
    for (let i = 0; i < headers.length; i++) {
      const headerX = getCenterX(headers[i], headerTextSize, xPos, colWidths[i])
      page.drawText(headers[i], {
        x: headerX,
        y: headerY - headerHeight/2 - 2,  // 텍스트를 아래로 이동하여 중앙 정렬
        size: headerTextSize,
        font,
        color: designColors.headerText
      })
      
      // 세로선 그리기 (전체 테이블 높이에 걸쳐)
      if (i < headers.length - 1) {
        xPos += colWidths[i]
        page.drawLine({
          start: { x: xPos, y: headerY },
          end: { x: xPos, y: headerY - totalTableHeight },
          color: designColors.border,
          thickness: 0.5
        })
      } else {
        xPos += colWidths[i]
      }
    }
    
    // 데이터 행들
    let currentY = headerY - headerHeight
    const dataTextSize = 13  // 헤더와 동일한 크기 (13)
    
    const leftData = group.collections.slice(0, maxDataRows)
    const rightData = group.collections.slice(maxDataRows, maxDataRows * 2)
    
    console.log('📊 통합 테이블 데이터 렌더링 시작:', {
      maxDataRows: maxDataRows,
      leftDataCount: leftData.length,
      rightDataCount: rightData.length,
      startY: currentY
    })
    
    for (let i = 0; i < maxDataRows; i++) {
      // 행 구분선
      page.drawLine({
        start: { x: margin, y: currentY },
        end: { x: margin + tableWidth, y: currentY },
        color: designColors.border,
        thickness: 0.5
      })
      
      currentY -= rowHeight
      
      // 좌측 데이터
      const leftCells = ['', '', '', '']
      if (leftData[i]) {
        const left = leftData[i]
        leftCells[0] = getSafeText(left.producer_name || '')
        leftCells[1] = left.product_variety 
          ? `${getSafeText(left.product_type || '')}(${getSafeText(left.product_variety)})`
          : getSafeText(left.product_type || '')
        leftCells[2] = left.product_type === '깻잎' && left.product_variety === '정품' ? '-' : left.box_weight || ''
        leftCells[3] = String(left.quantity || 0)
      }
      
      // 우측 데이터
      const rightCells = ['', '', '', '']
      if (rightData[i]) {
        const right = rightData[i]
        rightCells[0] = getSafeText(right.producer_name || '')
        rightCells[1] = right.product_variety 
          ? `${getSafeText(right.product_type || '')}(${getSafeText(right.product_variety)})`
          : getSafeText(right.product_type || '')
        rightCells[2] = right.product_type === '깻잎' && right.product_variety === '정품' ? '-' : right.box_weight || ''
        rightCells[3] = String(right.quantity || 0)
      }
      
      const allCells = [...leftCells, ...rightCells]
      
      // 데이터 출력
      xPos = margin
      for (let j = 0; j < allCells.length; j++) {
        if (allCells[j]) {
          const cellX = getCenterX(allCells[j], dataTextSize, xPos, colWidths[j])
          page.drawText(allCells[j], {
            x: cellX,
            y: currentY + rowHeight/2 - 2,  // 텍스트를 아래로 이동하여 중앙 정렬
            size: dataTextSize,
            font,
            color: designColors.text
          })
        }
        xPos += colWidths[j]
      }
    }
    
    // 운임료 계산 섹션 (통합 테이블 내부 - 셀 병합으로 구현)
    if (shippingInfo.calculations.length > 0) {
      console.log('📋 통합 테이블 내 운임료 섹션 추가 - 셀 병합 방식')
      
      
      
      // 운임료 항목들을 줄바꿈으로 구분하여 표시
      page.drawLine({
        start: { x: margin, y: currentY },
        end: { x: margin + tableWidth, y: currentY },
        color: designColors.border,
        thickness: 0.5
      })
      
      currentY -= rowHeight
      
      const shippingItemSize = 13  // 헤더와 동일한 크기 (13)
      const lineHeight = 15  // 줄 간격
      let textY = currentY + rowHeight - 8  // 시작 Y 위치
      
      // 운임료 행 배경 (높이를 항목 수에 따라 동적 계산)
      const validCalcs = shippingInfo.calculations.filter(c => c.quantity > 0)
      const totalLines = validCalcs.length + 1  // 운임료 항목들 + 총 운임료
      const dynamicRowHeight = totalLines * lineHeight + 10
      
      page.drawRectangle({
        x: margin,
        y: currentY + rowHeight - dynamicRowHeight,
        width: tableWidth,
        height: dynamicRowHeight,
        color: rgb(1, 1, 1),  // 흰색 배경
        borderColor: designColors.border,
        borderWidth: 0.5
      })
      
      // 각 운임료 항목을 개별 줄에 표시
      shippingInfo.calculations.forEach((calc) => {
        if (calc.quantity > 0) {
          const unitText = useKoreanFont 
            ? (calc.productType === '깻잎' && calc.variety === '정품' ? '장' : '박스')
            : (calc.productType === '깻잎' && calc.variety === '정품' ? 'sheets' : 'boxes')
          
          const wonText = useKoreanFont ? '원' : 'KRW'
          const productDisplay = useKoreanFont ? calc.displayText : 
            calc.displayText.replace('사과', 'Apple')
                           .replace('감', 'Persimmon')
                           .replace('깻잎', 'Perilla')
                           .replace('정품', 'Premium')
                           .replace('바라', 'Bara')
          
          const calcText = `${productDisplay}: ${calc.quantity}${unitText} × ${calc.unitRate.toLocaleString()}${wonText} = ${calc.totalAmount.toLocaleString()}${wonText}`
          
          page.drawText(calcText, {
            x: margin + 15,
            y: textY,
            size: shippingItemSize,
            font,
            color: designColors.text
          })
          
          textY -= lineHeight  // 다음 줄로 이동
        }
      })
      
      // 총 운임료를 마지막 줄에 표시
      const wonText = useKoreanFont ? '원' : 'KRW'
      const totalLabel = useKoreanFont ? '총 운임료' : 'Total Shipping'
      const totalText = `${totalLabel}: ${shippingInfo.totalAmount.toLocaleString()}${wonText}`
      
      page.drawText(totalText, {
        x: margin + 15,
        y: textY,
        size: shippingItemSize,
        font,
        color: designColors.text
      })
      
      // currentY를 동적 높이만큼 조정
      currentY = currentY + rowHeight - dynamicRowHeight
    }
    
    // 계좌정보 행 - 3개 셀로 분할 (계좌번호 | 기사명 | 전화번호)
    page.drawLine({
      start: { x: margin, y: currentY },
      end: { x: margin + tableWidth, y: currentY },
      color: designColors.border,
      thickness: 1
    })
    
    currentY -= rowHeight
    
    // 계좌정보 행 배경
    page.drawRectangle({
      x: margin,
      y: currentY,
      width: tableWidth,
      height: rowHeight,
      color: rgb(0.98, 0.98, 0.98),  // 연한 회색 배경
      borderColor: designColors.border,
      borderWidth: 0.5
    })
    
    // 계좌정보를 3개 구역으로 분할
    const accountColWidth1 = tableWidth * 0.4   // 계좌번호 (40%)
    const accountColWidth2 = tableWidth * 0.3   // 기사명 (30%)
    const accountColWidth3 = tableWidth * 0.3   // 전화번호 (30%)
    
    
    // 계좌번호 (첫 번째 셀)
    page.drawText(`${getSafeText('농협')} 356-0724-8964-13 (${getSafeText('강민준')})`, {
      x: margin + 8,
      y: currentY + rowHeight/2 - 2,  // 텍스트를 아래로 이동하여 중앙 정렬
      size: 13,  // 헤더와 동일한 크기 (13)
      font,
      color: designColors.text
    })
    
    
    // 전화번호 (세 번째 셀)
    const phoneText = `${getSafeText('H.P')}: 010-3444-8853`
    const phoneX = getCenterX(phoneText, 13, margin + accountColWidth1 + accountColWidth2, accountColWidth3)  // 헤더와 동일한 크기 (13)
    page.drawText(phoneText, {
      x: phoneX,
      y: currentY + rowHeight/2 - 2,  // 텍스트를 아래로 이동하여 중앙 정렬
      size: 13,  // 헤더와 동일한 크기 (13)
      font,
      color: designColors.text
    })
    
    // PDF 바이트 생성
    const pdfBytes = await pdfDoc.save()
    
    // 다운로드
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = group.fileName
    link.click()
    URL.revokeObjectURL(url)
    
  } catch (error) {
    console.error('PDF 생성 실패:', error)
    throw error
  }
}

// PDF를 blob으로 생성하는 함수 (기존 generateDeliveryNotePDFLib와 동일한 로직, 다운로드 없이)
export const generateDeliveryNotePDFBlob = async (group: DeliveryNoteGroup): Promise<Uint8Array> => {
  try {
    // PDF 문서 생성
    const pdfDoc = await PDFDocument.create()
    
    // FontKit 등록 (커스텀 폰트 사용을 위해 필요)
    pdfDoc.registerFontkit(fontkit)
    
    // A4 페이지 추가
    const page = pdfDoc.addPage([595.28, 841.89]) // A4 크기 (포인트 단위)
    const { width, height } = page.getSize()
    
    // 폰트 로드 전략: 한글 폰트 우선, 실패시 영어 대체
    let font = null
    let useKoreanFont = false
    
    // 기본 폰트 먼저 로드 (항상 성공)
    const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    
    try {
      // 1순위: 사용자 제공 나눔고딕 폰트 로드 시도
      console.log('📁 사용자 제공 나눔고딕 폰트 로드 시도...')
      const nanumBuffer = await loadNanumGothicFont()
      
      if (nanumBuffer && nanumBuffer.byteLength > 1000) {
        font = await pdfDoc.embedFont(nanumBuffer)
        useKoreanFont = true
        console.log('✅ 사용자 제공 나눔고딕 폰트 로드 성공!')
      } else {
        throw new Error('나눔고딕 폰트 로드 실패, 백업폰트 시도...')
      }
    } catch (error) {
      console.log('⚠️ 나눔고딕 실패, 웹폰트 백업 시도:', error)
      
      try {
        // 2순위: 웹폰트 백업
        const webFontBuffer = await loadWebFont()
        
        if (webFontBuffer && webFontBuffer.byteLength > 1000) {
          font = await pdfDoc.embedFont(webFontBuffer)
          useKoreanFont = true
          console.log('✅ 백업 웹폰트 로드 성공!')
        } else {
          throw new Error('백업 웹폰트도 실패')
        }
      } catch (webFontError) {
        console.log('⚠️ 모든 한글 폰트 로드 실패, 영어 폰트 사용:', webFontError)
        font = fallbackFont
        useKoreanFont = false
      }
    }

    // 여기서부터 기존 generateDeliveryNotePDFLib 함수의 로직과 완전히 동일
    const currentDate = new Date()
    const formattedDate = formatDate(currentDate.toISOString())

    // 컬러 정의
    const primaryColor = rgb(0.1, 0.3, 0.2) // 진한 초록
    const headerColor = rgb(0.2, 0.4, 0.3)
    const textColor = rgb(0.1, 0.1, 0.1)
    const lightGray = rgb(0.9, 0.9, 0.9)
    const borderColor = rgb(0.6, 0.6, 0.6)

    // 페이지 배경
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: height,
      color: rgb(1, 1, 1)
    })

    // 헤더 배경 박스
    page.drawRectangle({
      x: 40,
      y: height - 140,
      width: width - 80,
      height: 80,
      color: lightGray,
      borderColor: borderColor,
      borderWidth: 1
    })

    // 메인 제목
    const titleSize = useKoreanFont ? 22 : 20
    const mainTitle = '팜허브 송품장'
    page.drawText(mainTitle, {
      x: 60,
      y: height - 75,
      size: titleSize,
      font: font,
      color: primaryColor
    })

    // 부제목
    const subtitleSize = useKoreanFont ? 12 : 11
    const subtitle = '농산물 수거 관리 시스템'
    page.drawText(subtitle, {
      x: 60,
      y: height - 95,
      size: subtitleSize,
      font: font,
      color: headerColor
    })

    // 날짜 정보 (우측)
    const dateText = `출력일: ${formattedDate}`
    page.drawText(dateText, {
      x: width - 180,
      y: height - 75,
      size: subtitleSize,
      font: font,
      color: textColor
    })

    // 그룹 정보
    const groupInfoY = height - 115
    const marketText = `공판장: ${group.market}`
    const productText = `품목: ${group.productType}`
    
    page.drawText(marketText, {
      x: 60,
      y: groupInfoY,
      size: subtitleSize,
      font: font,
      color: textColor
    })

    page.drawText(productText, {
      x: 250,
      y: groupInfoY,
      size: subtitleSize,
      font: font,
      color: textColor
    })

    // 테이블 시작 위치 - 더 위로 이동하여 공간 활용
    const tableStartY = height - 100
    const rowHeight = 22  // 20 → 22로 증가 (여백 개선)
    const headerHeight = 26  // 25 → 26로 증가 (여백 개선)

    // A4 용지 가득 차게 테이블 크기 확장
    const tableStartX = 40
    const availableWidth = width - 80 // 양쪽 40포인트 여백
    
    console.log('📐 테이블 크기 설정:', {
      pageWidth: width,
      pageHeight: height,
      availableWidth: availableWidth,
      tableStartY: tableStartY,
      tableStartX: tableStartX
    })

    // 테이블 컬럼 정의 - A4 전체 너비 활용
    const columns = [
      { header: '생산자명', width: availableWidth * 0.15, align: 'left' },
      { header: '품목', width: availableWidth * 0.12, align: 'center' },
      { header: '품종', width: availableWidth * 0.12, align: 'center' },
      { header: '수량', width: availableWidth * 0.08, align: 'center' },
      { header: '박스무게', width: availableWidth * 0.10, align: 'center' },
      { header: '지역', width: availableWidth * 0.12, align: 'center' },
      { header: '공판장', width: availableWidth * 0.16, align: 'center' },
      { header: '접수일', width: availableWidth * 0.15, align: 'center' }
    ]

    const tableWidth = availableWidth

    // 테이블 헤더 배경 - 강화된 테두리
    page.drawRectangle({
      x: tableStartX,
      y: tableStartY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: lightGray,
      borderColor: rgb(0, 0, 1), // 파란색 테두리
      borderWidth: 2 // 두꺼운 테두리
    })
    
    console.log('📊 테이블 헤더 렌더링:', {
      x: tableStartX,
      y: tableStartY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      border: 'Blue 2px'
    })

    // 테이블 헤더 텍스트
    let currentX = tableStartX
    const headerTextSize = useKoreanFont ? 10 : 9
    
    columns.forEach(column => {
      page.drawText(column.header, {
        x: currentX + (column.width / 2) - (column.header.length * headerTextSize * 0.3),
        y: tableStartY - headerHeight + 8,
        size: headerTextSize,
        font: font,
        color: primaryColor
      })
      
      // 세로선 그리기 (마지막 컬럼 제외)
      if (currentX !== tableStartX + tableWidth - column.width) {
        page.drawLine({
          start: { x: currentX + column.width, y: tableStartY },
          end: { x: currentX + column.width, y: tableStartY - headerHeight },
          thickness: 1,
          color: borderColor
        })
      }
      
      currentX += column.width
    })

    // 데이터 행들 - A4 가득 채우기 위해 최소 55행 보장
    let currentRowY = tableStartY - headerHeight
    const dataTextSize = useKoreanFont ? 10 : 9  // 헤더와 유사한 크기로 조정
    const minRows = 55 // 추가 증가 (공간 확보로 더 많이 가능)
    const maxRows = Math.max(group.collections.length, minRows)
    
    console.log('📊 테이블 행 설정:', {
      actualDataRows: group.collections.length,
      minRows: minRows,
      finalRowCount: maxRows,
      tableStartY: tableStartY,
      currentRowY: currentRowY
    })

    for (let index = 0; index < maxRows; index++) {
      const collection = group.collections[index] || null // 빈 행도 허용
      currentRowY -= rowHeight
      
      // 행 배경 (교대로 색상 적용)
      if (index % 2 === 1) {
        page.drawRectangle({
          x: tableStartX,
          y: currentRowY,
          width: tableWidth,
          height: rowHeight,
          color: rgb(0.98, 0.98, 0.98)
        })
      }
      
      // 행 테두리
      page.drawRectangle({
        x: tableStartX,
        y: currentRowY,
        width: tableWidth,
        height: rowHeight,
        borderColor: borderColor,
        borderWidth: 0.5
      })

      // 데이터 준비 - 빈 행도 처리
      const rowData = collection ? [
        collection.producer_name || '-',
        collection.product_type || '-',
        collection.product_variety || '-',
        collection.product_type === '깻잎' && collection.product_variety === '정품' 
          ? `${collection.quantity || 0}장`
          : `${collection.quantity || 0}박스`,
        collection.product_type === '깻잎' && collection.product_variety === '정품' ? '-' : (collection.box_weight || '-'),
        collection.region || '-',
        collection.market || '-',
        collection.reception_date ? formatDate(collection.reception_date) : '-'
      ] : ['-', '-', '-', '-', '-', '-', '-', '-'] // 빈 행 데이터

      // 데이터 출력
      currentX = tableStartX
      columns.forEach((column, colIndex) => {
        const cellData = rowData[colIndex] || '-'
        let textX = currentX + 5 // 기본 왼쪽 정렬
        
        if (column.align === 'center') {
          textX = currentX + (column.width / 2) - (String(cellData).length * dataTextSize * 0.3)
        }
        
        page.drawText(String(cellData), {
          x: textX,
          y: currentRowY + 8,
          size: dataTextSize,
          font: font,
          color: textColor
        })
        
        currentX += column.width
      })
    }

    // 테이블 하단 테두리
    const tableBottomY = currentRowY
    page.drawLine({
      start: { x: tableStartX, y: tableBottomY },
      end: { x: tableStartX + tableWidth, y: tableBottomY },
      thickness: 1,
      color: borderColor
    })

    // 운임료 계산 섹션 추가 - 고정 위치 사용
    const shippingInfo = calculateShippingFees(group.collections)
    
    // 페이지 하단에서 고정 위치 (250포인트 위로 상향 이동)
    const shippingY = 250
    
    console.log('🎯 운임료 섹션 고정 위치 설정:', {
      pageHeight: height,
      tableBottomY: tableBottomY,
      shippingFixedY: shippingY,
      distanceFromBottom: shippingY
    })
    
    console.log('📋 PDF 운임료 섹션 진입:', {
      pageHeight: height,
      tableBottomY: tableBottomY,
      fixedShippingY: shippingY,
      calculationsLength: shippingInfo.calculations.length,
      totalAmount: shippingInfo.totalAmount
    })
    
    if (shippingInfo.calculations.length > 0) {
      console.log('📋 운임료 계산 내역 렌더링 시작')
      
      let currentShippingY = shippingY // 고정 위치에서 시작
      
      // 운임료 섹션 배경 박스 계산
      const sectionHeight = 25 + (shippingInfo.calculations.filter(c => c.quantity > 0).length * 18) + 15 + 25 + 10
      
      // 운임료 섹션 배경 박스 - 강화된 가시성
      page.drawRectangle({
        x: tableStartX - 10,
        y: currentShippingY - sectionHeight + 25,
        width: tableWidth + 20,
        height: sectionHeight,
        color: rgb(1, 1, 0.8), // 연한 노란색 배경으로 변경
        borderColor: rgb(1, 0, 0), // 빨간 테두리로 변경
        borderWidth: 3 // 두꺼운 테두리
      })
      
      console.log('🟡 운임료 배경 박스 렌더링:', {
        x: tableStartX - 10,
        y: currentShippingY - sectionHeight + 25,
        width: tableWidth + 20,
        height: sectionHeight,
        color: 'Yellow Background',
        border: 'Red 3px'
      })
      
      // 운임료 계산 제목
      const shippingTitleSize = useKoreanFont ? 12 : 11
      const shippingTitle = useKoreanFont ? '운임료 계산:' : 'Shipping Fees:'
      page.drawText(shippingTitle, {
        x: tableStartX,
        y: currentShippingY,
        size: shippingTitleSize,
        font: font,
        color: primaryColor
      })
      
      currentShippingY -= 25
      
      // 각 운임료 항목 표시
      const shippingItemSize = useKoreanFont ? 11 : 10  // 헤더와 유사한 크기로 조정
      shippingInfo.calculations.forEach((calc) => {
        if (calc.quantity > 0) {
          const unitText = useKoreanFont 
            ? (calc.productType === '깻잎' && calc.variety === '정품' ? '장' : '박스')
            : (calc.productType === '깻잎' && calc.variety === '정품' ? 'sheets' : 'boxes')
          
          const wonText = useKoreanFont ? '원' : 'KRW'
          const productDisplay = useKoreanFont ? calc.displayText : 
            calc.displayText.replace('사과', 'Apple')
                           .replace('감', 'Persimmon')
                           .replace('깻잎', 'Perilla')
                           .replace('정품', 'Premium')
                           .replace('바라', 'Bara')
          
          const calcText = `${productDisplay}: ${calc.quantity}${unitText} × ${calc.unitRate.toLocaleString()}${wonText} = ${calc.totalAmount.toLocaleString()}${wonText}`
          
          console.log('📋 운임료 항목 렌더링:', calcText, 'at Y:', currentShippingY)
          
          page.drawText(calcText, {
            x: tableStartX + 20,
            y: currentShippingY,
            size: shippingItemSize,
            font: font,
            color: textColor
          })
          
          currentShippingY -= 18
        }
      })
      
      // 구분선
      page.drawLine({
        start: { x: tableStartX, y: currentShippingY - 5 },
        end: { x: tableStartX + 300, y: currentShippingY - 5 },
        thickness: 1,
        color: borderColor
      })
      
      currentShippingY -= 15
      
      // 총 운임료
      const totalShippingSize = useKoreanFont ? 12 : 11
      const wonText = useKoreanFont ? '원' : 'KRW'
      const totalLabel = useKoreanFont ? '총 운임료:' : 'Total Shipping:'
      const totalText = `${totalLabel} ${shippingInfo.totalAmount.toLocaleString()}${wonText}`
      
      console.log('📋 총 운임료 렌더링:', totalText, 'at Y:', currentShippingY)
      
      page.drawText(totalText, {
        x: tableStartX,
        y: currentShippingY,
        size: totalShippingSize,
        font: font,
        color: primaryColor
      })
      
      currentShippingY -= 30
    }

    // 요약 정보 박스 (운임료 섹션 아래로 이동)
    const summaryY = 120 // 페이지 하단 고정 위치
    const totalItems = group.collections.length
    const totalBoxes = group.collections.reduce((sum, item) => {
      if (item.product_type === '깻잎' && item.product_variety === '정품') {
        return sum // 깻잎 정품은 박스 수량에서 제외
      }
      return sum + (item.quantity || 0)
    }, 0)

    // 요약 박스 배경
    page.drawRectangle({
      x: tableStartX + tableWidth - 200,
      y: summaryY,
      width: 200,
      height: 40,
      color: lightGray,
      borderColor: borderColor,
      borderWidth: 1
    })

    const summaryTextSize = useKoreanFont ? 11 : 10
    page.drawText(`총 접수 건수: ${totalItems}건`, {
      x: tableStartX + tableWidth - 190,
      y: summaryY + 22,
      size: summaryTextSize,
      font: font,
      color: primaryColor
    })

    if (totalBoxes > 0) {
      page.drawText(`총 박스 수량: ${totalBoxes}박스`, {
        x: tableStartX + tableWidth - 190,
        y: summaryY + 8,
        size: summaryTextSize,
        font: font,
        color: primaryColor
      })
    }

    // 하단 정보
    const footerY = 60
    const footerTextSize = useKoreanFont ? 9 : 8
    
    page.drawText('본 송품장은 팜허브 농산물 수거관리 시스템에서 자동 생성되었습니다.', {
      x: 60,
      y: footerY,
      size: footerTextSize,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    })
    
    // PDF 바이트 생성 후 반환 (다운로드하지 않음)
    return await pdfDoc.save()
  } catch (error) {
    console.error('PDF Blob 생성 오류:', error)
    throw error
  }
}

// 선택된 그룹들을 브라우저에서 미리보기로 보여주기
export const previewSelectedDeliveryNotesPDF = async (selectedGroups: DeliveryNoteGroup[]) => {
  try {
    if (selectedGroups.length === 0) {
      return { success: false, message: '선택된 그룹이 없습니다.' }
    }
    
    // 각 그룹별로 새 탭에서 미리보기 열기
    for (const group of selectedGroups) {
      const pdfBytes = await generateDeliveryNotePDFBlob(group)
      
      // PDF Blob 생성
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      
      // 새 탭에서 PDF 미리보기 열기
      const newWindow = window.open(url, '_blank')
      if (newWindow) {
        newWindow.document.title = `송품장 - ${group.market} (${group.productType})`
      }
      
      // 메모리 정리를 위해 URL 해제 (약간의 지연 후)
      setTimeout(() => URL.revokeObjectURL(url), 10000)
      
      // 여러 그룹일 때 간격 두기
      if (selectedGroups.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    }
    
    return { 
      success: true, 
      message: `선택한 ${selectedGroups.length}개 그룹의 송품장을 새 탭에서 열었습니다.`,
      groups: selectedGroups.map(g => ({ market: g.market, productType: g.productType }))
    }
  } catch (error) {
    console.error('송품장 미리보기 오류:', error)
    return { success: false, error, message: '송품장 미리보기 중 오류가 발생했습니다.' }
  }
}

// 기존 다운로드 함수도 유지 (필요시 사용)
export const downloadSelectedDeliveryNotesPDFLib = async (selectedGroups: DeliveryNoteGroup[]) => {
  console.log('🏷️ [PDF-LIB 다운로드 함수 호출됨] downloadSelectedDeliveryNotesPDFLib 시작 - 그룹 수:', selectedGroups.length)
  
  try {
    if (selectedGroups.length === 0) {
      return { success: false, message: '선택된 그룹이 없습니다.' }
    }
    
    for (const group of selectedGroups) {
      await generateDeliveryNotePDFLib(group)
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return { 
      success: true, 
      message: `선택한 ${selectedGroups.length}개 그룹의 송품장이 다운로드되었습니다.`,
      groups: selectedGroups.map(g => ({ market: g.market, productType: g.productType }))
    }
  } catch (error) {
    console.error('송품장 생성 오류:', error)
    return { success: false, error, message: '송품장 생성 중 오류가 발생했습니다.' }
  }
}