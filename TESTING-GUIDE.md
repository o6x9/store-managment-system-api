# Setup & Testing Guide — Windows + Postman

Everything from a blank machine to a fully tested API, in order. Do the parts in sequence: **A** gets it running, **B** explains what you just started, **C** tests every endpoint, **D** proves it in the database, **E** runs the automated suite.

Don't skip the checkpoints. If a checkpoint fails, fix it before moving on — every later step depends on it.

---

# PART A — Get everything connected

## Step 1 — Install Node.js

1. Go to **https://nodejs.org** and download the **LTS** installer (the left-hand button).
2. Run it. Accept the defaults. On the "Tools for Native Modules" screen you can leave the checkbox **unticked**.
3. Open **PowerShell** (press `Win`, type `powershell`, Enter) and check:

```powershell
node -v
npm -v
```

> **Checkpoint 1:** you see two version numbers, e.g. `v22.x.x` and `10.x.x`. If PowerShell says "not recognized", close it and open a **new** window — the PATH only updates for new terminals.

---

## Step 2 — Install PostgreSQL

1. Go to **https://www.postgresql.org/download/windows/** → "Download the installer".
2. Pick the latest version (16 or 17). Run the installer **as administrator**.
3. Component screen: keep **PostgreSQL Server**, **pgAdmin 4**, and **Command Line Tools** ticked. You can untick Stack Builder.
4. **Password screen — this matters.** You are setting the password for the superuser named `postgres`. Type something you will remember and **write it down**. You need it in Step 6 and Step 7.
5. Port: leave **5432**.
6. Locale: leave **Default locale**.
7. Finish. Uncheck "Launch Stack Builder" at the end.

Verify the service is running:

```powershell
Get-Service postgresql*
```

> **Checkpoint 2:** Status shows **Running**. If it shows Stopped, run `Start-Service postgresql-x64-16` (adjust the number to your version) in an **administrator** PowerShell.

---

## Step 3 — Make `psql` usable from PowerShell (optional but useful)

The installer puts the command-line tools in `C:\Program Files\PostgreSQL\16\bin` but doesn't always add them to PATH. Add it once:

1. Press `Win`, type **"environment variables"**, open *Edit the system environment variables*.
2. **Environment Variables…** → under *System variables* select **Path** → **Edit** → **New**.
3. Paste `C:\Program Files\PostgreSQL\16\bin` (change `16` to your version) → OK on every window.
4. **Close and reopen PowerShell**, then:

```powershell
psql --version
```

> If you'd rather not touch PATH, you can do everything in this guide through **pgAdmin 4** instead — I give both routes.

---

## Step 4 — Unzip the project and open it

1. Extract `store-management-api.zip` somewhere simple, e.g. `C:\Projects\store-management-api`.
   **Avoid** OneDrive/Desktop folders with spaces or Arabic characters in the path — npm sometimes trips over them.
2. Open the folder in **VS Code** (or just `cd` into it in PowerShell):

```powershell
cd C:\Projects\store-management-api
dir
```

> **Checkpoint 3:** you can see `package.json`, `src`, `migrations`, `seeders`, `tests`, `postman`.

---

## Step 5 — Install the project dependencies

```powershell
npm install
```

This reads `package.json` and downloads every library into a new `node_modules` folder (Express, Sequelize, the `pg` PostgreSQL driver, etc.). It takes a minute or two.

> **Checkpoint 4:** it finishes without red `ERR!` lines, and a `node_modules` folder now exists.
>
> If you get **"running scripts is disabled on this system"**, run this once and try again:
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
> ```

---

## Step 6 — Create the two databases

You need two: the real one, and a separate one the automated tests wipe clean.

### Route 1 — pgAdmin (visual)

1. Open **pgAdmin 4** from the Start menu. It asks for a master password (that's a pgAdmin-only password, set anything).
2. In the left tree expand **Servers → PostgreSQL 16**. It asks for the `postgres` password from Step 2.
3. Right-click **Databases → Create → Database…**, name it `store_management`, Save.
4. Repeat for `store_management_test`.

### Route 2 — PowerShell (faster)

```powershell
psql -U postgres -c "CREATE DATABASE store_management;"
psql -U postgres -c "CREATE DATABASE store_management_test;"
```

It prompts for the `postgres` password each time.

> **Checkpoint 5:** `psql -U postgres -l` lists both databases. In pgAdmin, both appear under Databases.

---

## Step 7 — Create your `.env` file

The project ships with `.env.example`. Copy it and fill in your real password:

```powershell
copy .env.example .env
notepad .env
```

Make it look like this, with **your** Step 2 password:

```env
NODE_ENV=development
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=store_management
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_LOGGING=false
```

Save and close.

**What this file does:** `src/config/config.js` reads these values at startup. Nothing about your database lives in the source code — that's why `.env` is in `.gitignore` and `.env.example` (with no real password) is the one committed to git.

> Tip: set `DB_LOGGING=true` later if you want to watch every SQL statement Sequelize generates in the terminal. It's the single best way to understand what the ORM is actually doing.

---

## Step 8 — Create the tables (migrations)

```powershell
npm run db:migrate
```

You should see four migrations run in order:

```
== 20260814000001-create-categories: migrated
== 20260814000002-create-suppliers: migrated
== 20260814000003-create-products: migrated
== 20260814000004-create-stock-movements: migrated
```

**What just happened:** each file in `migrations/` is a script with an `up()` (build this) and a `down()` (undo it). Sequelize ran them oldest-first and recorded each filename in a table called `SequelizeMeta`, so running the command again does nothing — it knows they're already applied.

Look at what was created, in pgAdmin: **store_management → Schemas → public → Tables**. Right-click `products` → **View/Edit Data → All Rows** (empty for now).

> **Checkpoint 6:** five tables exist — `categories`, `suppliers`, `products`, `stock_movements`, `SequelizeMeta`.

---

## Step 9 — Load the demo data (seeders)

```powershell
npm run db:seed
```

This inserts 4 categories, 3 suppliers, and 5 products. Check it:

```powershell
psql -U postgres -d store_management -c "SELECT sku, name, quantity, reorder_level FROM products ORDER BY sku;"
```

```
   sku   |           name           | quantity | reorder_level
---------+--------------------------+----------+---------------
 BEV-001 | Arabic Coffee 250g       |      120 |            20
 BEV-002 | Mineral Water 1.5L       |        8 |            25
 DRY-001 | Full Cream Milk 1L       |       15 |            30
 HSE-001 | Dish Soap 500ml          |       60 |            15
 SNK-001 | Salted Potato Chips 150g |      200 |            40
```

Note **BEV-002** (8 ≤ 25) and **DRY-001** (15 ≤ 30) are already below their reorder level — they should show up in the low-stock report later. That's deliberate, so you have something to test against.

> **Checkpoint 7:** five product rows exist.

---

## Step 10 — Start the API

```powershell
npm run dev
```

```
✓ PostgreSQL connection established
✓ API listening on http://localhost:3000/api/v1
```

`npm run dev` uses **nodemon**, which restarts the server automatically whenever you save a file. Use `npm start` for a plain run.

**Leave this window open.** The server runs in it. To test, open a **second** PowerShell window.

> **Checkpoint 8:** open **http://localhost:3000/api/v1/health** in your browser. You should see:
> ```json
> {"status":"ok","database":"connected","uptime":3.2}
> ```
> `"database":"connected"` is the important part — it means Express reached PostgreSQL. If you see this, **everything is wired together correctly.**

Stop the server any time with `Ctrl + C`.

---

# PART B — What did you just start?

Before testing, understand the path a request takes. Every single request follows the same five hops:

```
   Postman
      │  POST /api/v1/products  { "sku": "frz-001", ... }
      ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. src/app.js          helmet → cors → express.json()       │  parses the JSON body
├─────────────────────────────────────────────────────────────┤
│ 2. src/routes/         product.routes.js matches POST /     │  picks the handler
├─────────────────────────────────────────────────────────────┤
│ 3. src/validators/     createProduct rules run              │  bad input stops HERE → 422
│    src/middleware/validate.js                               │
├─────────────────────────────────────────────────────────────┤
│ 4. src/controllers/    product.controller.js create()       │  the business rules
├─────────────────────────────────────────────────────────────┤
│ 5. src/models/         Product.create() → SQL → PostgreSQL  │  the data
└─────────────────────────────────────────────────────────────┘
      │
      ▼  201 { "data": { ...} }      ← or any thrown error lands in
                                        src/middleware/errorHandler.js
```

Two things worth internalising:

- **Validation happens before the controller.** A request with a missing `name` never reaches your business logic and never touches the database. That's why 422 responses come back in a couple of milliseconds.
- **Controllers never format errors.** They just `throw ApiError.notFound(...)` or let Sequelize throw. One file — `errorHandler.js` — turns every error into JSON and picks the status code. That's why the error shape is identical across all 20+ endpoints.

**Status codes you'll see and what each means here:**

| Code | Meaning in this API |
|---|---|
| 200 | Read or update succeeded |
| 201 | Something was created |
| 204 | Deleted; there's intentionally no response body |
| 400 | Malformed JSON, or you referenced a category/supplier that doesn't exist |
| 404 | That id doesn't exist, or that URL isn't a route |
| 409 | Conflict: duplicate SKU/name/email, not enough stock, or delete blocked by references |
| 422 | Your input failed validation — the `details` array names the exact field |
| 500 | A bug. Check the server terminal window. |

---

# PART C — Test every endpoint with Postman

## Step 11 — Install Postman and import the collection

1. Download from **https://www.postman.com/downloads/** and install. You can skip creating an account — click **"Continue without an account"** at the bottom of the sign-in screen.
2. Click **Import** (top left).
3. Drag in **`postman/Store-Management-API.postman_collection.json`** from the project folder.
4. A collection called **Store Management API — Full Test Run** appears in the sidebar with 6 folders and 53 requests.

The collection already knows your server address. If you changed `PORT` in `.env`, click the collection name → **Variables** tab → edit `baseUrl`.

**Two things this collection does for you automatically:**

- **Saves ids.** When you create a category, a script grabs the returned `id` and stores it in `{{categoryId}}`. Every later request that needs it uses that variable, so you never copy-paste ids by hand.
- **Checks the answer.** Each request has assertions. After sending, click the **Test Results** tab next to the response body — green means the API behaved correctly, not just that it replied.

---

## Step 12 — Folder 0: prove the connection

Open **`0 — Health & discovery`** and send both requests.

| Request | Expect | What it proves |
|---|---|---|
| `01. Health check` | 200, `"database":"connected"` | Express is up **and** Postgres is reachable |
| `02. Endpoint index` | 200, list of endpoints | Routing works |

If health returns `"degraded"`, your `.env` credentials are wrong — go back to Step 7.

---

## Step 13 — Folder 1: Categories (learn the CRUD pattern here)

Send these **in order**. Read the response each time before moving on.

**`03. List categories`** → `200`
```json
{
  "data": [ { "id": 1, "name": "Beverages", ... } ],
  "meta": { "total": 4, "page": 1, "limit": 20, "totalPages": 1 }
}
```
Every list endpoint in this API returns this exact shape: rows in `data`, paging info in `meta`. Learn it once, it applies everywhere.

**`04. Create category`** → `201`. The response carries the new row **including its id**. The test script saved that id — check the collection's **Variables** tab and you'll see `categoryId` now has a value.

**`05. Duplicate name`** → `409`. You sent "Frozen Foods" again. PostgreSQL's unique index rejected it, Sequelize threw a `UniqueConstraintError`, and `errorHandler` translated that into 409. *No `if (nameExists)` check was written anywhere* — the database is the source of truth.

**`06. No name`** → `422`, and look at the body:
```json
{ "error": "Validation failed",
  "details": [{ "field": "name", "message": "name is required" }] }
```
The `details` array is what a frontend uses to highlight the wrong input box.

**`07. Get by id`** → `200`. Notice `products: []` is included — that's the `Category.hasMany(Product)` association being eager-loaded in one SQL JOIN.

**`08. Missing id`** → `404`. **`09. Non-numeric id`** → `422` — `/categories/abc` is rejected by the param validator before any query runs.

**`10. Update`** → `200`. You only sent `description`; `name` is untouched. Partial updates are the norm here.

**`11. Search`** → `200`. `?search=froz` does a case-insensitive partial match. Try `?search=FROZ` — same result.

**`12. Pagination`** → `200` with exactly 2 rows. Change `limit` to 3 and resend to see `meta` update.

---

## Step 14 — Folder 2: Suppliers (validation depth)

**`13. Create supplier`** → `201`. `isActive` comes back `true` even though you never sent it — that's a model default.

**`14. Invalid email`** → `422`, **`15. Duplicate email`** → `409`. Two different failures for two different reasons: one is *shape* (caught by the validator), one is *state* (caught by the database).

**`17. Update supplier`** — look at the body being sent:
```json
{ "phone": "+966 11 555 0999", "id": 9999 }
```
It tries to change the primary key. The response comes back with the **original** id. The controller has a `pick()` function that copies only whitelisted fields out of the body, so anything else you send is silently ignored. Test any API you build this way — a lot of them fail it.

---

## Step 15 — Folder 3: Products (the interesting one)

**`19. Create product`** → `201`. Three things to notice in the response:

1. You sent `"sku": "frz-001"`, you got back `"FRZ-001"`. A setter on the model uppercases it, so `frz-001` and `FRZ-001` can never become two different products.
2. `"isLowStock": false` — this column doesn't exist in the database. It's computed on the way out (`quantity <= reorderLevel`).
3. `category` and `supplier` objects are nested in. Two JOINs, one query.

**`22. Non-existent categoryId`** → `400` with `"Category 999999 does not exist"`. Without that check you'd get a raw PostgreSQL foreign-key error — technically correct, useless to a frontend developer.

**`23. Get product by id`** → `200`. Scroll to `stockMovements`. There's already one row, type `IN`, quantity 40 — created automatically because you supplied opening stock. **The ledger is complete from the product's first moment.**

**`24–28. Filters.** Try modifying them in Postman's Params table:
- `?search=frozen` searches name, SKU **and** description
- `?minPrice=10&maxPrice=20`
- `?sortBy=price&order=asc`

**`29. Invalid sortBy`** → `422`. The value sent is `DROP TABLE products`. `sortBy` is checked against a whitelist of five column names, so a hostile value never reaches the SQL. This is the one query parameter that *would* be injectable if passed straight through.

**`31. Low stock report`** → `200`. `BEV-002` and `DRY-001` from the seed data appear. The SQL compares two columns to each other (`quantity <= reorder_level`) rather than to a fixed number.

**`33. Update quantity directly`** → **`422`, on purpose.** This is the most important design decision in the project:

> You cannot change stock through `PUT /products/:id`. Ever.
>
> If you could, someone would set `quantity = 500` and nobody could answer "why?". Every stock change must go through `/stock`, where it gets a ledger row with a before, an after, and a reason.

---

## Step 16 — Folder 4: Stock movements (transactions in action)

The product currently has **40** units. Follow the arithmetic.

**`34. Stock IN +25`** → `201`
```json
{ "movement": { "type": "IN", "quantity": 25,
                "quantityBefore": 40, "quantityAfter": 65,
                "reference": "PO-1001" },
  "product": { "quantity": 65 } }
```
Two writes — update the product, insert the movement — inside **one transaction**. Either both land or neither does.

**`35. Stock OUT -5`** → `201`, now **60**.

**`36. Oversell 99999`** → `409` "Insufficient stock: have 60, tried to remove 99999".

**`37.`** re-reads the product: still **60**. The transaction rolled back — no partial update, and **no ledger row was written for the failed attempt**. Confirm that in `43.` where the total is 4, not 5.

**`39. Adjust without reason`** → `422`. A correction always needs a written justification.

**`40. Adjust to 50`** → `201`. This one is an **absolute set**, not a delta: "the shelf actually has 50". The ledger stores `quantity: 10` — the *size* of the correction — plus before 60 and after 50.

**`43. Full movement history`** → `200`, 4 rows, newest first:

| # | type | qty | before → after | reason |
|---|---|---|---|---|
| 4 | ADJUSTMENT | 10 | 60 → 50 | Physical stock count correction |
| 3 | OUT | 5 | 65 → 60 | Sold to customer |
| 2 | IN | 25 | 40 → 65 | Purchase order received |
| 1 | IN | 40 | 0 → 40 | Initial stock on product creation |

Read the `before → after` column downwards: `0→40→65→60→50`. It's a continuous chain with no gaps. **That's what an audited ledger buys you** — the current quantity isn't a number someone typed, it's the sum of a history you can inspect.

---

## Step 17 — Folder 5: Integrity guards & cleanup

**`46. Delete category in use`** → `409`. A product still points at it. Allowing the delete would leave the product with a dangling `categoryId`.

**`48. Delete the product`** → `204`. No response body — that's correct for a delete, not a bug.

**`49.`** then shows the movement history is **empty**. The stock movements were deleted with the product, via `ON DELETE CASCADE` in the migration. The database did that, not the application code.

**`50.`, `51.`** now delete the category and supplier successfully — nothing references them any more.

**`52. Delete product again`** → `404`. **`53. Unknown route`** → `404` from the catch-all handler.

---

## Step 18 — Run the whole collection at once

Now that you've walked through it manually, automate it:

1. Hover the collection name → **⋯** → **Run collection**.
2. Leave everything default → **Run Store Management API**.

Expect: **53 requests, 86 assertions, 0 failures**, in about a second.

This is the run you'd repeat after every change you make to the code. The collection cleans up after itself, so you can run it as many times as you like without resetting the database.

If you want it in the terminal instead of the GUI:

```powershell
npm install -g newman
newman run postman/Store-Management-API.postman_collection.json
```

---

# PART D — Watch it happen in the database

Keeping the API running, open pgAdmin → `store_management` → **Query Tool** and run these while you fire requests.

```sql
-- The full ledger, newest first, with product names
SELECT sm.id, p.sku, sm.type, sm.quantity,
       sm.quantity_before AS before, sm.quantity_after AS after,
       sm.reason, sm.created_at
FROM stock_movements sm
JOIN products p ON p.id = sm.product_id
ORDER BY sm.created_at DESC;

-- What needs reordering (the same comparison the API does)
SELECT sku, name, quantity, reorder_level
FROM products
WHERE quantity <= reorder_level AND is_active = true
ORDER BY quantity;

-- Stock value on hand
SELECT c.name AS category,
       COUNT(p.id) AS products,
       SUM(p.quantity) AS units,
       ROUND(SUM(p.quantity * p.cost), 2) AS stock_value
FROM categories c
LEFT JOIN products p ON p.category_id = c.id
GROUP BY c.name
ORDER BY stock_value DESC NULLS LAST;
```

**Prove the safety net is real** — try to break the rule from outside the API:

```sql
UPDATE products SET quantity = -1 WHERE sku = 'BEV-001';
```

```
ERROR:  new row for relation "products" violates check constraint
        "products_quantity_non_negative"
```

Even with a direct SQL connection, bypassing all your JavaScript, the database refuses. That's the `CHECK (quantity >= 0)` constraint added in the products migration. Validation in three layers — validator, model, database — means a bug in one layer isn't a disaster.

---

# PART E — The automated test suite

Postman tests a running server. The Jest suite tests the code directly, against `store_management_test`, wiping it clean each run.

```powershell
npm test
```

```
Test Suites: 2 passed, 2 total
Tests:       27 passed, 27 total
```

`tests/catalog.test.js` covers validation, pagination, uniqueness, SKU normalisation, the low-stock query, and the delete guards. `tests/stock.test.js` covers the ledger.

**The one test worth reading** is at the bottom of `tests/stock.test.js`:

```js
test('ten parallel OUT requests of 15 against 100 units never go negative', async () => {
  const attempts = Array.from({ length: 10 }, () =>
    request(app).post(`/api/v1/stock/${product.id}/out`).send({ quantity: 15 })
  );
  const results = await Promise.all(attempts);

  expect(results.filter(r => r.status === 201).length).toBe(6);  // 6 × 15 = 90
  expect(results.filter(r => r.status === 409).length).toBe(4);
  await product.reload();
  expect(product.quantity).toBe(10);
});
```

Ten simultaneous sales hit one product holding 100 units. Exactly 6 succeed, 4 are refused, and it lands on 10 — never negative.

**Why it works:** the stock controller does `SELECT ... FOR UPDATE` inside a transaction, which locks that product row. Request 2 can't read the quantity until request 1 has committed. Without the lock, several requests would read "100" at the same time, all decide there's enough, and all write — the classic race condition, and the single most common bug in inventory systems.

Run one file, or watch mode while you code:

```powershell
npx jest tests/stock.test.js
npx jest --watch
```

---

# PART F — When something breaks

| What you see | What it means | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | PostgreSQL isn't running | `Get-Service postgresql*` → `Start-Service postgresql-x64-16` (as admin) |
| `password authentication failed for user "postgres"` | Wrong `DB_PASSWORD` in `.env` | Retype it. No quotes, no spaces around `=` |
| `database "store_management" does not exist` | Step 6 skipped | `psql -U postgres -c "CREATE DATABASE store_management;"` |
| `relation "products" does not exist` | Migrations not run | `npm run db:migrate` |
| `EADDRINUSE :::3000` | Port 3000 already taken | `netstat -ano \| findstr :3000` then `taskkill /PID <pid> /F` — or change `PORT` in `.env` |
| `npm.ps1 cannot be loaded ... scripts is disabled` | PowerShell execution policy | `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |
| `psql: command not found` | PATH not set | Step 3, or use pgAdmin instead |
| Postman: `Could not send request` | Server not running | Check the terminal from Step 10 |
| Postman request returns 404 with a `{{variable}}` in the URL | You ran a request out of order | Run its folder from the top, or use Run collection |
| Tests fail with `database ... _test does not exist` | Second database missing | `psql -U postgres -c "CREATE DATABASE store_management_test;"` |
| A 500 error | A real bug | Read the **server terminal** — the stack trace is there, not in the response |

**Reset everything and start clean:**

```powershell
npm run db:reset      # undo all migrations → re-run them → re-seed
```

---

# Quick reference

```powershell
npm install          # once, after unzipping
npm run db:migrate   # create tables
npm run db:seed      # insert demo data
npm run db:reset     # wipe and rebuild everything
npm run dev          # start with auto-reload
npm start            # start normally
npm test             # 27 Jest tests
newman run postman/Store-Management-API.postman_collection.json   # 53 API tests
```

| Where | What lives there |
|---|---|
| `src/models/` | Table shape, validation rules, relationships |
| `src/controllers/` | Business rules — what happens on each request |
| `src/routes/` | URL → validator → controller wiring |
| `src/validators/` | Input rules, checked before the controller |
| `src/middleware/errorHandler.js` | Every error becomes JSON here |
| `migrations/` | Versioned schema history |
| `postman/` | The 53-request test collection |

---

## A good order to explore the code

Once the tests pass, read the source in the order a request travels — it'll make far more sense than opening files alphabetically:

1. `src/routes/product.routes.js` — five lines, shows the whole pattern
2. `src/validators/product.validator.js` — what "valid" means
3. `src/controllers/product.controller.js` — the actual logic
4. `src/models/product.model.js` — the table and its rules
5. `src/controllers/stock.controller.js` — read `applyMovement()` slowly, it's the heart of the project
6. `src/middleware/errorHandler.js` — how one file gives 20 endpoints identical error handling
