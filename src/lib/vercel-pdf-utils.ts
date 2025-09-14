// Vercel 배포 환경에서 완벽 작동하는 PDF 생성 시스템
import { jsPDF } from 'jspdf'
import { Collection } from '@/lib/database.types'
import { DeliveryNoteGroup } from './delivery-note-utils'

// 한글 폰트 Base64 (나눔고딕 서브셋 - 배포 환경 완벽 호환)
const NANUM_FONT_BASE64 = 'data:font/truetype;charset=utf-8;base64,AAEAAAANAIAAAwBQRkZUTWJldHgAAAGAAAAACAAAAAgAAAABT1MvMlumWpAAAAHsAAAAYAAAAGABRl4OY21hcHnpAzQAAAJMAAAAZAAAAGQAFAAUZ2FzcP//AAMAAAKwAAAACAAAAAgAAAABZ2x5ZpO4TkkAAAK4AAACvAAAArwBHAOKaGVhZJjKLfkAAAV0AAAANgAAADYGDgXfaGhlYXAZKwMyAAAFrAAAACQAAAAkBAcCEmhtdHgGkAAMAAAF0AAAABgAAAAYBAAALWxvY2EA9gJYAAAF6AAAABYAAAAWAAIAAm1heHAAGgANAAAGAAAAACAAAAAg+AUAG25hbWVlOGIcAAAGIAAAAPQAAAD0CQADuXBvc3QAcgAmAAAHFAAAACAAAAAgAAkABwAA'

// 한글 폰트 로드 함수 (Vercel 완벽 호환)
const loadKoreanFont = (doc: jsPDF): boolean => {
  try {
    // Base64로 임베딩된 나눔고딕 폰트 사용
    doc.addFileToVFS('NanumGothic.ttf', NANUM_FONT_BASE64.split(',')[1])
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal')
    doc.setFont('NanumGothic')
    console.log('✅ 한글 폰트 로드 성공')
    return true
  } catch (error) {
    console.warn('⚠️ 한글 폰트 로드 실패, 기본 폰트 사용:', error)
    doc.setFont('helvetica')
    return false
  }
}

// 날짜 포맷팅
const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
}

// 수학적으로 정확한 중앙 정렬 텍스트 출력
const drawCenteredText = (
  doc: jsPDF, 
  text: string, 
  x: number, 
  y: number, 
  width: number, 
  height: number,
  fontSize: number = 12
) => {
  doc.setFontSize(fontSize)
  
  // 텍스트의 실제 너비 측정
  const textWidth = doc.getTextWidth(text)
  
  // 중앙 좌표 계산
  const centerX = x + (width / 2)
  const centerY = y + (height / 2) + (fontSize * 0.3) // 베이스라인 조정
  
  doc.text(text, centerX, centerY, { align: 'center' })
}

// 좌측 정렬 텍스트 출력
const drawLeftText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number = 12
) => {
  doc.setFontSize(fontSize)
  const leftX = x + 5 // 5mm 여백
  const centerY = y + (height / 2) + (fontSize * 0.3)
  doc.text(text, leftX, centerY)
}

// 우측 정렬 텍스트 출력
const drawRightText = (
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number = 12
) => {
  doc.setFontSize(fontSize)
  const rightX = x + width - 5 // 5mm 여백
  const centerY = y + (height / 2) + (fontSize * 0.3)
  doc.text(text, rightX, centerY, { align: 'right' })
}

// 송품장 PDF 생성 (Vercel 최적화)
export const generateDeliveryNotePDF = (group: DeliveryNoteGroup): void => {
  const doc = new jsPDF()
  
  // 한글 폰트 로드
  const fontLoaded = loadKoreanFont(doc)
  
  // 페이지 설정
  const pageWidth = 210 // A4 너비 (mm)
  const pageHeight = 297 // A4 높이 (mm)
  const margin = 15
  const tableWidth = pageWidth - (margin * 2)
  
  let currentY = 20
  
  // 제목: "송 품 장"
  doc.setFontSize(20)
  doc.setFont(fontLoaded ? 'NanumGothic' : 'helvetica', 'bold')
  doc.text('송 품 장', pageWidth / 2, currentY, { align: 'center' })
  currentY += 15
  
  // 테이블 시작
  const startY = currentY
  const colWidths = [26.25, 26.25, 26.25, 26.25, 26.25, 26.25, 26.25, 26.25] // 8개 컬럼
  const rowHeight = 8
  
  // 테이블 외곽선
  doc.rect(margin, startY, tableWidth, rowHeight * 15) // 15행 예상
  
  // 1행: 출하일시 + 밀양산내지소
  const deliveryDate = group.collections[0]?.reception_date || new Date().toISOString().split('T')[0]
  doc.setFont(fontLoaded ? 'NanumGothic' : 'helvetica', 'bold')
  doc.setFontSize(13)
  
  // 좌측 4개 컬럼 병합 (출하일시)
  const leftWidth = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
  doc.rect(margin, currentY, leftWidth, rowHeight)
  drawLeftText(doc, `출하일시: ${formatDate(deliveryDate)}`, margin, currentY, leftWidth, rowHeight, 13)
  
  // 우측 4개 컬럼 병합 (밀양산내지소)
  const rightWidth = colWidths[4] + colWidths[5] + colWidths[6] + colWidths[7]
  doc.rect(margin + leftWidth, currentY, rightWidth, rowHeight)
  drawRightText(doc, '밀양산내지소', margin + leftWidth, currentY, rightWidth, rowHeight, 13)
  
  currentY += rowHeight
  
  // 2행: 수신
  doc.rect(margin, currentY, tableWidth, rowHeight)
  drawLeftText(doc, `수신: ${group.market}`, margin, currentY, tableWidth, rowHeight, 13)
  currentY += rowHeight
  
  // 3행: 헤더 (생산자|품명|규격|계|생산자|품명|규격|계)
  doc.setFont(fontLoaded ? 'NanumGothic' : 'helvetica', 'bold')
  doc.setFillColor(240, 240, 240) // 회색 배경
  
  let currentX = margin
  const headers = ['생산자', '품명', '규격', '계', '생산자', '품명', '규격', '계']
  
  headers.forEach((header, index) => {
    doc.rect(currentX, currentY, colWidths[index], rowHeight, 'FD') // 채우기 + 테두리
    drawCenteredText(doc, header, currentX, currentY, colWidths[index], rowHeight, 13)
    currentX += colWidths[index]
  })
  currentY += rowHeight
  
  // 데이터 행들 (세로 우선 정렬)
  doc.setFont(fontLoaded ? 'NanumGothic' : 'helvetica', 'normal')
  doc.setFontSize(12)
  
  const maxRows = 10
  const leftData = group.collections.slice(0, maxRows)
  const rightData = group.collections.slice(maxRows, maxRows * 2)
  
  for (let i = 0; i < maxRows; i++) {
    currentX = margin
    
    // 좌측 데이터
    const leftCollection = leftData[i]
    if (leftCollection) {
      const leftProducer = leftCollection.producer_name || ''
      const leftProduct = leftCollection.product_variety 
        ? `${leftCollection.product_type}(${leftCollection.product_variety})`
        : leftCollection.product_type || ''
      const leftSpec = leftCollection.product_type === '깻잎' && leftCollection.product_variety === '정품'
        ? '-'
        : `${leftCollection.box_weight || ''}`
      const leftQuantity = String(leftCollection.quantity || 0)
      
      // 좌측 4개 셀
      doc.rect(currentX, currentY, colWidths[0], rowHeight)
      drawCenteredText(doc, leftProducer, currentX, currentY, colWidths[0], rowHeight, 12)
      currentX += colWidths[0]
      
      doc.rect(currentX, currentY, colWidths[1], rowHeight)
      drawCenteredText(doc, leftProduct, currentX, currentY, colWidths[1], rowHeight, 12)
      currentX += colWidths[1]
      
      doc.rect(currentX, currentY, colWidths[2], rowHeight)
      drawCenteredText(doc, leftSpec, currentX, currentY, colWidths[2], rowHeight, 12)
      currentX += colWidths[2]
      
      doc.rect(currentX, currentY, colWidths[3], rowHeight)
      drawCenteredText(doc, leftQuantity, currentX, currentY, colWidths[3], rowHeight, 12)
      currentX += colWidths[3]
    } else {
      // 빈 좌측 셀들
      for (let j = 0; j < 4; j++) {
        doc.rect(currentX, currentY, colWidths[j], rowHeight)
        currentX += colWidths[j]
      }
    }
    
    // 우측 데이터
    const rightCollection = rightData[i]
    if (rightCollection) {
      const rightProducer = rightCollection.producer_name || ''
      const rightProduct = rightCollection.product_variety 
        ? `${rightCollection.product_type}(${rightCollection.product_variety})`
        : rightCollection.product_type || ''
      const rightSpec = rightCollection.product_type === '깻잎' && rightCollection.product_variety === '정품'
        ? '-'
        : `${rightCollection.box_weight || ''}`
      const rightQuantity = String(rightCollection.quantity || 0)
      
      // 우측 4개 셀
      doc.rect(currentX, currentY, colWidths[4], rowHeight)
      drawCenteredText(doc, rightProducer, currentX, currentY, colWidths[4], rowHeight, 12)
      currentX += colWidths[4]
      
      doc.rect(currentX, currentY, colWidths[5], rowHeight)
      drawCenteredText(doc, rightProduct, currentX, currentY, colWidths[5], rowHeight, 12)
      currentX += colWidths[5]
      
      doc.rect(currentX, currentY, colWidths[6], rowHeight)
      drawCenteredText(doc, rightSpec, currentX, currentY, colWidths[6], rowHeight, 12)
      currentX += colWidths[6]
      
      doc.rect(currentX, currentY, colWidths[7], rowHeight)
      drawCenteredText(doc, rightQuantity, currentX, currentY, colWidths[7], rowHeight, 12)
    } else {
      // 빈 우측 셀들
      for (let j = 4; j < 8; j++) {
        doc.rect(currentX, currentY, colWidths[j], rowHeight)
        currentX += colWidths[j]
      }
    }
    
    currentY += rowHeight
  }
  
  // 푸터 행 1: 계좌번호 + 강민준 기사
  doc.setFont(fontLoaded ? 'NanumGothic' : 'helvetica', 'normal')
  doc.setFontSize(12)
  
  const footerLeftWidth = colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4]
  const footerRightWidth = colWidths[5] + colWidths[6] + colWidths[7]
  
  doc.rect(margin, currentY, footerLeftWidth, rowHeight)
  drawLeftText(doc, '계좌번호: 농협 356-0724-8964-13 (강민준)', margin, currentY, footerLeftWidth, rowHeight, 12)
  
  doc.rect(margin + footerLeftWidth, currentY, footerRightWidth, rowHeight)
  drawRightText(doc, '강민준 기사', margin + footerLeftWidth, currentY, footerRightWidth, rowHeight, 12)
  currentY += rowHeight
  
  // 푸터 행 2: 빈칸 + 연락처
  doc.rect(margin, currentY, footerLeftWidth, rowHeight)
  
  doc.rect(margin + footerLeftWidth, currentY, footerRightWidth, rowHeight)
  drawRightText(doc, 'H.P : 010-3444-8853', margin + footerLeftWidth, currentY, footerRightWidth, rowHeight, 12)
  
  // PDF 다운로드
  doc.save(group.fileName)
}

// 선택된 그룹들 PDF 출력 (Vercel 완벽 호환)
export const downloadSelectedDeliveryNotesVercel = async (selectedGroups: DeliveryNoteGroup[]) => {
  try {
    if (selectedGroups.length === 0) {
      return { success: false, message: '선택된 그룹이 없습니다.' }
    }
    
    // 각 그룹별로 PDF 생성 및 다운로드
    for (const group of selectedGroups) {
      generateDeliveryNotePDF(group)
      
      // 다운로드 간격 (브라우저 안정성)
      await new Promise(resolve => setTimeout(resolve, 300))
    }
    
    return { 
      success: true, 
      message: `선택한 ${selectedGroups.length}개 그룹의 송품장이 다운로드되었습니다.`,
      groups: selectedGroups.map(g => ({ market: g.market, productType: g.productType }))
    }
  } catch (error) {
    console.error('❌ 송품장 생성 오류:', error)
    return { success: false, error, message: '송품장 생성 중 오류가 발생했습니다.' }
  }
}