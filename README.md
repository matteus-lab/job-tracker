# 🚀 Job Tracker - Monorepo

A professional-grade full-stack ecosystem designed to manage job applications and monitor infrastructure.

## 🏗️ Architecture

This project is a **Monorepo** managed with npm workspaces. To maintain consistency, **all commands must be executed from this root directory**.

- **📂 apps/api**: The core NestJS API (Security hardened, Logic-tested).
  > 💡 _For detailed API documentation and testing strategy, see [apps/api/README.md](./apps/api/README.md)._
- **📂 infra/**: Deployment blueprints (Docker, PostgreSQL, Monitoring).

## 🛠️ Global Scripts (Root Only)

### 🐳 Infrastructure

- `npm run db:up`: Start the local PostgreSQL container.
- `npm run db:down`: Stop the infrastructure.

### 🔑 Database (API)

- `npm run api:prisma:migrate`: Create and apply migrations (Dev mode).
- `npm run api:prisma:migrate:deploy`: Apply migrations to a production/staging DB.
- `npm run api:prisma:generate`: Generate Prisma Client types.
- `npm run api:prisma:studio`: Open database GUI.

### 🧪 Quality Control

- `npm run api:test:unit`: Run **Unit Tests** (Focus: Business Logic).
- `npm run api:test:e2e`: Run **E2E Tests** (Focus: Infrastructure & Routes).
- `npm run api:lint`: Run ESLint.
- `npm run format`: Prettier formatting for the whole repo.

## 🚀 Getting Started

1. **Env**: `nvm use` (Node 22).
2. **Install**: `npm install`.
3. **Infra**: Setup `infra/postgres/.env` then `npm run db:up`.
4. **App**: Setup `apps/api/.env` then `npm run api:prisma:migrate`.
5. **Launch**: `npm run api:dev`.
