import { redirect } from "next/navigation"

export default async function Home() {
  // This ensures the login page with role selection always appears first
  redirect("/auth/login")
}
