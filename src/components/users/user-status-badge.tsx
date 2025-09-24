"use client"

import { Badge } from "@/components/ui/badge"

interface UserStatusBadgeProps {
  status: string | null
}

export default function UserStatusBadge({ status }: UserStatusBadgeProps) {
  const getStatusConfig = (status: string | null) => {
    switch (status) {
      case 'approved':
        return {
          label: '활성',
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        }
      case 'pending':
        return {
          label: '대기중',
          className: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
        }
      case 'rejected':
        return {
          label: '거부됨',
          className: 'bg-red-100 text-red-800 hover:bg-red-100'
        }
      default:
        return {
          label: '알 수 없음',
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
        }
    }
  }

  const config = getStatusConfig(status)

  return (
    <Badge className={config.className}>
      {config.label}
    </Badge>
  )
}