import { Sequelize } from 'sequelize';
import sequelize from '@/lib/database';

// Import all models
import User from './User';
import Branch from './Branch';
import Product from './Product';
import ProductVariant from './ProductVariant';
import Inventory from './Inventory';
import Sale from './Sale';
import SaleItem from './SaleItem';
import Payment from './Payment';
import AuditLog from './AuditLog';
import Supplier from './Supplier';
import PurchaseOrder from './PurchaseOrder';
import PurchaseOrderItem from './PurchaseOrderItem';

// Initialize models
const models = {
  User: User.init(sequelize),
  Branch: Branch.init(sequelize),
  Product: Product.init(sequelize),
  ProductVariant: ProductVariant.init(sequelize),
  Inventory: Inventory.init(sequelize),
  Sale: Sale.init(sequelize),
  SaleItem: SaleItem.init(sequelize),
  Payment: Payment.init(sequelize),
  AuditLog: AuditLog.init(sequelize),
  Supplier: Supplier.init(sequelize),
  PurchaseOrder: PurchaseOrder.init(sequelize),
  PurchaseOrderItem: PurchaseOrderItem.init(sequelize),
};

// Define associations
Object.values(models).forEach((model: any) => {
  if (model.associate) {
    model.associate(models);
  }
});

export { sequelize };
export default models;