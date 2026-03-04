import { OrderCodec } from './codecs.js'
import * as t from 'io-ts'
import { InferSchemaType, Types } from 'mongoose'
import { OrderModel, OrderSchema } from './schema.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { AppError, genericError, notFoundError } from '../../model.js'

type Order = t.TypeOf<typeof OrderCodec>

type TT = InferSchemaType<typeof OrderSchema>

const placeOrder = (order: Order): TE.TaskEither<AppError, Types.ObjectId> =>
  pipe(
    new Date(),
    (now) =>
      TE.tryCatch(
        () =>
          new OrderModel({
            purchaser: order.purchaser,
            bookIds: order.bookIds,
            createdAt: now,
            updatedAt: now,
          }).save(),
        () => genericError(`order could not be saved`),
      ),
    TE.map((order: TT & { _id: Types.ObjectId }) => order._id),
  )

const ordersCount = (bookId: string): TE.TaskEither<AppError, number> =>
  pipe(
    TE.tryCatch(
      () => OrderModel.find({ bookIds: bookId }).exec(),
      () =>
        genericError(`could not retrieve any order for book with id ${bookId}`),
    ),
    TE.chain((orders) =>
      pipe(
        O.fromNullable(orders),
        E.fromOption(() =>
          notFoundError(
            `could not order any delivery for book with id ${bookId}`,
          ),
        ),
        TE.fromEither,
        TE.map((x) => x.length),
      ),
    ),
  )

export { Order, placeOrder, ordersCount }
