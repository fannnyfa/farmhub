/**
 * 한국 시간대(KST) 기준으로 오늘 날짜를 반환하는 유틸리티 함수
 */
export function getKoreanToday(): string {
  const now = new Date()
  const koreaTime = new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return koreaTime.toISOString().split('T')[0]
}

/**
 * 한국 시간대(KST) 기준으로 현재 시간을 반환하는 함수
 */
export function getKoreanNow(): Date {
  const now = new Date()
  return new Date(now.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
}

/**
 * 날짜 문자열이 오늘(한국 시간 기준)인지 확인하는 함수
 */
export function isToday(dateString: string | null): boolean {
  if (!dateString) return false
  return dateString === getKoreanToday()
}