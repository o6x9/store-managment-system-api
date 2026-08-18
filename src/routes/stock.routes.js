const express = require('express');
const controller = require('../controllers/stock.controller');
const validate = require('../middleware/validate');
const { listQuery } = require('../validators/common.validator');
const {
  stockIn, stockOut, stockAdjust, listMovements,
} = require('../validators/stock.validator');

const router = express.Router();

router.get('/movements', [...listQuery, ...listMovements], validate, controller.listMovements);
router.post('/:productId/in', stockIn, validate, controller.stockIn);
router.post('/:productId/out', stockOut, validate, controller.stockOut);
router.post('/:productId/adjust', stockAdjust, validate, controller.adjust);

module.exports = router;
