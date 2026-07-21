FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json client/package-lock.json ./client/
RUN npm ci && npm ci --prefix client

COPY tsconfig.json vitest.config.ts ./
COPY src ./src
COPY client ./client
RUN npm run client:build

ENV NODE_ENV=production
ENV PORT=2567
EXPOSE 2567
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - "http://127.0.0.1:${PORT}/healthz" > /dev/null || exit 1

CMD ["npm", "run", "server"]
