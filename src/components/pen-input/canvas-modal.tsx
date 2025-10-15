'use client'

import { useState, useRef, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { X, Check, Trash2, Undo2 } from 'lucide-react'
import { recognizeText, preprocessImage } from '@/lib/ocr-utils'
import { toast } from 'sonner'

// 좌표점 인터페이스
interface Point {
  x: number
  y: number
}

// 그리기 스타일 인터페이스
interface DrawStyle {
  color: string
  width: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
}

// 한 획(stroke) 인터페이스
interface Stroke {
  points: Point[]
  style: DrawStyle
}

interface CanvasModalProps {
  isOpen: boolean
  onClose: () => void
  onRecognize: (text: string) => void
}

export function CanvasModal({ isOpen, onClose, onRecognize }: CanvasModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showGuide, setShowGuide] = useState(true)
  
  // 획 히스토리 관리
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [currentStroke, setCurrentStroke] = useState<Point[]>([])
  
  // 기본 그리기 스타일
  const defaultDrawStyle: DrawStyle = {
    color: '#000000',
    width: 4,
    lineCap: 'round',
    lineJoin: 'round'
  }

  // 최대 히스토리 개수 (메모리 관리)
  const MAX_STROKES = 50

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 가이드 다시 표시 및 히스토리 초기화
      setShowGuide(true)
      setStrokes([])
      setCurrentStroke([])
      
      // 모달 DOM이 완전히 렌더링된 후 캔버스 초기화
      const initializeCanvas = () => {
        clearCanvas()
        console.log('캔버스 초기화 완료')
      }

      // 짧은 지연으로 DOM 렌더링 완료 대기
      const timeoutId = setTimeout(initializeCanvas, 150)
      
      // 추가 안전 장치: requestAnimationFrame으로 한 번 더 지연
      requestAnimationFrame(() => {
        setTimeout(initializeCanvas, 50)
      })

      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [isOpen])

  // ResizeObserver로 캔버스 크기 변화 감지
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current
      
      const handleResize = () => {
        console.log('캔버스 크기 변화 감지, 재초기화 중...')
        clearCanvas()
      }

      // ResizeObserver 지원 여부 확인
      if (window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(handleResize)
        resizeObserver.observe(canvas)

        return () => {
          resizeObserver.disconnect()
        }
      } else {
        // ResizeObserver 미지원 시 window resize 이벤트 사용
        window.addEventListener('resize', handleResize)
        return () => {
          window.removeEventListener('resize', handleResize)
        }
      }
    }
  }, [isOpen])

  // strokes 상태 변경 시 캔버스 재그리기
  useEffect(() => {
    if (isOpen) {
      redrawCanvas()
    }
  }, [strokes, isOpen])

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) {
      console.warn('캔버스 요소를 찾을 수 없습니다')
      return
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.warn('캔버스 컨텍스트를 가져올 수 없습니다')
      return
    }

    // 히스토리 초기화
    setStrokes([])
    setCurrentStroke([])

    // 캔버스 크기를 정확히 설정 (DPI 고려)
    const rect = canvas.getBoundingClientRect()
    const devicePixelRatio = window.devicePixelRatio || 1
    
    console.log('캔버스 크기 설정:', {
      cssWidth: rect.width,
      cssHeight: rect.height,
      devicePixelRatio,
      canvasWidth: rect.width * devicePixelRatio,
      canvasHeight: rect.height * devicePixelRatio
    })
    
    // 실제 표시 크기
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    
    // 내부 해상도 (고DPI 대응)
    canvas.width = rect.width * devicePixelRatio
    canvas.height = rect.height * devicePixelRatio
    
    // 컨텍스트 스케일링
    ctx.scale(devicePixelRatio, devicePixelRatio)

    // 흰색 배경으로 초기화 (가이드 없는 깨끗한 캔버스)
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, rect.width, rect.height)

    // 그리기 설정
    ctx.strokeStyle = defaultDrawStyle.color
    ctx.lineWidth = defaultDrawStyle.width
    ctx.lineCap = defaultDrawStyle.lineCap
    ctx.lineJoin = defaultDrawStyle.lineJoin
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

  // 캔버스 재그리기 함수 (히스토리 기반)
  const redrawCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // 캔버스 클리어
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // 배경 다시 그리기
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1))
    
    // 모든 완성된 획 다시 그리기
    strokes.forEach(stroke => {
      if (stroke.points.length > 1) {
        ctx.strokeStyle = stroke.style.color
        ctx.lineWidth = stroke.style.width
        ctx.lineCap = stroke.style.lineCap
        ctx.lineJoin = stroke.style.lineJoin
        
        ctx.beginPath()
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y)
        stroke.points.forEach((point, index) => {
          if (index > 0) {
            ctx.lineTo(point.x, point.y)
          }
        })
        ctx.stroke()
      }
    })

    // 현재 그리고 있는 획 그리기
    if (currentStroke.length > 1) {
      ctx.strokeStyle = defaultDrawStyle.color
      ctx.lineWidth = defaultDrawStyle.width
      ctx.lineCap = defaultDrawStyle.lineCap
      ctx.lineJoin = defaultDrawStyle.lineJoin
      
      ctx.beginPath()
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y)
      currentStroke.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x, point.y)
        }
      })
      ctx.stroke()
    }
  }

  // 마지막 획 되돌리기 함수
  const undoLastStroke = () => {
    if (strokes.length > 0) {
      setStrokes(prev => prev.slice(0, -1))
      console.log('획 되돌리기 완료, 남은 획 수:', strokes.length - 1)
      // 캔버스 재그리기는 useEffect에서 자동으로 처리됨
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    // 다중 터치 체크 (터치인 경우)
    if ('touches' in e && e.touches.length > 1) {
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    // 안전 장치: 캔버스 크기가 제대로 설정되지 않았으면 재초기화
    if (canvas.width === 0 || canvas.height === 0) {
      console.log('캔버스 크기가 0입니다. 재초기화 중...')
      clearCanvas()
      
      // 재초기화 후 잠시 대기
      setTimeout(() => {
        if (canvas.width > 0 && canvas.height > 0) {
          console.log('재초기화 완료, 그리기 시작')
          startDrawingInternal(e)
        }
      }, 50)
      return
    }

    startDrawingInternal(e)
  }

  const startDrawingInternal = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true)
    
    // 그리기 시작 시 가이드 숨김
    if (showGuide) {
      setShowGuide(false)
    }
    
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { x, y } = getCoordinates(e)
    console.log('그리기 시작 좌표:', { x, y })

    // 새로운 획 시작
    setCurrentStroke([{ x, y }])

    // 캔버스에 즉시 그리기 시작
    ctx.strokeStyle = defaultDrawStyle.color
    ctx.lineWidth = defaultDrawStyle.width
    ctx.lineCap = defaultDrawStyle.lineCap
    ctx.lineJoin = defaultDrawStyle.lineJoin
    
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

    // 현재 획에 점 추가
    setCurrentStroke(prev => [...prev, { x, y }])

    // 캔버스에 즉시 그리기
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (e && 'touches' in e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    // 그리기 종료 시 현재 획을 히스토리에 저장
    if (isDrawing && currentStroke.length > 0) {
      const stroke: Stroke = {
        points: [...currentStroke],
        style: { ...defaultDrawStyle }
      }
      
      setStrokes(prev => {
        const newStrokes = [...prev, stroke]
        // 최대 히스토리 개수 제한 (메모리 관리)
        const limitedStrokes = newStrokes.length > MAX_STROKES 
          ? newStrokes.slice(-MAX_STROKES) 
          : newStrokes
        console.log('획 추가 완료, 총 획 수:', limitedStrokes.length)
        return limitedStrokes
      })
      
      setCurrentStroke([])
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
        toast.success(`✅ '${recognizedText}' 인식 완료!`)
        onClose()
      } else {
        toast.error('❌ 인식 실패! 다음 방법을 시도해보세요:', {
          description: '• 한 글자씩 떨어뜨려서 쓰기\n• 더 굵고 진하게 쓰기\n• 정자로 또박또박 쓰기',
          duration: 5000
        })
        setShowGuide(true) // 가이드 다시 표시
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
      <DialogContent className="max-w-md w-full h-96 p-0 gap-0">
        <DialogHeader className="p-4 border-b bg-white">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-bold text-brand">
              ✏️ 생산자명 입력
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            펜이나 손가락으로 생산자명을 작성해주세요.
          </p>
        </DialogHeader>

        <div className="flex-1 flex flex-col bg-gray-50">
          {/* 캔버스 영역 */}
          <div className="flex-1 p-4 relative">
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
            
            {/* HTML 오버레이 가이드 (OCR에 포함되지 않음) */}
            {showGuide && (
              <div className="absolute inset-4 pointer-events-none flex items-center justify-center">
                <div className="text-center">
                  {/* 가이드 박스 */}
                  <div className="relative mx-auto w-48 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-4">
                    {/* 베이스라인 */}
                    <div className="absolute bottom-4 left-4 right-4 h-px bg-gray-200"></div>
                  </div>
                  
                  {/* 안내 텍스트 */}
                  <div className="text-gray-500 space-y-2">
                    <p className="text-sm font-medium">📝 이름을 크고 명확하게 작성하세요</p>
                    <div className="text-xs space-y-1">
                      <p>✅ 한 글자씩 떨어뜨려서 쓰세요</p>
                      <p>✅ 굵고 진하게 작성하세요</p>
                      <p>✅ 정자로 또박또박 쓰세요</p>
                      <p className="text-brand font-medium">예: 김 철 수</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 하단 버튼들 */}
          <div className="p-4 bg-white border-t">
            <div className="flex gap-2 justify-center">
              {/* 실행취소 버튼 */}
              <Button
                variant="outline"
                onClick={undoLastStroke}
                disabled={strokes.length === 0}
                className="flex items-center gap-1 px-3"
                title="마지막 획 되돌리기"
              >
                <Undo2 className="h-4 w-4" />
                <span className="hidden sm:inline">실행취소</span>
              </Button>
              
              {/* 전체 지우기 버튼 */}
              <Button
                variant="outline"
                onClick={() => {
                  clearCanvas()
                  setShowGuide(true) // 지우기 시 가이드 다시 표시
                }}
                className="flex items-center gap-1 px-3"
                title="전체 지우기"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline">전체지우기</span>
              </Button>
              
              {/* 이름 인식 버튼 */}
              <Button
                onClick={handleRecognize}
                disabled={isProcessing}
                className="flex items-center gap-1 px-3 bg-brand hover:bg-brand/90"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="hidden sm:inline">인식 중...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span className="hidden sm:inline">이름 인식</span>
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