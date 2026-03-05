import * as t from 'io-ts'
import * as td from 'io-ts-types'
import { NonEmptyStringCodec } from '../../codecs.js'

const WebHookMessageCodec = t.type({
    type: td.withMessage(NonEmptyStringCodec, () => 'must be a non empty string'),
    book: t.type({
        id: td.withMessage(NonEmptyStringCodec, () => 'must be a non empty string'),
        url: td.withMessage(NonEmptyStringCodec, () => 'must be a non empty string'),
    }),
})

export { WebHookMessageCodec }
