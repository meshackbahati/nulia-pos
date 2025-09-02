import { DataTypes, Model, Sequelize } from 'sequelize';

export interface ProductVariantAttributes {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode?: string;
  price: number;
  costPrice: number;
  attributes?: any; // size, color, etc.
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class ProductVariant extends Model<ProductVariantAttributes> implements ProductVariantAttributes {
  public id!: string;
  public productId!: string;
  public name!: string;
  public sku!: string;
  public barcode?: string;
  public price!: number;
  public costPrice!: number;
  public attributes?: any;
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  public static init(sequelize: Sequelize) {
    return super.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
        },
        productId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'products',
            key: 'id',
          },
        },
        name: {
          type: DataTypes.STRING,
          allowNull: false,
          validate: {
            len: [1, 200],
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
        price: {
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
        attributes: {
          type: DataTypes.JSONB,
          allowNull: true,
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
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
        modelName: 'ProductVariant',
        tableName: 'product_variants',
        indexes: [
          {
            fields: ['productId'],
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
    ProductVariant.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
    ProductVariant.hasMany(models.Inventory, {
      foreignKey: 'variantId',
      as: 'inventory',
    });
    ProductVariant.hasMany(models.SaleItem, {
      foreignKey: 'variantId',
      as: 'saleItems',
    });
  }
}

export default ProductVariant;