# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app

COPY tsconfig.json tsup.config.ts ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    MEMOS_MCP_TRANSPORT=http \
    MEMOS_MCP_HOST=0.0.0.0 \
    MEMOS_MCP_PORT=8080

RUN addgroup -S -g 10001 memos-mcp \
  && adduser -S -D -H -u 10001 -G memos-mcp memos-mcp \
  && mkdir -p /data \
  && chown -R memos-mcp:memos-mcp /data

COPY --from=build --chown=memos-mcp:memos-mcp /app/package.json ./package.json
COPY --from=build --chown=memos-mcp:memos-mcp /app/node_modules ./node_modules
COPY --from=build --chown=memos-mcp:memos-mcp /app/dist ./dist

USER memos-mcp

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.MEMOS_MCP_PORT || '8080') + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/index.js"]
