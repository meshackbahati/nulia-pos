import { redirect } from 'next/navigation';
import { checkAdminExists } from '@/lib/services/user-service';

export default async function HomePage() {
  // Check if any admin user exists
  const adminExists = await checkAdminExists();
  
  if (!adminExists) {
    // Redirect to installation page
    redirect('/install');
  }
  
  // Redirect to login if admin exists
  redirect('/auth/login');
}