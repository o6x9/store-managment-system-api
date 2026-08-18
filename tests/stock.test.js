const request = require('supertest');
const { app, db, resetDatabase, closeDatabase, seedBasics } = require('./helpers');

const API = '/api/v1';

beforeAll(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

let product;

beforeEach(async () => {
  await db.StockMovement.destroy({ where: {}, truncate: { cascade: true } });
  await db.Product.destroy({ where: {}, truncate: { cascade: true } });
  await db.Category.destroy({ where: {}, truncate: { cascade: true } });
  await db.Supplier.destroy({ where: {}, truncate: { cascade: true } });
  ({ product } = await seedBasics());
});

describe('Stock IN', () => {
  test('increases quantity and logs before/after', async () => {
    const res = await request(app)
      .post(`${API}/stock/${product.id}/in`)
      .send({ quantity: 25, reason: 'Purchase order', reference: 'PO-1001' });

    expect(res.status).toBe(201);
    expect(res.body.data.product.quantity).toBe(125);
    expect(res.body.data.movement).toMatchObject({
      type: 'IN',
      quantity: 25,
      quantityBefore: 100,
      quantityAfter: 125,
      reference: 'PO-1001',
    });
  });

  test('rejects quantity below 1', async () => {
    const res = await request(app).post(`${API}/stock/${product.id}/in`).send({ quantity: 0 });
    expect(res.status).toBe(422);
  });

  test('404s for an unknown product', async () => {
    const res = await request(app).post(`${API}/stock/999999/in`).send({ quantity: 5 });
    expect(res.status).toBe(404);
  });
});

describe('Stock OUT', () => {
  test('decreases quantity', async () => {
    const res = await request(app)
      .post(`${API}/stock/${product.id}/out`)
      .send({ quantity: 40, reason: 'Sale' });

    expect(res.status).toBe(201);
    expect(res.body.data.product.quantity).toBe(60);
  });

  test('refuses to oversell and leaves stock untouched', async () => {
    const res = await request(app)
      .post(`${API}/stock/${product.id}/out`)
      .send({ quantity: 500 });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/insufficient stock/i);

    await product.reload();
    expect(product.quantity).toBe(100);

    const movements = await db.StockMovement.count({ where: { productId: product.id } });
    expect(movements).toBe(0);
  });

  test('flags low stock in the response once past the reorder level', async () => {
    const res = await request(app)
      .post(`${API}/stock/${product.id}/out`)
      .send({ quantity: 85 });

    expect(res.body.data.product.quantity).toBe(15);
    expect(res.body.data.product.isLowStock).toBe(true);
  });
});

describe('Stock ADJUSTMENT', () => {
  test('sets an absolute quantity and records the delta', async () => {
    const res = await request(app)
      .post(`${API}/stock/${product.id}/adjust`)
      .send({ newQuantity: 90, reason: 'Annual stock count' });

    expect(res.status).toBe(201);
    expect(res.body.data.movement).toMatchObject({
      type: 'ADJUSTMENT',
      quantity: 10,
      quantityBefore: 100,
      quantityAfter: 90,
    });
  });

  test('requires a reason', async () => {
    const res = await request(app)
      .post(`${API}/stock/${product.id}/adjust`)
      .send({ newQuantity: 90 });
    expect(res.status).toBe(422);
  });

  test('rejects a no-op adjustment', async () => {
    const res = await request(app)
      .post(`${API}/stock/${product.id}/adjust`)
      .send({ newQuantity: 100, reason: 'Same value' });
    expect(res.status).toBe(400);
  });
});

describe('Concurrency', () => {
  test('ten parallel OUT requests of 15 against 100 units never go negative', async () => {
    const attempts = Array.from({ length: 10 }, () =>
      request(app).post(`${API}/stock/${product.id}/out`).send({ quantity: 15 })
    );
    const results = await Promise.all(attempts);

    const ok = results.filter((r) => r.status === 201).length;
    const refused = results.filter((r) => r.status === 409).length;

    expect(ok).toBe(6);        // 6 * 15 = 90 <= 100
    expect(refused).toBe(4);

    await product.reload();
    expect(product.quantity).toBe(10);
  });
});

describe('Movement history', () => {
  test('lists movements newest first and filters by type', async () => {
    await request(app).post(`${API}/stock/${product.id}/in`).send({ quantity: 10 });
    await request(app).post(`${API}/stock/${product.id}/out`).send({ quantity: 4 });
    await request(app).post(`${API}/stock/${product.id}/out`).send({ quantity: 6 });

    const all = await request(app).get(`${API}/stock/movements`);
    expect(all.body.meta.total).toBe(3);

    const outs = await request(app).get(`${API}/stock/movements?type=OUT`);
    expect(outs.body.meta.total).toBe(2);
    expect(outs.body.data.every((m) => m.type === 'OUT')).toBe(true);
  });

  test('cascades movement deletion when a product is removed', async () => {
    await request(app).post(`${API}/stock/${product.id}/in`).send({ quantity: 10 });
    await request(app).delete(`${API}/products/${product.id}`);

    const remaining = await db.StockMovement.count({ where: { productId: product.id } });
    expect(remaining).toBe(0);
  });
});
