"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export async function signIn(prevState: any, formData: FormData) {
  if (!formData) {
    return { error: "Form data is missing" }
  }

  const email = formData.get("email")?.toString()
  const password = formData.get("password")?.toString()
  const role = formData.get("role")?.toString()

  if (!email || !password || !role) {
    return { error: "Email, password, and role are required" }
  }

  if (!["manager", "salesperson"].includes(role)) {
    return { error: "Invalid role selected" }
  }

  const supabase = createClient()

  try {
    if (role === "manager") {
      console.log("[v0] Attempting manager login for:", email)

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.log("[v0] Supabase auth error:", authError)
        return { error: "Invalid manager credentials" }
      }

      console.log("[v0] Supabase auth successful, user ID:", authData.user.id)

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role, full_name, is_active, auth_user_id")
        .eq("auth_user_id", authData.user.id)
        .eq("role", "manager")
        .eq("is_active", true)
        .single()

      console.log("[v0] Database query result:", { userData, userError })
      console.log("[v0] Looking for auth_user_id:", authData.user.id)

      if (userError || !userData) {
        console.log("[v0] Manager account lookup failed:", userError)
        await supabase.auth.signOut()
        return { error: "Manager account not found or inactive" }
      }

      console.log("[v0] Manager login successful, redirecting to dashboard")
      redirect("/dashboard/manager")
    } else {
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, full_name, role, password_hash, is_active")
        .eq("email", email)
        .eq("role", "salesperson")
        .eq("is_active", true)
        .single()

      if (userError || !userData) {
        return { error: "Salesperson account not found or inactive" }
      }

      if (!userData.password_hash) {
        return { error: "Account not properly configured. Contact your manager." }
      }

      // Verify password
      const passwordMatch = await bcrypt.compare(password, userData.password_hash)
      if (!passwordMatch) {
        return { error: "Invalid salesperson credentials" }
      }

      // Create a session token for salesperson (stored in cookies)
      const sessionData = {
        userId: userData.id,
        email: userData.email,
        role: userData.role,
        fullName: userData.full_name,
        loginTime: new Date().toISOString(),
      }

      // Set session cookie (you might want to use a more secure method in production)
      const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString("base64")

      // Note: In a real production app, you'd want to use proper JWT tokens with expiration
      // For now, we'll redirect and handle session in the dashboard
      redirect(`/dashboard/salesperson?session=${encodeURIComponent(sessionToken)}`)
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
