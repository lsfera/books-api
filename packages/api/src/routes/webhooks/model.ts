import { WebHookCodec } from './codecs.js'
import * as t from 'io-ts'
import { InferSchemaType, Types } from 'mongoose'
import { WebHookModel, WebHookSchema } from './schema.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import {
  AppError,
  alreadyExistsError,
  genericError,
  notFoundError,
} from '../../model.js'

type WebHook = t.TypeOf<typeof WebHookCodec>

type TT = InferSchemaType<typeof WebHookSchema>

const isDuplicateKeyError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const candidate = error as { code?: unknown; message?: unknown }

  if (candidate.code === 11000) {
    return true
  }

  if (typeof candidate.message === 'string') {
    return candidate.message.includes('E11000')
  }

  return false
}

const findWebHooks = (): TE.TaskEither<
  AppError,
  Array<TT & { _id: Types.ObjectId }>
> =>
  pipe(
    TE.tryCatch(
      () => WebHookModel.find<TT & { _id: Types.ObjectId }>({}).exec(),
      () => genericError(`could not retrieve any webhook`),
    ),
    TE.chain((hooks: Array<TT & { _id: Types.ObjectId }>) =>
      pipe(
        O.fromNullable(hooks),
        E.fromOption(() => notFoundError('could not retrieve any webhook')),
        TE.fromEither,
      ),
    ),
  )

const registerWebHook = (
  hook: WebHook,
): TE.TaskEither<AppError, Types.ObjectId> =>
  pipe(
    new Date(),
    (now) =>
      TE.tryCatch(
        () =>
          new WebHookModel({
            url: hook.url,
            createdAt: now,
            updatedAt: now,
          }).save(),
        (e) =>
          isDuplicateKeyError(e)
            ? alreadyExistsError(
              `a webhook for URL '${hook.url}' already exists`,
            )
            : genericError(`webhook could not be saved`),
      ),
    TE.map((hook: TT & { _id: Types.ObjectId }) => hook._id),
  )

export { WebHook, registerWebHook, findWebHooks }
