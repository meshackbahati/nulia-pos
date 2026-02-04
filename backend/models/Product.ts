import { DataTypes, Model, Sequelize } from 'sequelize';

export interface ProductAttributes {
  id: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  basePrice: number;
  costPrice: number;
  sku: string;
  barcode?: string;
  imageUrl?: string;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

class Product extends Model<ProductAttributes> implements ProductAttributes {
  public id!: string;
  public name!: string;
  public description?: string;
  public category!: string;
  public brand?: string;
  public basePrice!: number;
  public costPrice!: number;
  public sku!: string;
  public barcode?: string;
  public imageUrl?: string;
  public isActive!: boolean;
  public metadata?: any;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // Instance methods
  public getProfitMargin(): number {
    return ((this.basePrice - this.costPrice) / this.costPrice) * 100;
  }

  public static init(sequelize: Sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 200],
          },
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        category: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 100],
          },
        },
        brand: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            len: [1, 100],
          },
        },
        basePrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        costPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        sku: {
          type: DataTypes.STRING,
          allowNull: false,
          unique: true,
          validate: {
            len: [1, 50],
          },
        },
        barcode: {
          type: DataTypes.STRING,
          allowNull: true,
          unique: true,
          validate: {
            len: [8, 50],
          },
        },
        imageUrl: {
          type: DataTypes.STRING,
          allowNull: true,
          validate: {
            isUrl: true,
          },
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        metadata: {
          type: DataTypes.JSONB,
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
        modelName: 'Product',
        tableName: 'products',
        indexes: [
          {
            fields: ['category'],
          },
          {
            fields: ['brand'],
          },
          {
            fields: ['sku'],
            unique: true,
          },
          {
            fields: ['barcode'],
            unique: true,
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    Product.hasMany(models.ProductVariant, {
      foreignKey: 'productId',
      as: 'variants',
    });
    Product.hasMany(models.Inventory, {
      foreignKey: 'productId',
      as: 'inventory',
    });
    Product.hasMany(models.SaleItem, {
      foreignKey: 'productId',
      as: 'saleItems',
    });
  }
}

export default Product;