# Production image for the Community Campaign Platform API.
# Build from this directory: docker build -t campaign-api .
# Do not run npm run seed:demo in this image.

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build \
  && npm prune --omit=dev

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN useradd --system --uid 1001 --create-home api
COPY --from=build --chown=api:api /app/node_modules ./node_modules
COPY --from=build --chown=api:api /app/dist ./dist
COPY --from=build --chown=api:api /app/package.json ./

USER api
EXPOSE 3000
CMD ["node", "dist/main.js"]
