"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export interface UserProfile {
  id: string
  auth_user_id: string
  email: string
  full_name: string
  role: "manager" | "salesperson"
  is_active: boolean
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

  return profile && profile.length > 0 ? profile[0] : null
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

// This is for the custom salesperson session, not Supabase Auth
export async function validateSalespersonSession(searchParams: { [key: string]: string | string[] | undefined }): Promise<UserProfile> {
  const sessionToken = searchParams?.session;

  if (!sessionToken || typeof sessionToken !== 'string') {
    redirect("/auth/login?error=session_missing");
  }

  try {
    const decodedToken = Buffer.from(sessionToken, 'base64').toString('utf-8');
    const sessionData = JSON.parse(decodedToken);

    // Basic validation
    if (sessionData.role !== 'salesperson' || !sessionData.userId) {
      throw new Error("Invalid session data");
    }

    // This is a simplified user object, but it should match the UserProfile shape
    // as much as possible for compatibility with the dashboard component.
    const user: UserProfile = {
      id: sessionData.userId,
      email: sessionData.email,
      full_name: sessionData.fullName,
      role: 'salesperson',
      // These fields are not in the token, so we can fill them with placeholders
      auth_user_id: '', // Salespersons don't have a Supabase auth_user_id
      is_active: true, // Assume active if they have a valid token
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return user;
  } catch (error) {
    redirect("/auth/login?error=session_invalid");
  }
}
