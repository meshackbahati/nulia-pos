import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShoppingCart, BarChart3, Users } from "lucide-react"
import Link from "next/link"

export default async function Home() {
  // If Supabase is not configured, show setup message
  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Connect Supabase to get started</h1>
          <p className="text-gray-600">Please configure your Supabase integration to use BorderShop.</p>
        </div>
      </div>
    )
  }

  // Check if user is already logged in
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is logged in, redirect to appropriate dashboard
  if (user) {
    const { data: profile } = await supabase.from("users").select("role").eq("email", user.email).single()

    if (profile?.role === "manager") {
      redirect("/dashboard/manager")
    } else {
      redirect("/dashboard/salesperson")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">BorderShop</h1>
            </div>
            <Link href="/auth/login">
              <Button className="bg-blue-600 hover:bg-blue-700">Sign In</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-gray-900 mb-6">Complete BorderShop Management System</h2>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Streamline your retail operations with IoT barcode scanning, inventory management, sales tracking, and
            comprehensive reporting - all in one powerful platform.
          </p>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <BarChart3 className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Smart Analytics</h3>
              <p className="text-gray-600">
                Real-time sales reports, inventory tracking, and business insights to optimize your operations.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <ShoppingCart className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">IoT Integration</h3>
              <p className="text-gray-600">
                Seamless barcode scanning with IoT devices for fast checkout and accurate inventory management.
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Role-Based Access</h3>
              <p className="text-gray-600">
                Secure access controls for managers and salespersons with appropriate permissions and features.
              </p>
            </div>
          </div>

          <Link href="/auth/login">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              Get Started Today
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
