const { sequelize, Product, StockMovement } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { getPagination, paginatedResponse } = require('../utils/pagination');

/**
 * All three write operations run in a transaction with a row-level lock on the
 * product, so two concurrent requests can't both read the same "before" value.
 */
async function applyMovement({ productId, type, delta, quantity, reason, reference }) {
  return sequelize.transaction(async (t) => {
    const product = await Product.findByPk(productId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!product) throw ApiError.notFound(`Product ${productId} not found`);

    const before = product.quantity;
    const after = before + delta;

    if (after < 0) {
      throw ApiError.conflict(
        `Insufficient stock for "${product.name}": have ${before}, tried to remove ${Math.abs(delta)}`
      );
    }

    await product.update({ quantity: after }, { transaction: t });

    const movement = await StockMovement.create(
      {
        productId: product.id,
        type,
        quantity,
        quantityBefore: before,
        quantityAfter: after,
        reason,
        reference,
      },
      { transaction: t }
    );

    return { product, movement };
  });
}

// POST /api/v1/stock/:productId/in
exports.stockIn = asyncHandler(async (req, res) => {
  const { quantity, reason, reference } = req.body;

  const { product, movement } = await applyMovement({
    productId: req.params.productId,
    type: 'IN',
    delta: quantity,
    quantity,
    reason: reason || 'Stock received',
    reference,
  });

  res.status(201).json({
    data: { movement, product: { id: product.id, sku: product.sku, quantity: product.quantity } },
  });
});

// POST /api/v1/stock/:productId/out
exports.stockOut = asyncHandler(async (req, res) => {
  const { quantity, reason, reference } = req.body;

  const { product, movement } = await applyMovement({
    productId: req.params.productId,
    type: 'OUT',
    delta: -quantity,
    quantity,
    reason: reason || 'Stock issued',
    reference,
  });

  res.status(201).json({
    data: {
      movement,
      product: {
        id: product.id,
        sku: product.sku,
        quantity: product.quantity,
        isLowStock: product.quantity <= product.reorderLevel,
      },
    },
  });
});

// POST /api/v1/stock/:productId/adjust
exports.adjust = asyncHandler(async (req, res) => {
  const { newQuantity, reason } = req.body;

  const result = await sequelize.transaction(async (t) => {
    const product = await Product.findByPk(req.params.productId, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!product) throw ApiError.notFound(`Product ${req.params.productId} not found`);

    const before = product.quantity;
    if (before === newQuantity) {
      throw ApiError.badRequest(`Quantity is already ${newQuantity}; nothing to adjust`);
    }

    await product.update({ quantity: newQuantity }, { transaction: t });

    const movement = await StockMovement.create(
      {
        productId: product.id,
        type: 'ADJUSTMENT',
        quantity: Math.abs(newQuantity - before),
        quantityBefore: before,
        quantityAfter: newQuantity,
        reason,
      },
      { transaction: t }
    );

    return { product, movement };
  });

  res.status(201).json({
    data: {
      movement: result.movement,
      product: { id: result.product.id, sku: result.product.sku, quantity: result.product.quantity },
    },
  });
});

// GET /api/v1/stock/movements
exports.listMovements = asyncHandler(async (req, res) => {
  const { page, limit, offset } = getPagination(req.query);
  const where = {};

  if (req.query.productId !== undefined) where.productId = req.query.productId;
  if (req.query.type) where.type = req.query.type;

  const result = await StockMovement.findAndCountAll({
    where,
    include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name'] }],
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  res.json(paginatedResponse(result, { page, limit }));
});
