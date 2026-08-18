const sequelize = require('../config/database');

const Category = require('./category.model')(sequelize);
const Supplier = require('./supplier.model')(sequelize);
const Product = require('./product.model')(sequelize);
const StockMovement = require('./stockMovement.model')(sequelize);

const models = { Category, Supplier, Product, StockMovement };

// Wire up associations once every model is registered.
Object.values(models).forEach((model) => {
  if (typeof model.associate === 'function') {
    model.associate(models);
  }
});

module.exports = { sequelize, ...models };
