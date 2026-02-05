import sequelize from '../lib/database.js';

// Import all models
import User from './User.js';
import Branch from './Branch.js';
import Product from './Product.js';
import ProductVariant from './ProductVariant.js';
import Inventory from './Inventory.js';
import Sale from './Sale.js';
import SaleItem from './SaleItem.js';
import Payment from './Payment.js';
import PaymentLog from './PaymentLog.js';
import AuditLog from './AuditLog.js';
import Supplier from './Supplier.js';
import PurchaseOrder from './PurchaseOrder.js';
import PurchaseOrderItem from './PurchaseOrderItem.js';
import Setting from './Setting.js';

// Initialize models
const models = {
    User: User.initialize(sequelize),
    Branch: Branch.initialize(sequelize),
    Product: Product.initialize(sequelize),
    ProductVariant: ProductVariant.initialize(sequelize),
    Inventory: Inventory.initialize(sequelize),
    Sale: Sale.initialize(sequelize),
    SaleItem: SaleItem.initialize(sequelize),
    Payment: Payment.initialize(sequelize),
    PaymentLog: PaymentLog.initialize(sequelize),
    AuditLog: AuditLog.initialize(sequelize),
    Supplier: Supplier.initialize(sequelize),
    PurchaseOrder: PurchaseOrder.initialize(sequelize),
    PurchaseOrderItem: PurchaseOrderItem.initialize(sequelize),
    Setting: Setting.initialize(sequelize),
};

// Define associations
Object.values(models).forEach((model) => {
    if (model.associate) {
        model.associate(models);
    }
});

export { sequelize };
export default models;
