import { DataTypes, Model, Sequelize } from 'sequelize';

export interface InventoryAttributes {
  id: string;
  branchId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  reservedQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  lastRestockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

class Inventory extends Model<InventoryAttributes> implements InventoryAttributes {
  public id!: string;
  public branchId!: string;
  public productId!: string;
  public variantId?: string;
  public quantity!: number;
  public reservedQuantity!: number;
  public minStockLevel!: number;
  public maxStockLevel!: number;
  public lastRestockedAt?: Date;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public getAvailableQuantity(): number {
    return this.quantity - this.reservedQuantity;
  }

  public isLowStock(): boolean {
    return this.getAvailableQuantity() <= this.minStockLevel;
  }

  public isOutOfStock(): boolean {
    return this.getAvailableQuantity() <= 0;
  }

  public canFulfillOrder(requestedQuantity: number): boolean {
    return this.getAvailableQuantity() >= requestedQuantity;
  }

  public static init(sequelize: Sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        branchId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'branches',
            key: 'id',
          },
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id',
          },
        },
        variantId: {
          type: DataTypes.UUID,
          allowNull: true,
          references: {
            model: 'product_variants',
            key: 'id',
          },
        },
        quantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        reservedQuantity: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
        },
        minStockLevel: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 10,
          validate: {
            min: 0,
          },
        },
        maxStockLevel: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1000,
          validate: {
            min: 0,
          },
        },
        lastRestockedAt: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
        },
      },
      {
        sequelize,
        modelName: 'Inventory',
        tableName: 'inventory',
        indexes: [
          {
            fields: ['branchId', 'productId', 'variantId'],
            unique: true,
          },
          {
            fields: ['branchId'],
          },
          {
            fields: ['productId'],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    Inventory.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch',
    });
    Inventory.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
    Inventory.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });
  }
}

export default Inventory;