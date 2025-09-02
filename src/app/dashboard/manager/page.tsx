import { ManagerDashboard } from '@/components/manager-dashboard';
import { requireAuth } from '@/lib/auth-middleware';

export default async function ManagerDashboardPage() {
  await requireAuth(['admin', 'manager', 'head_of_sales']);

  return <ManagerDashboard />;
}