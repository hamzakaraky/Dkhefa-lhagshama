import AdminGate from '@/components/admin/AdminGate'
import AdminInsights from '@/screens/admin/AdminInsights'

export default function AdminInsightsPage() {
  return (
    <AdminGate>
      <AdminInsights />
    </AdminGate>
  )
}
