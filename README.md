# Booksland Monorepo

Booksland is a cloud-native bookstore management system built as a monorepo with two packages:
- **API**: Express backend with MongoDB, OpenTelemetry tracing, and Prometheus metrics
- **Webapp**: React frontend with Vite, Effect-TS for functional error handling, and Vitest for testing

## Tech Stack

### API Package (`packages/api`)
- **Runtime**: Node.js with TypeScript (tsx)
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose (replica set support)
- **Observability**: OpenTelemetry (Jaeger tracing) + Prometheus metrics
- **FP**: fp-ts, io-ts for type-safe functional programming
- **Testing**: Mocha + Sinon
- **Docs**: OpenAPI 3.0 (Swagger UI)

### Webapp Package (`packages/webapp`)
- **Framework**: React 19
- **Build**: Vite 6
- **Effect**: Effect-TS for functional error handling and data fetching
- **Testing**: Vitest with jsdom
- **TypeScript**: Strict mode with composite projects
- **Features**: 
  - Tabbed interface (Books & Webhooks)
  - Real-time book browsing and search
  - Webhook registration and management
  - Type-safe API client with Effect

## Quick Start

### Prerequisites
- Node.js 18+ (20+ recommended)
- pnpm 10+
- Docker & Docker Compose (for infrastructure)

### Installation

```bash
# Install all dependencies for both packages
pnpm install
```

### Development

```bash
# Run both API and webapp in parallel
pnpm dev

# Or run individually:
pnpm dev:api      # Start API dev server (http://localhost:3001)
pnpm dev:webapp   # Start webapp dev server (http://localhost:5173)
```

### Using Docker Compose

The project includes full infrastructure setup via Docker Compose:

```bash
# Start all services (API, MongoDB, Jaeger, Prometheus, Swagger UI, nginx)
make run

# Start infrastructure only (for VS Code debugging)
make debug-api

# Stop all services
make stop
```

- **Nginx reverse proxy**: http://localhost:8080
  - API: http://localhost:8080/api/*
  - OpenAPI spec: http://localhost:8080/api-docs/openapi.json
  - Swagger UI: http://localhost:8080/swagger-ui/
- **Jaeger UI**: http://localhost:16686
- **Prometheus**: http://localhost:9090
- **API direct**: http://localhost:3001
- **Webapp direct**: http://localhost:5173 (dev server with proxy to nginx)

## Architecture

### Monorepo Structure

```
booksland-monorepo/
├── packages/
│   ├── api/                    # Express API
│   │   ├── src/
│   │   │   ├── routes/        # Book, Order, Delivery, Webhook routes
│   │   │   ├── monitoring/    # OpenTelemetry setup
│   │   │   ├── spec.ts        # OpenAPI generation
│   │   │   └── index.ts       # Express app entry
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   │
│   └── webapp/                 # React webapp
│       ├── src/
│       │   ├── components/    # BookList, BookSearch
│       │   ├── hooks/         # useEffectResult (Effect integration)
│       │   ├── services/      # booksApi (Effect-based client)
│       │   └── main.tsx
│       ├── tests/              # Vitest tests
│       └── package.json
│
├── docker-compose.yml          # Main services
├── docker-compose.config.yml   # nginx + prometheus configs
├── Makefile                    # Convenience targets
├── pnpm-workspace.yaml         # Workspace definition
└── package.json                # Root scripts
```

### Data Flow

```
User → Webapp (React/Effect) → Vite Proxy → nginx → API (Express) → MongoDB
                                           ↓
                                      Jaeger (traces)
                                      Prometheus (metrics)
```

## Development Workflows

### Building

```bash
# Build all packages
pnpm build

# Build individually
pnpm build:api
pnpm build:webapp
```

### Testing

```bash
# Run all tests
pnpm test

# Run package tests
pnpm test:api      # Mocha tests for API
pnpm test:webapp   # Vitest tests for webapp
```

### Type Checking

```bash
# Check all packages
pnpm typecheck
```

### Linting

```bash
# Lint all packages
pnpm lint
```

## API Configuration

Environment variables (see `packages/api/.env` or `docker-compose.yml`):

- `APPLICATION_PORT` (default: 3001): API HTTP port
- `METRICS_PORT` (default: 3002): Prometheus metrics endpoint port
- `DB_CONNECTION_STRING`: MongoDB connection string
- `OTLP_EXPORTER_HOST` (default: jaeger): OpenTelemetry collector host
- `OTLP_EXPORTER_PORT` (default: 4318): OTLP HTTP port
- `BASE_URL`: API base URL for OpenAPI spec

## Webapp Configuration

The webapp uses Vite's proxy configuration to route API requests through nginx in development:

```typescript
// vite.config.ts
{
  proxy: {
    '/api': 'http://localhost:8080',
    '/api-docs': 'http://localhost:8080'
  }
}
```

Optional environment variable for automatic webhook registration at app startup:

- `VITE_WEBHOOK_URL`: URL to auto-register via `POST /api/webhooks` (example: `https://webhook.site/your-unique-id`)

## Effect-TS Integration

The webapp uses Effect-TS for functional error handling:

### API Service Layer

```typescript
// packages/webapp/src/services/booksApi.ts
import { Effect, Layer } from 'effect'

const api = yield* BooksApiService
const books = yield* api.findBooks({ title: 'TypeScript' })
```

### React Hook

```typescript
// packages/webapp/src/hooks/useEffect.ts
const { data, error, loading } = useEffectResult(
  Effect.gen(function* () {
    const api = yield* BooksApiService
    return yield* api.findBooks()
  }).pipe(Effect.provide(BooksApiServiceLive))
)
```

## VS Code Debugging

The project includes a VS Code compound launch configuration:

1. **F5**: Start compose infrastructure + debug API
2. Breakpoints work in TypeScript source files
3. Auto-cleanup on debug stop via `make:stop` task

Configuration in `.vscode/launch.json`:
- `compose:debug-api`: Runs `make debug-api` (infra only)
- `Debug API (tsx)`: Attaches tsx debugger to API
- `compose+api:debug-api`: Compound config for both

## API Documentation

Generate OpenAPI documentation:

```bash
pnpm --filter @booksland/api run doc
```

This generates:
- `packages/api/src/spec.json`: OpenAPI 3.0 spec
- `packages/api/src/spec.html`: Redocly HTML documentation

Access live docs:
- Swagger UI: http://localhost:8080/swagger-ui/
- OpenAPI JSON: http://localhost:8080/api-docs/openapi.json

## Use Case

A bookstore owner needs software to:
- Track book inventory
- Add books when deliveries arrive
- Remove books when sold
- Get notified when stock is low

## Features

- **Books API**: CRUD operations for book inventory
- **Orders**: Place orders with webhook notifications
- **Deliveries**: Record delivery receipts
- **Webhooks**: MongoDB change streams for low-stock notifications
  - Register webhook URLs via webapp or API
  - Automatic notifications when books go out of stock
  - Secure webhook delivery with payload validation
- **Webapp**: React 19 interface with tabbed navigation
  - Browse and search books
  - Place orders and record deliveries
  - Register and manage webhooks
  - Real-time feedback with Effect-TS error handling
- **Distributed Tracing**: OpenTelemetry traces in Jaeger
- **Metrics**: Prometheus metrics for API performance
- **Type Safety**: Runtime validation with io-ts (API) and @effect/schema (webapp)

## Webhooks

The application supports webhook notifications for out-of-stock events. When books become unavailable (orders exceed deliveries), registered webhooks receive POST notifications.

### Registering a Webhook

**Via Webapp:**
1. Navigate to the "Webhooks" tab at http://localhost:5173
2. Enter your webhook URL (e.g., `https://webhook.site/your-unique-id`)
3. Click "Register Webhook"

**Via API:**
```bash
curl -X POST http://localhost:8080/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-webhook-url.com/notify"
  }'
```

### Webhook Payload

When a book goes out of stock, your webhook receives:

```json
{
  "type": "book_out_of_stock",
  "book": {
    "id": "507f1f77bcf86cd799439011",
    "url": "http://localhost:3001/books/507f1f77bcf86cd799439011"
  }
}
```

### Testing Webhooks

Use a service like [webhook.site](https://webhook.site) to test webhook delivery:

1. Visit https://webhook.site to get a unique URL
2. Register that URL in the Booksland webapp
3. Create orders that exceed book inventory
4. Watch the webhook notifications arrive in real-time

## Example API Calls

```bash
# Save a book
curl -X POST http://localhost:8080/api/books \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Effect-TS Handbook",
    "author": "Michael Arnaldi",
    "isbn": "978-1234567890",
    "year": 2024,
    "copies": 10
  }'

# Find books by title
curl "http://localhost:8080/api/books?title=Effect"

# Get a specific book (replace $BOOK_ID)
BOOK_ID="<book-id-from-location-header>"
curl "http://localhost:8080/api/books/$BOOK_ID"
```

## Testing

### API Tests (Mocha)

```bash
cd packages/api
pnpm test
```

Tests cover:
- Book CRUD operations
- Order placement
- Delivery recording
- Config validation

### Webapp Tests (Vitest)

```bash
cd packages/webapp
pnpm test         # Watch mode
pnpm test:run     # Single run
pnpm test:ui      # Vitest UI
```

Tests cover:
- Effect-based API service layer
- Book schema validation
- Error handling (NetworkError, ApiError, ParseError)
- Effect composition patterns

## Contributing

This is a demo project showcasing:
- Monorepo management with pnpm workspaces
- Functional programming patterns (fp-ts, Effect-TS)
- Cloud-native observability (OpenTelemetry, Prometheus)
- Type-safe runtime validation
- Modern TypeScript tooling (tsx, Vite, Vitest)

## License

ISC
