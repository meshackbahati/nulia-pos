import { createClient, isSupabaseConfigured } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

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

  redirect("/auth/login")
}
