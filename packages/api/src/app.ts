import express, { NextFunction } from 'express'
import { Request, Response } from 'express'
import * as core from 'express'
import { createMiddleware } from '@promster/express'
import { createServer as createPrometheusMetricsServer } from '@promster/server'
import { Config } from 'config.js'
import {
  getBooksHttpHandler,
  getBookHttpHandler,
  addBookHttpHandler,
  bookAvailabilityHttpHandler,
} from './routes/books/index.js'
import { placeOrderHttpHandler } from './routes/orders/index.js'
import { recordDeliveryHttpHandler } from './routes/deliveries/index.js'
import { DeliveryModel } from './routes/deliveries/schema.js'
import { OrderModel } from './routes/orders/schema.js'
import { handler } from './routes/notifications/index.js'
import { registerWebHookHttpHandler } from './routes/webhooks/index.js'
import { openApiSpecHttpHandler } from './routes/openapi/index.js'
import {
  getWebHookMessagesHttpHandler,
  saveWebHookMessageHttpHandler,
  streamWebHookMessagesHttpHandler,
} from './routes/webhook-messages/index.js'

const buildApp = async (cfg: Config): Promise<core.Express> => {
  const app = express()
  app.use(createMiddleware({ app }))
  await createPrometheusMetricsServer({
    port: cfg.metricsPort,
    detectKubernetes: false,
  })
  app.use(express.json())
  app.use((error: unknown, _: Request, res: Response, next: NextFunction) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ errors: ['invalid JSON format'] })
    }
    return next(error)
  })
  app.get('/books', getBooksHttpHandler)
  app.get('/books/:bookId', getBookHttpHandler)
  app.get('/books/:bookId/availability', bookAvailabilityHttpHandler)
  app.get('/webhook-messages', getWebHookMessagesHttpHandler)
  app.get('/webhook-messages/stream', streamWebHookMessagesHttpHandler)
  app.get('/openapi.json', openApiSpecHttpHandler)
  app.post('/books', addBookHttpHandler())
  app.post('/orders', placeOrderHttpHandler())
  app.post('/deliveries', recordDeliveryHttpHandler())
  app.post('/webhook-messages', saveWebHookMessageHttpHandler)
  app.post('/webhooks', registerWebHookHttpHandler)
  DeliveryModel.watch().on('change', handler)
  OrderModel.watch().on('change', handler)
  return app
}

export default buildApp
