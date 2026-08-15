# ─────────────────────────────────────────────────────────────
# Frontend production image — build context MUST be the repo root:
#   docker compose build frontend      (context: . / dockerfile: frontend/Dockerfile)
# The build needs backend/src/policy because vite aliases @policy there.
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Keep the vite/rollup build inside a small VPS's memory budget.
ENV NODE_OPTIONS=--max-old-space-size=1536

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY frontend/ ./
COPY backend/src/policy /backend/src/policy

# Empty base URL => the app calls /api and /ws on its own origin,
# which nginx (below) proxies to the backend container. Override only
# if you serve the API from a different host.
ARG VITE_API_BASE_URL=""
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine
RUN apk add --no-cache wget
COPY --from=builder /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
