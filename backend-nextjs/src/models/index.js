import { Sequelize, Op } from 'sequelize';
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
import ExchangeRate from './ExchangeRate.js';
import Webhook from './Webhook.js';
import Waste from './Waste.js';
import TaxRate from './TaxRate.js';
import CashRegister from './CashRegister.js';
import CashSession from './CashSession.js';
import CashTransaction from './CashTransaction.js';
import Expense from './Expense.js';
import ProductBundle from './ProductBundle.js';
import SerialNumber from './SerialNumber.js';
import Warehouse from './Warehouse.js';
import WarehouseZone from './WarehouseZone.js';
import Customer from './Customer.js';
import CustomerDeposit from './CustomerDeposit.js';
import Layaway from './Layaway.js';
import Return from './Return.js';
import ReturnItem from './ReturnItem.js';
import Integration from './Integration.js';
import RealtimeEvent from './RealtimeEvent.js';

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
    ExchangeRate: ExchangeRate.initialize(sequelize),
    Webhook: Webhook.initialize(sequelize),
    Waste: Waste.initialize(sequelize),
    TaxRate: TaxRate.initialize(sequelize),
    CashRegister: CashRegister.initialize(sequelize),
    CashSession: CashSession.initialize(sequelize),
    CashTransaction: CashTransaction.initialize(sequelize),
    Expense: Expense.initialize(sequelize),
    ProductBundle: ProductBundle.initialize(sequelize),
    SerialNumber: SerialNumber.initialize(sequelize),
    Warehouse: Warehouse.initialize(sequelize),
    WarehouseZone: WarehouseZone.initialize(sequelize),
    Customer: Customer.initialize(sequelize),
    CustomerDeposit: CustomerDeposit.initialize(sequelize),
    Layaway: Layaway.initialize(sequelize),
    Return: Return.initialize(sequelize),
    ReturnItem: ReturnItem.initialize(sequelize),
    Integration: Integration.initialize(sequelize),
    RealtimeEvent: RealtimeEvent.initialize(sequelize),
};

// Define associations
Object.values(models).forEach((model) => {
    if (model.associate) {
        model.associate(models);
    }
});

models.Sequelize = Sequelize;
models.Op = Op;

export { sequelize };
export default models;
