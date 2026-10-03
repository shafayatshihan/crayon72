#!/usr/bin/env bash
# One-shot: typecheck → build → check-pages for the given lecture keys → fix videos → ship.
# Usage: bash scripts/ship.sh m6,m7
set -e
cd "$(dirname "$0")/.."
npx tsc --noEmit -p .
npm run build 2>&1 | grep -E "error|built"
node scripts/check-pages.mjs light 900 "$1" 2>&1 | tail -3
# drive every slider / button / orbit of every animation like a real user; fails on console
# warnings, lost WebGL contexts, black frames or a WebGL leak. Idle checks cannot catch these.
for k in ${1//,/ }; do
  node scripts/anim-interact.mjs "$k" light > raw/interact.log 2>&1 || { tail -15 raw/interact.log; echo "ABORT: interaction problems in $k"; exit 1; }
  tail -2 raw/interact.log
done
node scripts/check-embeds.mjs --fix 2>&1 | tail -1
npm run build 2>&1 | grep -E "error|built"
OUT="$(cat .ship-target 2>/dev/null || echo ../Crayon72.html)"
cp dist/index.html "$OUT" && echo "shipped $OUT $(du -h "$OUT" | cut -f1)"
