const { param, query } = require('express-validator');

const idParam = [
  param('id').isInt({ min: 1 }).withMessage('id must be a positive integer').toInt(),
];

const listQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1-100').toInt(),
  query('search').optional().isString().trim(),
];

module.exports = { idParam, listQuery };
