import { InstallationForm } from '@/components/installation-form';
import { checkAdminExists } from '@/lib/services/user-service';
import { redirect } from 'next/navigation';

export default async function InstallPage() {
  // Check if admin already exists
  const adminExists = await checkAdminExists();
  
  if (adminExists) {
    redirect('/auth/login');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">RP</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome to RetailPro</h1>
            <p className="text-gray-600 mt-2">
              Let's set up your multi-branch retail management system
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">🚀 System Installation</h3>
            <p className="text-blue-800 text-sm">
              Create your administrator account to get started. You'll be able to:
            </p>
            <ul className="text-blue-800 text-sm mt-2 space-y-1">
              <li>• Manage multiple branches</li>
              <li>• Create user accounts</li>
              <li>• Configure payment systems</li>
              <li>• Set up inventory management</li>
            </ul>
          </div>

          <InstallationForm />
        </div>
      </div>
    </div>
  );
}