const { Op } = require('sequelize');
const { Supplier, Product } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');

// GET /api/v1/suppliers
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};

  if (req.query.search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${req.query.search}%` } },
      { contactName: { [Op.iLike]: `%${req.query.search}%` } },
      { email: { [Op.iLike]: `%${req.query.search}%` } },
    ];
  }
  if (req.query.isActive !== undefined) {
    where.isActive = req.query.isActive === 'true' || req.query.isActive === true;
  }

  const result = await Supplier.findAndCountAll({
    where,
    limit,
    offset,
    order: [['name', 'ASC']],
  });

  res.json(paginatedResponse(result, { page, limit }));
});

// GET /api/v1/suppliers/:id
exports.getById = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id, {
    include: [{ model: Product, as: 'products', attributes: ['id', 'sku', 'name', 'quantity'] }],
  });

  if (!supplier) throw ApiError.notFound(`Supplier ${req.params.id} not found`);

  res.json({ data: supplier });
});

// POST /api/v1/suppliers
exports.create = asyncHandler(async (req, res) => {
  const supplier = await Supplier.create(pick(req.body));
  res.status(201).json({ data: supplier });
});

// PUT /api/v1/suppliers/:id
exports.update = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) throw ApiError.notFound(`Supplier ${req.params.id} not found`);

  await supplier.update(pick(req.body));
  res.json({ data: supplier });
});

// DELETE /api/v1/suppliers/:id
exports.remove = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findByPk(req.params.id);
  if (!supplier) throw ApiError.notFound(`Supplier ${req.params.id} not found`);

  const productCount = await Product.count({ where: { supplierId: supplier.id } });
  if (productCount > 0) {
    throw ApiError.conflict(
      `Cannot delete: ${productCount} product(s) are still linked to this supplier`
    );
  }

  await supplier.destroy();
  res.status(204).send();
});

/** Whitelist writable fields so clients can't set id/timestamps. */
function pick(body) {
  const allowed = ['name', 'contactName', 'email', 'phone', 'address', 'isActive'];
  return allowed.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}
