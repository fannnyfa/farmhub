import jsPDF from 'jspdf'
import { Collection } from '@/lib/database.types'
import { DeliveryNoteGroup } from './delivery-note-utils'

// 운임료 체계 정의 (pdf-lib-utils.ts와 동일)
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

// 운임료 계산 함수 (pdf-lib-utils.ts와 동일)
const calculateShippingFees = (collections: Collection[]): { 
  calculations: ShippingCalculation[], 
  totalAmount: number 
} => {
  console.log('🚛 [jsPDF] 운임료 계산 시작 - 컬렉션 개수:', collections.length)
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
  
  console.log('🚛 [jsPDF] 운임료 계산 완료:', {
    calculationsCount: calculations.length,
    calculations: calculations,
    totalAmount: totalAmount
  })
  
  return { calculations, totalAmount }
}

// 한글 텍스트를 그대로 유지 (PDF 생성 시 문제가 있을 수 있지만 시도)
const getDisplayText = (text: string) => {
  // 원본 텍스트 그대로 반환 (한글 유지)
  return text
}

// 날짜 포맷팅 함수 - 한글 형식
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
}

// jsPDF를 사용한 송품장 생성
export const generateDeliveryNotePDF = async (group: DeliveryNoteGroup): Promise<void> => {
  console.log('🏷️ [jsPDF 함수 호출됨] generateDeliveryNotePDF 시작 - 그룹:', group.market, group.productType)
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // 기본 폰트 설정 (jsPDF는 한글을 지원하지 않으므로 영어 대체 사용)
  pdf.setFont('helvetica', 'normal')
  console.log('jsPDF 한글 미지원으로 영어 대체 텍스트 사용')

  const deliveryDate = group.collections[0]?.reception_date || new Date().toISOString().split('T')[0]
  
  // A4 페이지 크기 (210mm x 297mm)
  const pageWidth = 210
  const margin = 15
  const contentWidth = pageWidth - (margin * 2)
  
  // 제목 - 항상 영어로 표시
  pdf.setFontSize(20)
  const title = getDisplayText('송 품 장')
  const titleWidth = pdf.getTextWidth(title)
  pdf.text(title, (pageWidth - titleWidth) / 2, 30)
  
  // 기본 폰트 크기와 스타일 설정
  pdf.setFontSize(12)
  
  let yPos = 50
  
  // 출하일시 및 밀양산내지소 - 항상 영어로 표시
  const dateText = `${getDisplayText('출하일시')}: ${formatDate(deliveryDate)}`
  const officeText = getDisplayText('밀양산내지소')
  
  pdf.text(dateText, margin, yPos)
  pdf.text(officeText, pageWidth - margin - pdf.getTextWidth(officeText), yPos)
  yPos += 10
  
  // 수신 - 항상 영어로 표시
  const receiverText = `${getDisplayText('수신')}: ${group.market}`
  pdf.text(receiverText, margin, yPos)
  yPos += 15
  
  // 테이블 헤더 - 중앙 정렬을 위한 정확한 계산
  const totalTableWidth = contentWidth
  const colWidths = [
    totalTableWidth * 0.125,  // 생산자 12.5%
    totalTableWidth * 0.175,  // 품명 17.5%
    totalTableWidth * 0.1,    // 규격 10%
    totalTableWidth * 0.1,    // 계 10%
    totalTableWidth * 0.125,  // 생산자 12.5%
    totalTableWidth * 0.175,  // 품명 17.5%
    totalTableWidth * 0.1,    // 규격 10%
    totalTableWidth * 0.1     // 계 10%
  ]
  const headerTexts = ['생산자', '품명', '규격', '계', '생산자', '품명', '규격', '계']
  const headers = headerTexts.map(h => getDisplayText(h))
  
  // 테이블 선 그리기 함수 - 정확한 좌표 계산
  const drawTableLines = (startY: number, rows: number) => {
    const rowHeight = 10 // 각 행 높이 8mm → 10mm로 증가 (여백 개선)
    const tableHeight = rows * rowHeight
    const tableEndX = margin + totalTableWidth
    
    // 세로선들 - 정확한 누적 좌표 계산
    let xPos = margin
    for (let i = 0; i <= colWidths.length; i++) {
      pdf.line(xPos, startY, xPos, startY + tableHeight)
      if (i < colWidths.length) {
        xPos += colWidths[i]
      }
    }
    
    // 가로선들 - 정확한 시작점과 끝점
    for (let i = 0; i <= rows; i++) {
      const yLine = startY + (i * rowHeight)
      pdf.line(margin, yLine, tableEndX, yLine)
    }
  }
  
  // 헤더 그리기
  pdf.setFontSize(11)
  
  // 헤더 텍스트 중앙 정렬 - 정확한 계산
  let xPos = margin
  for (let i = 0; i < headers.length; i++) {
    const cellWidth = colWidths[i]
    const cellCenter = xPos + (cellWidth / 2)
    const textWidth = pdf.getTextWidth(headers[i])
    const textX = cellCenter - (textWidth / 2)
    const textY = yPos + 7.5 // 수직 중앙 정렬 (행 높이 10mm에서 아래로 조정)
    
    pdf.text(headers[i], textX, textY)
    xPos += cellWidth
  }
  
  yPos += 10  // 8 → 10으로 변경 (행 높이와 일치)
  
  // 데이터 행들
  pdf.setFontSize(11)  // 헤더와 동일한 크기 (11)
  
  const maxRows = 10
  const leftData = group.collections.slice(0, maxRows)
  const rightData = group.collections.slice(maxRows, maxRows * 2)
  
  for (let i = 0; i < maxRows; i++) {
    const leftCollection = leftData[i]
    const rightCollection = rightData[i]
    
    // 좌측 데이터 - 한글을 영어로 변환
    const leftCells = ['', '', '', '']
    if (leftCollection) {
      leftCells[0] = getDisplayText(leftCollection.producer_name || '')
      
      const productType = getDisplayText(leftCollection.product_type || '')
      const productVariety = leftCollection.product_variety ? getDisplayText(leftCollection.product_variety) : ''
      leftCells[1] = productVariety ? `${productType}(${productVariety})` : productType
      
      leftCells[2] = leftCollection.product_type === '깻잎' && leftCollection.product_variety === '정품'
        ? '-'
        : leftCollection.box_weight || ''
      leftCells[3] = String(leftCollection.quantity || 0)
    }
    
    // 우측 데이터 - 한글을 영어로 변환
    const rightCells = ['', '', '', '']
    if (rightCollection) {
      rightCells[0] = getDisplayText(rightCollection.producer_name || '')
      
      const productType = getDisplayText(rightCollection.product_type || '')
      const productVariety = rightCollection.product_variety ? getDisplayText(rightCollection.product_variety) : ''
      rightCells[1] = productVariety ? `${productType}(${productVariety})` : productType
      
      rightCells[2] = rightCollection.product_type === '깻잎' && rightCollection.product_variety === '정품'
        ? '-'
        : rightCollection.box_weight || ''
      rightCells[3] = String(rightCollection.quantity || 0)
    }
    
    // 셀 데이터 그리기 - 정확한 중앙 정렬
    xPos = margin
    const allCells = [...leftCells, ...rightCells]
    
    for (let j = 0; j < allCells.length; j++) {
      const cellText = allCells[j]
      if (cellText) {
        const cellWidth = colWidths[j]
        const cellCenter = xPos + (cellWidth / 2)
        const textWidth = pdf.getTextWidth(cellText)
        const textX = cellCenter - (textWidth / 2)
        const textY = yPos + 7.5 // 수직 중앙 정렬 (행 높이 10mm에서 아래로 조정)
        
        pdf.text(cellText, textX, textY)
      }
      xPos += colWidths[j]
    }
    
    yPos += 10  // 8 → 10으로 변경 (행 높이와 일치)
  }
  
  // 테이블 선 그리기 - 헤더 포함
  const tableStartY = yPos - (maxRows + 1) * 10 // 헤더 + 데이터 행들 (행 높이 변경에 따라 8 → 10)
  drawTableLines(tableStartY, maxRows + 1)
  
  yPos += 15
  
  // 운임료 계산 섹션 추가
  const shippingInfo = calculateShippingFees(group.collections)
  
  console.log('📋 [jsPDF] PDF 운임료 섹션 진입:', {
    yPos: yPos,
    calculationsLength: shippingInfo.calculations.length,
    totalAmount: shippingInfo.totalAmount
  })
  
  if (shippingInfo.calculations.length > 0) {
    console.log('📋 [jsPDF] 운임료 계산 내역 렌더링 시작')
    
    // 운임료 계산 제목
    pdf.setFontSize(12)
    pdf.text(getDisplayText('운임료 계산:'), margin, yPos)
    yPos += 10
    
    // 각 운임료 항목 표시
    pdf.setFontSize(11)  // 헤더와 동일한 크기 (11)
    shippingInfo.calculations.forEach((calc) => {
      if (calc.quantity > 0) {
        const unitText = calc.productType === '깻잎' && calc.variety === '정품' ? getDisplayText('장') : getDisplayText('박스')
        const calcText = `${getDisplayText(calc.displayText)}: ${calc.quantity}${unitText} × ${calc.unitRate.toLocaleString()}${getDisplayText('원')} = ${calc.totalAmount.toLocaleString()}${getDisplayText('원')}`
        
        console.log('📋 [jsPDF] 운임료 항목 렌더링:', calcText, 'at Y:', yPos)
        
        pdf.text(calcText, margin + 10, yPos)
        yPos += 10  // 8 → 10으로 변경 (행 높이와 일치)
      }
    })
    
    // 구분선
    pdf.line(margin, yPos + 2, margin + 200, yPos + 2)
    yPos += 10
    
    // 총 운임료
    pdf.setFontSize(12)
    const totalText = `${getDisplayText('총 운임료')}: ${shippingInfo.totalAmount.toLocaleString()}${getDisplayText('원')}`
    
    console.log('📋 [jsPDF] 총 운임료 렌더링:', totalText, 'at Y:', yPos)
    
    pdf.text(totalText, margin, yPos)
    yPos += 20
  }
  
  // 계좌번호 및 기사 정보 - 헤더와 동일한 크기로 설정
  pdf.setFontSize(11)  // 헤더와 동일한 크기 (11)
  const accountText = `${getDisplayText('계좌번호')}: ${getDisplayText('농협')} 356-0724-8964-13 (Min Jun Kang)`
  const driverText = getDisplayText('강민준 기사')
  const phoneText = `${getDisplayText('H.P')}: 010-3444-8853`
  
  pdf.text(accountText, margin, yPos)
  pdf.text(driverText, pageWidth - margin - pdf.getTextWidth(driverText), yPos)
  yPos += 10  // 8 → 10으로 변경 (행 높이와 일치)
  pdf.text(phoneText, pageWidth - margin - pdf.getTextWidth(phoneText), yPos)
  
  // PDF 저장
  pdf.save(group.fileName)
}

// 선택된 그룹들을 jsPDF로 출력
export const downloadSelectedDeliveryNotes = async (selectedGroups: DeliveryNoteGroup[]) => {
  console.log('🏷️ [jsPDF 다운로드 함수 호출됨] downloadSelectedDeliveryNotes 시작 - 그룹 수:', selectedGroups.length)
  
  try {
    if (selectedGroups.length === 0) {
      return { success: false, message: '선택된 그룹이 없습니다.' }
    }
    
    // 각 그룹별로 PDF 생성 및 다운로드
    for (const group of selectedGroups) {
      await generateDeliveryNotePDF(group)
      
      // 각 파일 다운로드 사이에 약간의 지연
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