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

  if (role === "manager") {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return { error: "Invalid manager credentials" }
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role, full_name, is_active, auth_user_id")
      .eq("auth_user_id", authData.user.id)
      .eq("role", "manager")
      .maybeSingle()

    if (userError) {
      await supabase.auth.signOut()
      return { error: "Database query failed: " + userError.message }
    }

    if (!userData) {
      await supabase.auth.signOut()
      return { error: "Manager account not found or inactive" }
    }

    const isActive = userData.is_active === true || userData.is_active === "true"
    if (!isActive) {
      await supabase.auth.signOut()
      return { error: "Manager account is inactive" }
    }

    redirect("/dashboard/manager")
  } else {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name, role, password_hash, is_active")
      .eq("email", email)
      .eq("role", "salesperson")
      .maybeSingle()

    if (userError) {
      return { error: "Database query failed: " + userError.message }
    }

    if (!userData) {
      return { error: "Salesperson account not found" }
    }

    const isActive = userData.is_active === true || userData.is_active === "true"
    if (!isActive) {
      return { error: "Salesperson account is inactive" }
    }

    if (!userData.password_hash) {
      return { error: "Salesperson account not properly configured" }
    }

    const passwordMatch = await bcrypt.compare(password, userData.password_hash)
    if (!passwordMatch) {
      return { error: "Invalid salesperson credentials" }
    }

    const sessionData = {
      userId: userData.id,
      email: userData.email,
      role: userData.role,
      fullName: userData.full_name,
      loginTime: new Date().toISOString(),
    }

    const sessionToken = Buffer.from(JSON.stringify(sessionData)).toString("base64")
    redirect(`/dashboard/salesperson?session=${encodeURIComponent(sessionToken)}`)
  }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
