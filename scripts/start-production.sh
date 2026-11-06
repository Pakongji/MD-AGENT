#!/bin/sh
set -eu

pnpm run db:migrate:deploy

exec pnpm exec next start -H 0.0.0.0 -p "${PORT:-3000}"
