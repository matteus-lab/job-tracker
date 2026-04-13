# API

A production-ready NestJS backend to follow job interviews.

## API Commands

Execute this commands from root, not from /apps/api.

```bash
# Infrastructure
$ npm run db:up       # Start the local PostgreSQL container
$ num run db:down     # Stop the DB

# Database
$ npm run api:prisma:migrate          # Create apply migrations
$ npm run api:prisma:migrate:deploy   # Apply migrations to Production
$ npm run api:prisma:generate         # Generate Prisma Client types for TypeScript
$ npm run api:prisma:studio           # To visualize DB data

# Development
$ npm run api:dev

# Testing
$ npm run api:test:unit           # Unit (Business rules)
$ npm run api:test:integration    # Integration (module services)
$ npm run api:test:e2e            # E2E (Controllers)

# Production
$ npm run api:build       # Build the app
```

## Technical features

### Security

- **Hardened**: Helmet headers, Rate Limiting (`Throttler`), and CORS whitelisting.
- **Strict Validation**: DTO-based validation with zero tolerance for non-whitelisted properties.
- **Zero-Leak Serialization**: `ClassSerializer` with `excludeAll` strategy.
- **Trust Proxy**: Configured for reverse-proxy deployments (Nginx, Docker).

### Observability

- **Pino HTTP**: High-performance JSON logging.
- **Traceability**: Unique `X-Request-ID` for every request, shared between logs and exception filters.

### Hexagonal (Ports & Adapters) and Dependency Inversion (IoD)

To achieve total decoupling, we use the **Ports & Adapters** pattern:

1. **The Port (Interface)**: Defined in the Domain layer (`modules/foo/domain/bar.repository.interface.ts`). It defines the _contract_ (e.g., "I need a way to save a user").
2. **The Service**: Defined in the Engine layer (`modules/foo/engine/bar.service.ts`). The Service only knows the Interface. This inversion of dependency makes the system independent from any specific implementation. NestJS links them via **Injection Tokens**.
3. **The Adapter (Implementation)**: Defined in the Infrastructure layer (`modules/foo/infra/bar.repository.ts`). It fulfills the contract using a specific technology (Prisma) and is injected by NestJS (ID).

### The `/modules/foo` Hub

| Directory                           | Prefix/Suffix  | Purpose                                                                 |
| :---------------------------------- | :------------- | :---------------------------------------------------------------------- |
| **`domain`**                        |                | Pure business logic and interfaces (Port)                               |
| **`domain/foo.bar.interface.ts`**   | `I*`           | Interfaces (Port) for a repository                                      |
| **`domain/entities/bar.entity.ts`** | `*Entity`      | The "Noble" business object. DB-agnostic & Stable.                      |
| **`engine`**                        |                | Defines what the application does using the domain.                     |
| **`engine/commands/`**              | `*Command`     | Defines what the engines will receives has inputs.                      |
| **`engine/foo.service`**            | `*Service`     | An engine for use-cases                                                 |
| **`infra`**                         |                | External dependencies                                                   |
| **`infra/dto/request/`**            | `*RequestDto`  | Incoming API data. Validated via `class-validator`.                     |
| **`infra/dto/response/`**           | `*ResponseDto` | Outgoing API data. Controlled via `class-transformer`.                  |
| **`infra/persistence`**             | `*Persistence` | Data formatted specifically for the DB.                                 |
| **`infra/foo.mapper`**              | `*Mapper`      | Convert a Data type to another between infra                            |
| **`infra/foo.repository`**          | `*Repository`  | Technical implementation using specific libraries like Prisma or Argon2 |

### The Mapping Lifecycle

We use a **Mapper** to handle transitions between layers, ensuring no layer-specific logic leaks into another:

- **Controller (IN)**: Translates `Request DTO` → `Input`.
- **Service (IN)**: Orchestrates logic using `Input` and transform into `Persisence` to call the repository.
- **Repository**: Executes DB queries using `Persistence`, receive a `Prisma Model` and return an `Entity`.
- **Service (OUT)**: Use `Entity` to do business rules.
- **Controller (OUT)**: Converts `Entity` → `Response DTO` for the final output.

## Testing

We maintain a high standard of reliability by following a strict testing pyramid. Each layer has a specific responsibility to ensure full system coverage without redundant test logic.

### Unit

- **Files**: `src/**/*.spec.ts`
- **Targets**: Every file that has business logic.
- **Focus**: Pure business logic and data transformation integrity.
- **Rule**: Uses mock for dependencies.
- **Objective** : Cover mappers, transformation of data and conditional branches (if, switch) of the business domain.

### Integration

- **Files**: `test/integration/**/*.integration-spec.ts`
- **Targets**: Every entry points of modules (`Services`) and `Repositories`
- **Focus**: Data persistence, SQL query validity, database constraints (Unique, FK), and **Transaction Atomicity**.
- **Rule**: Uses a **real database** instance. It validates that `Persistence` schemas match Prisma models by verifying using `Prisma`. Also verify that `runInTransaction` correctly handles rollbacks upon failure.
- **Objective** : Verify that every modules work as expected and data is persisted.
- **Note**: These tests must run with `--runInBand` to ensure database state isolation between suites.

### E2E

- **Files**: `test/e2e/**/*.e2e-spec.ts`
- **Targets**: Every entry points of Public API (`Controllers`)
- **Focus**: Every routes, every `DTO Validation`, `Guards`, and `Exception Filters`,
- **Rule**: Treats the API as a black box, behave like being user or Postman by sending real HTTP requests. It verifies that `class-validator` decorators on **DTOs** correctly reject bad payloads (400 Bad Request) and that security headers or serialization rules are active. Try not to use prisma but only routes.
- **Objective**: Guarantee that the system works well for the user.

---
