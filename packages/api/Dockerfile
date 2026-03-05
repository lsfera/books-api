FROM node:22-bookworm-slim AS base
WORKDIR /opt/app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/package.json
RUN pnpm install --frozen-lockfile --filter @booksland/api...

FROM deps AS builder
COPY packages/api ./packages/api
WORKDIR /opt/app/packages/api
RUN pnpm run build
RUN pnpm exec tsx ./src/spec.ts

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json ./packages/api/package.json
RUN pnpm install --frozen-lockfile --prod --filter @booksland/api... \
    && pnpm store prune \
    && rm -rf /root/.cache /tmp/*
WORKDIR /opt/app/packages/api
RUN rm -f /opt/app/package.json /opt/app/pnpm-lock.yaml /opt/app/pnpm-workspace.yaml
COPY --from=builder /opt/app/packages/api/.dist ./.dist
COPY --from=builder /opt/app/packages/api/src/spec.json ./spec.json
CMD ["node", "--require", "./.dist/src/monitoring/index.js", "./.dist/src/index.js"]
