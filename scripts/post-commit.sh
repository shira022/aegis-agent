#!/usr/bin/env bash
#
# post-commit.sh — Post-commit hook for Aegis Agent
#
# Runs typecheck ONLY on changed packages (lighter than pre-commit).
# Detects which packages changed via git diff HEAD~1 and runs tsc --noEmit.
# Skips silently if no package was affected.
#
# Install:
#   ln -sf ../../scripts/post-commit.sh .git/hooks/post-commit

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get files changed in the most recent commit
CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null || echo "")

if [ -z "$CHANGED_FILES" ]; then
  # First commit or no diff — skip silently
  exit 0
fi

# Determine which packages were modified
CHANGED_PACKAGES=()

for file in $CHANGED_FILES; do
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
    # Root config changed — typecheck everything
    echo -e "${YELLOW}⚠ Root config changed, running typecheck on all packages...${NC}"
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
  # No package changes — skip silently
  exit 0
fi

echo -e "${CYAN}🔎 Post-commit typecheck:${NC}"
printf "   %s\n" "${CHANGED_PACKAGES[@]}"
echo ""

FAILED=0

for pkg in "${CHANGED_PACKAGES[@]}"; do
  if [ -f "$pkg/package.json" ] && grep -q '"typecheck"' "$pkg/package.json"; then
    echo "   Checking $pkg..."
    if (cd "$pkg" && npx tsc --noEmit 2>&1); then
      echo -e "   ${GREEN}✓ $pkg${NC}"
    else
      echo -e "   ${YELLOW}⚠ $pkg — type errors detected (see above)${NC}"
      FAILED=1
    fi
  fi
done

echo ""
if [ $FAILED -ne 0 ]; then
  echo -e "${YELLOW}⚠ Post-commit typecheck found issues in ${#CHANGED_PACKAGES[@]} package(s).${NC}"
else
  echo -e "${GREEN}✅ Typecheck passed for ${#CHANGED_PACKAGES[@]} package(s).${NC}"
fi

# Soft exit — never block the commit (this is post-commit)
exit 0
