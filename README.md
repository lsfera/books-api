# booksland

This repository showcases a sample application that explores a cloud-native model. It incorporates [fp-ts](https://github.com/gcanti/fp-ts) and [io-ts](https://github.com/gcanti/io-ts) for a robust foundation. Additionally, the codebase utilizes infrastructure components such as Docker, Prometheus, and [OpenTelemetry](https://opentelemetry.io/).

## use case

A bookstore owner wants a very rudimentary software she can use to keep track of stock. She has to add books to the stock if she receives a delivery and she wants to delete books from stock if they are bought. Furthermore, she wants to get notified if a book is running out of stock so she can order more.

## building, running, etc...

You can build the project by launching `pnpm run build`.

Within the project, you'll find Docker Compose descriptor files that enable you to leverage the project's infrastructure directly from your local machine.

- `make run`: build image(s) and run all services.
- `make debug`: run infrastructure services only (without `api`) for VS Code debugging.
- `make stop`: stop and remove compose services.

Equivalent direct compose command:
`docker compose -f docker-compose.yml -f docker-compose.config.yml up -d`.

## configuration

The application is configurable through environment variables or command-line arguments.

* `APPLICATION_PORT` / `--applicationPort`: the application listening port.
* `DB_CONNECTION_STRING` / `--dbConnectionString`: the MongoDB connection string.
* `METRICS_PORT` / `--metricsPort`: the port for metrics scraping.
* `BASE_URL` / `--baseUrl`: the application base URL (e.g. `http://localhost:3001`).
* `OTLP_EXPORTER_HOST` / `--otlpExporterHost`: the host for the OTLP exporter.
* `OTLP_EXPORTER_PORT` / `--otlpExporterPort`: the port for the OTLP exporter.

## documentation

Run `pnpm run doc` to generate API documentation (specifications are contained in the **./src/spec.json** file).
After generation, the OpenAPI spec is available at `GET /openapi.json` (via nginx at `http://localhost:8080/api-docs/openapi.json`).
Swagger UI is available at `http://localhost:8080/swagger-ui/`.

## notifications

For the use case of notifications, a simple mechanism based on webhooks paired with [MongoDB change streams](https://www.mongodb.com/docs/manual/changeStreams/) has been implemented. This avoids the need to involve additional infrastructure.

## metrics and tracing

With Docker Compose, instances of [Jaeger](https://www.jaegertracing.io) and [Prometheus](https://prometheus.io) are provided, accessible at `http://localhost:9090` and `http://localhost:16686`, respectively.

## example of curls

```sh
# set this from the Location header returned by POST /books
BOOK_ID="<book-id>"
```

```sh
# adding a book
curl -v \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"title":"Types and Programming Languages","isbn":"0262162091","conditions":"new","authors":["Benjamin C. Pierce"],"categories":["computer", "science"]}' \
  http://localhost:3001/books

# < HTTP/1.1 201 Created
# < Location: http://localhost:3001/books/<book-id>
# < ...
```

```sh
# placing an order
curl -v \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"purchaser":"Alonzo Church","bookIds":["'"$BOOK_ID"'"]}' \
  http://localhost:3001/orders

# < HTTP/1.1 201 Created
# < ...
```

```sh
# recording a delivery
curl -v \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"supplier":"Bertrand Russell","bookIds":["'"$BOOK_ID"'"]}' \
  http://localhost:3001/deliveries

# < HTTP/1.1 201 Created
# < ...
```

```sh
# retrieving book availability
curl -v -X GET "http://localhost:3001/books/$BOOK_ID/availability"

# < HTTP/1.1 200 OK
# < ...
# {"count":1}
```

```sh
# registering a webhook
curl -v \
  -H 'Content-Type: application/json' \
  -X POST \
  -d '{"url":"http://localhost:3003"}' \
  http://localhost:3001/webhooks

# < HTTP/1.1 201 OK
# < ...
```
