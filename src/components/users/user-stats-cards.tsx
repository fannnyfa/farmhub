"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  ShieldCheckIcon
} from "@heroicons/react/24/outline"

interface UserStats {
  totalUsers: number
  pendingUsers: number
  approvedUsers: number
  adminUsers: number
}

interface UserStatsCardsProps {
  stats: UserStats
  loading?: boolean
}

export default function UserStatsCards({ stats, loading = false }: UserStatsCardsProps) {
  const formatNumber = (num: number) => {
    return loading ? '-' : num.toLocaleString()
  }

  const statCards = [
    {
      title: "전체 사용자",
      value: formatNumber(stats.totalUsers),
      description: "시스템 전체",
      icon: UserGroupIcon,
      color: "text-blue-600"
    },
    {
      title: "승인 대기",
      value: formatNumber(stats.pendingUsers),
      description: "pending 상태",
      icon: ClockIcon,
      color: "text-orange-600"
    },
    {
      title: "활성 사용자",
      value: formatNumber(stats.approvedUsers),
      description: "approved 상태",
      icon: CheckCircleIcon,
      color: "text-green-600"
    },
    {
      title: "관리자",
      value: formatNumber(stats.adminUsers),
      description: "admin 역할",
      icon: ShieldCheckIcon,
      color: "text-purple-600"
    }
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {statCards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-gray-500 flex items-center gap-1">
                <Icon className="w-4 h-4" />
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-lg sm:text-2xl font-bold ${card.color}`}>
                {card.value}
              </div>
              <p className="text-xs text-gray-500 hidden sm:block">
                {card.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}