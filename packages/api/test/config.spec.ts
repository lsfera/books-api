import * as assert from 'assert'
import { getConfig } from '../src/config.js'
import * as E from 'fp-ts/lib/Either.js'
import { pipe } from 'fp-ts/lib/function.js'
import {
  DEFAULT_APPLICATION_PORT,
  DEFAULT_BASE_URL,
  DEFAULT_DB_CONNECTION_STRING,
  DEFAULT_METRICS_PORT,
  DEFAULT_OTLP_EXPORTER_HOST,
  DEFAULT_OTLP_EXPORTER_PORT,
} from '../src/codecs.js'

describe('parsing configuration', () => {
  it('empty values return default config', () => {
    pipe(
      getConfig([], {}),
      E.fold(
        () => {
          assert.fail('failed to parse configuration')
        },
        (cfg) => {
          assert.equal(cfg.dbConnectionString, DEFAULT_DB_CONNECTION_STRING)
          assert.equal(cfg.applicationPort, DEFAULT_APPLICATION_PORT)
          assert.equal(cfg.metricsPort, DEFAULT_METRICS_PORT)
          assert.equal(cfg.otlpExporterHost, DEFAULT_OTLP_EXPORTER_HOST)
          assert.equal(cfg.otlpExporterPort, DEFAULT_OTLP_EXPORTER_PORT)
          assert.equal(cfg.baseUrl, DEFAULT_BASE_URL)
        },
      ),
    )
  })

  it('command args take precedence', () => {
    const expected = 'mongodb://localhost:27017/db1'
    pipe(
      getConfig(['--dbConnectionString', expected], {
        DB_CONNECTION_STRING: 'mongodb://localhost:27017/db2',
      }),
      E.fold(
        () => {
          assert.fail('failed to parse configuration')
        },
        (cfg) => {
          assert.equal(cfg.dbConnectionString, expected)
        },
      ),
    )
  })

  it('takes values both from args and env', () => {
    const expected1 = 'mongodb://localhost:27017/db1'
    const expected2 = 9999
    pipe(
      getConfig(['--dbConnectionString', expected1], {
        APPLICATION_PORT: expected2.toString(),
      }),
      E.fold(
        () => {
          assert.fail('failed to parse configuration')
        },
        (cfg) => {
          assert.equal(cfg.dbConnectionString, expected1)
          assert.equal(cfg.applicationPort, expected2)
        },
      ),
    )
  })

  it('all values from args', () => {
    const expected1 = 'mongodb://localhost:27017/db1'
    const expected2 = '9998'
    const expected3 = '9999'
    const expected4 = 'some.host'
    const expected5 = '9997'
    const expected6 = 'http://localhost'
    pipe(
      getConfig(
        [
          '--dbConnectionString',
          expected1,
          '--applicationPort',
          expected2,
          '--metricsPort',
          expected3,
          '--otlpExporterHost',
          expected4,
          '--otlpExporterPort',
          expected5,
          '--baseUrl',
          expected6,
        ],
        {},
      ),
      E.fold(
        () => {
          assert.fail('failed to parse configuration')
        },
        (cfg) => {
          assert.equal(cfg.dbConnectionString, expected1)
          assert.equal(cfg.applicationPort, parseInt(expected2))
          assert.equal(cfg.metricsPort, parseInt(expected3))
          assert.equal(cfg.otlpExporterHost, expected4)
          assert.equal(cfg.otlpExporterPort, parseInt(expected5))
          assert.equal(cfg.baseUrl, expected6)
        },
      ),
    )
  })

  it('all values from env', () => {
    const expected1 = 'mongodb://localhost:27017/db1'
    const expected2 = '9998'
    const expected3 = '9999'
    const expected4 = 'some.host'
    const expected5 = '9997'
    const expected6 = 'http://localhost'
    pipe(
      getConfig([], {
        DB_CONNECTION_STRING: expected1,
        APPLICATION_PORT: expected2,
        METRICS_PORT: expected3,
        OTLP_EXPORTER_HOST: expected4,
        OTLP_EXPORTER_PORT: expected5,
        BASE_URL: expected6,
      }),
      E.fold(
        () => {
          assert.fail('failed to parse configuration')
        },
        (cfg) => {
          assert.equal(cfg.dbConnectionString, expected1)
          assert.equal(cfg.applicationPort, parseInt(expected2))
          assert.equal(cfg.metricsPort, parseInt(expected3))
          assert.equal(cfg.otlpExporterHost, expected4)
          assert.equal(cfg.otlpExporterPort, parseInt(expected5))
          assert.equal(cfg.baseUrl, expected6)
        },
      ),
    )
  })

  it('non positive integer leads to default value', () => {
    const num = -9999
    pipe(
      getConfig([], {
        APPLICATION_PORT: num.toString(),
        METRICS_PORT: num.toString(),
        OTLP_EXPORTER_PORT: num.toString(),
      }),
      E.fold(
        () => {
          assert.fail('failed to parse configuration')
        },
        (cfg) => {
          assert.equal(cfg.applicationPort, DEFAULT_APPLICATION_PORT)
          assert.equal(cfg.metricsPort, DEFAULT_METRICS_PORT)
          assert.equal(cfg.otlpExporterPort, DEFAULT_OTLP_EXPORTER_PORT)
        },
      ),
    )
  })

  it('empty string leads to default value', () => {
    const empty = ''
    pipe(
      getConfig([], {
        DB_CONNECTION_STRING: empty,
        OTLP_EXPORTER_HOST: empty,
      }),
      E.fold(
        () => {
          assert.fail('failed to parse configuration')
        },
        (cfg) => {
          assert.equal(cfg.dbConnectionString, DEFAULT_DB_CONNECTION_STRING)
          assert.equal(cfg.otlpExporterHost, DEFAULT_OTLP_EXPORTER_HOST)
        },
      ),
    )
  })
})
