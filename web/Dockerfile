# base image
FROM node:22-alpine3.21 AS base
LABEL maintainer="takatost@gmail.com"

# if you located in China, you can use nju mirror to speed up
RUN sed -i 's/dl-cdn.alpinelinux.org/mirror.nju.edu.cn/g' /etc/apk/repositories

RUN apk add --no-cache tzdata
RUN npm install -g pnpm@10.11.1
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"


# install packages
FROM base AS packages

WORKDIR /app/web

COPY package.json .
COPY pnpm-lock.yaml .

# Copy and setup speed monitoring script
COPY pnpm-monitor.sh /usr/local/bin/pnpm-monitor.sh
RUN chmod +x /usr/local/bin/pnpm-monitor.sh

# if you located in China, you can use taobao registry to speed up
# RUN pnpm install --frozen-lockfile --registry https://registry.npmmirror.com/

RUN /usr/local/bin/pnpm-monitor.sh https://registry.npmjs.org/

# build resources
FROM base AS builder
WORKDIR /app/web
COPY --from=packages /app/web/ .
COPY . .

ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN pnpm build


# production stage
FROM base AS production

ENV NODE_ENV=production
ENV EDITION=SELF_HOSTED
ENV DEPLOY_ENV=PRODUCTION
ENV CONSOLE_API_URL=http://127.0.0.1:5001
ENV APP_API_URL=http://127.0.0.1:5001
ENV MARKETPLACE_API_URL=https://marketplace.dify.ai
ENV MARKETPLACE_URL=https://marketplace.dify.ai
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1
ENV PM2_INSTANCES=2

# set timezone
ENV TZ=UTC
RUN ln -s /usr/share/zoneinfo/${TZ} /etc/localtime \
    && echo ${TZ} > /etc/timezone


WORKDIR /app/web
COPY --from=builder /app/web/public ./public
COPY --from=builder /app/web/.next/standalone ./
COPY --from=builder /app/web/.next/static ./.next/static

COPY docker/entrypoint.sh ./entrypoint.sh


# global runtime packages
RUN echo "=== Installing PM2 with speed monitoring ===" && \
    echo "Starting PM2 installation at: $(date)" && \
    pnpm add -g pm2 --registry https://registry.npmjs.org/ && \
    echo "PM2 installation completed at: $(date)" && \
    mkdir /.pm2 && \
    chown -R 1001:0 /.pm2 /app/web && \
    chmod -R g=u /.pm2 /app/web

ARG COMMIT_SHA
ENV COMMIT_SHA=${COMMIT_SHA}

USER 1001
EXPOSE 3000
ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
