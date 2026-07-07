# Built from the monorepo root: `docker build -f apps/api/Dockerfile .`
# Needs the whole workspace in context because apps/api depends on the
# @drivehub/database and @drivehub/contracts workspace packages.
FROM node:22-slim AS build
WORKDIR /repo

COPY package.json package-lock.json turbo.json tsconfig.base.json ./
# npm ci validates the lockfile against every workspace it declares, so all
# five package.json files must be present even though only three of these
# workspaces are actually built/run in this image.
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/contracts/package.json packages/contracts/package.json

RUN npm ci

COPY packages/database packages/database
COPY packages/contracts packages/contracts
COPY apps/api apps/api

RUN npm run build --workspace=@drivehub/contracts
# prisma.config.ts requires DATABASE_URL to resolve at all, even for `generate`
# (which doesn't connect to a DB) — this placeholder is build-time only and
# is overridden by the real DATABASE_URL the host injects at runtime.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npm run prisma:generate --workspace=@drivehub/database
RUN npm run build --workspace=@drivehub/database
RUN npm run build --workspace=@drivehub/api

FROM node:22-slim AS runtime
WORKDIR /repo
ENV NODE_ENV=production

COPY --from=build /repo /repo

EXPOSE 4000
CMD ["node", "apps/api/dist/main.js"]
