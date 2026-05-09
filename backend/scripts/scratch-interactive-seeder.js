/*
# Interactive Data Seeder
Interactive version for the retail system
Uses your Sequelize models structure
Located in: seeders/interactive-seeder.js
*/

'use strict';

import { sequelize } from '../models/index.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import readline from 'readline';
import models from '../models/index.js';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for console
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m'
};

// Helper functions
const ask = (question) => {
  return new Promise((resolve) => {
    rl.question(colors.cyan + question + colors.reset, (answer) => {
      resolve(answer.trim());
    });
  });
};

const askYesNo = async (question) => {
  const answer = await ask(`${question} (y/n): `);
  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
};

const printSection = (title) => {
  console.log(colors.magenta + '\n' + '═'.repeat(60) + colors.reset);
  console.log(colors.yellow + `📌 ${title}` + colors.reset);
  console.log(colors.magenta + '═'.repeat(60) + colors.reset);
};

const printSuccess = (message) => {
  console.log(colors.green + `✅ ${message}` + colors.reset);
};

const printInfo = (message) => {
  console.log(colors.blue + `ℹ️  ${message}` + colors.reset);
};

const printWarning = (message) => {
  console.log(colors.yellow + `⚠️  ${message}` + colors.reset);
};

const printError = (message) => {
  console.log(colors.red + `❌ ${message}` + colors.reset);
};

// Main interactive seeder
class InteractiveSeeder {
  constructor() {
    this.now = new Date();
    this.branches = [];
    this.products = [];
    this.users = [];
    this.inventory = [];
  }

  async start() {
    try {
      this.showWelcome();
      
      // Connect to database
      await this.connectToDatabase();
      
      // Check existing data
      await this.checkExistingData();
      
      // Collect data
      await this.collectBranches();
      await this.collectProducts();
      await this.collectUsers();
      
      // Review and confirm
      await this.reviewData();
      
      // Generate inventory
      await this.generateInventory();
      
      // Save to database
      await this.saveToDatabase();
      
      this.showSuccessMessage();
      
    } catch (error) {
      printError(`Seeder failed: ${error.message}`);
      console.error(error.stack);
    } finally {
      rl.close();
      process.exit(0);
    }
  }

  showWelcome() {
    console.log(colors.cyan + '='.repeat(70) + colors.reset);
    console.log(colors.yellow + '🛍️  RETAIL MANAGEMENT SYSTEM - INTERACTIVE SEEDER' + colors.reset);
    console.log(colors.cyan + '='.repeat(70) + colors.reset);
    console.log(colors.blue + 'This tool will guide you through creating custom data for your system.' + colors.reset);
    console.log(colors.blue + 'All data will be saved directly to your database.\n' + colors.reset);
    console.log(colors.white + 'Press Ctrl+C at any time to cancel the process.\n' + colors.reset);
  }

  async connectToDatabase() {
    printInfo('Connecting to database...');
    try {
      await sequelize.authenticate();
      printSuccess('Database connection established!');
    } catch (error) {
      printError(`Database connection failed: ${error.message}`);
      throw error;
    }
  }

  async checkExistingData() {
    printInfo('Checking for existing data...');
    
    try {
      const branchCount = await models.Branch.count();
      const productCount = await models.Product.count();
      const userCount = await models.User.count();
      
      if (branchCount > 0 || productCount > 0 || userCount > 0) {
        printWarning(`Found existing data: ${branchCount} branches, ${productCount} products, ${userCount} users`);
        
        const clearData = await askYesNo('Do you want to clear all existing data before seeding?');
        if (clearData) {
          printInfo('Clearing existing data...');
          
          // Clear in correct order (respecting foreign keys)
          await models.Inventory.destroy({ where: {} });
          await models.SaleItem.destroy({ where: {} });
          await models.Sale.destroy({ where: {} });
          await models.User.destroy({ where: {} });
          await models.Product.destroy({ where: {} });
          await models.Branch.destroy({ where: {} });
          
          printSuccess('Existing data cleared!');
        } else {
          printInfo('Keeping existing data. New data will be added.');
        }
      }
    } catch (error) {
      // Tables might not exist yet, that's OK
      printInfo('No existing data found or tables not created yet.');
    }
  }

  async collectBranches() {
    printSection('STEP 1: CREATE STORE BRANCHES');
    console.log(colors.blue + 'Let\'s create your store branches. You need at least one branch.' + colors.reset);
    
    let branchNumber = 1;
    let continueAdding = true;
    
    while (continueAdding) {
      console.log(colors.cyan + `\n--- Creating Branch #${branchNumber} ---` + colors.reset);
      
      const branchData = {
        id: uuidv4(),
        name: await this.askRequired('Branch name: '),
        address: await this.askRequired('Address: '),
        phone: await this.askRequired('Phone number: '),
        email: await ask('Email address: ') || `branch${branchNumber}@store.com`,
        currency: await ask('Currency (USD, KES, EUR, etc): ') || 'USD',
        currencySymbol: await ask('Currency symbol ($, KES, €, etc): ') || '$',
        timezone: await ask('Timezone (default: UTC): ') || 'UTC',
        isActive: true,
        metadata: {}
      };
      
      // Add metadata
      if (await askYesNo('Would you like to add branch metadata (type, size, features)?')) {
        branchData.metadata = await this.collectMetadata();
      }
      
      this.branches.push(branchData);
      printSuccess(`Branch "${branchData.name}" added successfully!`);
      
      branchNumber++;
      continueAdding = await askYesNo('Add another branch?');
    }
  }

  async collectProducts() {
    printSection('STEP 2: CREATE PRODUCTS');
    console.log(colors.blue + 'Now let\'s add products to your inventory.' + colors.reset);
    
    const categories = [
      'Beverages', 'Bakery', 'Fruits', 'Vegetables', 'Dairy',
      'Meat & Poultry', 'Grains', 'Snacks', 'Frozen Foods',
      'Household', 'Personal Care', 'Electronics', 'Clothing'
    ];
    
    let productNumber = 1;
    let continueAdding = true;
    
    while (continueAdding) {
      console.log(colors.cyan + `\n--- Creating Product #${productNumber} ---` + colors.reset);
      
      // Show categories
      console.log(colors.yellow + '\nAvailable categories:' + colors.reset);
      categories.forEach((cat, index) => {
        console.log(`  ${index + 1}. ${cat}`);
      });
      console.log(`  ${categories.length + 1}. Custom category`);
      
      // Get category
      let category;
      const catChoice = await ask(`Select category (1-${categories.length + 1}): `);
      const catIndex = parseInt(catChoice) - 1;
      
      if (catIndex >= 0 && catIndex < categories.length) {
        category = categories[catIndex];
      } else {
        category = await this.askRequired('Enter custom category: ');
      }
      
      const productData = {
        id: uuidv4(),
        name: await this.askRequired('Product name: '),
        description: await this.askRequired('Description: '),
        category: category,
        brand: await ask('Brand: ') || 'Generic',
        basePrice: await this.askNumber('Selling price: '),
        costPrice: await this.askNumber('Cost price: '),
        sku: await this.generateSKU(productNumber),
        barcode: await ask('Barcode (optional): ') || null,
        imageUrl: await ask('Image URL (optional): ') || null,
        isActive: true,
        metadata: {}
      };
      
      // Add product specifications
      if (await askYesNo('Add product specifications (weight, size, color, etc)?')) {
        productData.metadata = await this.collectMetadata();
      }
      
      this.products.push(productData);
      printSuccess(`Product "${productData.name}" added successfully!`);
      
      productNumber++;
      continueAdding = await askYesNo('Add another product?');
    }
  }

  async collectUsers() {
    printSection('STEP 3: CREATE USERS');
    console.log(colors.blue + 'Now let\'s create user accounts for your system.' + colors.reset);
    
    const roles = [
      { id: 'admin', name: 'Administrator (full system access)' },
      { id: 'manager', name: 'Manager (branch management)' },
      { id: 'salesperson', name: 'Salesperson (sales operations)' },
      { id: 'cashier', name: 'Cashier (sales only)' },
      { id: 'inventory', name: 'Inventory Manager (stock control)' }
    ];
    
    let userNumber = 1;
    let continueAdding = true;
    
    while (continueAdding) {
      console.log(colors.cyan + `\n--- Creating User #${userNumber} ---` + colors.reset);
      
      // Show roles
      console.log(colors.yellow + '\nAvailable roles:' + colors.reset);
      roles.forEach((role, index) => {
        console.log(`  ${index + 1}. ${role.name}`);
      });
      
      // Get role
      let role;
      const roleChoice = await ask(`Select role (1-${roles.length}): `);
      const roleIndex = parseInt(roleChoice) - 1;
      
      if (roleIndex >= 0 && roleIndex < roles.length) {
        role = roles[roleIndex].id;
      } else {
        role = 'salesperson';
      }
      
      const userData = {
        id: uuidv4(),
        email: await this.askRequired('Email: '),
        password: await this.askRequired('Password: '),
        firstName: await this.askRequired('First name: '),
        lastName: await this.askRequired('Last name: '),
        role: role,
        branchId: null,
        isActive: true
      };
      
      // Assign branch if not admin
      if (role !== 'admin' && this.branches.length > 0) {
        console.log(colors.yellow + '\nAssign user to a branch:' + colors.reset);
        this.branches.forEach((branch, index) => {
          console.log(`  ${index + 1}. ${branch.name}`);
        });
        
        const branchChoice = await ask(`Select branch (1-${this.branches.length}): `);
        const branchIndex = parseInt(branchChoice) - 1;
        
        if (branchIndex >= 0 && branchIndex < this.branches.length) {
          userData.branchId = this.branches[branchIndex].id;
          printSuccess(`Assigned to ${this.branches[branchIndex].name}`);
        }
      } else if (role === 'admin') {
        printInfo('Admin users have access to all branches');
      }
      
      this.users.push(userData);
      printSuccess(`User "${userData.email}" added successfully!`);
      
      userNumber++;
      continueAdding = await askYesNo('Add another user?');
    }
  }

  async reviewData() {
    printSection('DATA REVIEW');
    
    console.log(colors.yellow + `🏪 BRANCHES (${this.branches.length}):` + colors.reset);
    this.branches.forEach((branch, index) => {
      console.log(`  ${index + 1}. ${branch.name} - ${branch.address} (${branch.currency} ${branch.currencySymbol})`);
    });
    
    console.log(colors.yellow + `\n📦 PRODUCTS (${this.products.length}):` + colors.reset);
    this.products.forEach((product, index) => {
      console.log(`  ${index + 1}. ${product.name} - ${product.category} - $${product.basePrice}`);
    });
    
    console.log(colors.yellow + `\n👤 USERS (${this.users.length}):` + colors.reset);
    this.users.forEach((user, index) => {
      const branchName = user.branchId 
        ? this.branches.find(b => b.id === user.branchId)?.name 
        : 'All branches (Admin)';
      console.log(`  ${index + 1}. ${user.email} - ${user.role} - ${branchName}`);
    });
    
    console.log(colors.magenta + '\n' + '─'.repeat(50) + colors.reset);
    
    const proceed = await askYesNo('Does everything look correct? Proceed to save?');
    if (!proceed) {
      printWarning('Seeder cancelled by user.');
      rl.close();
      process.exit(0);
    }
  }

  async generateInventory() {
    printInfo('Generating inventory for all branches...');
    
    // Get inventory settings
    printInfo('\nInventory Settings:');
    const defaultQuantity = parseInt(await ask('Default stock quantity per product: ') || '100');
    const minStock = parseInt(await ask('Minimum stock level (alert when below): ') || '10');
    const maxStock = parseInt(await ask('Maximum stock level: ') || '200');
    
    // Generate inventory for each branch and product
    for (const branch of this.branches) {
      for (const product of this.products) {
        this.inventory.push({
          id: uuidv4(),
          branchId: branch.id,
          productId: product.id,
          variantId: null,
          quantity: defaultQuantity,
          reservedQuantity: 0,
          minStockLevel: minStock,
          maxStockLevel: maxStock,
          lastRestockedAt: this.now,
          createdAt: this.now,
          updatedAt: this.now
        });
      }
    }
    
    printSuccess(`Generated ${this.inventory.length} inventory records`);
  }

  async saveToDatabase() {
    printSection('SAVING TO DATABASE');
    printInfo('Please wait while we save your data...');
    
    const transaction = await sequelize.transaction();
    
    try {
      // Save branches
      if (this.branches.length > 0) {
        for (const branch of this.branches) {
          await models.Branch.create(branch, { transaction });
        }
        printSuccess(`Saved ${this.branches.length} branches`);
      }
      
      // Save products
      if (this.products.length > 0) {
        for (const product of this.products) {
          await models.Product.create(product, { transaction });
        }
        printSuccess(`Saved ${this.products.length} products`);
      }
      
      // Save users (hash passwords first)
      if (this.users.length > 0) {
        for (const user of this.users) {
          const hashedPassword = await bcrypt.hash(user.password, 12);
          await models.User.create({
            ...user,
            password: hashedPassword
          }, { transaction });
        }
        printSuccess(`Saved ${this.users.length} users`);
      }
      
      // Save inventory
      if (this.inventory.length > 0) {
        for (const inv of this.inventory) {
          await models.Inventory.create(inv, { transaction });
        }
        printSuccess(`Saved ${this.inventory.length} inventory records`);
      }
      
      // Commit transaction
      await transaction.commit();
      printSuccess('Transaction committed successfully!');
      
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      printError(`Error saving data: ${error.message}`);
      throw error;
    }
  }

  showSuccessMessage() {
    console.log(colors.green + '\n' + '='.repeat(70) + colors.reset);
    console.log(colors.green + '🎉 DATA SEEDED SUCCESSFULLY!' + colors.reset);
    console.log(colors.green + '='.repeat(70) + colors.reset);
    
    console.log(colors.cyan + '\n📊 FINAL SUMMARY:' + colors.reset);
    console.log(`🏪 Branches: ${this.branches.length}`);
    console.log(`📦 Products: ${this.products.length}`);
    console.log(`👤 Users: ${this.users.length}`);
    console.log(`📋 Inventory Items: ${this.inventory.length}`);
    
    console.log(colors.yellow + '\n🔑 USER CREDENTIALS:' + colors.reset);
    this.users.forEach((user, index) => {
      const branchInfo = user.branchId 
        ? this.branches.find(b => b.id === user.branchId)?.name 
        : 'System Administrator';
      console.log(`${colors.white}${index + 1}. ${user.email}${colors.reset}`);
      console.log(`   Role: ${user.role} | Branch: ${branchInfo}`);
      console.log(`   Password: ${user.password}\n`);
    });
    
    console.log(colors.blue + '💡 You can now log in to your retail system.' + colors.reset);
    console.log(colors.blue + '🚀 System is ready for use!\n' + colors.reset);
  }

  // Helper methods
  async askRequired(question) {
    let answer = '';
    while (!answer.trim()) {
      answer = await ask(question);
      if (!answer.trim()) {
        printWarning('This field is required!');
      }
    }
    return answer.trim();
  }

  async askNumber(question) {
    let number;
    while (isNaN(number) || number === undefined) {
      const answer = await ask(question);
      number = parseFloat(answer);
      if (isNaN(number)) {
        printWarning('Please enter a valid number!');
      }
    }
    return number;
  }

  async collectMetadata() {
    const metadata = {};
    let addMore = true;
    
    console.log(colors.blue + '\nAdd metadata (key-value pairs). Press Enter on empty key to finish.' + colors.reset);
    
    while (addMore) {
      const key = await ask('Key (e.g., "size", "color", "weight"): ');
      if (!key.trim()) {
        addMore = false;
        continue;
      }
      
      const value = await ask(`Value for "${key}": `);
      metadata[key] = value;
      
      const another = await ask('Add another metadata field? (y/n): ');
      addMore = another.toLowerCase() === 'y';
    }
    
    return metadata;
  }

  generateSKU(productNumber) {
    const prefix = 'PROD';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${productNumber.toString().padStart(3, '0')}-${random}`;
  }
}

// Run the seeder
const seeder = new InteractiveSeeder();

// Handle cleanup
rl.on('close', () => {
  console.log(colors.cyan + '\n👋 Thank you for using the Interactive Seeder!' + colors.reset);
  process.exit(0);
});

// Start the seeder
seeder.start();