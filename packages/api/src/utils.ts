import { Response } from 'express'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as T from 'fp-ts/lib/Task.js'
import { pipe } from 'fp-ts/lib/function.js'
import { AppError, ErrorCode } from './model.js'
import { Span } from '@opentelemetry/api'

const getParam = (id: string | undefined): E.Either<AppError, string> =>
  pipe(
    O.fromNullable(id),
    E.fromOption(() => ({
      code: 'not_found',
      message: 'resource could not be found',
    })),
  )

const replyToError =
  <T>(res: Response<AppError | T>, span?: Span) =>
  (e: AppError): T.Task<Response<AppError | T>> => {
    const multiple = (
      e: AppError,
    ): e is { errors: Array<{ code: ErrorCode; message?: string }> } =>
      'errors' in e && Array.isArray(e.errors)
    if (multiple(e)) {
      return T.of(res.status(403).json(e))
    } else {
      span?.setAttribute('error_code', e.code)
      span?.setAttribute('error_message', e.message ?? '<null>')
      switch (e.code) {
        case 'not_found':
          return T.of(res.status(404).json(e))
        case 'generic_error':
          return T.of(res.status(500).json(e))
        case 'already_exists':
          return T.of(res.status(403).json(e))
        case 'validation':
          return T.of(res.status(403).json(e))
      }
    }
  }

export { getParam, replyToError }
