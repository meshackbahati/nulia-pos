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

    // Query the users table to get the role
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("email", email.toString())
      .single()

    if (userError || !userData) {
      // If user doesn't exist in users table, create a default entry
      const role = email.toString().includes("manager") ? "manager" : "salesperson"

      await supabase.from("users").insert({
        email: email.toString(),
        role: role,
        full_name: role === "manager" ? "Store Manager" : "Sales Person",
      })

      // Redirect based on email pattern as fallback
      if (role === "manager") {
        redirect("/dashboard/manager")
      } else {
        redirect("/dashboard/salesperson")
      }
    } else {
      // Redirect based on actual role from database
      if (userData.role === "manager") {
        redirect("/dashboard/manager")
      } else {
        redirect("/dashboard/salesperson")
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

// Sign up function for creating new users (managers only)
export async function signUp(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")
  const password = formData.get("password")
  const fullName = formData.get("fullName")
  const role = formData.get("role")

  if (!email || !password || !fullName || !role) {
    return { error: "All fields are required" }
  }

  const supabase = createClient()

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toString(),
      password: password.toString(),
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/dashboard`,
      },
    })

    if (authError) {
      return { error: authError.message }
    }

    // Add user to users table
    if (authData.user) {
      await supabase.from("users").insert({
        email: email.toString(),
        role: role.toString(),
        full_name: fullName.toString(),
      })
    }

    return { success: "User account created successfully. Check email to confirm account." }
  } catch (error) {
    console.error("Sign up error:", error)
    return { error: "An unexpected error occurred. Please try again." }
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
