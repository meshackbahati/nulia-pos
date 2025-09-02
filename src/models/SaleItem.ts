import { DataTypes, Model, Sequelize } from 'sequelize';

export interface SaleItemAttributes {
  id: string;
  saleId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  discountAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

class SaleItem extends Model<SaleItemAttributes> implements SaleItemAttributes {
  public id!: string;
  public saleId!: string;
  public productId!: string;
  public variantId?: string;
  public quantity!: number;
  public unitPrice!: number;
  public totalPrice!: number;
  public discountAmount!: number;
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
        saleId: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: 'sales',
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
          validate: {
            min: 1,
          },
        },
        unitPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        totalPrice: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        discountAmount: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0,
          validate: {
            min: 0,
          },
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
        modelName: 'SaleItem',
        tableName: 'sale_items',
        indexes: [
          {
            fields: ['saleId'],
          },
          {
            fields: ['productId'],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    SaleItem.belongsTo(models.Sale, {
      foreignKey: 'saleId',
      as: 'sale',
    });
    SaleItem.belongsTo(models.Product, {
      foreignKey: 'productId',
      as: 'product',
    });
    SaleItem.belongsTo(models.ProductVariant, {
      foreignKey: 'variantId',
      as: 'variant',
    });
  }
}

export default SaleItem;