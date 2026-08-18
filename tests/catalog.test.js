const request = require('supertest');
const { app, db, resetDatabase, closeDatabase, seedBasics } = require('./helpers');

const API = '/api/v1';

beforeAll(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await db.StockMovement.destroy({ where: {}, truncate: { cascade: true } });
  await db.Product.destroy({ where: {}, truncate: { cascade: true } });
  await db.Category.destroy({ where: {}, truncate: { cascade: true } });
  await db.Supplier.destroy({ where: {}, truncate: { cascade: true } });
});

describe('Categories', () => {
  test('creates a category and returns 201', async () => {
    const res = await request(app).post(`${API}/categories`).send({ name: 'Snacks' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ name: 'Snacks' });
    expect(res.body.data.id).toEqual(expect.any(Number));
  });

  test('rejects a missing name with 422 and field details', async () => {
    const res = await request(app).post(`${API}/categories`).send({});
    expect(res.status).toBe(422);
    expect(res.body.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'name' })])
    );
  });

  test('rejects a duplicate name with 409', async () => {
    await request(app).post(`${API}/categories`).send({ name: 'Snacks' });
    const res = await request(app).post(`${API}/categories`).send({ name: 'Snacks' });
    expect(res.status).toBe(409);
  });

  test('returns 404 for an unknown id', async () => {
    const res = await request(app).get(`${API}/categories/424242`);
    expect(res.status).toBe(404);
  });

  test('paginates and reports meta', async () => {
    await db.Category.bulkCreate(
      Array.from({ length: 7 }, (_, i) => ({ name: `Cat ${i + 1}` }))
    );
    const res = await request(app).get(`${API}/categories?page=2&limit=3`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.meta).toMatchObject({ total: 7, page: 2, limit: 3, totalPages: 3 });
  });

  test('refuses to delete a category that still has products', async () => {
    const { category } = await seedBasics();
    const res = await request(app).delete(`${API}/categories/${category.id}`);
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/product/i);
  });
});

describe('Suppliers', () => {
  test('validates email format', async () => {
    const res = await request(app).post(`${API}/suppliers`).send({ name: 'Bad Co', email: 'nope' });
    expect(res.status).toBe(422);
  });

  test('updates only whitelisted fields', async () => {
    const created = await request(app).post(`${API}/suppliers`).send({ name: 'Gulf Foods' });
    const res = await request(app)
      .put(`${API}/suppliers/${created.body.data.id}`)
      .send({ contactName: 'Mona Saleh', id: 9999 });

    expect(res.status).toBe(200);
    expect(res.body.data.contactName).toBe('Mona Saleh');
    expect(res.body.data.id).toBe(created.body.data.id);
  });
});

describe('Products', () => {
  test('normalises SKU to uppercase and reports low stock', async () => {
    const cat = await db.Category.create({ name: 'Dairy' });
    const res = await request(app).post(`${API}/products`).send({
      sku: 'dry-001',
      name: 'Full Cream Milk 1L',
      price: 7.25,
      quantity: 2,
      reorderLevel: 10,
      categoryId: cat.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.sku).toBe('DRY-001');
    expect(res.body.data.isLowStock).toBe(true);
  });

  test('records an opening stock movement when created with quantity', async () => {
    const res = await request(app)
      .post(`${API}/products`)
      .send({ sku: 'OPN-001', name: 'Opening Stock Item', quantity: 12 });

    const movements = await db.StockMovement.findAll({ where: { productId: res.body.data.id } });
    expect(movements).toHaveLength(1);
    expect(movements[0].type).toBe('IN');
    expect(movements[0].quantityAfter).toBe(12);
  });

  test('rejects a non-existent categoryId with 400', async () => {
    const res = await request(app)
      .post(`${API}/products`)
      .send({ sku: 'ORP-001', name: 'Orphan', categoryId: 999999 });
    expect(res.status).toBe(400);
  });

  test('blocks direct quantity edits through PUT', async () => {
    const { product } = await seedBasics();
    const res = await request(app).put(`${API}/products/${product.id}`).send({ quantity: 5000 });
    expect(res.status).toBe(422);

    await product.reload();
    expect(product.quantity).toBe(100);
  });

  test('filters by lowStock using a column-to-column comparison', async () => {
    await db.Product.bulkCreate([
      { sku: 'A-1', name: 'Healthy stock', quantity: 50, reorderLevel: 10 },
      { sku: 'B-1', name: 'At threshold', quantity: 10, reorderLevel: 10 },
      { sku: 'C-1', name: 'Below threshold', quantity: 2, reorderLevel: 10 },
    ]);

    const res = await request(app).get(`${API}/products/low-stock`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((p) => p.sku).sort()).toEqual(['B-1', 'C-1']);
  });

  test('supports search, price range and sorting', async () => {
    await db.Product.bulkCreate([
      { sku: 'S-1', name: 'Coffee beans', price: 30 },
      { sku: 'S-2', name: 'Coffee filter', price: 10 },
      { sku: 'S-3', name: 'Tea bags', price: 20 },
    ]);

    const search = await request(app).get(`${API}/products?search=coffee`);
    expect(search.body.meta.total).toBe(2);

    const range = await request(app).get(`${API}/products?minPrice=15&maxPrice=25`);
    expect(range.body.data.map((p) => p.sku)).toEqual(['S-3']);

    const sorted = await request(app).get(`${API}/products?sortBy=price&order=asc`);
    expect(sorted.body.data.map((p) => p.price)).toEqual([10, 20, 30]);
  });

  test('rejects an unknown sortBy column', async () => {
    const res = await request(app).get(`${API}/products?sortBy=; DROP TABLE products`);
    expect(res.status).toBe(422);
  });
});
