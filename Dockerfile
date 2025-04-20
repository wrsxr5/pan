FROM oven/bun:1.2.10-slim
WORKDIR /app

COPY apps/server apps/server
COPY libs libs
COPY package.docker.json package.json

RUN bun install --production
CMD ["bun", "start"]