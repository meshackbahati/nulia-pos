"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export interface UserProfile {
  id: string
  auth_user_id: string
  email: string
  full_name: string
  role: "manager" | "salesperson"
  created_at: string
  updated_at: string
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } = await supabase.rpc("get_user_for_auth", {
    user_auth_id: user.id,
  })

  if (error) {
    console.error("[v0] Error fetching user profile:", error)
    return null
  }

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

export async function logAuditEvent(
  action: string,
  tableName: string,
  recordId?: string,
  oldValues?: any,
  newValues?: any,
) {
  const user = await getCurrentUser()
  if (!user) return

  const supabase = createClient()

  await supabase.from("audit_logs").insert({
    user_id: user.id,
    action,
    table_name: tableName,
    record_id: recordId,
    old_values: oldValues,
    new_values: newValues,
  })
}
