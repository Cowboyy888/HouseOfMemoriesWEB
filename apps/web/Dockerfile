FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY apps/web ./apps/web
COPY packages/contracts ./packages/contracts
RUN npm ci
RUN npm --workspace apps/web run build
EXPOSE 3000
CMD ["npm", "--workspace", "apps/web", "run", "start"]
