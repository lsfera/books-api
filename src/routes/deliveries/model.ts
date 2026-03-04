import { DeliveryCodec } from './codecs.js'
import * as t from 'io-ts'
import { InferSchemaType, Types } from 'mongoose'
import { DeliveryModel, DeliverySchema } from './schema.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { AppError, genericError, notFoundError } from '../../model.js'

type Delivery = t.TypeOf<typeof DeliveryCodec>

type TT = InferSchemaType<typeof DeliverySchema>

const recordDelivery = (
  delivery: Delivery,
): TE.TaskEither<AppError, Types.ObjectId> =>
  pipe(
    new Date(),
    (now) =>
      TE.tryCatch(
        () =>
          new DeliveryModel({
            supplier: delivery.supplier,
            bookIds: delivery.bookIds,
            createdAt: now,
            updatedAt: now,
          }).save(),
        () => genericError(`delivery could not be saved`),
      ),
    TE.map((delivery: TT & { _id: Types.ObjectId }) => delivery._id),
  )

const deliveriesCount = (bookId: string): TE.TaskEither<AppError, number> =>
  pipe(
    TE.tryCatch(
      () => DeliveryModel.find({ bookIds: bookId }).exec(),
      () =>
        genericError(
          `could not retrieve any delivery for book with id ${bookId}`,
        ),
    ),
    TE.chain((deliveries) =>
      pipe(
        O.fromNullable(deliveries),
        E.fromOption(() =>
          notFoundError(
            `could not retrieve any delivery for book with id ${bookId}`,
          ),
        ),
        TE.fromEither,
        TE.map((x) => x.length),
      ),
    ),
  )

export { Delivery, recordDelivery, deliveriesCount }
