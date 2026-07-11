# Event Ticket Booking System

A RESTful API for managing event ticket bookings, built with Node.js, Express, TypeScript, Sequelize, and PostgreSQL. It supports initializing events with a fixed ticket inventory, concurrent ticket booking, automatic FIFO waiting-list management, and cancellations that reassign freed tickets to the next person in line — all with strict consistency guarantees under concurrent load.

## Table of Contents
- [Architecture](#architecture)
- [Design Principles Applied](#design-principles-applied)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Running the App](#running-the-app)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Testing](#testing)
- [Linting & Formatting](#linting--formatting)
- [Concurrency & Data Integrity](#concurrency--data-integrity)
- [Scalability Notes](#scalability-notes)
- [Security Notes](#security-notes)
- [Known Limitations & Future Work](#known-limitations--future-work)

## Architecture

The codebase follows a layered architecture that separates HTTP concerns from business logic and persistence:

```
Request
  │
  ▼
Routes            (src/routes)        — declares endpoints, wires middleware in order
  │
  ▼
Middleware        (src/middleware)    — auth, request validation (Zod), rate limiting, security headers
  │
  ▼
Controllers       (src/controllers)   — translate HTTP <-> domain calls only; no business logic
  │
  ▼
Services          (src/services)      — business logic, transactions, orchestration (the only layer
  │                                      allowed to open a DB transaction or talk to > 1 model)
  ▼
Models            (src/db/models)     — Sequelize models; schema lives in migrations, not sync()
  │
  ▼
PostgreSQL
```

Cross-cutting concerns live in their own modules and are composed in [src/app.ts](src/app.ts):
- **`src/config/env.ts`** — validates all required environment variables at startup with Zod and fails fast with a clear error instead of surfacing confusing runtime failures later.
- **`src/errors/AppError.ts`** — typed, HTTP-status-aware error classes (`NotFoundError`, `BadRequestError`, `ConflictError`, `UnauthorizedError`, `ForbiddenError`) thrown from services.
- **`src/middleware/error.middleware.ts`** — a single global error handler that turns thrown `AppError`s, Zod validation errors, and unexpected exceptions into one consistent JSON shape.
- **`src/utils/asyncHandler.ts`** — wraps async route handlers so rejected promises reach the error handler without a `try/catch` in every controller.

`src/app.ts` builds the Express app (used by both the server bootstrap and, potentially, integration tests); `src/index.ts` is only responsible for starting the HTTP server, connecting to the database, and shutting down gracefully.

## Design Principles Applied

This project was refactored specifically to address SOLID, DRY, and ACID concerns found in the original implementation. Concretely:

**SOLID**
- **Single Responsibility** — controllers used to validate input, run business logic, and talk to four different Sequelize models in one function. That's now split: routes wire middleware, middleware validates/authenticates, controllers only shape HTTP responses, and services own business rules (`src/services/event.service.ts`, `user.service.ts`, `waitingList.service.ts`).
- **Open/Closed** — new event statuses or ticket outcomes are added by extending `EventStatusEnum`/`TicketStatus` and the small `computeStatus` helper, not by editing every call site.
- **Liskov/Interface segregation** — DTOs (`CreateEventDTO`, `PublicUser`, etc.) describe exactly the shape each layer needs (e.g. `PublicUser` omits `password`) instead of passing around full Sequelize model instances.
- **Dependency inversion** — controllers depend on service function signatures, not on Sequelize directly; only the service and model layers know Sequelize exists.

**DRY**
- One source of truth for environment access (`config/env.ts`) instead of scattered `process.env.X` reads (and a duplicated, unused second Sequelize instance in the old `db/models/index.ts`, which has been removed).
- One source of truth for status/enum values (`interfaces/event.interface.ts`) instead of hand-typed string literals duplicated across the model and controller.
- One error-response shape produced by a single middleware instead of a repeated `try { ... } catch { res.status(500)... }` block in every controller method.
- Validation schemas (Zod) are defined once in `utils/validator.ts` and reused as both the runtime validator and the TypeScript type (`z.infer<...>`).

**ACID**
- Ticket booking and cancellation each run inside a single `sequelize.transaction(...)` call.
- The event row is read with `lock: transaction.LOCK.UPDATE` (`SELECT ... FOR UPDATE`) before its `availableTickets` is checked or mutated, closing the check-then-act race condition present in the original code (two concurrent bookings could both read "5 available" and both proceed, overselling the event).
- Waiting-list enqueue/dequeue reads and writes happen inside the same transaction as the booking/cancellation they're part of, so a crash mid-operation can't leave `waitingListCount` out of sync with the actual number of waiting-list rows.
- `events.name` now has a real database-level `UNIQUE` constraint (migration `20260711000000-add-constraints-and-indexes.js`) instead of relying solely on an application-level "check then insert" query, which is itself race-prone.
- Schema is owned exclusively by migrations. The old code also called `sequelize.sync()` on every boot, which can silently alter tables out-of-band from the migration history — a real correctness hazard in a system with real data. `sequelize.sync()` has been removed from the boot sequence.

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js + TypeScript |
| Web framework | Express |
| ORM / DB | Sequelize + PostgreSQL |
| Validation | Zod |
| Auth | JSON Web Tokens (`jsonwebtoken`), password hashing via `bcryptjs` |
| Security headers | `helmet` |
| Rate limiting | `express-rate-limit` |
| Logging | `morgan` (HTTP access logs) |
| Testing | Jest + `ts-jest` |
| Linting / formatting | ESLint (flat config, `typescript-eslint`) + Prettier |

## Project Structure

```
src/
  app.ts                  Express app assembly (middleware + routes + error handler)
  index.ts                Server bootstrap: DB connection, listen, graceful shutdown
  config/
    env.ts                Zod-validated environment configuration
  controllers/
    event.controller.ts   Thin HTTP handlers for event/ticket endpoints
    user.controller.ts    Thin HTTP handlers for auth/user endpoints
  services/
    event.service.ts      Booking/cancellation/initialization business logic + transactions
    user.service.ts       Registration/login/listing business logic
    waitingList.service.ts FIFO waiting-list enqueue/dequeue helpers
  middleware/
    auth.middleware.ts     JWT verification, attaches req.user
    validate.middleware.ts Zod-based request body/query validation
    error.middleware.ts    Global 404 + error handler
  errors/
    AppError.ts            Typed HTTP errors (NotFoundError, ConflictError, ...)
  routes/
    event.route.ts
    user.route.ts
    health.route.ts
  db/
    sequelize.ts            Sequelize connection (pooled)
    config/config.js        sequelize-cli environment config
    models/                  Sequelize models (schema defined by migrations)
    migrations/              Schema history (source of truth for the DB schema)
  interfaces/                Shared DTOs / enums
  utils/
    validator.ts             Zod schemas (single source of truth for input shapes)
    asyncHandler.ts           Async route handler wrapper
    helpers.ts                 Test helpers (e.g. token generation)
  __tests__/                  Jest test suites
```

## Getting Started

### Prerequisites
- Node.js 18+
- A running PostgreSQL instance

### Installation
```bash
git clone <repo-url>
cd event_ticket_BE
npm install
cp .env.sample .env   # then fill in the values, see below
```

## Environment Variables

Configuration is validated at startup (`src/config/env.ts`) — the app refuses to boot if a required variable is missing or malformed, with a clear error listing exactly what's wrong.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | `development` \| `test` \| `production` |
| `PORT` | No | `4000` | HTTP port the API listens on |
| `DB_HOST` | Yes | — | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_USER` | Yes | — | PostgreSQL user |
| `DB_PASSWORD` | Yes | — | PostgreSQL password |
| `DB_NAME` | Yes | — | PostgreSQL database name |
| `JWT_SECRET_KEY` | Yes | — | Secret used to sign/verify JWTs |
| `JWT_EXPIRES_IN` | No | `1h` | Token lifetime (e.g. `1h`, `7d`) |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` (15 min) | Rate-limit window |
| `RATE_LIMIT_MAX` | No | `100` | Max requests per window per IP |

See [.env.sample](.env.sample) for a ready-to-copy template.

## Database Setup

Schema is owned entirely by migrations (the app no longer calls `sequelize.sync()` on boot, since that can silently drift from migration history):

```bash
# apply all migrations
npm run migrate

# roll back everything (destructive — development use only)
npm run migrate:undo
```

Tables created: `users`, `events`, `tickets`, `waitingList`, plus a unique constraint on `events.name` and indexes supporting the ticket/waiting-list lookups (see `src/db/migrations/20260711000000-add-constraints-and-indexes.js`).

## Running the App

```bash
npm run dev      # ts-node + nodemon, auto-reload on change
npm run build    # compiles TypeScript to dist/
npm start        # runs the compiled build (dist/index.js)
```

Once running:
- API base URL: `http://localhost:<PORT>/api/v1`
- Health check: `http://localhost:<PORT>/health`

## API Reference

All responses are JSON with a `status` field (`"success"` or `"error"`). All request bodies are validated with Zod; invalid input returns `400` with a `errors` array of `{ path, message }`.

### Auth — `/api/v1/user`

#### `POST /register`
Registers a new user.

Request body:
```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "country": "UK",
  "email": "ada@example.com",
  "password": "supersecret"
}
```

`201 Created`:
```json
{
  "status": "success",
  "message": "Registration successful",
  "user": { "id": "...", "firstName": "Ada", "lastName": "Lovelace", "country": "UK", "email": "ada@example.com", "createdAt": "...", "updatedAt": "..." }
}
```
Note: the password hash is never included in any response.

`409 Conflict` if the email is already registered.

#### `POST /login`
Request body: `{ "email": string, "password": string }`

`200 OK`: `{ "status": "success", "message": "Login successful", "token": "<jwt>" }`

`401 Unauthorized` for a bad email/password combination.

#### `GET /`  *(requires `Authorization: Bearer <token>`)*
Lists users, paginated. Query params: `page` (default `1`), `pageSize` (default `20`, max `100`).

`200 OK`:
```json
{
  "status": "success",
  "message": "Successfully fetched users",
  "data": [ { "id": "...", "firstName": "...", "...": "..." } ],
  "pagination": { "page": 1, "pageSize": 20, "total": 42, "totalPages": 3 }
}
```
Password hashes are excluded at the query level (`attributes: { exclude: ['password'] }`), not filtered out after the fact.

### Events & Tickets — `/api/v1/event`

All endpoints below require `Authorization: Bearer <token>`.

#### `POST /initialize`
Creates a new event with a fixed ticket inventory.

Request body: `{ "name": string, "totalTickets": number (positive integer) }`

`201 Created`: `{ "status": "success", "message": "Event created successfully", "event": { ... } }`

`409 Conflict` if an event with the same name already exists (enforced at the database level via a unique constraint, not just an application check).

#### `POST /book/:eventId`
Books tickets for the authenticated user. If the requested quantity exceeds current availability, the **entire** request is placed on the waiting list (no partial booking) — one waiting-list row per requested ticket, preserving FIFO order.

Request body: `{ "numberOfTickets": number (positive integer) }`

`200 OK`:
```json
{
  "status": "success",
  "message": "Tickets booked successfully",
  "availableTickets": 3,
  "waitingListCount": 0
}
```
or, when added to the waiting list instead:
```json
{
  "status": "success",
  "message": "Not enough tickets available, added to waiting list",
  "availableTickets": 0,
  "waitingListCount": 2
}
```

`404 Not Found` if the event doesn't exist.

#### `POST /cancel/:eventId`
Cancels tickets previously booked by the authenticated user. Freed tickets are immediately reassigned to the earliest entrants on the waiting list (FIFO), one seat at a time, within the same transaction.

Request body: `{ "numberOfTickets": number (positive integer) }`

`200 OK`: `{ "status": "success", "message": "Tickets canceled successfully", "availableTickets": 2, "waitingListCount": 0 }`

`409 Conflict` if the user is trying to cancel more tickets than they have booked.

#### `GET /status/:eventId?status=<status>`
Fetches an event. If `status` is provided, it must be one of `available ticket`, `sold out`, `waiting list`, and the endpoint returns `404` if the event's current status doesn't match (useful for polling for a specific state).

`200 OK`: `{ "status": "success", "message": "Event found", "data": { ...event } }`

### Health — `/health`

`GET /health` — `200 OK` with `{ "status": "ok", "database": "connected", "uptime": <seconds> }` if the DB is reachable, `503` otherwise. Intended for load balancer / orchestrator health checks.

## Error Handling

Every error path returns the same JSON shape:
```json
{ "status": "error", "message": "..." }
```
Zod validation failures additionally include an `errors` array with per-field detail. There is no case where a route can throw an unhandled exception past the client — `asyncHandler` forwards every rejection to the single global error middleware in `src/middleware/error.middleware.ts`.

## Testing

```bash
npm test          # run once with coverage
npm run test:watch
```

Tests target the service layer, where the actual business rules live (booking math, waiting-list FIFO behavior, cancellation/reassignment, auth), rather than re-testing Express plumbing. `sequelize.transaction` is stubbed in tests to immediately invoke its callback, so tests don't require a live database connection — only `DB_HOST`/`JWT_SECRET_KEY`/etc. placeholder values (`jest.setup.js`) so the startup env validation doesn't fail in CI.

## Linting & Formatting

```bash
npm run lint        # ESLint
npm run lint:fix
npm run format       # Prettier
```

## Concurrency & Data Integrity

The original implementation read `event.availableTickets`, decided whether to book or wait-list, and only then wrote the update back — a classic **check-then-act** race: two simultaneous requests could both observe 1 ticket remaining and both book it, overselling the event by one. It's fixed by:

1. Wrapping the whole booking/cancellation operation in `sequelize.transaction(...)`.
2. Reading the event row with `SELECT ... FOR UPDATE` (`lock: transaction.LOCK.UPDATE`) so a second concurrent transaction touching the same event blocks until the first commits, rather than reading stale data.
3. Keeping every dependent write (ticket orders, waiting-list rows, the event's counters) inside that same transaction so a mid-operation crash can't leave them inconsistent.

The same pattern protects waiting-list dequeue during cancellation, so two concurrent cancellations can't both hand the same freed seat to two different waiting users.

## Scalability Notes

- **Connection pooling** is configured on the Sequelize instance (`src/db/sequelize.ts`) so the app can serve concurrent requests without exhausting Postgres connections; tune `pool.max` to your deployment's expected concurrency and your Postgres `max_connections`.
- **Indexes** added for the query patterns the app actually runs: `(eventId, userId)` on `tickets` for booking/cancellation lookups, and `(eventId, position)` on `waitingList` for FIFO dequeues (migration `20260711000000-add-constraints-and-indexes.js`).
- **Pagination** on `GET /api/v1/user` avoids loading the entire users table into memory as it grows.
- **Stateless app tier** — the app holds no in-process session state (auth is a stateless JWT), so it can be horizontally scaled behind a load balancer; only the Postgres connection pool size needs coordinating across instances.
- **Rate limiting** (`express-rate-limit`) protects the API and the database behind it from abusive traffic spikes.
- **Health endpoint** (`/health`) is provided for load balancers / container orchestrators (e.g. Kubernetes liveness/readiness probes) to detect and route around unhealthy instances.
- For very high write contention on a single, extremely popular event, row-level locking will serialize booking requests for *that event*; if that becomes a bottleneck at scale, consider a queue-based booking worker or per-event sharding — not needed at this project's current scale, called out here for awareness.

## Security Notes

- Passwords are hashed with `bcryptjs` before storage and are never returned in any API response or included in `GET /api/v1/user` queries (excluded at the SQL level, not filtered after fetching).
- `helmet` sets standard security headers; `express-rate-limit` mitigates brute-force and abuse.
- All environment secrets (DB credentials, JWT secret) are required and validated at boot — the app will not start with a missing or empty `JWT_SECRET_KEY`.
- All event/ticket endpoints require a valid JWT; `GET /api/v1/user` also now requires authentication (previously public, which leaked the full user list to anyone).
- There is currently no role/permission system — any authenticated user can create events (`POST /api/v1/event/initialize`). If that's not desired, the next step is adding a `role` column and an authorization middleware.

## Known Limitations & Future Work

- **No role-based access control** — event creation is gated only by authentication, not by an "admin" role. Worth adding if this API is exposed beyond trusted organizers.
- **Waiting-list fairness across events** — position is scoped per-event, which is correct for this domain, but if cross-event prioritization is ever needed it isn't supported today.
- **No refresh tokens** — JWTs simply expire; there's no revocation or refresh flow.
- **No integration/e2e test layer** — current tests cover the service layer thoroughly; adding `supertest`-driven HTTP-level tests against a real (or containerized) test database would catch issues at the routing/middleware layer too.
- **`npm audit`** currently reports vulnerabilities in transitive dependencies; run `npm audit` periodically and update as fixes become available upstream.
