"use server"

import { createServerActionClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export interface UserProfile {
  id: string
  email: string
  full_name: string
  role: "manager" | "salesperson"
  created_at: string
  updated_at: string
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()

  return profile
}

export async function requireAuth(): Promise<UserProfile> {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/auth/login")
  }
  return user
}

export async function requireManager(): Promise<UserProfile> {
  const user = await requireAuth()
  if (user.role !== "manager") {
    redirect("/auth/login")
  }
  return user
}

export async function requireSalesperson(): Promise<UserProfile> {
  const user = await requireAuth()
  if (user.role !== "salesperson") {
    redirect("/auth/login")
  }
  return user
}

export function hasPermission(userRole: string, requiredRole: string): boolean {
  const roleHierarchy = {
    manager: 2,
    salesperson: 1,
  }

  return (
    roleHierarchy[userRole as keyof typeof roleHierarchy] >= roleHierarchy[requiredRole as keyof typeof roleHierarchy]
  )
}

export async function logAuditEvent(
  action: string,
  tableName: string,
  recordId?: string,
  oldValues?: any,
  newValues?: any,
) {
  const user = await getCurrentUser()
  if (!user) return

  const cookieStore = cookies()
  const supabase = createServerActionClient({ cookies: () => cookieStore })

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action,
    table_name: tableName,
    record_id: recordId,
    old_values: oldValues,
    new_values: newValues,
  })
}
