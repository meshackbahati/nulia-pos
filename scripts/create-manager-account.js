// Script to create the initial manager account in Supabase
// Run this in your browser console or as a Node.js script

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function createManagerAccount() {
  const { createClient } = await import("@supabase/supabase-js")

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: "manager@bordershop.com",
      password: "password123",
    })

    if (authError) {
      console.error("Auth Error:", authError.message)
      return
    }

    console.log("Auth user created:", authData.user?.id)

    // Create user profile
    const { error: profileError } = await supabase.from("users").insert({
      id: authData.user.id,
      full_name: "BorderShop Manager",
      email: "manager@bordershop.com",
      role: "manager",
      created_at: new Date().toISOString(),
    })

    if (profileError) {
      console.error("Profile Error:", profileError.message)
      return
    }

    console.log("✅ Manager account created successfully!")
    console.log("Email: manager@bordershop.com")
    console.log("Password: password123")
  } catch (error) {
    console.error("Error:", error)
  }
}

// Run the function
createManagerAccount()
