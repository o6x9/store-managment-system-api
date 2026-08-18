const { body } = require('express-validator');

const createSupplier = [
  body('name')
    .exists({ checkFalsy: true }).withMessage('name is required')
    .isLength({ min: 2, max: 150 }).withMessage('name must be 2-150 characters')
    .trim(),
  body('contactName').optional({ nullable: true }).isString().trim(),
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid').normalizeEmail(),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 30 }).trim(),
  body('address').optional({ nullable: true }).isString().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean').toBoolean(),
];

const updateSupplier = [
  body('name').optional().isLength({ min: 2, max: 150 }).withMessage('name must be 2-150 characters').trim(),
  body('contactName').optional({ nullable: true }).isString().trim(),
  body('email').optional({ nullable: true }).isEmail().withMessage('email must be valid').normalizeEmail(),
  body('phone').optional({ nullable: true }).isString().isLength({ max: 30 }).trim(),
  body('address').optional({ nullable: true }).isString().trim(),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean').toBoolean(),
];

module.exports = { createSupplier, updateSupplier };
