'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_movements', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      product_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'products', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.ENUM('IN', 'OUT', 'ADJUSTMENT'),
        allowNull: false,
      },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      quantity_before: { type: Sequelize.INTEGER, allowNull: false },
      quantity_after: { type: Sequelize.INTEGER, allowNull: false },
      reason: { type: Sequelize.STRING(255), allowNull: true },
      reference: { type: Sequelize.STRING(100), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
    });

    await queryInterface.addIndex('stock_movements', ['product_id']);
    await queryInterface.addIndex('stock_movements', ['type']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('stock_movements');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_stock_movements_type"');
  },
};
