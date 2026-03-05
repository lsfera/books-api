import { NodeSDK } from '@opentelemetry/sdk-node'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express'
import { getConfig } from '../config.js'
import { identity, pipe } from 'fp-ts/lib/function.js'
import * as E from 'fp-ts/lib/Either.js'

const otel = pipe(
  getConfig(process.argv, process.env),
  E.map(
    (cfg) =>
      new NodeSDK({
        traceExporter: new OTLPTraceExporter({
          headers: {},
          url: `http://${cfg.otlpExporterHost}:${cfg.otlpExporterPort}/v1/traces`,
        }),
        metricReader: new PeriodicExportingMetricReader({
          exporter: new OTLPMetricExporter({
            headers: {},
            url: `http://${cfg.otlpExporterHost}:${cfg.otlpExporterPort}/v1/metrics`,
            concurrencyLimit: 1,
          }),
        }),
        instrumentations: [
          new HttpInstrumentation(),
          new ExpressInstrumentation(),
        ],
        resource: resourceFromAttributes({
          [SemanticResourceAttributes.SERVICE_NAME]:
            process.env.npm_package_name,
          [SemanticResourceAttributes.SERVICE_VERSION]:
            process.env.npm_package_version,
        }),
      }),
  ),
  E.fold(() => undefined, identity),
)

export default otel
