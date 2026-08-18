#!/usr/bin/env bash
# End-to-end smoke test against a running API. Usage: bash tests/smoke.sh [baseUrl]
BASE="${1:-http://localhost:3000/api/v1}"
PASS=0; FAIL=0

# check <name> <expected-status> <curl args...>
check() {
  local name="$1" expected="$2"; shift 2
  local body status
  body=$(curl -s -w $'\n%{http_code}' "$@")
  status="${body##*$'\n'}"
  body="${body%$'\n'*}"
  if [ "$status" = "$expected" ]; then
    PASS=$((PASS+1)); printf '  PASS  %-52s [%s]\n' "$name" "$status"
  else
    FAIL=$((FAIL+1)); printf '  FAIL  %-52s [got %s, want %s]\n    %s\n' "$name" "$status" "$expected" "${body:0:200}"
  fi
  LAST_BODY="$body"
}

jqf() { python3 -c "import sys,json;print(json.load(sys.stdin)$1)"; }

echo "── Health & discovery ───────────────────────────────"
check "GET /health"                       200 "$BASE/health"
check "GET / (endpoint index)"            200 "$BASE/"
check "GET /nope (unknown route)"         404 "$BASE/nope"

echo "── Categories ───────────────────────────────────────"
check "GET /categories"                   200 "$BASE/categories"
check "POST /categories"                  201 -X POST "$BASE/categories" -H 'Content-Type: application/json' \
      -d '{"name":"Frozen Foods","description":"Freezer section"}'
CAT_ID=$(echo "$LAST_BODY" | jqf "['data']['id']")
check "POST /categories (duplicate name)" 409 -X POST "$BASE/categories" -H 'Content-Type: application/json' \
      -d '{"name":"Frozen Foods"}'
check "POST /categories (missing name)"   422 -X POST "$BASE/categories" -H 'Content-Type: application/json' -d '{}'
check "GET /categories/$CAT_ID"           200 "$BASE/categories/$CAT_ID"
check "GET /categories/999999"            404 "$BASE/categories/999999"
check "GET /categories/abc (bad id)"      422 "$BASE/categories/abc"
check "PUT /categories/$CAT_ID"           200 -X PUT "$BASE/categories/$CAT_ID" -H 'Content-Type: application/json' \
      -d '{"description":"Frozen & chilled"}'
check "GET /categories?search=froz"       200 "$BASE/categories?search=froz"

echo "── Suppliers ────────────────────────────────────────"
check "POST /suppliers"                   201 -X POST "$BASE/suppliers" -H 'Content-Type: application/json' \
      -d '{"name":"Polar Cold Chain","email":"po@polar.example","phone":"+966 11 555 0404"}'
SUP_ID=$(echo "$LAST_BODY" | jqf "['data']['id']")
check "POST /suppliers (bad email)"       422 -X POST "$BASE/suppliers" -H 'Content-Type: application/json' \
      -d '{"name":"Bad Email Co","email":"not-an-email"}'
check "POST /suppliers (dup email)"       409 -X POST "$BASE/suppliers" -H 'Content-Type: application/json' \
      -d '{"name":"Another Co","email":"po@polar.example"}'
check "GET /suppliers/$SUP_ID"            200 "$BASE/suppliers/$SUP_ID"
check "PUT /suppliers/$SUP_ID"            200 -X PUT "$BASE/suppliers/$SUP_ID" -H 'Content-Type: application/json' \
      -d '{"contactName":"Layla Ahmed"}'

echo "── Products ─────────────────────────────────────────"
check "POST /products"                    201 -X POST "$BASE/products" -H 'Content-Type: application/json' \
      -d "{\"sku\":\"frz-001\",\"name\":\"Frozen Peas 1kg\",\"price\":12.5,\"cost\":8,\"quantity\":40,\"reorderLevel\":10,\"categoryId\":$CAT_ID,\"supplierId\":$SUP_ID}"
PROD_ID=$(echo "$LAST_BODY" | jqf "['data']['id']")
SKU=$(echo "$LAST_BODY" | jqf "['data']['sku']")
[ "$SKU" = "FRZ-001" ] && { PASS=$((PASS+1)); echo "  PASS  sku normalised to uppercase (FRZ-001)"; } \
                       || { FAIL=$((FAIL+1)); echo "  FAIL  sku not normalised: $SKU"; }
check "POST /products (dup sku)"          409 -X POST "$BASE/products" -H 'Content-Type: application/json' \
      -d '{"sku":"FRZ-001","name":"Clash"}'
check "POST /products (negative price)"   422 -X POST "$BASE/products" -H 'Content-Type: application/json' \
      -d '{"sku":"NEG-001","name":"Negative","price":-5}'
check "POST /products (bad categoryId)"   400 -X POST "$BASE/products" -H 'Content-Type: application/json' \
      -d '{"sku":"ORP-001","name":"Orphan","categoryId":999999}'
check "GET /products/$PROD_ID"            200 "$BASE/products/$PROD_ID"
check "GET /products?search=frozen"       200 "$BASE/products?search=frozen"
check "GET /products?categoryId=$CAT_ID"  200 "$BASE/products?categoryId=$CAT_ID"
check "GET /products?minPrice=10&maxPrice=20" 200 "$BASE/products?minPrice=10&maxPrice=20"
check "GET /products?sortBy=price&order=asc"  200 "$BASE/products?sortBy=price&order=asc"
check "GET /products?sortBy=hacker"       422 "$BASE/products?sortBy=hacker"
check "GET /products?limit=500"           422 "$BASE/products?limit=500"
check "GET /products/low-stock"           200 "$BASE/products/low-stock"
check "PUT /products/$PROD_ID"            200 -X PUT "$BASE/products/$PROD_ID" -H 'Content-Type: application/json' \
      -d '{"price":13.75}'
check "PUT /products (quantity blocked)"  422 -X PUT "$BASE/products/$PROD_ID" -H 'Content-Type: application/json' \
      -d '{"quantity":999}'

echo "── Stock movements ──────────────────────────────────"
check "POST /stock/$PROD_ID/in (+25)"     201 -X POST "$BASE/stock/$PROD_ID/in" -H 'Content-Type: application/json' \
      -d '{"quantity":25,"reason":"Purchase order","reference":"PO-1001"}'
QTY=$(echo "$LAST_BODY" | jqf "['data']['product']['quantity']")
[ "$QTY" = "65" ] && { PASS=$((PASS+1)); echo "  PASS  quantity 40 -> 65 after stock in"; } \
                  || { FAIL=$((FAIL+1)); echo "  FAIL  expected 65, got $QTY"; }
check "POST /stock/$PROD_ID/out (-5)"     201 -X POST "$BASE/stock/$PROD_ID/out" -H 'Content-Type: application/json' \
      -d '{"quantity":5,"reason":"Sold"}'
QTY=$(echo "$LAST_BODY" | jqf "['data']['product']['quantity']")
[ "$QTY" = "60" ] && { PASS=$((PASS+1)); echo "  PASS  quantity 65 -> 60 after stock out"; } \
                  || { FAIL=$((FAIL+1)); echo "  FAIL  expected 60, got $QTY"; }
check "POST /stock/out (oversell)"        409 -X POST "$BASE/stock/$PROD_ID/out" -H 'Content-Type: application/json' \
      -d '{"quantity":99999,"reason":"Too much"}'
check "POST /stock/in (quantity 0)"       422 -X POST "$BASE/stock/$PROD_ID/in" -H 'Content-Type: application/json' \
      -d '{"quantity":0}'
check "POST /stock/adjust (no reason)"    422 -X POST "$BASE/stock/$PROD_ID/adjust" -H 'Content-Type: application/json' \
      -d '{"newQuantity":50}'
check "POST /stock/adjust -> 50"          201 -X POST "$BASE/stock/$PROD_ID/adjust" -H 'Content-Type: application/json' \
      -d '{"newQuantity":50,"reason":"Stock count correction"}'
check "POST /stock/in on missing product" 404 -X POST "$BASE/stock/999999/in" -H 'Content-Type: application/json' \
      -d '{"quantity":1}'
check "GET /stock/movements"              200 "$BASE/stock/movements"
check "GET /stock/movements?type=OUT"     200 "$BASE/stock/movements?type=OUT"
check "GET /stock/movements?type=BOGUS"   422 "$BASE/stock/movements?type=BOGUS"

echo "── Referential integrity & cleanup ──────────────────"
check "DELETE /categories (in use)"       409 -X DELETE "$BASE/categories/$CAT_ID"
check "DELETE /suppliers (in use)"        409 -X DELETE "$BASE/suppliers/$SUP_ID"
check "DELETE /products/$PROD_ID"         204 -X DELETE "$BASE/products/$PROD_ID"
check "DELETE /categories/$CAT_ID"        204 -X DELETE "$BASE/categories/$CAT_ID"
check "DELETE /suppliers/$SUP_ID"         204 -X DELETE "$BASE/suppliers/$SUP_ID"
check "DELETE /products (already gone)"   404 -X DELETE "$BASE/products/$PROD_ID"
check "malformed JSON body"               400 -X POST "$BASE/categories" -H 'Content-Type: application/json' -d '{bad json'

echo
echo "════════════════════════════════════════════════════"
echo "  passed: $PASS   failed: $FAIL"
[ "$FAIL" -eq 0 ] || exit 1
