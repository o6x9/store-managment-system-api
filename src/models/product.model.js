const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Product extends Model {
    static associate(models) {
      Product.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
      Product.belongsTo(models.Supplier, { foreignKey: 'supplierId', as: 'supplier' });
      Product.hasMany(models.StockMovement, {
        foreignKey: 'productId',
        as: 'stockMovements',
        onDelete: 'CASCADE',
      });
    }

    /** True when stock has fallen to or below the reorder threshold. */
    get isLowStock() {
      return this.quantity <= this.reorderLevel;
    }

    toJSON() {
      const values = { ...this.get() };
      values.isLowStock = this.quantity <= this.reorderLevel;
      return values;
    }
  }

  Product.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      sku: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: { msg: 'A product with this SKU already exists' },
        validate: {
          notEmpty: { msg: 'SKU is required' },
        },
        set(value) {
          this.setDataValue('sku', String(value).trim().toUpperCase());
        },
      },
      name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Product name is required' },
          len: { args: [2, 200], msg: 'Product name must be 2-200 characters' },
        },
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Price cannot be negative' },
        },
        get() {
          const raw = this.getDataValue('price');
          return raw === null ? null : Number(raw);
        },
      },
      cost: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Cost cannot be negative' },
        },
        get() {
          const raw = this.getDataValue('cost');
          return raw === null ? null : Number(raw);
        },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: { args: [0], msg: 'Quantity cannot be negative' },
        },
      },
      reorderLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: {
          min: { args: [0], msg: 'Reorder level cannot be negative' },
        },
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'piece',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
      },
      supplierId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'suppliers', key: 'id' },
      },
    },
    {
      sequelize,
      modelName: 'Product',
      tableName: 'products',
      underscored: true,
      timestamps: true,
      indexes: [
        { fields: ['category_id'] },
        { fields: ['supplier_id'] },
        { fields: ['name'] },
      ],
    }
  );

  return Product;
};
