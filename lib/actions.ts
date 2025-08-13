"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const supabase = createClient()

  try {
    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toString(),
      password: password.toString(),
    })

    if (authError) {
      return { error: authError.message }
    }

    // Query the users table to get the role using the authenticated user's ID
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, full_name")
      .eq("id", authData.user.id)
      .single()

    if (userError || !userData) {
      return { error: "User profile not found. Please contact your manager." }
    }

    // Redirect based on actual role from database
    if (userData.role === "manager") {
      redirect("/dashboard/manager")
    } else {
      redirect("/dashboard/salesperson")
    }

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
