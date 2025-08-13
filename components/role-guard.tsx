"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { getCurrentUser, hasPermission } from "@/lib/auth-utils"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole: "manager" | "salesperson"
  fallback?: React.ReactNode
}

export default function RoleGuard({ children, requiredRole, fallback }: RoleGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await getCurrentUser()
        if (user && hasPermission(user.role, requiredRole)) {
          setHasAccess(true)
        } else {
          setHasAccess(false)
        }
      } catch {
        setHasAccess(false)
      }
    }

    checkAccess()
  }, [requiredRole])

  if (hasAccess === null) {
    return <div className="flex items-center justify-center p-8">Loading...</div>
  }

  if (!hasAccess) {
    return fallback || <div className="text-center p-8 text-gray-500">Access denied</div>
  }

  return <>{children}</>
}
