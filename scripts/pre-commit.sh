#!/usr/bin/env bash
#
# pre-commit.sh — Pre-commit hook for Aegis Agent
#
# Runs TypeScript type checking and tests for changed packages only.
# Blocks the commit if any check fails.
#
# Install:
#   cp scripts/pre-commit.sh .git/hooks/pre-commit
#   chmod +x .git/hooks/pre-commit
#
# Or via symlink:
#   ln -sf ../../scripts/pre-commit.sh .git/hooks/pre-commit

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 Pre-commit checks running...${NC}"
echo ""

# Get list of staged files (excluding deleted files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  echo -e "${GREEN}✓ No staged files to check.${NC}"
  exit 0
fi

# Determine which packages were modified
CHANGED_PACKAGES=()

for file in $STAGED_FILES; do
  # Match packages/@aegis/<name>/ or apps/<name>/
  if [[ "$file" =~ ^packages/@aegis/([^/]+)/ ]]; then
    pkg="${BASH_REMATCH[1]}"
    pkg_path="packages/@aegis/$pkg"
    if [[ ! " ${CHANGED_PACKAGES[*]:-} " =~ " ${pkg_path} " ]]; then
      CHANGED_PACKAGES+=("$pkg_path")
    fi
  elif [[ "$file" =~ ^apps/([^/]+)/ ]]; then
    app="${BASH_REMATCH[1]}"
    app_path="apps/$app"
    if [[ ! " ${CHANGED_PACKAGES[*]:-} " =~ " ${app_path} " ]]; then
      CHANGED_PACKAGES+=("$app_path")
    fi
  elif [[ "$file" =~ ^tsconfig\.json$ ]] || [[ "$file" =~ ^turbo\.json$ ]] || [[ "$file" =~ ^package\.json$ ]]; then
    # Root config changed — run everything
    echo -e "${YELLOW}⚠ Root config changed, running checks on all packages...${NC}"
    CHANGED_PACKAGES=()
    for pkg_dir in packages/@aegis/*/; do
      CHANGED_PACKAGES+=("${pkg_dir%/}")
    done
    for app_dir in apps/*/; do
      CHANGED_PACKAGES+=("${app_dir%/}")
    done
    break
  fi
done

if [ ${#CHANGED_PACKAGES[@]} -eq 0 ]; then
  echo -e "${GREEN}✓ No package changes detected. Skipping checks.${NC}"
  exit 0
fi

echo "Changed packages:"
printf "  %s\n" "${CHANGED_PACKAGES[@]}"
echo ""

FAILED=0

# Step 1: TypeScript type checking
echo -e "${YELLOW}📋 Running TypeScript type checks...${NC}"
for pkg in "${CHANGED_PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ] && grep -q '"typecheck"' "$pkg/package.json"; then
    echo "  Type-checking $pkg..."
    if ! (cd "$pkg" && npx tsc --noEmit 2>&1); then
      echo -e "  ${RED}✗ Type check failed in $pkg${NC}"
      FAILED=1
    else
      echo -e "  ${GREEN}✓ $pkg type check passed${NC}"
    fi
  fi
done
echo ""

# Step 2: Run tests for changed packages
echo -e "${YELLOW}🧪 Running tests...${NC}"
for pkg in "${CHANGED_PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ] && grep -q '"test"' "$pkg/package.json"; then
    # Skip packages with no test files
    TEST_FILES=$(find "$pkg" -name "*.test.*" -o -name "*.spec.*" 2>/dev/null | grep -v node_modules | head -1)
    if [ -z "$TEST_FILES" ]; then
      echo "  ⏭ Skipping $pkg (no test files)"
      continue
    fi
    echo "  Testing $pkg..."
    if ! (cd "$pkg" && npx vitest run 2>&1); then
      echo -e "  ${RED}✗ Tests failed in $pkg${NC}"
      FAILED=1
    else
      echo -e "  ${GREEN}✓ $pkg tests passed${NC}"
    fi
  fi
done
echo ""

# Step 3: Check for hardcoded secrets
echo -e "${YELLOW}🔒 Checking for potential secrets...${NC}"
POTENTIAL_SECRETS=$(echo "$STAGED_FILES" | grep -v '\.gitignore' | xargs grep -lEi \
  '(api[_-]?key|secret[_-]?key|password|token|private[_-]?key)\s*[:=]\s*["\x27][A-Za-z0-9+/=_-]{16,}' \
  2>/dev/null || true)

if [ -n "$POTENTIAL_SECRETS" ]; then
  echo -e "  ${RED}✗ Potential hardcoded secrets found:${NC}"
  echo "$POTENTIAL_SECRETS" | while read -r f; do
    echo "    $f"
  done
  FAILED=1
else
  echo -e "  ${GREEN}✓ No potential secrets detected${NC}"
fi
echo ""

# Final result
if [ $FAILED -ne 0 ]; then
  echo -e "${RED}❌ Pre-commit checks failed. Commit blocked.${NC}"
  echo -e "${RED}Fix the issues above and try again.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ All pre-commit checks passed.${NC}"
exit 0
