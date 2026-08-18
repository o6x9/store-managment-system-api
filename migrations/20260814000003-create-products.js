'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('products', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      sku: { type: Sequelize.STRING(50), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(200), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      price: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      reorder_level: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 5 },
      unit: { type: Sequelize.STRING(20), allowNull: false, defaultValue: 'piece' },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      category_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      supplier_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'suppliers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('products', ['category_id']);
    await queryInterface.addIndex('products', ['supplier_id']);
    await queryInterface.addIndex('products', ['name']);

    // Belt-and-braces: the DB rejects negative stock even if the app misbehaves.
    await queryInterface.sequelize.query(
      'ALTER TABLE products ADD CONSTRAINT products_quantity_non_negative CHECK (quantity >= 0)'
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE products ADD CONSTRAINT products_price_non_negative CHECK (price >= 0)'
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('products');
  },
};
