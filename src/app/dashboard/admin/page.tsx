import { AdminDashboard } from '@/components/admin-dashboard';
import { requireAuth } from '@/lib/auth-middleware';

export default async function AdminDashboardPage() {
  await requireAuth(['admin']);

  return <AdminDashboard />;
}