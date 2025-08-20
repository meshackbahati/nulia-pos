"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { requireManager, logAuditEvent } from "./auth-utils"
import bcrypt from "bcryptjs"

export async function createUser(prevState: any, formData: FormData) {
  try {
    // Verify manager permissions
    await requireManager()

    const email = formData.get("email")?.toString()
    const password = formData.get("password")?.toString()
    const fullName = formData.get("fullName")?.toString()
    const role = formData.get("role")?.toString()

    if (!email || !password || !fullName || !role) {
      return { error: "All fields are required" }
    }

    if (!["manager", "salesperson"].includes(role)) {
      return { error: "Invalid role specified" }
    }

    if (password.length < 6) {
      return { error: "Password must be at least 6 characters long" }
    }

    const supabase = createClient()

    // Check if user already exists
    const { data: existingUser } = await supabase.from("users").select("email").eq("email", email).single()

    if (existingUser) {
      return { error: "User with this email already exists" }
    }

    if (role === "manager") {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

      if (authError) {
        return { error: authError.message }
      }

      // Create manager profile
      if (authData.user) {
        const { error: profileError } = await supabase.from("users").insert({
          auth_user_id: authData.user.id,
          email,
          full_name: fullName,
          role,
          is_active: true,
        })

        if (profileError) {
          return { error: "Failed to create manager profile" }
        }

        await logAuditEvent("MANAGER_CREATED", "users", authData.user.id, null, {
          email,
          full_name: fullName,
          role,
        })
      }
    } else {
      const passwordHash = await bcrypt.hash(password, 12)

      const { data: userData, error: profileError } = await supabase
        .from("users")
        .insert({
          email,
          full_name: fullName,
          role,
          password_hash: passwordHash,
          is_active: true,
        })
        .select()
        .single()

      if (profileError) {
        return { error: "Failed to create salesperson account" }
      }

      await logAuditEvent("SALESPERSON_CREATED", "users", userData.id, null, {
        email,
        full_name: fullName,
        role,
      })
    }

    revalidatePath("/dashboard/manager")
    return { success: `${role === "manager" ? "Manager" : "Salesperson"} account created successfully` }
  } catch (error) {
    console.error("Create user error:", error)
    return { error: "Failed to create user account" }
  }
}

export async function updateUser(userId: string, userData: { full_name: string; role: string }) {
  try {
    // Verify manager permissions
    await requireManager()

    const supabase = createClient()

    // Get old values for audit
    const { data: oldUser } = await supabase.from("users").select("*").eq("id", userId).single()

    // Update user
    const { error } = await supabase
      .from("users")
      .update({
        full_name: userData.full_name,
        role: userData.role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)

    if (error) {
      throw new Error(error.message)
    }

    // Log audit event
    await logAuditEvent("USER_UPDATED", "users", userId, oldUser, userData)

    revalidatePath("/dashboard/manager")
  } catch (error) {
    console.error("Update user error:", error)
    throw error
  }
}

export async function deleteUser(userId: string) {
  try {
    // Verify manager permissions
    await requireManager()

    const supabase = createClient()

    // Get user data for audit
    const { data: userData } = await supabase.from("users").select("*").eq("id", userId).single()
    
    if (!userData) {
      throw new Error("User not found")
    }

    // Delete auth user first if it's a manager
    if (userData.role === 'manager') {
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      if (authError) {
        console.error("Failed to delete auth user:", authError)
        throw new Error("Failed to delete user's authentication data")
      }
    }

    // Delete user profile
    const { error: profileError } = await supabase
      .from("users")
      .delete()
      .eq("id", userId)
      .select()
      .single()

    if (profileError) {
      throw new Error(profileError.message)
    }

    // Log audit event
    await logAuditEvent("USER_DELETED", "users", userId, userData, null)

    revalidatePath("/dashboard/manager")
    return { success: true, message: "User deleted successfully" }
  } catch (error) {
    console.error("Delete user error:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to delete user"
    return { success: false, error: errorMessage }
  }
}

export async function getAllUsers() {
  try {
    // Verify manager permissions
    await requireManager()

    const supabase = createClient()

    const { data: users, error } = await supabase.from("users").select("*").order("created_at", { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return users
  } catch (error) {
    console.error("Get users error:", error)
    throw error
  }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    // Verify manager permissions
    await requireManager()

    if (newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters long")
    }

    const supabase = createClient()

    // Get user info to determine auth type
    const { data: userData } = await supabase.from("users").select("role, auth_user_id").eq("id", userId).single()

    if (!userData) {
      throw new Error("User not found")
    }

    if (userData.role === "manager" && userData.auth_user_id) {
      const { error } = await supabase.auth.admin.updateUserById(userData.auth_user_id, {
        password: newPassword,
      })

      if (error) {
        throw new Error(error.message)
      }
    } else {
      const passwordHash = await bcrypt.hash(newPassword, 12)

      const { error } = await supabase.from("users").update({ password_hash: passwordHash }).eq("id", userId)

      if (error) {
        throw new Error(error.message)
      }
    }

    // Log audit event
    await logAuditEvent("PASSWORD_RESET", "users", userId, null, { password_reset: true })

    revalidatePath("/dashboard/manager")
  } catch (error) {
    console.error("Reset password error:", error)
    throw error
  }
}
