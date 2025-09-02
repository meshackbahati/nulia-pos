/*
# Demo Data Seeder

Creates sample data for development and testing:
1. Demo branches with different configurations
2. Sample products across various categories
3. Initial inventory for each branch
4. Demo users with different roles

This seeder only runs if SEED_SAMPLE_DATA=true in environment
*/

'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface, Sequelize) {
    // Only seed if explicitly enabled
    if (process.env.SEED_SAMPLE_DATA !== 'true') {
      console.log('Skipping demo data seeding (SEED_SAMPLE_DATA not enabled)');
      return;
    }

    const now = new Date();

    // Create demo branches
    const branches = [
      {
        id: uuidv4(),
        name: 'Downtown Store',
        address: '123 Main Street, Downtown, City',
        phone: '+1234567890',
        email: 'downtown@retailpro.com',
        currency: 'USD',
        currencySymbol: '$',
        timezone: 'America/New_York',
        isActive: true,
        metadata: { type: 'flagship', size: 'large' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'Mall Branch',
        address: '456 Shopping Mall, Level 2, City',
        phone: '+1234567891',
        email: 'mall@retailpro.com',
        currency: 'USD',
        currencySymbol: '$',
        timezone: 'America/New_York',
        isActive: true,
        metadata: { type: 'mall', size: 'medium' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'Nairobi Branch',
        address: 'Westlands, Nairobi, Kenya',
        phone: '+254712345678',
        email: 'nairobi@retailpro.com',
        currency: 'KES',
        currencySymbol: 'KES',
        timezone: 'Africa/Nairobi',
        isActive: true,
        metadata: { type: 'international', size: 'large' },
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert('branches', branches);

    // Create demo users
    const hashedPassword = await bcrypt.hash('password123', 12);
    const users = [
      {
        id: uuidv4(),
        email: 'admin@retailpro.com',
        password: hashedPassword,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        branchId: null,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        email: 'manager.downtown@retailpro.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Manager',
        role: 'manager',
        branchId: branches[0].id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        email: 'sales.downtown@retailpro.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'Salesperson',
        role: 'salesperson',
        branchId: branches[0].id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        email: 'manager.nairobi@retailpro.com',
        password: hashedPassword,
        firstName: 'David',
        lastName: 'Kimani',
        role: 'manager',
        branchId: branches[2].id,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert('users', users);

    // Create demo products
    const products = [
      {
        id: uuidv4(),
        name: 'Coca Cola 500ml',
        description: 'Refreshing cola drink',
        category: 'Beverages',
        brand: 'Coca Cola',
        basePrice: 2.50,
        costPrice: 1.50,
        sku: 'COKE-500ML',
        barcode: '1234567890123',
        imageUrl: 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg',
        isActive: true,
        metadata: { volume: '500ml', type: 'carbonated' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'White Bread Loaf',
        description: 'Fresh white bread',
        category: 'Bakery',
        brand: 'Fresh Bakery',
        basePrice: 3.00,
        costPrice: 1.80,
        sku: 'BREAD-WHITE',
        barcode: '2345678901234',
        imageUrl: 'https://images.pexels.com/photos/209206/pexels-photo-209206.jpeg',
        isActive: true,
        metadata: { weight: '800g', type: 'fresh' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'Bananas (per kg)',
        description: 'Fresh yellow bananas',
        category: 'Fruits',
        brand: 'Local Farm',
        basePrice: 4.00,
        costPrice: 2.50,
        sku: 'BANANA-KG',
        barcode: '3456789012345',
        imageUrl: 'https://images.pexels.com/photos/2872755/pexels-photo-2872755.jpeg',
        isActive: true,
        metadata: { unit: 'kg', type: 'fresh' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'Milk 1L',
        description: 'Fresh whole milk',
        category: 'Dairy',
        brand: 'Farm Fresh',
        basePrice: 3.50,
        costPrice: 2.20,
        sku: 'MILK-1L',
        barcode: '4567890123456',
        imageUrl: 'https://images.pexels.com/photos/236010/pexels-photo-236010.jpeg',
        isActive: true,
        metadata: { volume: '1L', type: 'dairy' },
        createdAt: now,
        updatedAt: now,
      },
      {
        id: uuidv4(),
        name: 'Rice 2kg',
        description: 'Premium white rice',
        category: 'Grains',
        brand: 'Premium Grains',
        basePrice: 8.00,
        costPrice: 5.50,
        sku: 'RICE-2KG',
        barcode: '5678901234567',
        imageUrl: 'https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg',
        isActive: true,
        metadata: { weight: '2kg', type: 'staple' },
        createdAt: now,
        updatedAt: now,
      },
    ];

    await queryInterface.bulkInsert('products', products);

    // Create inventory for each branch
    const inventory = [];
    branches.forEach(branch => {
      products.forEach(product => {
        inventory.push({
          id: uuidv4(),
          branchId: branch.id,
          productId: product.id,
          variantId: null,
          quantity: Math.floor(Math.random() * 100) + 50, // Random stock between 50-150
          reservedQuantity: 0,
          minStockLevel: 10,
          maxStockLevel: 200,
          lastRestockedAt: now,
          createdAt: now,
          updatedAt: now,
        });
      });
    });

    await queryInterface.bulkInsert('inventory', inventory);

    console.log('✅ Demo data seeded successfully');
    console.log('📧 Demo accounts created:');
    console.log('   Admin: admin@retailpro.com / password123');
    console.log('   Manager: manager.downtown@retailpro.com / password123');
    console.log('   Salesperson: sales.downtown@retailpro.com / password123');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('inventory', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('branches', null, {});
  }
};