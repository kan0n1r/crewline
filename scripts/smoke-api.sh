#!/usr/bin/env bash
# Crewline API smoke checks against a running server
set -euo pipefail
BASE="${BASE_URL:-http://localhost:3000}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

echo "== Health =="
curl -sf "$BASE/api/health" | head -c 200
echo

echo "== Login (alice) =="
curl -sf -c "$COOKIE_JAR" -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"alice123"}' \
  "$BASE/api/login" | head -c 300
echo

echo "== Me =="
curl -sf -b "$COOKIE_JAR" "$BASE/api/me"
echo

echo "== Customers (count) =="
curl -sf "$BASE/api/customers" | python3 -c "import sys,json; print(len(json.load(sys.stdin)), 'customers')"

echo "== Deals (count) =="
curl -sf "$BASE/api/deals" | python3 -c "import sys,json; print(len(json.load(sys.stdin)), 'deals')"

echo "== Update notes =="
curl -sf -H 'Content-Type: application/json' \
  -d '{"notes":"Smoke test note"}' \
  "$BASE/api/customers/1/notes"
echo

echo "== Slack mock =="
curl -sf -H 'Content-Type: application/json' \
  -d '{"message":"Smoke test","channel":"#sales"}' \
  "$BASE/api/integrations/slack"
echo

echo "== Power BI mock =="
curl -sf "$BASE/api/integrations/powerbi" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('dashboard'))"

echo "OK — smoke finished against $BASE"
