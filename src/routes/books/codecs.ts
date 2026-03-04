import { ALL_CONDITIONS, Condition } from './model.js'
import * as E from 'fp-ts/lib/Either.js'
import { identity, pipe } from 'fp-ts/lib/function.js'
import * as t from 'io-ts'
import * as td from 'io-ts-types'
import { NonEmptyStringCodec } from '../../codecs.js'

const isCondition = (input: unknown): input is Condition =>
  typeof input === 'string' && ALL_CONDITIONS.includes(input as Condition)

const ConditionCodec = new t.Type<Condition, string, unknown>(
  'ConditionCodec',
  isCondition,
  (input: unknown, context: t.Context) =>
    pipe(
      t.string.validate(input, context),
      E.chain((str: string) =>
        isCondition(str)
          ? t.success<Condition>(str)
          : t.failure<Condition>(input, context),
      ),
    ),
  identity,
)

const BookCodec = t.type({
  title: td.withMessage(
    NonEmptyStringCodec,
    () => 'must be a non empty string',
  ),
  isbn: td.withMessage(NonEmptyStringCodec, () => 'must be a non empty string'),
  conditions: td.withMessage(
    ConditionCodec,
    () =>
      `allowed values are ${ALL_CONDITIONS.map(
        (condition) => `'${condition}'`,
      ).join(', ')}`,
  ),
  authors: td.withMessage(
    t.array(NonEmptyStringCodec),
    () => 'empty values are not allowed',
  ),
  categories: td.withMessage(
    t.array(NonEmptyStringCodec),
    () => 'empty values are not allowed',
  ),
})

export { ConditionCodec, BookCodec }
