const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kwjhjayrqaazdzuyefxv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3amhqYXlycWFhemR6dXllZnh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1Nzg1NSwiZXhwIjoyMDcwNjMzODU1fQ.NLBLf2j_OSgoTkr_rcYMoT9HeKuBw5caKY50wgkZcMw'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupTestData() {
  console.log('🚀 Setting up test data for supermarket system...')
  
  try {
    // 1. Create manager auth account
    console.log('\n👤 Creating manager account...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'manager@bordershop.com',
      password: 'Manager123!',
      email_confirm: true
    })
    
    if (authError && !authError.message.includes('already been registered')) {
      throw authError
    }
    
    let authUserId = authData?.user?.id
    if (!authUserId) {
      // If user already exists, get their ID
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers.users.find(u => u.email === 'manager@bordershop.com')
      authUserId = existingUser?.id
    }
    
    console.log('✅ Manager auth account ready')
    
    // 2. Create/update user profile
    if (authUserId) {
      console.log('\n📝 Creating manager profile...')
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          auth_user_id: authUserId,
          email: 'manager@bordershop.com',
          full_name: 'System Manager',
          role: 'manager',
          is_active: true
        })
      
      if (profileError) throw profileError
      console.log('✅ Manager profile created')
    }
    
    // 3. Create sample products
    console.log('\n📦 Creating sample products...')
    const sampleProducts = [
      {
        name: 'Coca Cola 500ml',
        category: 'Beverages',
        price: 2500,
        quantity: 50,
        barcode: '1234567890123',
        currency: 'UGX',
        low_stock_threshold: 10,
        reorder_point: 20,
        is_active: true
      },
      {
        name: 'White Bread Loaf',
        category: 'Bakery',
        price: 3000,
        quantity: 25,
        barcode: '2345678901234',
        currency: 'UGX',
        low_stock_threshold: 5,
        reorder_point: 10,
        is_active: true
      },
      {
        name: 'Fresh Milk 1L',
        category: 'Dairy',
        price: 4500,
        quantity: 30,
        barcode: '3456789012345',
        currency: 'UGX',
        low_stock_threshold: 8,
        reorder_point: 15,
        is_active: true
      },
      {
        name: 'Rice 1kg',
        category: 'Grains',
        price: 6000,
        quantity: 40,
        barcode: '4567890123456',
        currency: 'UGX',
        low_stock_threshold: 12,
        reorder_point: 25,
        is_active: true
      },
      {
        name: 'Cooking Oil 1L',
        category: 'Cooking',
        price: 8500,
        quantity: 20,
        barcode: '5678901234567',
        currency: 'UGX',
        low_stock_threshold: 5,
        reorder_point: 10,
        is_active: true
      }
    ]
    
    for (const product of sampleProducts) {
      const { error } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'barcode' })
      
      if (error) {
        console.log(`⚠️  Product ${product.name} error:`, error.message)
      } else {
        console.log(`✅ Product added: ${product.name}`)
      }
    }
    
    // 4. Create salesperson accounts (non-auth)
    console.log('\n👥 Creating salesperson accounts...')
    const salespersons = [
      {
        email: 'john@bordershop.com',
        full_name: 'John Doe',
        role: 'salesperson',
        is_active: true
      },
      {
        email: 'jane@bordershop.com',
        full_name: 'Jane Smith',
        role: 'salesperson',
        is_active: true
      }
    ]
    
    for (const salesperson of salespersons) {
      const { error } = await supabase
        .from('users')
        .upsert(salesperson, { onConflict: 'email' })
      
      if (error) {
        console.log(`⚠️  Salesperson ${salesperson.full_name} error:`, error.message)
      } else {
        console.log(`✅ Salesperson added: ${salesperson.full_name}`)
      }
    }
    
    console.log('\n🎉 Test data setup complete!')
    console.log('\n📋 Login Credentials:')
    console.log('Manager: manager@bordershop.com / Manager123!')
    console.log('Salesperson: Use custom login with john@bordershop.com or jane@bordershop.com')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

setupTestData()