#!/bin/bash
# Journal App — API Test Script
# Usage: bash test-api.sh [BASE_URL]
# Default BASE_URL: http://localhost:8080

set -e

BASE="${1:-http://localhost:8080}"
PASS=0
FAIL=0
TOKEN=""
JOURNAL_ID=""

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    green "  PASS: $desc (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $desc — expected HTTP $expected, got HTTP $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    green "  PASS: $desc"
    PASS=$((PASS + 1))
  else
    red "  FAIL: $desc — response does not contain '$needle'"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_contains() {
  local desc="$1" haystack="$2" needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    red "  FAIL: $desc — response contains '$needle' (should not)"
    FAIL=$((FAIL + 1))
  else
    green "  PASS: $desc"
    PASS=$((PASS + 1))
  fi
}

# ============================================================
bold "=== 1. HEALTH CHECK ==="
# ============================================================
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/public/health-check")
assert_status "Health check returns 200" "200" "$STATUS"

BODY=$(curl -s "$BASE/public/health-check")
assert_contains "Health check returns 'Ok'" "$BODY" "Ok"

# ============================================================
bold "=== 2. SECURITY HEADERS ==="
# ============================================================
HEADERS=$(curl -s -I "$BASE/public/health-check")
assert_contains "X-Content-Type-Options header" "$HEADERS" "X-Content-Type-Options"
assert_contains "X-Frame-Options header" "$HEADERS" "X-Frame-Options"
assert_contains "X-Content-Type-Options: nosniff" "$HEADERS" "nosniff"
assert_contains "X-Frame-Options: DENY" "$HEADERS" "DENY"

# ============================================================
bold "=== 3. AUTHENTICATION — SIGN UP ==="
# ============================================================
# Valid signup
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/public/signUp" \
  -H "Content-Type: application/json" \
  -d '{"userName":"testuser1","password":"password123","email":"test1@example.com","sentimentAnalysis":false}')
assert_status "Valid signup returns 200" "200" "$STATUS"

# Short password
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/public/signUp" \
  -H "Content-Type: application/json" \
  -d '{"userName":"testuser_short","password":"123","email":"short@example.com","sentimentAnalysis":false}')
assert_status "Short password returns 400" "400" "$STATUS"

# Duplicate signup (same username)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/public/signUp" \
  -H "Content-Type: application/json" \
  -d '{"userName":"testuser1","password":"password123","email":"dup@example.com","sentimentAnalysis":false}')
assert_status "Duplicate username handled" "400" "$STATUS"

# ============================================================
bold "=== 4. AUTHENTICATION — LOGIN ==="
# ============================================================
# Successful login
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/public/login" \
  -H "Content-Type: application/json" \
  -d '{"userName":"testuser1","password":"password123"}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "Valid login returns 200" "200" "$STATUS"
TOKEN="$BODY"
assert_contains "Login returns JWT token" "$TOKEN" "eyJ"

# Wrong password
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/public/login" \
  -H "Content-Type: application/json" \
  -d '{"userName":"testuser1","password":"wrongpassword"}')
assert_status "Wrong password returns 400" "400" "$STATUS"

# Non-existent user
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/public/login" \
  -H "Content-Type: application/json" \
  -d '{"userName":"nonexistent","password":"password123"}')
assert_status "Non-existent user returns 400" "400" "$STATUS"

# ============================================================
bold "=== 5. UNAUTHORIZED ACCESS ==="
# ============================================================
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/journal")
assert_status "No token → 401/403" "401" "$STATUS"

STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/journal" \
  -H "Authorization: Bearer invalidtoken123")
assert_status "Invalid JWT → 401/403" "401" "$STATUS"

# ============================================================
bold "=== 6. JOURNAL CRUD ==="
# ============================================================
AUTH="Authorization: Bearer $TOKEN"

# Create entry
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/journal" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"title":"Test Entry","content":"This is a test journal entry about my day."}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "Create journal entry returns 201" "201" "$STATUS"
JOURNAL_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")
assert_contains "Created entry has title" "$BODY" "Test Entry"

# Get all entries
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE/journal" -H "$AUTH")
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "Get all entries returns 200" "200" "$STATUS"
assert_contains "Entries list contains our entry" "$BODY" "Test Entry"

# Get entry by ID
if [ -n "$JOURNAL_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE/journal/id/$JOURNAL_ID" -H "$AUTH")
  STATUS=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  assert_status "Get entry by ID returns 200" "200" "$STATUS"
  assert_contains "Fetched entry has correct title" "$BODY" "Test Entry"
fi

# Update entry
if [ -n "$JOURNAL_ID" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE/journal/id/$JOURNAL_ID" \
    -H "Content-Type: application/json" \
    -H "$AUTH" \
    -d '{"title":"Updated Entry","content":"This entry has been updated."}')
  STATUS=$(echo "$RESPONSE" | tail -1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  assert_status "Update entry returns 200" "200" "$STATUS"
  assert_contains "Updated entry has new title" "$BODY" "Updated Entry"
fi

# Delete entry
if [ -n "$JOURNAL_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/journal/id/$JOURNAL_ID" -H "$AUTH")
  assert_status "Delete entry returns 204" "204" "$STATUS"

  # Verify deleted
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/journal/id/$JOURNAL_ID" -H "$AUTH")
  assert_status "Deleted entry returns 404" "404" "$STATUS"
fi

# ============================================================
bold "=== 7. OWNERSHIP ENFORCEMENT ==="
# ============================================================
# Create entry as testuser1
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE/journal" \
  -H "Content-Type: application/json" \
  -H "$AUTH" \
  -d '{"title":"Private Entry","content":"Only I should see this."}')
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
OWNED_ID=$(echo "$BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null || echo "")

# Create second user
curl -s -X POST "$BASE/public/signUp" \
  -H "Content-Type: application/json" \
  -d '{"userName":"testuser2","password":"password456","email":"test2@example.com","sentimentAnalysis":false}' > /dev/null 2>&1

# Login as testuser2
RESPONSE2=$(curl -s -X POST "$BASE/public/login" \
  -H "Content-Type: application/json" \
  -d '{"userName":"testuser2","password":"password456"}')
TOKEN2="$RESPONSE2"
AUTH2="Authorization: Bearer $TOKEN2"

if [ -n "$OWNED_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/journal/id/$OWNED_ID" -H "$AUTH2")
  assert_status "User2 cannot read User1's entry (404)" "404" "$STATUS"

  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/journal/id/$OWNED_ID" -H "$AUTH2")
  assert_status "User2 cannot delete User1's entry (404)" "404" "$STATUS"
fi

# ============================================================
bold "=== 8. ADMIN ENDPOINTS ==="
# ============================================================
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/all-users" -H "$AUTH")
assert_status "Non-admin cannot access admin endpoints (403)" "403" "$STATUS"

# ============================================================
bold "=== 9. SWAGGER ==="
# ============================================================
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/swagger-ui/index.html")
assert_status "Swagger UI accessible" "200" "$STATUS"

# ============================================================
bold "=== 10. CLEANUP ==="
# ============================================================
# Delete testuser1's remaining entries
if [ -n "$TOKEN" ]; then
  ENTRIES=$(curl -s "$BASE/journal" -H "$AUTH" 2>/dev/null)
  if echo "$ENTRIES" | grep -q '"id"'; then
    IDS=$(echo "$ENTRIES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for e in data:
    print(e['id'])
" 2>/dev/null || echo "")
    for ID in $IDS; do
      curl -s -o /dev/null -X DELETE "$BASE/journal/id/$ID" -H "$AUTH" 2>/dev/null
    done
  fi
fi
green "  Cleanup done"

# ============================================================
bold ""
# ============================================================
TOTAL=$((PASS + FAIL))
bold "=== RESULTS: $PASS/$TOTAL passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
  red "Some tests failed!"
  exit 1
else
  green "All tests passed!"
  exit 0
fi
