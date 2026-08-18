const express = require('express');
const { sequelize } = require('../models');

const categoryRoutes = require('./category.routes');
const supplierRoutes = require('./supplier.routes');
const productRoutes = require('./product.routes');
const stockRoutes = require('./stock.routes');

const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'ok', database: 'connected', uptime: process.uptime() });
  } catch (err) {
    res.status(503).json({ status: 'degraded', database: 'unreachable', message: err.message });
  }
});

router.get('/', (req, res) => {
  res.json({
    name: 'Store Management System API',
    version: '1.0.0',
    endpoints: {
      categories: '/api/v1/categories',
      suppliers: '/api/v1/suppliers',
      products: '/api/v1/products',
      lowStock: '/api/v1/products/low-stock',
      stockIn: 'POST /api/v1/stock/:productId/in',
      stockOut: 'POST /api/v1/stock/:productId/out',
      stockAdjust: 'POST /api/v1/stock/:productId/adjust',
      movements: '/api/v1/stock/movements',
    },
  });
});

router.use('/categories', categoryRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);

module.exports = router;
