const express = require('express');
const controller = require('../controllers/product.controller');
const validate = require('../middleware/validate');
const { idParam, listQuery } = require('../validators/common.validator');
const { createProduct, updateProduct, listProducts } = require('../validators/product.validator');

const router = express.Router();

// Static path must be registered before /:id or "low-stock" is read as an id.
router.get('/low-stock', controller.lowStock);

router.get('/', [...listQuery, ...listProducts], validate, controller.list);
router.get('/:id', idParam, validate, controller.getById);
router.post('/', createProduct, validate, controller.create);
router.put('/:id', [...idParam, ...updateProduct], validate, controller.update);
router.delete('/:id', idParam, validate, controller.remove);

module.exports = router;
