import { POSInterface } from '@/components/pos-interface';
import { requireAuth } from '@/lib/auth-middleware';

export default async function POSPage() {
  await requireAuth(['admin', 'manager', 'head_of_sales', 'salesperson']);

  return <POSInterface />;
}