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

/**
 * 한국 시간 기준으로 내일 날짜를 반환하는 함수
 */
export function getKoreanTomorrow(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const koreaTomorrow = new Date(tomorrow.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return koreaTomorrow.toISOString().split('T')[0]
}

/**
 * 한국 시간 기준으로 모레 날짜를 반환하는 함수
 */
export function getKoreanDayAfterTomorrow(): string {
  const dayAfterTomorrow = new Date()
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2)
  const koreaDay = new Date(dayAfterTomorrow.getTime() + (9 * 60 * 60 * 1000)) // UTC+9
  return koreaDay.toISOString().split('T')[0]
}

/**
 * 날짜를 사용자 친화적 형태로 표시하는 함수
 */
export function getDateDisplayText(dateString: string): string {
  const today = getKoreanToday()
  const tomorrow = getKoreanTomorrow()
  const dayAfterTomorrow = getKoreanDayAfterTomorrow()

  if (dateString === today) {
    return `${dateString} (오늘)`
  } else if (dateString === tomorrow) {
    return `${dateString} (내일)`
  } else if (dateString === dayAfterTomorrow) {
    return `${dateString} (모레)`
  } else {
    return dateString
  }
}