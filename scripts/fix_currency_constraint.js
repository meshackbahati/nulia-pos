const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://kwjhjayrqaazdzuyefxv.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3amhqYXlycWFhemR6dXllZnh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTA1Nzg1NSwiZXhwIjoyMDcwNjMzODU1fQ.NLBLf2j_OSgoTkr_rcYMoT9HeKuBw5caKY50wgkZcMw'

const supabase = createClient supabaseUrl, supabaseServiceKey)

async function fixProducts() {
  console.log('🔧 Fixing product currencies...')
  
  try {
    // First let's see what currencies are currently allowed
    console.log('📋 Checking current products...')
    const { data: existingProducts, error } = await supabase
      .from('products')
      .select('*')
    
    if (error) throw error
    
    console.log('Current products:', existingProducts?.length || 0)
    if (existingProducts && existingProducts.length > 0) {
      console.log('Sample product currency:', existingProducts[0].currency)
    }
    
    // Create sample products with KES currency (seems to be what's configured)
    console.log('\n📦 Creating products with KES currency...')
    const sampleProducts = [
      {
        name: 'Coca Cola 500ml',
        category: 'Beverages',
        price: 70, // KES equivalent
        quantity: 50,
        barcode: '1234567890123',
        currency: 'KES',
        low_stock_threshold: 10,
        reorder_point: 20,
        is_active: true
      },
      {
        name: 'White Bread Loaf',
        category: 'Bakery',
        price: 85,
        quantity: 25,
        barcode: '2345678901234',
        currency: 'KES',
        low_stock_threshold: 5,
        reorder_point: 10,
        is_active: true
      },
      {
        name: 'Fresh Milk 1L',
        category: 'Dairy',
        price: 120,
        quantity: 30,
        barcode: '3456789012345',
        currency: 'KES',
        low_stock_threshold: 8,
        reorder_point: 15,
        is_active: true
      }
    ]
    
    for (const product of sampleProducts) {
      const { error } = await supabase
        .from('products')
        .upsert(product, { onConflict: 'barcode' })
      
      if (error) {
        console.log(`❌ Product ${product.name} error:`, error.message)
      } else {
        console.log(`✅ Product added: ${product.name} - ${product.currency} ${product.price}`)
      }
    }
    
    console.log('\n✅ Products fixed!')
    
  } catch (error) {
    console.error('❌ Fix failed:', error)
  }
}

fixProducts()