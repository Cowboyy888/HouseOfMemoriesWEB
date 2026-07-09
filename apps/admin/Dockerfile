FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* turbo.json tsconfig.base.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY apps/admin ./apps/admin
COPY packages/contracts ./packages/contracts
RUN npm ci
RUN npm --workspace apps/admin run build
EXPOSE 3000
CMD ["npm", "--workspace", "apps/admin", "run", "start"]
