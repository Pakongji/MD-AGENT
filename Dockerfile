FROM node:24-bookworm-slim

ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global pnpm@11.25.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile --prod=false

COPY . .
RUN pnpm build \
  && chmod +x ./scripts/start-production.sh

EXPOSE 3000

CMD ["./scripts/start-production.sh"]
