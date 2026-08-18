const { body } = require('express-validator');

const createCategory = [
  body('name')
    .exists({ checkFalsy: true }).withMessage('name is required')
    .isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters')
    .trim(),
  body('description').optional({ nullable: true }).isString().trim(),
];

const updateCategory = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 }).withMessage('name must be 2-100 characters')
    .trim(),
  body('description').optional({ nullable: true }).isString().trim(),
];

module.exports = { createCategory, updateCategory };
