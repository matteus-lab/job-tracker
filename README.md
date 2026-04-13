# Mood tracker - Monorepo

An app designed to track events and mood of the user to try to find correlation.

## Architecture

This project is a **Monorepo** managed with npm workspaces. To maintain consistency, **all commands must be executed from this root directory**.

- **📂 apps/api**: The core NestJS API to manage the database and back-end.

  > For documentation, see [api/README.md](./apps/api/README.md).

- **📂 apps/client**: Vite + Vue 3 + TypeScript client to consume the API.

  > For documentation, see [client/README.md](./apps/client/README.md).

- **📂 infra/**: Deployment blueprints (Docker, PostgreSQL, Monitoring).

## Setup

### Development

1. **Node**: `nvm use` (.nvmrc 22).
2. **Install**: `npm install`.
3. **Infra**: Setup `infra/postgres/.env` then `npm run db:up` to deploy a docker container with postgre database for local dev.
4. **Api**: Setup `apps/api/.env` then `npm run api:prisma:deploy` to apply migration.
5. **Launch**: `npm run api:dev`.

## Global Scripts

### Infrastructure

- `npm run db:up`: Start the local PostgreSQL container.
- `npm run db:down`: Stop the infrastructure.

### API

#### DB / Prisma

- `npm run api:prisma:migrate`: Create and apply migrations (Dev only). Can create new migration files or reset the DB and apply generate.
- `npm run api:prisma:deploy`: Apply migrations to a production/staging DB.
- `npm run api:prisma:generate`: Generate Prisma Client types.
- `npm run api:prisma:studio`: Open database GUI.

#### Linter

- `npm run api:lint`: Eslint to track code error before build.

#### Development

- `npm run api:dev`: Start the API.

#### Testing

- `npm run api:test:unit`: Run unit tests.
- `npm run api:test:integration`: Run integration tests.
- `npm run api:test:e2e`: Run e2e tests.
- `npm run api:all`: Run all tests.

#### Build

- `npm run api:build`: Build the app in /dist folder.
