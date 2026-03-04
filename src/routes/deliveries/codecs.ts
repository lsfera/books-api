import * as t from 'io-ts'
import * as td from 'io-ts-types'
import { NonEmptyStringCodec } from '../../codecs.js'

const DeliveryCodec = t.type({
  supplier: td.withMessage(
    NonEmptyStringCodec,
    () => 'must be a non empty string',
  ),
  bookIds: td.withMessage(
    t.array(NonEmptyStringCodec),
    () => 'empty values are not allowed',
  ),
})

export { DeliveryCodec }
