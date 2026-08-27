# syntax=docker/dockerfile:1.7
# Single image: Vite-built client served by the Express server.
#   docker build --build-arg VITE_BASE=/ilcc/ -t ilcc .

# ---- 1. build the client ----------------------------------------------
FROM node:22-bookworm-slim AS client-build
ARG VITE_BASE=/
ENV VITE_BASE=$VITE_BASE
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---- 2. server deps (better-sqlite3 needs a toolchain to compile) -----
FROM node:22-bookworm-slim AS server-deps
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- 3. runtime -------------------------------------------------------
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 tini \
 && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3000 DATA_DIR=/data DB_PATH=/data/ilcc.db DOWNLOADS_DIR=/data/downloads
WORKDIR /app
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /data/downloads && chown -R node:node /data /app
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
WORKDIR /app/server
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "index.js"]
