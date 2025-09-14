import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { Collection } from '@/lib/database.types'
import { DeliveryNoteGroup } from './delivery-note-utils'
import { loadNanumGothicFont, loadWebFont } from './korean-font-data'

// 날짜 포맷팅 함수
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
}

// PDFLib을 사용한 한글 송품장 생성
export const generateDeliveryNotePDFLib = async (group: DeliveryNoteGroup): Promise<void> => {
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
    const titleFontSize = 24
    const titleX = getCenterX(title, titleFontSize, 0, width)
    page.drawText(title, {
      x: titleX,
      y: yPos,
      size: titleFontSize,
      font,
      color: rgb(0, 0, 0)
    })
    yPos -= 50
    
    // 출하일시 및 밀양산내지소
    const dateText = `${getSafeText('출하일시')}: ${useKoreanFont ? formatDate(deliveryDate) : deliveryDate}`
    const officeText = getSafeText('밀양산내지소')
    const fontSize = 12
    
    page.drawText(dateText, {
      x: margin,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    const officeTextWidth = font.widthOfTextAtSize(officeText, fontSize)
    page.drawText(officeText, {
      x: width - margin - officeTextWidth,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    yPos -= 25
    
    // 수신
    const receiverText = `${getSafeText('수신')}: ${getSafeText(group.market)}`
    page.drawText(receiverText, {
      x: margin,
      y: yPos,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    yPos -= 30
    
    // 테이블 시작 위치
    const tableStartY = yPos
    const rowHeight = 25
    const headerHeight = 30
    
    // 컬럼 너비 계산 (8개 컬럼)
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
    
    // 테이블 외곽선 그리기
    const tableWidth = contentWidth
    const maxRows = 10
    const totalRows = maxRows + 1 // 헤더 포함
    const tableHeight = headerHeight + (maxRows * rowHeight)
    
    // 외곽선
    page.drawRectangle({
      x: margin,
      y: yPos - tableHeight,
      width: tableWidth,
      height: tableHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    })
    
    // 세로선들
    let xPos = margin
    for (let i = 1; i < colWidths.length; i++) {
      xPos += colWidths[i - 1]
      page.drawLine({
        start: { x: xPos, y: yPos },
        end: { x: xPos, y: yPos - tableHeight },
        color: rgb(0, 0, 0),
        thickness: 1
      })
    }
    
    // 가로선들 (헤더 구분선과 각 행 구분선)
    for (let i = 0; i <= maxRows; i++) {
      const lineY = yPos - headerHeight - (i * rowHeight)
      page.drawLine({
        start: { x: margin, y: lineY },
        end: { x: margin + tableWidth, y: lineY },
        color: rgb(0, 0, 0),
        thickness: 1
      })
    }
    
    // 헤더 텍스트
    const headers = ['생산자', '품명', '규격', '계', '생산자', '품명', '규격', '계'].map(h => getSafeText(h))
    xPos = margin
    const headerY = yPos - (headerHeight / 2) - 3
    
    for (let i = 0; i < headers.length; i++) {
      const headerX = getCenterX(headers[i], fontSize, xPos, colWidths[i])
      page.drawText(headers[i], {
        x: headerX,
        y: headerY,
        size: fontSize,
        font,
        color: rgb(0, 0, 0)
      })
      xPos += colWidths[i]
    }
    
    // 데이터 행들
    const leftData = group.collections.slice(0, maxRows)
    const rightData = group.collections.slice(maxRows, maxRows * 2)
    const dataFontSize = 10
    
    for (let i = 0; i < maxRows; i++) {
      const rowY = yPos - headerHeight - ((i + 1) * rowHeight) + (rowHeight / 2) - 2
      xPos = margin
      
      // 좌측 데이터
      const leftCells = ['', '', '', '']
      if (leftData[i]) {
        const left = leftData[i]
        leftCells[0] = getSafeText(left.producer_name || '')
        leftCells[1] = left.product_variety 
          ? `${getSafeText(left.product_type || '')}(${getSafeText(left.product_variety)})`
          : getSafeText(left.product_type || '')
        leftCells[2] = left.product_type === '깻잎' && left.product_variety === '정품'
          ? '-'
          : left.box_weight || ''
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
        rightCells[2] = right.product_type === '깻잎' && right.product_variety === '정품'
          ? '-'
          : right.box_weight || ''
        rightCells[3] = String(right.quantity || 0)
      }
      
      const allCells = [...leftCells, ...rightCells]
      
      // 셀 데이터 중앙 정렬로 출력
      for (let j = 0; j < allCells.length; j++) {
        if (allCells[j]) {
          const cellText = allCells[j] // 이미 getSafeText 처리됨
          const cellX = getCenterX(cellText, dataFontSize, xPos, colWidths[j])
          page.drawText(cellText, {
            x: cellX,
            y: rowY,
            size: dataFontSize,
            font,
            color: rgb(0, 0, 0)
          })
        }
        xPos += colWidths[j]
      }
    }
    
    // 계좌번호 및 기사 정보
    const bottomY = yPos - tableHeight - 40
    const accountText = useKoreanFont 
      ? '계좌번호: 농협 356-0724-8964-13 (강민준)'
      : `${getSafeText('계좌번호')}: ${getSafeText('농협')} 356-0724-8964-13 (Min Jun Kang)`
    const driverText = getSafeText('강민준 기사')
    const phoneText = `${getSafeText('H.P')} : 010-3444-8853`
    
    page.drawText(accountText, {
      x: margin,
      y: bottomY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    const driverTextWidth = font.widthOfTextAtSize(driverText, fontSize)
    page.drawText(driverText, {
      x: width - margin - driverTextWidth,
      y: bottomY,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    const phoneTextWidth = font.widthOfTextAtSize(phoneText, fontSize)
    page.drawText(phoneText, {
      x: width - margin - phoneTextWidth,
      y: bottomY - 20,
      size: fontSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    // PDF 바이트 생성
    const pdfBytes = await pdfDoc.save()
    
    // 다운로드
    const blob = new Blob([pdfBytes], { type: 'application/pdf' })
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

// 선택된 그룹들을 PDFLib으로 출력
export const downloadSelectedDeliveryNotesPDFLib = async (selectedGroups: DeliveryNoteGroup[]) => {
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