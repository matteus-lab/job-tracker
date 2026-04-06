# Job Tracker API

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

1. **The Port (Interface)**: Defined in the Domain layer (`user.repository.interface.ts`). It defines the _contract_ (e.g., "I need a way to save a user").
2. **The Adapter (Implementation)**: Defined in the Infrastructure layer (`user.repository.ts`). It fulfills the contract using a specific technology (Prisma).
3. **The Connection**: NestJS links them via **Injection Tokens**. The Service only knows the Interface, making the system "pluggable".

### The `/schemas` Hub

All data structures in each modules are centralized to maintain a "Single Source of Truth" and prevent circular dependencies:

| Directory          | Suffix        | Layer      | Purpose                                                |
| :----------------- | :------------ | :--------- | :----------------------------------------------------- |
| **`dto/request`**  | `Request`     | **Web**    | Incoming API data. Validated via `class-validator`.    |
| **`dto/response`** | `Response`    | **Web**    | Outgoing API data. Controlled via `class-transformer`. |
| **`inputs`**       | `Input`       | **Logic**  | Internal service-to-service communication (Pure TS).   |
| **`entities`**     | `Entity`      | **Domain** | The "Noble" business object. DB-agnostic & Stable.     |
| **`persistence`**  | `Persistence` | **DB**     | Data formatted specifically for the ORM (Prisma).      |

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
