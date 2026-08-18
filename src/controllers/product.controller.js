const { Op, col, where: sqlWhere } = require('sequelize');
const { Product, Category, Supplier, StockMovement } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');

const WRITABLE = [
  'sku', 'name', 'description', 'price', 'cost',
  'reorderLevel', 'unit', 'isActive', 'categoryId', 'supplierId',
];

const INCLUDES = [
  { model: Category, as: 'category', attributes: ['id', 'name'] },
  { model: Supplier, as: 'supplier', attributes: ['id', 'name'] },
];

// GET /api/v1/products
exports.list = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const {
    search, categoryId, supplierId, lowStock, isActive,
    minPrice, maxPrice, sortBy = 'createdAt', order = 'DESC',
  } = req.query;

  const where = {};

  if (search) {
    where[Op.or] = [
      { name: { [Op.iLike]: `%${search}%` } },
      { sku: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }
  if (categoryId !== undefined) where.categoryId = categoryId;
  if (supplierId !== undefined) where.supplierId = supplierId;
  if (isActive !== undefined) where.isActive = isActive;

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price[Op.gte] = minPrice;
    if (maxPrice !== undefined) where.price[Op.lte] = maxPrice;
  }

  // quantity <= reorder_level, compared column-to-column
  const andConditions = lowStock
    ? [sqlWhere(col('Product.quantity'), Op.lte, col('Product.reorder_level'))]
    : [];

  const result = await Product.findAndCountAll({
    where: andConditions.length ? { [Op.and]: [where, ...andConditions] } : where,
    include: INCLUDES,
    limit,
    offset,
    order: [[sortBy, String(order).toUpperCase()]],
    distinct: true,
  });

  res.json(paginatedResponse(result, { page, limit }));
});

// GET /api/v1/products/low-stock
exports.lowStock = asyncHandler(async (req, res) => {
  const products = await Product.findAll({
    where: {
      [Op.and]: [
        { isActive: true },
        sqlWhere(col('Product.quantity'), Op.lte, col('Product.reorder_level')),
      ],
    },
    include: INCLUDES,
    order: [['quantity', 'ASC']],
  });

  res.json({ data: products, meta: { total: products.length } });
});

// GET /api/v1/products/:id
exports.getById = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id, {
    include: [
      ...INCLUDES,
      {
        model: StockMovement,
        as: 'stockMovements',
        attributes: ['id', 'type', 'quantity', 'quantityBefore', 'quantityAfter', 'reason', 'createdAt'],
        limit: 10,
        order: [['createdAt', 'DESC']],
        separate: true,
      },
    ],
  });

  if (!product) throw ApiError.notFound(`Product ${req.params.id} not found`);

  res.json({ data: product });
});

// POST /api/v1/products
exports.create = asyncHandler(async (req, res) => {
  const payload = pick(req.body);

  await assertRelationsExist(payload);

  // Initial stock is allowed at creation time; later changes go through /stock.
  if (req.body.quantity !== undefined) payload.quantity = req.body.quantity;

  const product = await Product.create(payload);

  if (product.quantity > 0) {
    await StockMovement.create({
      productId: product.id,
      type: 'IN',
      quantity: product.quantity,
      quantityBefore: 0,
      quantityAfter: product.quantity,
      reason: 'Initial stock on product creation',
    });
  }

  const created = await Product.findByPk(product.id, { include: INCLUDES });
  res.status(201).json({ data: created });
});

// PUT /api/v1/products/:id
exports.update = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw ApiError.notFound(`Product ${req.params.id} not found`);

  const payload = pick(req.body);
  await assertRelationsExist(payload);

  await product.update(payload);

  const updated = await Product.findByPk(product.id, { include: INCLUDES });
  res.json({ data: updated });
});

// DELETE /api/v1/products/:id
exports.remove = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw ApiError.notFound(`Product ${req.params.id} not found`);

  await product.destroy(); // stock movements cascade
  res.status(204).send();
});

function pick(body) {
  return WRITABLE.reduce((acc, key) => {
    if (body[key] !== undefined) acc[key] = body[key];
    return acc;
  }, {});
}

/** Fail with a clear 404 instead of a raw FK error when a relation id is bogus. */
async function assertRelationsExist({ categoryId, supplierId }) {
  if (categoryId) {
    const exists = await Category.count({ where: { id: categoryId } });
    if (!exists) throw ApiError.badRequest(`Category ${categoryId} does not exist`);
  }
  if (supplierId) {
    const exists = await Supplier.count({ where: { id: supplierId } });
    if (!exists) throw ApiError.badRequest(`Supplier ${supplierId} does not exist`);
  }
}
