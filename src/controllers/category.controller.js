const { Op } = require('sequelize');
const { Category, Product } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');

// GET /api/v1/categories
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};

  if (req.query.search) {
    where.name = { [Op.iLike]: `%${req.query.search}%` };
  }

  const result = await Category.findAndCountAll({
    where,
    limit,
    offset,
    order: [['name', 'ASC']],
  });

  res.json(paginatedResponse(result, { page, limit }));
});

// GET /api/v1/categories/:id
exports.getById = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id, {
    include: [{ model: Product, as: 'products', attributes: ['id', 'sku', 'name', 'price', 'quantity'] }],
  });

  if (!category) throw ApiError.notFound(`Category ${req.params.id} not found`);

  res.json({ data: category });
});

// POST /api/v1/categories
exports.create = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  const category = await Category.create({ name, description });
  res.status(201).json({ data: category });
});

// PUT /api/v1/categories/:id
exports.update = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw ApiError.notFound(`Category ${req.params.id} not found`);

  const { name, description } = req.body;
  await category.update({
    ...(name !== undefined ? { name } : {}),
    ...(description !== undefined ? { description } : {}),
  });

  res.json({ data: category });
});

// DELETE /api/v1/categories/:id
exports.remove = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw ApiError.notFound(`Category ${req.params.id} not found`);

  const productCount = await Product.count({ where: { categoryId: category.id } });
  if (productCount > 0) {
    throw ApiError.conflict(
      `Cannot delete: ${productCount} product(s) still belong to this category`
    );
  }

  await category.destroy();
  res.status(204).send();
});
