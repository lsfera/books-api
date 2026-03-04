import { Request, Response } from 'express'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as T from 'fp-ts/lib/Task.js'
import { pipe } from 'fp-ts/lib/function.js'
import { WebHookCodec } from './codecs.js'
import { registerWebHook } from './model.js'
import { AppError, flattenValidationErrors } from '../../model.js'
import { context, trace } from '@opentelemetry/api'
import { replyToError } from '../../utils.js'

const registerWebHookHttpHandler = async (
  req: Request<Record<string, never>, AppError | void, unknown>,
  res: Response<AppError | void>,
): Promise<void> => {
  /*
  #swagger.summary = 'Webhook registration.'
  #swagger.description = 'Webhooks are the mechanism through which it is possible to subscribe to notifications regarding books that go out of stock.'
  #swagger.operationId = 'register_webhook'
  #swagger.requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: {
          ref: "#/components/schemas/registerWebHook"
        }
      }
    }
  }
  #swagger.responses[201] = {
    description: "Webhook registered",
    content: {}
  }
*/
  const span = trace.getSpan(context.active())
  await pipe(
    TE.fromEither(WebHookCodec.decode(req.body)),
    TE.mapLeft(flattenValidationErrors),
    TE.chain(registerWebHook),
    TE.fold(replyToError(res, span), () => T.of(res.status(201).end())),
  )()
}

export { registerWebHookHttpHandler }
