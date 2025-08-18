const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kwjhjayrqaazdzuyefxv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3amhqYXlycWFhemR6dXllZnh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1Nzg1NSwiZXhwIjoyMDcwNjMzODU1fQ.NLBLf2j_OSgoTkr_rcYMoT9HeKuBw5caKY50wgkZcMw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkDatabaseSetup() {
  console.log('🔍 Checking Supabase database setup...')
  
  try {
    // Check if main tables exist
    const tablesToCheck = ['products', 'users', 'sales', 'sale_items']
    
    for (const table of tablesToCheck) {
      console.log(`\n📋 Checking table: ${table}`)
      const { data, error } = await supabase.from(table).select('*').limit(1)
      
      if (error) {
        console.log(`❌ Table ${table} error:`, error.message)
      } else {
        console.log(`✅ Table ${table} exists and is accessible`)
        console.log(`   Sample data count: ${data ? data.length : 0}`)
      }
    }
    
    // Check auth users
    console.log('\n👥 Checking auth users...')
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      console.log('❌ Auth users error:', authError.message)
    } else {
      console.log(`✅ Auth system working. Users count: ${authData.users.length}`)
    }
    
    console.log('\n🎯 Database check complete!')
    
  } catch (err) {
    console.error('❌ Database check failed:', err)
  }
}

checkDatabaseSetup()