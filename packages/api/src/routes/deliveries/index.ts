import { Request, Response } from 'express'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as T from 'fp-ts/lib/Task.js'
import { pipe } from 'fp-ts/lib/function.js'
import { DeliveryCodec } from './codecs.js'
import { recordDelivery } from './model.js'
import { AppError, flattenValidationErrors } from '../../model.js'
import { context, trace } from '@opentelemetry/api'
import { replyToError } from '../../utils.js'

type RecordDeliveryDeps = {
  recordDelivery: typeof recordDelivery
}

const recordDeliveryHttpHandler =
  (deps: RecordDeliveryDeps = { recordDelivery }) =>
  async (
    req: Request<Record<string, never>, AppError | void, unknown>,
    res: Response<AppError | void>,
  ): Promise<void> => {
    /*
        #swagger.summary = 'Delivery recording.'
        #swagger.description = 'Deliveries increase the stock.'
        #swagger.operationId = 'record_delivery'
        #swagger.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: {
                ref: "#/components/schemas/recordDelivery"
              }
            }
          }
        }
        #swagger.responses[201] = {
          description: "Delivery recorded",
          content: {}
        }
        #swagger.responses[403] = { description: 'Validation/already exists error' }
        #swagger.responses[404] = { description: 'Resource not found' }
        #swagger.responses[500] = { description: 'Internal server error' }
      */
    const span = trace.getSpan(context.active())
    await pipe(
      TE.fromEither(DeliveryCodec.decode(req.body)),
      TE.mapLeft(flattenValidationErrors),
      TE.chain(deps.recordDelivery),
      TE.fold(replyToError(res, span), () => T.of(res.status(201).end())),
    )()
  }

export { recordDeliveryHttpHandler }
