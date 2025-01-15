#!/usr/bin/env bash
# ──────────────────────────────────────────────
# 🔒 Mycelium ERP — Pre-Commit Safety Gatecheck
# ──────────────────────────────────────────────
# Usage:  bash scripts/tools/safety-check.sh [--all | --build | --lint | --secrets | --sql | --auth | --errors | --asynchandler | --rawpool | --rbac | --permissions]
# No args = runs all gates.

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$PROJECT_ROOT"

# ── Colours ──────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Colour

PASS="${GREEN}✅ PASS${NC}"
FAIL="${RED}❌ FAIL${NC}"
WARN="${YELLOW}⚠️  WARN${NC}"

# ── Result tracking ─────────────────────────
declare -A RESULTS
OVERALL=0 # 0 = pass, 1 = fail

# ── Helpers ──────────────────────────────────
header() {
    echo ""
    echo -e "${CYAN}${BOLD}── Gate $1: $2 ──${NC}"
}

record() {
    local gate="$1"
    local status="$2" # 0=pass, 1=fail
    if [ "$status" -eq 0 ]; then
        RESULTS["$gate"]="$PASS"
    else
        RESULTS["$gate"]="$FAIL"
        OVERALL=1
    fi
}

# ── Gate 1: Build Verification ───────────────
gate_build() {
    header 1 "Build Verification"
    if npm run build:only 2>&1; then
        echo -e "\n${GREEN}Build succeeded.${NC}"
        record "Build" 0
    else
        echo -e "\n${RED}Build failed! Fix errors before proceeding.${NC}"
        record "Build" 1
    fi
}

# ── Gate 2: Lint Check ───────────────────────
gate_lint() {
    header 2 "Lint Check"
    if npm run lint 2>&1; then
        echo -e "\n${GREEN}Lint passed.${NC}"
        record "Lint" 0
    else
        echo -e "\n${RED}Lint failed! Run 'npm run lint:fix' then fix remaining issues.${NC}"
        record "Lint" 1
    fi
}

# ── Gate 3: Secret Scan ──────────────────────
gate_secrets() {
    header 3 "Secret Scan"
    local hits
    hits=$(grep -rn \
        --include='*.js' --include='*.jsx' --include='*.cjs' --include='*.mjs' --include='*.json' \
        -E "(password|secret|token|api_key|apikey|api-key)\s*[:=]\s*['\"][^'\"]{8,}" \
        backend/ frontend/ shared/ 2>/dev/null \
        | grep -vi "example\|placeholder\|your_\|process\.env\|\.env\.\|node_modules\|package-lock" \
        || true)

    if [ -z "$hits" ]; then
        echo -e "${GREEN}No hardcoded secrets found.${NC}"
        record "Secrets" 0
    else
        echo -e "${RED}Potential hardcoded secrets detected:${NC}"
        echo "$hits"
        echo -e "\n${YELLOW}Review each hit — remove real credentials and rotate them.${NC}"
        record "Secrets" 1
    fi
}

# ── Gate 4: Dangerous SQL Scan ───────────────
gate_sql() {
    header 4 "Dangerous SQL Scan"
    local hits
    hits=$(grep -rn \
        --include='*.js' --include='*.cjs' --include='*.mjs' \
        -i -E "(DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE\s+|DELETE\s+FROM\s+\w+\s*$|DELETE\s+FROM\s+\w+\s*;)" \
        backend/ shared/ 2>/dev/null \
        || true)

    if [ -z "$hits" ]; then
        echo -e "${GREEN}No dangerous SQL patterns found.${NC}"
        record "SQL" 0
    else
        echo -e "${RED}Potentially destructive SQL detected:${NC}"
        echo "$hits"
        echo -e "\n${YELLOW}Ensure all operations have WHERE clauses and user approval.${NC}"
        record "SQL" 1
    fi
}

# ── Gate 5: Auth Bypass Scan ─────────────────
gate_auth() {
    header 5 "Auth Bypass Scan"
    local hits
    hits=$(grep -rn \
        --include='*.js' --include='*.cjs' --include='*.mjs' \
        -E "(auth.*skip|bypass.*auth|middleware.*disable|requireAuth.*false|excludePaths.*\*)" \
        backend/ 2>/dev/null \
        | grep -vi "test\|spec\|mock\|// " \
        || true)

    if [ -z "$hits" ]; then
        echo -e "${GREEN}No auth bypass patterns found.${NC}"
        record "Auth" 0
    else
        echo -e "${YELLOW}Auth exclusion patterns found (review for legitimacy):${NC}"
        echo "$hits"
        echo -e "\n${YELLOW}Known exclusions (/api/auth/*, /api/health) are acceptable.${NC}"
        # Auth exclusions aren't auto-fail — they need review
        record "Auth" 0
    fi
}

# ── Gate 6: Error Swallowing Scan ────────────
gate_errors() {
    header 6 "Error Swallowing Scan"
    local hits
    hits=$(grep -rn \
        --include='*.js' --include='*.cjs' --include='*.mjs' \
        -P "catch\s*\([^)]*\)\s*\{\s*\}" \
        backend/ frontend/ shared/ 2>/dev/null \
        || true)

    if [ -z "$hits" ]; then
        echo -e "${GREEN}No empty catch blocks found.${NC}"
        record "Errors" 0
    else
        echo -e "${RED}Empty catch blocks found:${NC}"
        echo "$hits"
        echo -e "\n${YELLOW}Add at minimum console.error(err) inside each catch block.${NC}"
        record "Errors" 1
    fi
}

# ── Gate 7: asyncHandler Coverage ────────────
gate_asynchandler() {
    header 7 "asyncHandler Coverage"
    local hits
    hits=$(grep -rn \
        --include='*.js' --include='*.cjs' \
        -E "router\.(get|post|put|delete|patch)\(" \
        backend/routes/ 2>/dev/null \
        | grep -v "asyncHandler" \
        | grep -v "^Binary" \
        || true)

    if [ -z "$hits" ]; then
        echo -e "${GREEN}All route handlers use asyncHandler.${NC}"
        record "asyncHandler" 0
    else
        echo -e "${RED}Route handlers missing asyncHandler wrapper:${NC}"
        echo "$hits"
        echo -e "\n${YELLOW}Wrap each bare handler with asyncHandler() to prevent unhandled rejections.${NC}"
        record "asyncHandler" 1
    fi
}

# ── Gate 8: Raw Pool Access Scan ─────────────
gate_rawpool() {
    header 8 "Raw Pool Access Scan"
    local hits
    hits=$(grep -rn \
        --include='*.js' --include='*.cjs' --include='*.mjs' \
        -E "pool\.(query|getConnection)\(" \
        backend/ 2>/dev/null \
        | grep -v "queryHelper\.js" \
        | grep -v "database-transaction-helper\.js" \
        | grep -v "database\.js" \
        | grep -v "node_modules" \
        || true)

    if [ -z "$hits" ]; then
        echo -e "${GREEN}No raw pool access found outside query helpers.${NC}"
        record "RawPool" 0
    else
        echo -e "${RED}Direct pool access found outside permitted files:${NC}"
        echo "$hits"
        echo -e "\n${YELLOW}Use withConnection()/withTransaction()/executeTransaction() instead.${NC}"
        record "RawPool" 1
    fi
}

# ── Gate 9: RBAC Route Coverage ──────────────
gate_rbac() {
    header 9 "RBAC Route Coverage"
    local missing=0
    local missing_files=""

    # Public/special files that don't need RBAC
    local skip_files="auth.js receipts.js index.js catalog.js service-operations.js"

    for f in backend/routes/*.js; do
        local base
        base=$(basename "$f")

        # Skip public/special files
        if echo "$skip_files" | grep -qw "$base"; then
            continue
        fi

        if ! grep -q "requirePermission\|requireRole\|requireAnyPermission\|requireAllPermissions" "$f" 2>/dev/null; then
            missing_files="${missing_files}\n  ⚠️  Missing RBAC guard: $f"
            missing=1
        fi
    done

    if [ "$missing" -eq 0 ]; then
        echo -e "${GREEN}All protected route files have RBAC guards.${NC}"
        record "RBAC" 0
    else
        echo -e "${YELLOW}Route files without RBAC middleware:${NC}"
        echo -e "$missing_files"
        echo -e "\n${YELLOW}Add requirePermission(PERMISSIONS.X) or equivalent to unguarded routes.${NC}"
        # RBAC gaps are a warning, not auto-fail (may be intentional)
        record "RBAC" 0
    fi
}

# ── Gate 10: Permission Constant Integrity ───
gate_permissions() {
    header 10 "Permission Constant Integrity"
    local hits
    hits=$(grep -rn \
        --include='*.js' --include='*.cjs' --include='*.mjs' \
        -E "'(inventory|warehouse|users|invoices|suppliers|repairs|rma|stocktake|receipts|spare-parts|audit|system)\.(read|write|delete|manage|approve|export)'" \
        backend/ 2>/dev/null \
        | grep -v "permissions\.cjs" \
        | grep -v "permissions\.js" \
        | grep -v "node_modules" \
        | grep -v " \* " \
        | grep -v "^\s*//" \
        || true)

    if [ -z "$hits" ]; then
        echo -e "${GREEN}No hardcoded permission strings found.${NC}"
        record "Permissions" 0
    else
        echo -e "${RED}Hardcoded permission strings found outside permissions files:${NC}"
        echo "$hits"
        echo -e "\n${YELLOW}Replace with PERMISSIONS.X constants from permissions.cjs.${NC}"
        record "Permissions" 1
    fi
}

# ── Summary Report ───────────────────────────
print_summary() {
    echo ""
    echo -e "${BOLD}🔒 Pre-Commit Safety Report${NC}"
    echo "─────────────────────────────"

    local gates=("Build" "Lint" "Secrets" "SQL" "Auth" "Errors" "asyncHandler" "RawPool" "RBAC" "Permissions")
    local labels=("Build" "Lint " "Secret Scan" "SQL Safety" "Auth Bypass" "Error Handling" "asyncHandler" "Raw Pool" "RBAC Coverage" "Perm Strings")

    for i in "${!gates[@]}"; do
        local key="${gates[$i]}"
        local label="${labels[$i]}"
        if [ -n "${RESULTS[$key]+x}" ]; then
            printf "  Gate %-2d — %-15s %b\n" "$((i+1))" "$label" "${RESULTS[$key]}"
        else
            printf "  Gate %-2d — %-15s %b\n" "$((i+1))" "$label" "${YELLOW}SKIPPED${NC}"
        fi
    done

    echo "─────────────────────────────"
    if [ "$OVERALL" -eq 0 ]; then
        echo -e "  Overall: ${GREEN}${BOLD}PASS${NC}"
    else
        echo -e "  Overall: ${RED}${BOLD}FAIL${NC}"
        echo -e "\n  ${YELLOW}Fix failing gates before marking the task as complete.${NC}"
    fi
    echo ""
}

# ── Main ─────────────────────────────────────
run_all() {
    gate_build
    gate_lint
    gate_secrets
    gate_sql
    gate_auth
    gate_errors
    gate_asynchandler
    gate_rawpool
    gate_rbac
    gate_permissions
}

# Parse arguments
if [ $# -eq 0 ]; then
    echo -e "${BOLD}🔒 Mycelium ERP — Running all safety gates...${NC}"
    run_all
else
    echo -e "${BOLD}🔒 Mycelium ERP — Running selected safety gates...${NC}"
    for arg in "$@"; do
        case "$arg" in
            --all)          run_all ;;
            --build)        gate_build ;;
            --lint)         gate_lint ;;
            --secrets)      gate_secrets ;;
            --sql)          gate_sql ;;
            --auth)         gate_auth ;;
            --errors)       gate_errors ;;
            --asynchandler) gate_asynchandler ;;
            --rawpool)      gate_rawpool ;;
            --rbac)         gate_rbac ;;
            --permissions)  gate_permissions ;;
            *)
                echo -e "${RED}Unknown gate: $arg${NC}"
                echo "Usage: $0 [--all | --build | --lint | --secrets | --sql | --auth | --errors | --asynchandler | --rawpool | --rbac | --permissions]"
                exit 1
                ;;
        esac
    done
fi

print_summary
exit $OVERALL
