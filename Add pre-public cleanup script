#!/bin/bash
# cleanup-for-public.sh
# Run this from your bubboard repo root before going public.
# Removes dead code files and verifies the build still passes.

set -e

echo "=== Driftwatch Pre-Public Cleanup ==="
echo ""

# 1. Delete dead files
echo "Deleting dead files..."

FILES_TO_DELETE=(
  "src/components/DirectoryScanner.tsx"
  "src/components/FileContentInput.tsx"
  "src/scanner/scannerUtils.ts"
)

for f in "${FILES_TO_DELETE[@]}"; do
  if [ -f "$f" ]; then
    rm "$f"
    echo "  ✓ Deleted $f"
  else
    echo "  - $f (already gone)"
  fi
done

# 2. Delete backup files if they exist
echo ""
echo "Checking for backup files..."
BACKUPS=$(find src -name "*.backup.tsx" 2>/dev/null || true)
if [ -n "$BACKUPS" ]; then
  echo "$BACKUPS" | while read -r bf; do
    rm "$bf"
    echo "  ✓ Deleted $bf"
  done
else
  echo "  - No backup files found"
fi

# 3. Remove tsconfig.tsbuildinfo if present (regenerated on build)
if [ -f "tsconfig.tsbuildinfo" ]; then
  rm tsconfig.tsbuildinfo
  echo "  ✓ Deleted tsconfig.tsbuildinfo (will regenerate)"
fi

# 4. Verify .gitignore covers the right things
echo ""
echo "Checking .gitignore..."
REQUIRED_IGNORES=("*.backup.tsx" ".env" ".env.local" "tsconfig.tsbuildinfo" "CLAUDE.md")
for pattern in "${REQUIRED_IGNORES[@]}"; do
  if grep -qF "$pattern" .gitignore; then
    echo "  ✓ .gitignore has: $pattern"
  else
    echo "  ⚠ MISSING from .gitignore: $pattern"
  fi
done

# 5. Check no dead imports remain
echo ""
echo "Checking for stale imports..."
STALE=0

if grep -rn "FileContentInput" src/ --include="*.tsx" --include="*.ts" 2>/dev/null; then
  echo "  ⚠ Found references to FileContentInput — check these"
  STALE=1
fi

if grep -rn "from.*components/DirectoryScanner" src/ --include="*.tsx" --include="*.ts" 2>/dev/null; then
  echo "  ⚠ Found imports from components/DirectoryScanner — check these"
  STALE=1
fi

if grep -rn "from.*scannerUtils" src/ --include="*.tsx" --include="*.ts" 2>/dev/null; then
  echo "  ⚠ Found imports from scannerUtils — check these"
  STALE=1
fi

if [ $STALE -eq 0 ]; then
  echo "  ✓ No stale imports found"
fi

# 6. Type check and build
echo ""
echo "Running type check..."
npx tsc --noEmit
echo "  ✓ Type check passed"

echo ""
echo "Running production build..."
npm run build
echo "  ✓ Build passed"

echo ""
echo "=== Cleanup complete! Ready for public. ==="
