import * as E from 'fp-ts/lib/Either.js'
import { identity, pipe } from 'fp-ts/lib/function.js'
import * as t from 'io-ts'
import * as td from 'io-ts-types'

const PositiveIntegerNumberCodec = new t.Type<number, number, unknown>(
  'PositiveIntegerNumberCodec',
  t.number.is,
  (input: unknown, context: t.Context) =>
    pipe(
      t.number.validate(input, context),
      E.chain((num: number) =>
        Number.isInteger(num) && num >= 0
          ? t.success<number>(num)
          : t.failure<number>(input, context),
      ),
    ),
  identity,
)

const NonEmptyStringCodec = new t.Type<string, string, unknown>(
  'RoleCodec',
  t.string.is,
  (input: unknown, context: t.Context) =>
    pipe(
      t.string.validate(input, context),
      E.chain((str: string) =>
        str.length > 0
          ? t.success<string>(str)
          : t.failure<string>(input, context),
      ),
    ),
  identity,
)

const DEFAULT_DB_CONNECTION_STRING = 'mongodb://localhost:27017/booksland'
const DEFAULT_APPLICATION_PORT = 3001
const DEFAULT_METRICS_PORT = 3002
const DEFAULT_OTLP_EXPORTER_HOST = 'localhost'
const DEFAULT_OTLP_EXPORTER_PORT = 4318
const DEFAULT_BASE_URL = `http://localhost:${DEFAULT_APPLICATION_PORT}`

const ConfigCodec = t.type({
  dbConnectionString: td.withMessage(
    td.withFallback(NonEmptyStringCodec, DEFAULT_DB_CONNECTION_STRING),
    () => 'must be a non empty string',
  ),
  applicationPort: td.withMessage(
    td.withFallback(
      td.NumberFromString.pipe(
        PositiveIntegerNumberCodec,
        'PositiveIntegerNumberFromString',
      ),
      DEFAULT_APPLICATION_PORT,
    ),
    () => 'only positive integers are allowed',
  ),
  metricsPort: td.withMessage(
    td.withFallback(
      td.NumberFromString.pipe(
        PositiveIntegerNumberCodec,
        'PositiveIntegerNumberFromString',
      ),
      DEFAULT_METRICS_PORT,
    ),
    () => 'only positive integers are allowed',
  ),
  otlpExporterHost: td.withMessage(
    td.withFallback(NonEmptyStringCodec, DEFAULT_OTLP_EXPORTER_HOST),
    () => 'must be a non empty string',
  ),
  otlpExporterPort: td.withMessage(
    td.withFallback(
      td.NumberFromString.pipe(
        PositiveIntegerNumberCodec,
        'PositiveIntegerNumberFromString',
      ),
      DEFAULT_OTLP_EXPORTER_PORT,
    ),
    () => 'only positive integers are allowed',
  ),
  baseUrl: td.withMessage(
    td.withFallback(NonEmptyStringCodec, DEFAULT_BASE_URL),
    () => 'must be a non empty string',
  ),
})

export {
  PositiveIntegerNumberCodec,
  NonEmptyStringCodec,
  ConfigCodec,
  DEFAULT_DB_CONNECTION_STRING,
  DEFAULT_APPLICATION_PORT,
  DEFAULT_METRICS_PORT,
  DEFAULT_OTLP_EXPORTER_HOST,
  DEFAULT_OTLP_EXPORTER_PORT,
  DEFAULT_BASE_URL,
}
