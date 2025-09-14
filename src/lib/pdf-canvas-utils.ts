import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { Collection } from '@/lib/database.types'
import { DeliveryNoteGroup } from './delivery-note-utils'

// 날짜 포맷팅 함수
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return `${date.getFullYear()}년 ${String(date.getMonth() + 1).padStart(2, '0')}월 ${String(date.getDate()).padStart(2, '0')}일`
}

// HTML 송품장 생성 함수
const createDeliveryNoteHTML = (group: DeliveryNoteGroup): string => {
  const deliveryDate = group.collections[0]?.reception_date || new Date().toISOString().split('T')[0]
  
  // 세로 우선 순서로 다단 테이블 행 생성 함수
  const generateTableRows = (collections: Collection[], maxRows = 10) => {
    const leftData = collections.slice(0, maxRows)
    const rightData = collections.slice(maxRows, maxRows * 2)
    
    let rows = ''
    for (let i = 0; i < maxRows; i++) {
      const left = leftData[i]
      const right = rightData[i]
      
      // 좌측 데이터
      let leftProducer = '', leftProduct = '', leftSpec = '', leftQuantity = ''
      if (left) {
        leftProducer = left.producer_name || ''
        leftProduct = left.product_variety 
          ? `${left.product_type}(${left.product_variety})`
          : left.product_type || ''
        leftSpec = left.product_type === '깻잎' && left.product_variety === '정품'
          ? '-'
          : left.box_weight || ''
        leftQuantity = String(left.quantity || 0)
      }
      
      // 우측 데이터
      let rightProducer = '', rightProduct = '', rightSpec = '', rightQuantity = ''
      if (right) {
        rightProducer = right.producer_name || ''
        rightProduct = right.product_variety 
          ? `${right.product_type}(${right.product_variety})`
          : right.product_type || ''
        rightSpec = right.product_type === '깻잎' && right.product_variety === '정품'
          ? '-'
          : right.box_weight || ''
        rightQuantity = String(right.quantity || 0)
      }
      
      rows += `
        <tr>
          <td>${leftProducer}</td>
          <td>${leftProduct}</td>
          <td>${leftSpec}</td>
          <td>${leftQuantity}</td>
          <td>${rightProducer}</td>
          <td>${rightProduct}</td>
          <td>${rightSpec}</td>
          <td>${rightQuantity}</td>
        </tr>
      `
    }
    return rows
  }

  return `
    <div style="
      width: 794px; 
      height: 1123px; 
      padding: 40px;
      font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
      font-size: 12px;
      background: white;
      color: black;
      box-sizing: border-box;
    ">
      <!-- 제목 -->
      <div style="
        font-size: 24px; 
        font-weight: bold; 
        text-align: center; 
        margin-bottom: 30px;
        letter-spacing: 0.5em;
      ">송 품 장</div>
      
      <!-- 테이블 -->
      <table style="
        width: 100%;
        border-collapse: collapse;
        border: 2px solid #000;
        font-size: 12px;
      ">
        <!-- 출하일시 + 밀양산내지소 -->
        <tr>
          <td colspan="4" style="
            height: 40px;
            text-align: left;
            vertical-align: middle;
            padding: 10px;
            font-size: 14px;
            font-weight: bold;
            border: 1px solid #000;
          ">출하일시: ${formatDate(deliveryDate)}</td>
          <td colspan="4" style="
            height: 40px;
            text-align: right;
            vertical-align: middle;
            padding: 10px;
            font-size: 14px;
            font-weight: bold;
            border: 1px solid #000;
          ">밀양산내지소</td>
        </tr>
        
        <!-- 수신 -->
        <tr>
          <td colspan="8" style="
            height: 40px;
            text-align: left;
            vertical-align: middle;
            padding: 10px;
            font-size: 14px;
            font-weight: bold;
            border: 1px solid #000;
          ">수신: ${group.market}</td>
        </tr>
        
        <!-- 헤더 -->
        <tr>
          <th style="border: 1px solid #000; padding: 10px; background-color: #f0f0f0; font-weight: bold;">생산자</th>
          <th style="border: 1px solid #000; padding: 10px; background-color: #f0f0f0; font-weight: bold;">품명</th>
          <th style="border: 1px solid #000; padding: 10px; background-color: #f0f0f0; font-weight: bold;">규격</th>
          <th style="border: 1px solid #000; padding: 10px; background-color: #f0f0f0; font-weight: bold;">계</th>
          <th style="border: 1px solid #000; padding: 10px; background-color: #f0f0f0; font-weight: bold;">생산자</th>
          <th style="border: 1px solid #000; padding: 10px; background-color: #f0f0f0; font-weight: bold;">품명</th>
          <th style="border: 1px solid #000; padding: 10px; background-color: #f0f0f0; font-weight: bold;">규격</th>
          <th style="border: 1px solid #000; padding: 10px; background-color: #f0f0f0; font-weight: bold;">계</th>
        </tr>
        
        <!-- 데이터 행들 -->
        ${generateTableRows(group.collections)}
        
        <!-- 계좌번호 + 기사정보 -->
        <tr>
          <td colspan="5" style="
            height: 35px;
            text-align: left;
            vertical-align: middle;
            padding: 10px;
            border: 1px solid #000;
          ">계좌번호: 농협 356-0724-8964-13 (강민준)</td>
          <td colspan="3" style="
            height: 35px;
            text-align: right;
            vertical-align: middle;
            padding: 10px;
            border: 1px solid #000;
          ">강민준 기사</td>
        </tr>
        <tr>
          <td colspan="5" style="
            height: 35px;
            border: 1px solid #000;
          "></td>
          <td colspan="3" style="
            height: 35px;
            text-align: right;
            vertical-align: middle;
            padding: 10px;
            border: 1px solid #000;
          ">H.P : 010-3444-8853</td>
        </tr>
      </table>
    </div>
  `
}

// HTML을 Canvas로 변환한 후 PDF 생성
export const generateDeliveryNotePDFWithCanvas = async (group: DeliveryNoteGroup): Promise<void> => {
  try {
    // HTML 생성
    const htmlContent = createDeliveryNoteHTML(group)
    
    // 임시 div 생성
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = htmlContent
    tempDiv.style.position = 'absolute'
    tempDiv.style.left = '-9999px'
    tempDiv.style.top = '-9999px'
    document.body.appendChild(tempDiv)
    
    // html2canvas로 이미지 생성
    const canvas = await html2canvas(tempDiv.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 794,
      height: 1123
    })
    
    // 임시 div 제거
    document.body.removeChild(tempDiv)
    
    // PDF 생성
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [794, 1123]
    })
    
    // 캔버스 이미지를 PDF에 추가
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, 0, 794, 1123)
    
    // PDF 저장
    pdf.save(group.fileName)
    
  } catch (error) {
    console.error('PDF 생성 실패:', error)
    throw error
  }
}

// 선택된 그룹들을 Canvas-PDF로 출력
export const downloadSelectedDeliveryNotesWithCanvas = async (selectedGroups: DeliveryNoteGroup[]) => {
  try {
    if (selectedGroups.length === 0) {
      return { success: false, message: '선택된 그룹이 없습니다.' }
    }
    
    for (const group of selectedGroups) {
      await generateDeliveryNotePDFWithCanvas(group)
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