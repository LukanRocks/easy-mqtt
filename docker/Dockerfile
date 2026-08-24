# syntax=docker/dockerfile:1

# ── Stage 1: build the web SPA and the server bundle ────────────────────────
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo

# Install dependencies against the lockfile first for better layer caching.
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json ./
COPY packages/dynsec/package.json packages/dynsec/package.json
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Build.
COPY . .
RUN pnpm --filter @easy-mqtt/web build \
 && pnpm --filter @easy-mqtt/server build

# Produce a self-contained production install for the server (prod deps only).
RUN pnpm --filter @easy-mqtt/server deploy --prod --legacy /prod

# ── Stage 2: runtime — Mosquitto + dynsec plugin, supervised by s6 ──────────
FROM eclipse-mosquitto:2 AS runtime

ARG S6_OVERLAY_VERSION=3.2.1.0
ARG TARGETARCH

# Node runtime for the admin app. mosquitto_ctrl ships in the base image.
RUN apk add --no-cache nodejs

# s6-overlay: process supervisor / PID 1.
ADD https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-noarch.tar.xz /tmp/s6-noarch.tar.xz
RUN tar -C / -Jxpf /tmp/s6-noarch.tar.xz && rm /tmp/s6-noarch.tar.xz
RUN set -eux; \
    case "${TARGETARCH}" in \
      amd64)  S6_ARCH=x86_64 ;; \
      arm64)  S6_ARCH=aarch64 ;; \
      arm)    S6_ARCH=armhf ;; \
      *)      S6_ARCH=x86_64 ;; \
    esac; \
    wget -O /tmp/s6-arch.tar.xz "https://github.com/just-containers/s6-overlay/releases/download/v${S6_OVERLAY_VERSION}/s6-overlay-${S6_ARCH}.tar.xz"; \
    tar -C / -Jxpf /tmp/s6-arch.tar.xz; \
    rm /tmp/s6-arch.tar.xz

# Application: built server bundle + its prod node_modules + the built SPA.
WORKDIR /app/server
COPY --from=build /prod/node_modules ./node_modules
COPY --from=build /repo/apps/server/dist/server.js ./server.js
COPY --from=build /repo/apps/server/package.json ./package.json
COPY --from=build /repo/apps/web/dist /app/web

# s6 service definitions, mosquitto.conf, and the first-run bootstrap.
COPY docker/rootfs /
COPY docker/bootstrap.sh /bootstrap.sh
RUN chmod +x /bootstrap.sh \
      /etc/s6-overlay/s6-rc.d/mosquitto/run \
      /etc/s6-overlay/s6-rc.d/app/run

ENV NODE_ENV=production \
    MQTT_HOST=localhost \
    MQTT_PORT=1883 \
    PORT=80 \
    WEB_DIR=/app/web \
    SESSION_SECRET_FILE=/data/session-secret \
    DATA_DIR=/data \
    S6_KEEP_ENV=1

EXPOSE 1883 80
VOLUME ["/data"]

ENTRYPOINT ["/init"]
