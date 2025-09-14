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
    
    const fontSize = 12
    yPos -= 20
    
    // 통합 테이블 시작 위치
    const tableStartY = yPos
    const rowHeight = 25
    const headerHeight = 30
    const infoRowHeight = 25
    
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
    
    // 통합 테이블: 정보(2행) + 헤더(1행) + 데이터(10행) + 하단정보(2행) = 15행
    const tableWidth = contentWidth
    const maxDataRows = 10
    
    // 모든 행을 동일한 높이로 통일
    const uniformRowHeight = 25
    const totalRows = 15  // 2 + 1 + 10 + 2
    const tableHeight = totalRows * uniformRowHeight
    
    // 표 외곽선
    page.drawRectangle({
      x: margin,
      y: yPos - tableHeight,
      width: tableWidth,
      height: tableHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    })
    
    // 세로선들 (헤더와 데이터 행에만 - 정보행은 제외)
    let xPos = margin
    for (let i = 1; i < colWidths.length; i++) {
      xPos += colWidths[i - 1]
      page.drawLine({
        start: { x: xPos, y: yPos - (2 * uniformRowHeight) },  // 수신 행 아래부터
        end: { x: xPos, y: yPos - (13 * uniformRowHeight) },   // 데이터 마지막까지
        color: rgb(0, 0, 0),
        thickness: 1
      })
    }
    
    // 가로선들 (특정 행만 구분)
    // 행 1 하단 (수신 아래)
    page.drawLine({
      start: { x: margin, y: yPos - (2 * uniformRowHeight) },
      end: { x: margin + tableWidth, y: yPos - (2 * uniformRowHeight) },
      color: rgb(0, 0, 0),
      thickness: 1
    })
    
    // 행 2 하단 (헤더 아래)
    page.drawLine({
      start: { x: margin, y: yPos - (3 * uniformRowHeight) },
      end: { x: margin + tableWidth, y: yPos - (3 * uniformRowHeight) },
      color: rgb(0, 0, 0),
      thickness: 1
    })
    
    // 데이터 행들 구분선 (행 3-12)
    for (let i = 4; i < 13; i++) {
      const lineY = yPos - (i * uniformRowHeight)
      page.drawLine({
        start: { x: margin, y: lineY },
        end: { x: margin + tableWidth, y: lineY },
        color: rgb(0, 0, 0),
        thickness: 1
      })
    }
    
    // 행 12 하단 (데이터 마지막 아래)
    page.drawLine({
      start: { x: margin, y: yPos - (13 * uniformRowHeight) },
      end: { x: margin + tableWidth, y: yPos - (13 * uniformRowHeight) },
      color: rgb(0, 0, 0),
      thickness: 1
    })
    
    // === 텍스트 내용 (동일한 좌표 체계 사용) ===
    const textSize = 11
    
    // 행 0: 출하일시 (왼쪽) | 밀양산내지소 (오른쪽) - 칸 구분 없이
    let rowY = yPos - (uniformRowHeight / 2) - 3
    page.drawText(`${getSafeText('출하일시')}: ${useKoreanFont ? formatDate(deliveryDate) : deliveryDate}`, {
      x: margin + 15,  // 왼쪽 정렬
      y: rowY,
      size: textSize,
      font,
      color: rgb(0, 0, 0)
    })
    page.drawText(getSafeText('밀양산내지소'), {
      x: margin + tableWidth - 85,  // 오른쪽 정렬
      y: rowY,
      size: textSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    // 행 1: 수신 - 칸 구분 없이 한줄에
    rowY = yPos - (1.5 * uniformRowHeight) - 3
    page.drawText(`${getSafeText('수신')}: ${getSafeText(group.market)}`, {
      x: margin + 15,  // 왼쪽에서 약간 떨어뜨림
      y: rowY,
      size: textSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    // 행 2: 헤더
    const headers = ['생산자', '품명', '규격', '계', '생산자', '품명', '규격', '계'].map(h => getSafeText(h))
    rowY = yPos - (2.5 * uniformRowHeight) - 3
    xPos = margin
    
    for (let i = 0; i < headers.length; i++) {
      const headerX = getCenterX(headers[i], textSize, xPos, colWidths[i])
      page.drawText(headers[i], {
        x: headerX,
        y: rowY,
        size: textSize,
        font,
        color: rgb(0, 0, 0)
      })
      xPos += colWidths[i]
    }
    
    // 행 3-12: 데이터 행들
    const leftData = group.collections.slice(0, maxDataRows)
    const rightData = group.collections.slice(maxDataRows, maxDataRows * 2)
    
    for (let i = 0; i < maxDataRows; i++) {
      rowY = yPos - ((3 + i + 0.5) * uniformRowHeight) - 3
      xPos = margin
      
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
      for (let j = 0; j < allCells.length; j++) {
        if (allCells[j]) {
          const cellX = getCenterX(allCells[j], 10, xPos, colWidths[j])
          page.drawText(allCells[j], {
            x: cellX,
            y: rowY,
            size: 10,
            font,
            color: rgb(0, 0, 0)
          })
        }
        xPos += colWidths[j]
      }
    }
    
    // 행 13: 계좌번호 (왼쪽) | 기사 (가운데) | 연락처 (오른쪽) - 칸 구분 없이 한줄에 좌우 구분
    rowY = yPos - (13.5 * uniformRowHeight) - 3
    page.drawText(`${getSafeText('계좌번호')}: ${getSafeText('농협')} 356-0724-8964-13`, {
      x: margin + 15,  // 왼쪽 정렬
      y: rowY,
      size: textSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    page.drawText(getSafeText('강민준 기사'), {
      x: margin + (tableWidth / 2) - 35,  // 가운데 정렬
      y: rowY,
      size: textSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    page.drawText(`${getSafeText('H.P')}: 010-3444-8853`, {
      x: margin + tableWidth - 115,  // 오른쪽 정렬
      y: rowY,
      size: textSize,
      font,
      color: rgb(0, 0, 0)
    })
    
    // 기존 계좌번호 및 기사 정보는 위의 정보 테이블에 포함되어 제거
    
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

    // 테이블 시작 위치
    const tableStartY = height - 180
    const rowHeight = 25
    const headerHeight = 30

    // 테이블 컬럼 정의 (한글 환경에 최적화)
    const columns = [
      { header: '생산자명', width: 80, align: 'left' },
      { header: '품목', width: 70, align: 'center' },
      { header: '품종', width: 60, align: 'center' },
      { header: '수량', width: 50, align: 'center' },
      { header: '박스무게', width: 60, align: 'center' },
      { header: '지역', width: 70, align: 'center' },
      { header: '공판장', width: 80, align: 'center' },
      { header: '접수일', width: 70, align: 'center' }
    ]

    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0)
    const tableStartX = 60

    // 테이블 헤더 배경
    page.drawRectangle({
      x: tableStartX,
      y: tableStartY - headerHeight,
      width: tableWidth,
      height: headerHeight,
      color: lightGray,
      borderColor: borderColor,
      borderWidth: 1
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

    // 데이터 행들
    let currentRowY = tableStartY - headerHeight
    const dataTextSize = useKoreanFont ? 9 : 8

    group.collections.forEach((collection, index) => {
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

      // 데이터 준비
      const rowData = [
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
      ]

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
    })

    // 테이블 하단 테두리
    const tableBottomY = currentRowY
    page.drawLine({
      start: { x: tableStartX, y: tableBottomY },
      end: { x: tableStartX + tableWidth, y: tableBottomY },
      thickness: 1,
      color: borderColor
    })

    // 요약 정보 박스
    const summaryY = tableBottomY - 60
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
      const blob = new Blob([pdfBytes], { type: 'application/pdf' })
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