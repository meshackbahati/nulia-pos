"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { getCurrentUser } from "@/lib/auth-utils"
import { hasPermission } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, AlertTriangle } from "lucide-react"

interface RoleGuardProps {
  children: React.ReactNode
  requiredRole: "manager" | "salesperson"
  fallback?: React.ReactNode
}

export default function RoleGuard({ children, requiredRole, fallback }: RoleGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const user = await getCurrentUser()
        if (user) {
          setUserRole(user.role)
          if (hasPermission(user.role, requiredRole)) {
            setHasAccess(true)
          } else {
            setHasAccess(false)
          }
        } else {
          setHasAccess(false)
        }
      } catch (error) {
        console.error("[ATHENA] Role check failed:", error)
        setHasAccess(false)
      }
    }

    checkAccess()
  }, [requiredRole])

  if (hasAccess === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Verifying access...</span>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      fallback || (
        <Card className="max-w-md mx-auto mt-8">
          <CardContent className="text-center p-8">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-4">You don't have permission to access this area.</p>
            {userRole && (
              <p className="text-sm text-gray-500">
                Current role: <span className="font-medium capitalize">{userRole}</span>
                <br />
                Required role: <span className="font-medium capitalize">{requiredRole}</span>
              </p>
            )}
            <div className="mt-4">
              <Shield className="h-6 w-6 text-gray-400 mx-auto" />
            </div>
          </CardContent>
        </Card>
      )
    )
  }

  return <>{children}</>
}
