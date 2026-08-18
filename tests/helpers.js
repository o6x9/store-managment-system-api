process.env.NODE_ENV = 'test';

const app = require('../src/app');
const db = require('../src/models');

/** Drops and recreates every table in the test database. */
async function resetDatabase() {
  await db.sequelize.sync({ force: true });
}

async function closeDatabase() {
  await db.sequelize.close();
}

async function seedBasics() {
  const category = await db.Category.create({ name: 'Beverages', description: 'Drinks' });
  const supplier = await db.Supplier.create({ name: 'Al-Noor Trading', email: 'orders@alnoor.example' });
  const product = await db.Product.create({
    sku: 'BEV-001',
    name: 'Arabic Coffee 250g',
    price: 24.5,
    cost: 16,
    quantity: 100,
    reorderLevel: 20,
    categoryId: category.id,
    supplierId: supplier.id,
  });
  return { category, supplier, product };
}

module.exports = { app, db, resetDatabase, closeDatabase, seedBasics };
