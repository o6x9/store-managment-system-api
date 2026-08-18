const { body, param, query } = require('express-validator');

const productIdParam = [
  param('productId').isInt({ min: 1 }).withMessage('productId must be a positive integer').toInt(),
];

const stockIn = [
  ...productIdParam,
  body('quantity')
    .exists().withMessage('quantity is required')
    .isInt({ min: 1 }).withMessage('quantity must be at least 1')
    .toInt(),
  body('reason').optional({ nullable: true }).isString().isLength({ max: 255 }).trim(),
  body('reference').optional({ nullable: true }).isString().isLength({ max: 100 }).trim(),
];

const stockOut = stockIn;

const stockAdjust = [
  ...productIdParam,
  body('newQuantity')
    .exists().withMessage('newQuantity is required')
    .isInt({ min: 0 }).withMessage('newQuantity must be >= 0')
    .toInt(),
  body('reason')
    .exists({ checkFalsy: true }).withMessage('reason is required for an adjustment')
    .isLength({ max: 255 }).trim(),
];

const listMovements = [
  query('productId').optional().isInt({ min: 1 }).toInt(),
  query('type').optional().isIn(['IN', 'OUT', 'ADJUSTMENT']).withMessage('type must be IN, OUT or ADJUSTMENT'),
];

module.exports = { stockIn, stockOut, stockAdjust, listMovements, productIdParam };
