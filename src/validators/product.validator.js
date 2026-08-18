const { body, query } = require('express-validator');

const createProduct = [
  body('sku')
    .exists({ checkFalsy: true }).withMessage('sku is required')
    .isLength({ min: 2, max: 50 }).withMessage('sku must be 2-50 characters')
    .trim(),
  body('name')
    .exists({ checkFalsy: true }).withMessage('name is required')
    .isLength({ min: 2, max: 200 }).withMessage('name must be 2-200 characters')
    .trim(),
  body('description').optional({ nullable: true }).isString().trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be >= 0').toFloat(),
  body('cost').optional().isFloat({ min: 0 }).withMessage('cost must be >= 0').toFloat(),
  body('quantity').optional().isInt({ min: 0 }).withMessage('quantity must be >= 0').toInt(),
  body('reorderLevel').optional().isInt({ min: 0 }).withMessage('reorderLevel must be >= 0').toInt(),
  body('unit').optional().isString().isLength({ max: 20 }).trim(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('categoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('categoryId must be a positive integer').toInt(),
  body('supplierId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('supplierId must be a positive integer').toInt(),
];

const updateProduct = [
  body('sku').optional().isLength({ min: 2, max: 50 }).withMessage('sku must be 2-50 characters').trim(),
  body('name').optional().isLength({ min: 2, max: 200 }).withMessage('name must be 2-200 characters').trim(),
  body('description').optional({ nullable: true }).isString().trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('price must be >= 0').toFloat(),
  body('cost').optional().isFloat({ min: 0 }).withMessage('cost must be >= 0').toFloat(),
  body('reorderLevel').optional().isInt({ min: 0 }).withMessage('reorderLevel must be >= 0').toInt(),
  body('unit').optional().isString().isLength({ max: 20 }).trim(),
  body('isActive').optional().isBoolean().toBoolean(),
  body('categoryId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('categoryId must be a positive integer').toInt(),
  body('supplierId').optional({ nullable: true }).isInt({ min: 1 }).withMessage('supplierId must be a positive integer').toInt(),
  // quantity is intentionally not updatable here — it moves through /stock endpoints
  body('quantity').not().exists().withMessage('quantity is managed through /api/v1/stock endpoints'),
];

const listProducts = [
  query('categoryId').optional().isInt({ min: 1 }).toInt(),
  query('supplierId').optional().isInt({ min: 1 }).toInt(),
  query('lowStock').optional().isBoolean().toBoolean(),
  query('isActive').optional().isBoolean().toBoolean(),
  query('minPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('maxPrice').optional().isFloat({ min: 0 }).toFloat(),
  query('sortBy').optional().isIn(['name', 'price', 'quantity', 'createdAt', 'sku'])
    .withMessage('sortBy must be one of: name, price, quantity, createdAt, sku'),
  query('order').optional().isIn(['asc', 'desc', 'ASC', 'DESC']).withMessage('order must be asc or desc'),
];

module.exports = { createProduct, updateProduct, listProducts };
