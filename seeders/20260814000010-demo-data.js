'use strict';

module.exports = {
  async up(queryInterface) {
    const now = new Date();

    await queryInterface.bulkInsert('categories', [
      { name: 'Beverages', description: 'Soft drinks, coffee, tea, juices', created_at: now, updated_at: now },
      { name: 'Snacks', description: 'Chips, biscuits, chocolate', created_at: now, updated_at: now },
      { name: 'Dairy', description: 'Milk, cheese, yoghurt', created_at: now, updated_at: now },
      { name: 'Household', description: 'Cleaning and paper goods', created_at: now, updated_at: now },
    ]);

    await queryInterface.bulkInsert('suppliers', [
      {
        name: 'Al-Noor Trading', contact_name: 'Faisal Al-Harbi', email: 'orders@alnoor.example',
        phone: '+966 11 555 0101', address: 'Riyadh, Saudi Arabia',
        is_active: true, created_at: now, updated_at: now,
      },
      {
        name: 'Gulf Foods Co.', contact_name: 'Mona Saleh', email: 'sales@gulffoods.example',
        phone: '+966 12 555 0202', address: 'Jeddah, Saudi Arabia',
        is_active: true, created_at: now, updated_at: now,
      },
      {
        name: 'Desert Fresh Dairy', contact_name: 'Omar Nasser', email: 'hello@desertfresh.example',
        phone: '+966 13 555 0303', address: 'Dammam, Saudi Arabia',
        is_active: true, created_at: now, updated_at: now,
      },
    ]);

    const [categories] = await queryInterface.sequelize.query('SELECT id, name FROM categories');
    const [suppliers] = await queryInterface.sequelize.query('SELECT id, name FROM suppliers');
    const cat = (n) => categories.find((c) => c.name === n).id;
    const sup = (n) => suppliers.find((s) => s.name === n).id;

    await queryInterface.bulkInsert('products', [
      {
        sku: 'BEV-001', name: 'Arabic Coffee 250g', description: 'Ground, medium roast',
        price: 24.50, cost: 16.00, quantity: 120, reorder_level: 20, unit: 'pack', is_active: true,
        category_id: cat('Beverages'), supplier_id: sup('Al-Noor Trading'), created_at: now, updated_at: now,
      },
      {
        sku: 'BEV-002', name: 'Mineral Water 1.5L', description: 'Case of 12',
        price: 15.00, cost: 9.50, quantity: 8, reorder_level: 25, unit: 'case', is_active: true,
        category_id: cat('Beverages'), supplier_id: sup('Gulf Foods Co.'), created_at: now, updated_at: now,
      },
      {
        sku: 'SNK-001', name: 'Salted Potato Chips 150g', description: null,
        price: 6.75, cost: 4.00, quantity: 200, reorder_level: 40, unit: 'piece', is_active: true,
        category_id: cat('Snacks'), supplier_id: sup('Gulf Foods Co.'), created_at: now, updated_at: now,
      },
      {
        sku: 'DRY-001', name: 'Full Cream Milk 1L', description: 'Refrigerated',
        price: 7.25, cost: 5.10, quantity: 15, reorder_level: 30, unit: 'bottle', is_active: true,
        category_id: cat('Dairy'), supplier_id: sup('Desert Fresh Dairy'), created_at: now, updated_at: now,
      },
      {
        sku: 'HSE-001', name: 'Dish Soap 500ml', description: 'Lemon scent',
        price: 11.00, cost: 6.80, quantity: 60, reorder_level: 15, unit: 'bottle', is_active: true,
        category_id: cat('Household'), supplier_id: sup('Al-Noor Trading'), created_at: now, updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('stock_movements', null, {});
    await queryInterface.bulkDelete('products', null, {});
    await queryInterface.bulkDelete('suppliers', null, {});
    await queryInterface.bulkDelete('categories', null, {});
  },
};
