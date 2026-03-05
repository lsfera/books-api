FROM node:22-bookworm-slim AS base
WORKDIR /opt/app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm run build
RUN pnpm exec ts-node ./src/spec.ts

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod
COPY --from=builder /opt/app/.dist ./.dist
COPY --from=builder /opt/app/src/spec.json ./spec.json
CMD ["pnpm", "run", "start"]
