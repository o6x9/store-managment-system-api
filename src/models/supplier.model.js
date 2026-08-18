const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Supplier extends Model {
    static associate(models) {
      Supplier.hasMany(models.Product, {
        foreignKey: 'supplierId',
        as: 'products',
        onDelete: 'SET NULL',
      });
    }
  }

  Supplier.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Supplier name is required' },
          len: { args: [2, 150], msg: 'Supplier name must be 2-150 characters' },
        },
      },
      contactName: {
        type: DataTypes.STRING(150),
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: true,
        unique: { msg: 'A supplier with this email already exists' },
        validate: {
          isEmail: { msg: 'Must be a valid email address' },
        },
      },
      phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
      },
      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: 'Supplier',
      tableName: 'suppliers',
      underscored: true,
      timestamps: true,
    }
  );

  return Supplier;
};
