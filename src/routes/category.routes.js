const express = require('express');
const controller = require('../controllers/category.controller');
const validate = require('../middleware/validate');
const { idParam, listQuery } = require('../validators/common.validator');
const { createCategory, updateCategory } = require('../validators/category.validator');

const router = express.Router();

router.get('/', listQuery, validate, controller.list);
router.get('/:id', idParam, validate, controller.getById);
router.post('/', createCategory, validate, controller.create);
router.put('/:id', [...idParam, ...updateCategory], validate, controller.update);
router.delete('/:id', idParam, validate, controller.remove);

module.exports = router;
