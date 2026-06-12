import AdminGate from '@/components/admin/AdminGate'
import AdminCategoriesPage from '@/screens/admin/AdminCategoriesPage'

export default function AdminCategories() {
  return (
    <AdminGate>
      <AdminCategoriesPage />
    </AdminGate>
  )
}
