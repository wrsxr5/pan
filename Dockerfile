FROM oven/bun:slim
WORKDIR /app

COPY apps/server apps/server
COPY libs libs
COPY package.docker.json package.json

RUN bun install --production
CMD ["bun", "start"]