# ---- Stage 1: build the client into public/ -------------------------------
FROM node:22-alpine AS client-build
WORKDIR /app

# Client deps (separate package.json under client/)
COPY client/package.json client/package-lock.json ./client/
RUN npm ci --prefix client --no-audit --no-fund

# The client build imports engine types via the @engine alias (../src/engine)
COPY tsconfig.json ./
COPY src ./src
COPY client ./client
RUN npm run build --prefix client   # emits /app/public

# ---- Stage 2: runtime ------------------------------------------------------
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY --from=client-build /app/public ./public

# Colyseus needs a single long-lived process; PORT is respected if set.
EXPOSE 2567
CMD ["npm", "start"]
