'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, RotateCcw, Check, Trash2 } from 'lucide-react'
import { recognizeText, preprocessImage } from '@/lib/ocr-utils'
import { toast } from 'sonner'

interface CanvasModalProps {
  isOpen: boolean
  onClose: () => void
  onRecognize: (text: string) => void
}

export function CanvasModal({ isOpen, onClose, onRecognize }: CanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 캔버스 초기화
      clearCanvas()
    }
  }, [isOpen])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 캔버스 크기를 정확히 설정 (DPI 고려)
    const rect = canvas.getBoundingClientRect()
    const devicePixelRatio = window.devicePixelRatio || 1
    
    // 실제 표시 크기
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    
    // 내부 해상도 (고DPI 대응)
    canvas.width = rect.width * devicePixelRatio
    canvas.height = rect.height * devicePixelRatio
    
    // 컨텍스트 스케일링
    ctx.scale(devicePixelRatio, devicePixelRatio)

    // 흰색 배경으로 초기화
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 그리기 설정
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  // 정확한 좌표 계산 헬퍼 함수
  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    let clientX, clientY

    if ('touches' in e) {
      // 터치 이벤트 - 기본 동작 차단
      e.preventDefault()
      e.stopPropagation()
      
      // 다중 터치 방지
      if (e.touches.length === 0 || e.touches.length > 1) return { x: 0, y: 0 }
      
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      // 마우스 이벤트
      clientX = e.clientX
      clientY = e.clientY
    }

    // 정확한 캔버스 상대 좌표 계산 (스크롤 오프셋 고려)
    const x = clientX - rect.left
    const y = clientY - rect.top

    // 캔버스 경계 내부로 제한
    const boundedX = Math.max(0, Math.min(x, rect.width))
    const boundedY = Math.max(0, Math.min(y, rect.height))

    return { x: boundedX, y: boundedY }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // 다중 터치 체크 (터치인 경우)
    if ('touches' in e && e.touches.length > 1) {
      return
    }

    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    // 다중 터치 체크 (터치인 경우)
    if ('touches' in e && e.touches.length > 1) {
      setIsDrawing(false)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e && 'touches' in e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setIsDrawing(false)
  }

  const handleRecognize = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsProcessing(true)

    try {
      // 캔버스가 비어있는지 확인
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        toast.error('캔버스를 초기화할 수 없습니다.')
        setIsProcessing(false)
        return
      }

      // 이미지 데이터 전처리 (OCR 인식률 향상)
      const processedImageData = preprocessImage(canvas)
      
      // Tesseract.js를 사용한 실제 OCR 처리
      const recognizedText = await recognizeText(processedImageData)
      
      if (recognizedText.trim()) {
        onRecognize(recognizedText)
        toast.success('텍스트 인식이 완료되었습니다!')
        onClose()
      } else {
        toast.warning('인식된 텍스트가 없습니다. 더 명확하게 작성해주세요.')
      }

    } catch (error) {
      console.error('OCR 처리 중 오류:', error)
      toast.error('텍스트 인식에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 gap-0">
        <DialogHeader className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold text-brand">
              ✏️ 터치입력
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            펜이나 손가락으로 생산자명, 품목, 수량 등을 자유롭게 작성해주세요.
          </p>
        </DialogHeader>

        <div className="flex-1 flex flex-col bg-gray-50">
          {/* 캔버스 영역 */}
          <div className="flex-1 p-4">
            <canvas
              ref={canvasRef}
              className="w-full h-full bg-white border-2 border-gray-200 rounded-lg shadow-sm cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              onTouchCancel={stopDrawing}
              style={{ 
                touchAction: 'none',           // 터치 스크롤 방지
                userSelect: 'none',            // 텍스트 선택 방지  
                WebkitUserSelect: 'none',      // Safari 텍스트 선택 방지
                WebkitTouchCallout: 'none',    // Safari 터치 콜아웃 방지
                KhtmlUserSelect: 'none',       // 구형 브라우저 지원
                MozUserSelect: 'none',         // Firefox 지원
                msUserSelect: 'none'           // IE 지원
              }}
            />
          </div>

          {/* 하단 버튼들 */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={clearCanvas}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                지우기
              </Button>
              
              <Button
                onClick={handleRecognize}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-brand hover:bg-brand/90"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    인식 중...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    인식 시작
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}