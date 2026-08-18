const express = require('express');
const controller = require('../controllers/supplier.controller');
const validate = require('../middleware/validate');
const { idParam, listQuery } = require('../validators/common.validator');
const { createSupplier, updateSupplier } = require('../validators/supplier.validator');

const router = express.Router();

router.get('/', listQuery, validate, controller.list);
router.get('/:id', idParam, validate, controller.getById);
router.post('/', createSupplier, validate, controller.create);
router.put('/:id', [...idParam, ...updateSupplier], validate, controller.update);
router.delete('/:id', idParam, validate, controller.remove);

module.exports = router;
