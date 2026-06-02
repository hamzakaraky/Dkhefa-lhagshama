import { useLanguage } from '@/contexts/LanguageContext'
import { getStatusColor } from '@/utils/helpers'
import type { RequestStatus } from '@/types'

interface StatusBadgeProps {
  status: RequestStatus
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useLanguage()
  return (
    <span className={`badge ${getStatusColor(status)}`}>
      {(t.status as Record<string, string>)[status] || status}
    </span>
  )
}