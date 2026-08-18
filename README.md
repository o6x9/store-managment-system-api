# Store Management System API

REST API for a store's inventory: categories, suppliers, products, and an audited stock ledger.

**Stack:** Node.js + Express 5 · Sequelize 6 · PostgreSQL · express-validator · Jest + Supertest

> **New here?** Start with **[TESTING-GUIDE.md](TESTING-GUIDE.md)** — step-by-step setup on Windows and a walkthrough of every endpoint in Postman.

---

## Project layout

```
store-management-api/
├── src/
│   ├── app.js                  Express app (middleware + route mounting)
│   ├── server.js               Entry point: connects to PG, listens, graceful shutdown
│   ├── config/
│   │   ├── config.js           Env-driven config (also read by sequelize-cli)
│   │   └── database.js         Sequelize instance
│   ├── models/                 Sequelize models + associations
│   │   ├── index.js            Registers models, wires associations
│   │   ├── category.model.js
│   │   ├── supplier.model.js
│   │   ├── product.model.js
│   │   └── stockMovement.model.js
│   ├── controllers/            Request handling + business rules
│   ├── routes/                 URL → validator → controller wiring
│   ├── validators/             express-validator chains
│   ├── middleware/             validate, notFound, errorHandler
│   └── utils/                  ApiError, asyncHandler, pagination
├── migrations/                 sequelize-cli schema migrations
├── seeders/                    Demo data
└── tests/                      Jest + Supertest suites, plus a curl smoke test
```

The request path is always the same: **route → validator → `validate` → controller → model → response**, with any thrown error landing in `errorHandler`.

---

## Setup

```bash
npm install
cp .env.example .env          # then edit credentials
createdb store_management     # and store_management_test for the test suite
npm run db:migrate
npm run db:seed
npm run dev                   # http://localhost:3000/api/v1
```

`.env`:

| Variable | Meaning | Default |
|---|---|---|
| `PORT` | HTTP port | `3000` |
| `DB_HOST` / `DB_PORT` | Postgres host & port | `127.0.0.1` / `5432` |
| `DB_NAME` | Database name (test suite uses `<name>_test`) | `store_management` |
| `DB_USER` / `DB_PASSWORD` | Credentials | — |
| `DB_LOGGING` | `true` to echo SQL | `false` |
| `DB_SYNC` | `true` to `sequelize.sync({alter:true})` on boot (dev only) | `false` |

### npm scripts

| Script | Does |
|---|---|
| `npm run dev` | nodemon with reload |
| `npm start` | production start |
| `npm run db:migrate` | apply migrations |
| `npm run db:seed` | insert demo categories/suppliers/products |
| `npm run db:reset` | undo all → migrate → seed |
| `npm test` | Jest + Supertest against `store_management_test` |

---

## Data model

```
categories 1───* products *───1 suppliers
                   │
                   1
                   │
                   *
             stock_movements
```

**products** — `sku` (unique, auto-uppercased), `name`, `description`, `price`, `cost`, `quantity`, `reorderLevel`, `unit`, `isActive`, `categoryId`, `supplierId`. Responses include a computed `isLowStock` (`quantity <= reorderLevel`).

**stock_movements** — append-only ledger: `type` (`IN` / `OUT` / `ADJUSTMENT`), `quantity`, `quantityBefore`, `quantityAfter`, `reason`, `reference`. Nothing overwrites history; the product's `quantity` and the ledger are updated in one transaction.

Deleting a category or supplier that still has products returns **409** rather than orphaning rows. Deleting a product cascades its movements.

---

## Endpoints

Base path: `/api/v1`

### Categories
| Method | Path | Notes |
|---|---|---|
| GET | `/categories` | `?page` `?limit` `?search` |
| GET | `/categories/:id` | includes its products |
| POST | `/categories` | `{ name, description? }` |
| PUT | `/categories/:id` | partial update |
| DELETE | `/categories/:id` | 409 if products still reference it |

### Suppliers
| Method | Path | Notes |
|---|---|---|
| GET | `/suppliers` | `?page` `?limit` `?search` `?isActive` |
| GET | `/suppliers/:id` | includes its products |
| POST | `/suppliers` | `{ name, contactName?, email?, phone?, address?, isActive? }` |
| PUT | `/suppliers/:id` | partial update |
| DELETE | `/suppliers/:id` | 409 if products still reference it |

### Products
| Method | Path | Notes |
|---|---|---|
| GET | `/products` | `?search` `?categoryId` `?supplierId` `?lowStock` `?isActive` `?minPrice` `?maxPrice` `?sortBy=name\|price\|quantity\|sku\|createdAt` `?order=asc\|desc` `?page` `?limit` |
| GET | `/products/low-stock` | active products at or below reorder level |
| GET | `/products/:id` | includes category, supplier, last 10 movements |
| POST | `/products` | `quantity` here is opening stock and logs an `IN` movement |
| PUT | `/products/:id` | `quantity` is **rejected** — use the stock endpoints |
| DELETE | `/products/:id` | cascades stock movements |

### Stock
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/stock/:productId/in` | `{ quantity, reason?, reference? }` | receive stock |
| POST | `/stock/:productId/out` | `{ quantity, reason?, reference? }` | 409 if it would go negative |
| POST | `/stock/:productId/adjust` | `{ newQuantity, reason }` | absolute set; reason required |
| GET | `/stock/movements` | — | `?productId` `?type` `?page` `?limit` |

### Health
`GET /api/v1/health` → `{ status, database, uptime }` · `GET /api/v1/` → endpoint index

---

## Response shapes

List:

```json
{ "data": [ ... ], "meta": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 } }
```

Single: `{ "data": { ... } }` · Delete: `204` with no body

Error:

```json
{
  "error": "Validation failed",
  "message": "One or more fields are invalid",
  "details": [{ "field": "name", "message": "name is required" }]
}
```

| Status | When |
|---|---|
| 400 | malformed JSON, referenced category/supplier doesn't exist, no-op adjustment |
| 404 | unknown id or unknown route |
| 409 | duplicate SKU/name/email, insufficient stock, delete blocked by references |
| 422 | field validation failed |
| 500 | unexpected — logged server-side, message hidden in production |

---

## Examples

```bash
# Create a product with opening stock
curl -X POST http://localhost:3000/api/v1/products \
  -H 'Content-Type: application/json' \
  -d '{"sku":"frz-001","name":"Frozen Peas 1kg","price":12.5,"cost":8,
       "quantity":40,"reorderLevel":10,"categoryId":1,"supplierId":1}'

# Receive 25 more against a PO
curl -X POST http://localhost:3000/api/v1/stock/1/in \
  -H 'Content-Type: application/json' \
  -d '{"quantity":25,"reason":"Purchase order","reference":"PO-1001"}'

# What needs reordering?
curl http://localhost:3000/api/v1/products/low-stock
```

---

## Testing

```bash
createdb store_management_test
npm test                      # 27 Jest tests
bash tests/smoke.sh           # 51 curl checks against a running server
```

The Jest suite covers validation, pagination, uniqueness conflicts, referential-integrity guards, SKU normalisation, low-stock filtering, the full stock ledger, and a concurrency test that fires ten parallel `OUT` requests at one product to prove stock can't go negative under load (the row is locked `FOR UPDATE` inside a transaction).

---

## Notes on a few decisions

- **Stock only moves through `/stock`.** `PUT /products/:id` rejects `quantity` so every change has a ledger row explaining it.
- **Row-level locks.** Each stock write does `SELECT ... FOR UPDATE` inside a transaction, so two concurrent sales can't both read the same starting quantity.
- **Two layers of validation.** express-validator rejects bad input shapes at the edge (422); model validators and DB constraints (including `CHECK (quantity >= 0)`) are the backstop.
- **`sortBy` is whitelisted** rather than passed to the query builder, so the sort parameter can't be used for injection.

## Where to take it next

Auth (JWT + roles), customers and sales orders that deduct stock, purchase orders, barcode lookup, CSV import/export, and reporting endpoints (stock valuation, movement summaries by period).
"# store-managment-system-api" 
