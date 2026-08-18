const { DataTypes, Model } = require('sequelize');

const MOVEMENT_TYPES = ['IN', 'OUT', 'ADJUSTMENT'];

module.exports = (sequelize) => {
  class StockMovement extends Model {
    static associate(models) {
      StockMovement.belongsTo(models.Product, { foreignKey: 'productId', as: 'product' });
    }
  }

  StockMovement.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      productId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
      },
      type: {
        type: DataTypes.ENUM(...MOVEMENT_TYPES),
        allowNull: false,
        validate: {
          isIn: { args: [MOVEMENT_TYPES], msg: `Type must be one of: ${MOVEMENT_TYPES.join(', ')}` },
        },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [1], msg: 'Movement quantity must be at least 1' },
        },
      },
      quantityBefore: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      quantityAfter: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      reference: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'StockMovement',
      tableName: 'stock_movements',
      underscored: true,
      timestamps: true,
      updatedAt: false,
      indexes: [{ fields: ['product_id'] }, { fields: ['type'] }],
    }
  );

  StockMovement.MOVEMENT_TYPES = MOVEMENT_TYPES;

  return StockMovement;
};
