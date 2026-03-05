import { Request, Response } from 'express'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as T from 'fp-ts/lib/Task.js'
import { pipe } from 'fp-ts/lib/function.js'
import { OrderCodec } from './codecs.js'
import { placeOrder } from './model.js'
import { AppError, flattenValidationErrors } from '../../model.js'
import { context, trace } from '@opentelemetry/api'
import { replyToError } from '../../utils.js'

type PlaceOrderDeps = {
  placeOrder: typeof placeOrder
}

const placeOrderHttpHandler =
  (deps: PlaceOrderDeps = { placeOrder }) =>
  async (
    req: Request<Record<string, never>, AppError | void, unknown>,
    res: Response<AppError | void>,
  ): Promise<void> => {
    /*
        #swagger.summary = 'Order placement.'
        #swagger.description = 'Incoming orders cause the stock quantity to decrease.'
        #swagger.operationId = 'place_order'
        #swagger.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: {
                ref: "#/components/schemas/placeOrder"
              }
            }
          }
        }
        #swagger.responses[201] = {
          description: "Order placed",
          content: {}
        }
        #swagger.responses[403] = { description: 'Validation/already exists error' }
        #swagger.responses[404] = { description: 'Resource not found' }
        #swagger.responses[500] = { description: 'Internal server error' }
      */
    const span = trace.getSpan(context.active())
    await pipe(
      TE.fromEither(OrderCodec.decode(req.body)),
      TE.mapLeft(flattenValidationErrors),
      TE.chain(deps.placeOrder),
      TE.fold(replyToError(res, span), () => T.of(res.status(201).end())),
    )()
  }

export { placeOrderHttpHandler }
