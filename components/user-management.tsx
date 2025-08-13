"use client"

import { useState, useActionState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Edit, Trash2, Key, Users, Shield } from "lucide-react"
import { createUser, updateUser, deleteUser, resetUserPassword } from "@/lib/user-actions"
import { useFormStatus } from "react-dom"

interface User {
  id: string
  email: string
  full_name: string
  role: "manager" | "salesperson"
  created_at: string
  updated_at: string
}

interface UserManagementProps {
  users: User[]
  currentUser: User
}

function SubmitButton({ children, ...props }: any) {
  const { pending } = useFormStatus()
  return (
    <Button {...props} disabled={pending}>
      {pending ? "Processing..." : children}
    </Button>
  )
}

export default function UserManagement({ users, currentUser }: UserManagementProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState<User | null>(null)
  const [newPassword, setNewPassword] = useState("")

  const [createState, createAction] = useActionState(createUser, null)

  const handleEdit = async (user: User, formData: FormData) => {
    try {
      await updateUser(user.id, {
        full_name: formData.get("fullName")?.toString() || "",
        role: formData.get("role")?.toString() || "",
      })
      setEditingUser(null)
      window.location.reload()
    } catch (error) {
      alert("Failed to update user")
    }
  }

  const handleDelete = async (user: User) => {
    if (user.id === currentUser.id) {
      alert("You cannot delete your own account")
      return
    }

    if (confirm(`Are you sure you want to delete ${user.full_name}?`)) {
      try {
        await deleteUser(user.id)
        window.location.reload()
      } catch (error) {
        alert("Failed to delete user")
      }
    }
  }

  const handlePasswordReset = async (user: User) => {
    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters long")
      return
    }

    try {
      await resetUserPassword(user.id, newPassword)
      setShowPasswordDialog(null)
      setNewPassword("")
      alert("Password reset successfully")
    } catch (error) {
      alert("Failed to reset password")
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>Manage user accounts and permissions</CardDescription>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.full_name}
                    {user.id === currentUser.id && (
                      <Badge variant="outline" className="ml-2">
                        You
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "manager" ? "default" : "secondary"} className="capitalize">
                      {user.role === "manager" && <Shield className="h-3 w-3 mr-1" />}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditingUser(user)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setShowPasswordDialog(user)}>
                        <Key className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user)}
                        disabled={user.id === currentUser.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Create User Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
              <DialogDescription>Add a new user account to the system</DialogDescription>
            </DialogHeader>
            <form action={createAction}>
              <div className="grid gap-4 py-4">
                {createState?.error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {createState.error}
                  </div>
                )}
                {createState?.success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                    {createState.success}
                  </div>
                )}
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" name="fullName" placeholder="Enter full name" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="Enter email address" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" name="password" type="password" placeholder="Enter password" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="role">Role</Label>
                  <Select name="role" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salesperson">Salesperson</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <SubmitButton className="bg-blue-600 hover:bg-blue-700">Create User</SubmitButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit User Dialog */}
        <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user information and permissions</DialogDescription>
            </DialogHeader>
            {editingUser && (
              <form action={(formData) => handleEdit(editingUser, formData)}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-fullName">Full Name</Label>
                    <Input
                      id="edit-fullName"
                      name="fullName"
                      defaultValue={editingUser.full_name}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input id="edit-email" value={editingUser.email} disabled className="bg-gray-100" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-role">Role</Label>
                    <Select name="role" defaultValue={editingUser.role} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="salesperson">Salesperson</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>
                    Cancel
                  </Button>
                  <SubmitButton className="bg-blue-600 hover:bg-blue-700">Update User</SubmitButton>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={!!showPasswordDialog} onOpenChange={(open) => !open && setShowPasswordDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>Set a new password for {showPasswordDialog?.full_name}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPasswordDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => showPasswordDialog && handlePasswordReset(showPasswordDialog)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Reset Password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
