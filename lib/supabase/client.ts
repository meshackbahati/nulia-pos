import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Check if Supabase environment variables are available
export const isSupabaseConfigured =
  typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
  typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0

// Create a singleton instance of the Supabase client for Client Components
export const supabase = isSupabaseConfigured ? createClientComponentClient() : {
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithPassword: () => Promise.resolve({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
    signOut: () => Promise.resolve({ error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
  },
  from: () => ({
    select: () => ({ 
      eq: () => ({ 
        single: () => Promise.resolve({ data: null, error: { message: "Supabase not configured" } }),
        data: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } })
      })
    }),
    insert: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } }),
    update: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } }),
    delete: () => Promise.resolve({ data: [], error: { message: "Supabase not configured" } }),
  })
} as any
