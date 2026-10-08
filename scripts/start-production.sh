#!/bin/sh
set -eu

mkdir -p /var/data
pnpm exec prisma db push --skip-generate
pnpm run db:seed-if-empty

exec pnpm exec next start -H 0.0.0.0 -p "${PORT:-3000}"
