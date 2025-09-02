import { LoginForm } from '@/components/login-form';
import { checkAdminExists } from '@/lib/services/user-service';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  // Check if system is installed
  const adminExists = await checkAdminExists();
  
  if (!adminExists) {
    redirect('/install');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">RP</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">RetailPro POS</h1>
            <p className="text-gray-600 mt-2">
              Sign in to your account
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 text-center text-sm text-gray-600">
            <p>Multi-branch retail management system</p>
          </div>
        </div>
      </div>
    </div>
  );
}