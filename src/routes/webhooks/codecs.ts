import * as t from 'io-ts'
import * as td from 'io-ts-types'
import * as E from 'fp-ts/lib/Either.js'
import { identity, pipe } from 'fp-ts/lib/function.js'

const isAValidUrl = (s: string): boolean =>
  pipe(
    E.tryCatch(
      () => new URL(s),
      () => 'not a valid url',
    ),
    E.fold(
      () => false,
      () => true,
    ),
  )

const URLCodec = new t.Type<string, string, unknown>(
  'ConditionCodec',
  (input: unknown): input is string => typeof input === 'string',
  (input: unknown, context: t.Context) =>
    pipe(
      t.string.validate(input, context),
      E.chain((str: string) =>
        isAValidUrl(str)
          ? t.success<string>(str)
          : t.failure<string>(input, context),
      ),
    ),
  identity,
)

const WebHookCodec = t.type({
  url: td.withMessage(URLCodec, () => 'must be a valid URL'),
})

export { WebHookCodec }
