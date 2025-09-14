import { Collection } from '@/lib/database.types'

// 당일 완료된 항목만 추출하고 공판장별-품목별로 그룹화
export const groupCompletedCollections = (collections: Collection[]) => {
  // 1. 당일 완료된 항목만 필터링
  const today = new Date().toISOString().split('T')[0]
  const completedCollections = collections.filter(
    (collection) => collection.status === 'completed' && collection.reception_date === today
  )

  if (completedCollections.length === 0) {
    return []
  }

  // 2. 공판장별로 그룹화
  const groupedByMarket = completedCollections.reduce((acc, collection) => {
    const marketKey = collection.market || '미지정'
    if (!acc[marketKey]) {
      acc[marketKey] = []
    }
    acc[marketKey].push(collection)
    return acc
  }, {} as Record<string, Collection[]>)

  // 3. 각 공판장 내에서 품목별로 그룹화
  const result = []
  for (const [market, marketCollections] of Object.entries(groupedByMarket)) {
    const groupedByProduct = marketCollections.reduce((acc, collection) => {
      const productKey = collection.product_type || '미지정'
      if (!acc[productKey]) {
        acc[productKey] = []
      }
      acc[productKey].push(collection)
      return acc
    }, {} as Record<string, Collection[]>)

    // 각 품목별 그룹을 결과에 추가
    for (const [productType, productCollections] of Object.entries(groupedByProduct)) {
      result.push({
        market,
        productType,
        collections: productCollections,
        fileName: `송품장_${market}_${productType}_${new Date().toISOString().split('T')[0]}.pdf`
      })
    }
  }

  return result
}

// 송품장 그룹 타입 정의
export interface DeliveryNoteGroup {
  market: string
  productType: string
  collections: Collection[]
  fileName: string
}