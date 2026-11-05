#!/usr/bin/env sh
# Rebuilds index.html from the three source parts in src/.
# Usage: sh scripts/build.sh
set -e
cd "$(dirname "$0")/.."
{
  cat src/head.html
  cat src/body.html
  printf '<script>\n'
  cat src/app.js
  printf '</script>\n</body>\n</html>\n'
} > index.html
mkdir -p public
cp index.html public/index.html
echo "Built index.html ($(wc -c < index.html) bytes)"
