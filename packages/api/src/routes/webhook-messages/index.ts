import { Request, Response } from 'express'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as T from 'fp-ts/lib/Task.js'
import { pipe } from 'fp-ts/lib/function.js'
import { AppError, flattenValidationErrors } from '../../model.js'
import { context, trace } from '@opentelemetry/api'
import { replyToError } from '../../utils.js'
import { WebHookMessageCodec } from './codecs.js'
import {
  findWebHookMessages,
  saveWebHookMessage,
  StoredWebHookMessage,
  subscribeToWebHookMessages,
} from './model.js'

const saveWebHookMessageHttpHandler = async (
  req: Request<Record<string, never>, AppError | void, unknown>,
  res: Response<AppError | void>,
): Promise<void> => {
  /*
  #swagger.summary = 'Receive webhook notification message.'
  #swagger.description = 'Receives webhook notification payloads and stores recent messages for inspection.'
  #swagger.operationId = 'save_webhook_message'
  #swagger.requestBody = {
    required: true,
    content: {
      "application/json": {
        schema: {
          ref: "#/components/schemas/saveWebHookMessage"
        }
      }
    }
  }
  #swagger.responses[202] = {
    description: "Webhook message accepted",
    content: {}
  }
  #swagger.responses[403] = { description: 'Validation/already exists error' }
  #swagger.responses[404] = { description: 'Resource not found' }
  #swagger.responses[500] = { description: 'Internal server error' }
*/
  const span = trace.getSpan(context.active())
  await pipe(
    TE.fromEither(WebHookMessageCodec.decode(req.body)),
    TE.mapLeft(flattenValidationErrors),
    TE.chain(saveWebHookMessage),
    TE.fold(replyToError(res, span), () => T.of(res.status(202).end())),
  )()
}

const getWebHookMessagesHttpHandler = async (
  _: Request<Record<string, never>, AppError | { messages: Array<StoredWebHookMessage> }>,
  res: Response<AppError | { messages: Array<StoredWebHookMessage> }>,
): Promise<void> => {
  /*
  #swagger.summary = 'List webhook notification messages.'
  #swagger.description = 'Returns the latest received webhook notification payloads.'
  #swagger.operationId = 'find_webhook_messages'
  #swagger.responses[200] = {
    description: '',
    content: {
      "application/json": {
        schema:{
          $ref: "#/components/schemas/findWebHookMessages"
        }
      }
    }
  }
  #swagger.responses[403] = { description: 'Validation/already exists error' }
  #swagger.responses[404] = { description: 'Resource not found' }
  #swagger.responses[500] = { description: 'Internal server error' }
*/
  const span = trace.getSpan(context.active())
  await pipe(
    findWebHookMessages(),
    TE.fold(replyToError(res, span), (x) => T.of(res.status(200).json({ messages: x }))),
  )()
}

const streamWebHookMessagesHttpHandler = (
  _: Request,
  res: Response,
): void => {
  /*
  #swagger.summary = 'Stream webhook notification messages.'
  #swagger.description = 'Streams newly received webhook notification payloads using Server-Sent Events (SSE).'
  #swagger.operationId = 'stream_webhook_messages'
  #swagger.produces = ['text/event-stream']
  #swagger.responses[200] = {
    description: 'SSE stream opened',
    content: {
      "text/event-stream": {
        schema: {
          type: 'string'
        }
      }
    }
  }
  #swagger.responses[403] = { description: 'Validation/already exists error' }
  #swagger.responses[404] = { description: 'Resource not found' }
  #swagger.responses[500] = { description: 'Internal server error' }
*/
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const unsubscribe = subscribeToWebHookMessages((message) => {
    res.write(`data: ${JSON.stringify(message)}\n\n`)
  })

  res.on('close', () => {
    unsubscribe()
    res.end()
  })
}

export {
  saveWebHookMessageHttpHandler,
  getWebHookMessagesHttpHandler,
  streamWebHookMessagesHttpHandler,
}
