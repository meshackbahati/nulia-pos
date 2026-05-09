/*
# Interactive Data Seeder with Menu Options
Choose what to seed: users, branches, products, or everything
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

// Main interactive seeder with menu options
class InteractiveSeeder {
  constructor() {
    this.now = new Date();
    this.selectedOptions = {
      branches: false,
      products: false,
      users: false,
      inventory: false
    };
  }

  async start() {
    try {
      this.showWelcome();
      
      // Connect to database
      await this.connectToDatabase();
      
      // Show main menu
      await this.showMainMenu();
      
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
    console.log(colors.yellow + '🛍️  RETAIL SYSTEM - INTERACTIVE DATA SEEDER' + colors.reset);
    console.log(colors.cyan + '='.repeat(70) + colors.reset);
    console.log(colors.blue + 'Choose what you want to seed. Your database already exists.' + colors.reset);
    console.log(colors.blue + 'Select specific options or seed everything.\n' + colors.reset);
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

  async showMainMenu() {
    printSection('MAIN MENU');
    
    console.log(colors.blue + 'What would you like to seed?\n' + colors.reset);
    console.log('1. 🏪 Seed Branches only');
    console.log('2. 📦 Seed Products only');
    console.log('3. 👤 Seed Users only');
    console.log('4. 📋 Seed Inventory only (requires branches & products)');
    console.log('5. 🔄 Seed Everything (start from scratch)');
    console.log('6. 🎯 Seed Specific combination (choose multiple)');
    console.log('7. 🚫 Exit\n');
    
    const choice = await ask('Enter your choice (1-7): ');
    
    switch (choice) {
      case '1':
        await this.seedBranchesOnly();
        break;
      case '2':
        await this.seedProductsOnly();
        break;
      case '3':
        await this.seedUsersOnly();
        break;
      case '4':
        await this.seedInventoryOnly();
        break;
      case '5':
        await this.seedEverything();
        break;
      case '6':
        await this.seedCustomCombination();
        break;
      case '7':
        console.log(colors.yellow + 'Goodbye!' + colors.reset);
        return;
      default:
        printError('Invalid choice! Please try again.');
        await this.showMainMenu();
    }
  }

  async seedBranchesOnly() {
    printSection('SEED BRANCHES ONLY');
    
    const branches = await this.collectBranches();
    
    if (branches.length > 0) {
      const proceed = await askYesNo(`Save ${branches.length} branch(es) to database?`);
      if (proceed) {
        await this.saveBranches(branches);
        printSuccess('Branches seeded successfully!');
      } else {
        printWarning('Operation cancelled.');
      }
    }
    
    await this.askReturnToMenu();
  }

  async seedProductsOnly() {
    printSection('SEED PRODUCTS ONLY');
    
    const products = await this.collectProducts();
    
    if (products.length > 0) {
      const proceed = await askYesNo(`Save ${products.length} product(s) to database?`);
      if (proceed) {
        await this.saveProducts(products);
        printSuccess('Products seeded successfully!');
      } else {
        printWarning('Operation cancelled.');
      }
    }
    
    await this.askReturnToMenu();
  }

  async seedUsersOnly() {
    printSection('SEED USERS ONLY');
    
    // Check if we have branches to assign users to
    const existingBranches = await models.Branch.findAll({
      attributes: ['id', 'name']
    });
    
    if (existingBranches.length === 0) {
      printWarning('No branches found in database!');
      const createBranch = await askYesNo('Would you like to create a branch first?');
      if (createBranch) {
        await this.seedBranchesOnly();
        return;
      }
    }
    
    const users = await this.collectUsers(existingBranches);
    
    if (users.length > 0) {
      const proceed = await askYesNo(`Save ${users.length} user(s) to database?`);
      if (proceed) {
        await this.saveUsers(users);
        printSuccess('Users seeded successfully!');
      } else {
        printWarning('Operation cancelled.');
      }
    }
    
    await this.askReturnToMenu();
  }

  async seedInventoryOnly() {
    printSection('SEED INVENTORY ONLY');
    
    // Check if we have branches and products
    const existingBranches = await models.Branch.findAll();
    const existingProducts = await models.Product.findAll();
    
    if (existingBranches.length === 0) {
      printError('No branches found! Please seed branches first.');
      await this.askReturnToMenu();
      return;
    }
    
    if (existingProducts.length === 0) {
      printError('No products found! Please seed products first.');
      await this.askReturnToMenu();
      return;
    }
    
    printInfo(`Found ${existingBranches.length} branches and ${existingProducts.length} products`);
    
    const inventorySettings = await this.getInventorySettings();
    const inventory = await this.generateInventory(existingBranches, existingProducts, inventorySettings);
    
    const proceed = await askYesNo(`Create ${inventory.length} inventory records?`);
    if (proceed) {
      await this.saveInventory(inventory);
      printSuccess('Inventory seeded successfully!');
    } else {
      printWarning('Operation cancelled.');
    }
    
    await this.askReturnToMenu();
  }

  async seedEverything() {
    printSection('SEED EVERYTHING FROM SCRATCH');
    
    printWarning('⚠️  WARNING: This will create a completely new dataset!');
    const confirm = await askYesNo('Are you sure you want to seed everything from scratch?');
    
    if (!confirm) {
      printWarning('Operation cancelled.');
      await this.askReturnToMenu();
      return;
    }
    
    // Clear existing data
    const clearData = await askYesNo('Clear all existing data first?');
    if (clearData) {
      await this.clearAllData();
    }
    
    // Seed branches
    const branches = await this.collectBranches();
    if (branches.length > 0) {
      await this.saveBranches(branches);
      printSuccess(`Saved ${branches.length} branches`);
    }
    
    // Seed products
    const products = await this.collectProducts();
    if (products.length > 0) {
      await this.saveProducts(products);
      printSuccess(`Saved ${products.length} products`);
    }
    
    // Seed users
    const users = await this.collectUsers(branches);
    if (users.length > 0) {
      await this.saveUsers(users);
      printSuccess(`Saved ${users.length} users`);
    }
    
    // Seed inventory
    const inventorySettings = await this.getInventorySettings();
    const inventory = await this.generateInventory(branches, products, inventorySettings);
    if (inventory.length > 0) {
      await this.saveInventory(inventory);
      printSuccess(`Saved ${inventory.length} inventory records`);
    }
    
    this.showFinalSummary(branches, products, users, inventory);
    await this.askReturnToMenu();
  }

  async seedCustomCombination() {
    printSection('SEED CUSTOM COMBINATION');
    
    console.log(colors.blue + 'Select what you want to seed:\n' + colors.reset);
    
    this.selectedOptions.branches = await askYesNo('Seed branches?');
    this.selectedOptions.products = await askYesNo('Seed products?');
    this.selectedOptions.users = await askYesNo('Seed users?');
    this.selectedOptions.inventory = await askYesNo('Seed inventory?');
    
    // Validate selection
    if (this.selectedOptions.inventory && (!this.selectedOptions.branches || !this.selectedOptions.products)) {
      printWarning('Inventory requires branches and products. Enabling them...');
      this.selectedOptions.branches = true;
      this.selectedOptions.products = true;
    }
    
    if (this.selectedOptions.users && !this.selectedOptions.branches) {
      const assignToExisting = await askYesNo('Users need branches. Use existing branches in database?');
      if (!assignToExisting) {
        this.selectedOptions.branches = true;
      }
    }
    
    // Start seeding selected options
    const branches = this.selectedOptions.branches ? await this.collectBranches() : [];
    const products = this.selectedOptions.products ? await this.collectProducts() : [];
    
    let users = [];
    if (this.selectedOptions.users) {
      const userBranches = this.selectedOptions.branches ? branches : await models.Branch.findAll();
      users = await this.collectUsers(userBranches);
    }
    
    let inventory = [];
    if (this.selectedOptions.inventory) {
      const inventoryBranches = this.selectedOptions.branches ? branches : await models.Branch.findAll();
      const inventoryProducts = this.selectedOptions.products ? products : await models.Product.findAll();
      const inventorySettings = await this.getInventorySettings();
      inventory = await this.generateInventory(inventoryBranches, inventoryProducts, inventorySettings);
    }
    
    // Confirm before saving
    printSection('REVIEW SELECTION');
    
    if (branches.length > 0) console.log(`🏪 Branches to create: ${branches.length}`);
    if (products.length > 0) console.log(`📦 Products to create: ${products.length}`);
    if (users.length > 0) console.log(`👤 Users to create: ${users.length}`);
    if (inventory.length > 0) console.log(`📋 Inventory records to create: ${inventory.length}`);
    
    const proceed = await askYesNo('Proceed with seeding?');
    if (!proceed) {
      printWarning('Operation cancelled.');
      await this.askReturnToMenu();
      return;
    }
    
    // Save selected data
    const transaction = await sequelize.transaction();
    try {
      if (branches.length > 0) await this.saveBranches(branches, transaction);
      if (products.length > 0) await this.saveProducts(products, transaction);
      if (users.length > 0) await this.saveUsers(users, transaction);
      if (inventory.length > 0) await this.saveInventory(inventory, transaction);
      
      await transaction.commit();
      printSuccess('All selected data seeded successfully!');
      
      this.showFinalSummary(branches, products, users, inventory);
      
    } catch (error) {
      await transaction.rollback();
      printError(`Error seeding data: ${error.message}`);
    }
    
    await this.askReturnToMenu();
  }

  // Data collection methods
  async collectBranches() {
    const branches = [];
    let branchNumber = 1;
    let continueAdding = true;
    
    console.log(colors.blue + '\nAdding branches...' + colors.reset);
    
    while (continueAdding) {
      console.log(colors.cyan + `\n--- Branch #${branchNumber} ---` + colors.reset);
      
      const branchData = {
        id: uuidv4(),
        name: await this.askRequired('Branch name: '),
        address: await this.askRequired('Address: '),
        phone: await this.askRequired('Phone number: '),
        email: await ask('Email: ') || `branch${branchNumber}@store.com`,
        currency: await ask('Currency (USD, KES, EUR): ') || 'USD',
        currencySymbol: await ask('Currency symbol ($, KES, €): ') || '$',
        timezone: await ask('Timezone: ') || 'UTC',
        isActive: true,
        metadata: {}
      };
      
      if (await askYesNo('Add metadata?')) {
        branchData.metadata = await this.collectMetadata();
      }
      
      branches.push(branchData);
      printSuccess(`Branch "${branchData.name}" added`);
      
      branchNumber++;
      continueAdding = await askYesNo('Add another branch?');
    }
    
    return branches;
  }

  async collectProducts() {
    const products = [];
    const categories = ['Beverages', 'Bakery', 'Fruits', 'Dairy', 'Grains', 'Electronics', 'Clothing'];
    
    let productNumber = 1;
    let continueAdding = true;
    
    console.log(colors.blue + '\nAdding products...' + colors.reset);
    
    while (continueAdding) {
      console.log(colors.cyan + `\n--- Product #${productNumber} ---` + colors.reset);
      
      // Category selection
      console.log(colors.yellow + 'Categories:' + colors.reset);
      categories.forEach((cat, idx) => console.log(`  ${idx + 1}. ${cat}`));
      console.log(`  ${categories.length + 1}. Custom`);
      
      let category;
      const catChoice = await ask(`Select category (1-${categories.length + 1}): `);
      const catIdx = parseInt(catChoice) - 1;
      
      if (catIdx >= 0 && catIdx < categories.length) {
        category = categories[catIdx];
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
      
      if (await askYesNo('Add product specifications?')) {
        productData.metadata = await this.collectMetadata();
      }
      
      products.push(productData);
      printSuccess(`Product "${productData.name}" added`);
      
      productNumber++;
      continueAdding = await askYesNo('Add another product?');
    }
    
    return products;
  }

  async collectUsers(existingBranches = []) {
    const users = [];
    const roles = ['admin', 'manager', 'salesperson', 'cashier'];
    
    let userNumber = 1;
    let continueAdding = true;
    
    console.log(colors.blue + '\nAdding users...' + colors.reset);
    
    while (continueAdding) {
      console.log(colors.cyan + `\n--- User #${userNumber} ---` + colors.reset);
      
      // Role selection
      console.log(colors.yellow + 'Roles:' + colors.reset);
      roles.forEach((role, idx) => console.log(`  ${idx + 1}. ${role}`));
      
      let role;
      const roleChoice = await ask(`Select role (1-${roles.length}): `);
      const roleIdx = parseInt(roleChoice) - 1;
      role = roles[roleIdx] || 'salesperson';
      
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
      
      // Assign branch if not admin and branches exist
      if (role !== 'admin' && existingBranches.length > 0) {
        console.log(colors.yellow + '\nAvailable branches:' + colors.reset);
        existingBranches.forEach((branch, idx) => {
          console.log(`  ${idx + 1}. ${branch.name}`);
        });
        
        const branchChoice = await ask(`Assign to branch (1-${existingBranches.length}, or Enter for none): `);
        if (branchChoice && !isNaN(branchChoice)) {
          const branchIdx = parseInt(branchChoice) - 1;
          if (branchIdx >= 0 && branchIdx < existingBranches.length) {
            userData.branchId = existingBranches[branchIdx].id;
          }
        }
      }
      
      users.push(userData);
      printSuccess(`User "${userData.email}" added`);
      
      userNumber++;
      continueAdding = await askYesNo('Add another user?');
    }
    
    return users;
  }

  async getInventorySettings() {
    console.log(colors.blue + '\nInventory Settings:' + colors.reset);
    
    return {
      defaultQuantity: parseInt(await ask('Default stock quantity: ') || '100'),
      minStockLevel: parseInt(await ask('Minimum stock level: ') || '10'),
      maxStockLevel: parseInt(await ask('Maximum stock level: ') || '200')
    };
  }

  async generateInventory(branches, products, settings) {
    const inventory = [];
    const now = new Date();
    
    for (const branch of branches) {
      for (const product of products) {
        inventory.push({
          id: uuidv4(),
          branchId: branch.id,
          productId: product.id,
          variantId: null,
          quantity: settings.defaultQuantity,
          reservedQuantity: 0,
          minStockLevel: settings.minStockLevel,
          maxStockLevel: settings.maxStockLevel,
          lastRestockedAt: now,
          createdAt: now,
          updatedAt: now
        });
      }
    }
    
    return inventory;
  }

  // Database operations
  async saveBranches(branches, transaction = null) {
    const options = transaction ? { transaction } : {};
    
    for (const branch of branches) {
      await models.Branch.create(branch, options);
    }
    
    printSuccess(`Saved ${branches.length} branches`);
  }

  async saveProducts(products, transaction = null) {
    const options = transaction ? { transaction } : {};
    
    for (const product of products) {
      await models.Product.create(product, options);
    }
    
    printSuccess(`Saved ${products.length} products`);
  }

  async saveUsers(users, transaction = null) {
    const options = transaction ? { transaction } : {};
    
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      await models.User.create({
        ...user,
        password: hashedPassword
      }, options);
    }
    
    printSuccess(`Saved ${users.length} users`);
  }

  async saveInventory(inventory, transaction = null) {
    const options = transaction ? { transaction } : {};
    
    for (const item of inventory) {
      await models.Inventory.create(item, options);
    }
    
    printSuccess(`Saved ${inventory.length} inventory records`);
  }

  async clearAllData() {
    printWarning('Clearing all data...');
    
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
      
      await models.Inventory.destroy({ where: {}, force: true });
      await models.SaleItem.destroy({ where: {}, force: true });
      await models.Sale.destroy({ where: {}, force: true });
      await models.User.destroy({ where: {}, force: true });
      await models.Product.destroy({ where: {}, force: true });
      await models.Branch.destroy({ where: {}, force: true });
      
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
      
      printSuccess('All data cleared!');
    } catch (error) {
      printError(`Error clearing data: ${error.message}`);
      throw error;
    }
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
    while (isNaN(number)) {
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
    
    console.log(colors.blue + '\nAdd metadata. Press Enter on empty key to finish.' + colors.reset);
    
    while (addMore) {
      const key = await ask('Key: ');
      if (!key.trim()) {
        addMore = false;
        continue;
      }
      
      const value = await ask(`Value for "${key}": `);
      metadata[key] = value;
      
      addMore = await askYesNo('Add another?');
    }
    
    return metadata;
  }

  generateSKU(number) {
    const prefix = 'PROD';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${number.toString().padStart(3, '0')}-${random}`;
  }

  showFinalSummary(branches, products, users, inventory) {
    console.log(colors.green + '\n' + '='.repeat(60) + colors.reset);
    console.log(colors.green + '🎉 SEEDING COMPLETE!' + colors.reset);
    console.log(colors.green + '='.repeat(60) + colors.reset);
    
    console.log(colors.cyan + '\n📊 SUMMARY:' + colors.reset);
    console.log(`🏪 Branches created: ${branches?.length || 0}`);
    console.log(`📦 Products created: ${products?.length || 0}`);
    console.log(`👤 Users created: ${users?.length || 0}`);
    console.log(`📋 Inventory records: ${inventory?.length || 0}`);
    
    if (users?.length > 0) {
      console.log(colors.yellow + '\n🔑 USER CREDENTIALS:' + colors.reset);
      users.forEach((user, idx) => {
        console.log(`${colors.white}${idx + 1}. ${user.email}${colors.reset}`);
        console.log(`   Password: ${user.password}`);
        console.log(`   Role: ${user.role}\n`);
      });
    }
  }

  async askReturnToMenu() {
    const returnToMenu = await askYesNo('\nReturn to main menu?');
    if (returnToMenu) {
      await this.showMainMenu();
    } else {
      console.log(colors.yellow + 'Goodbye!' + colors.reset);
    }
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