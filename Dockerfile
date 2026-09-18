FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src/ ./src/
COPY public/ ./public/
COPY server.ts ./

ENV NODE_ENV=production
EXPOSE 3000

USER bun

CMD ["bun", "server.ts"]