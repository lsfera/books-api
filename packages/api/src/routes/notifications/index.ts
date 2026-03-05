import { Types } from 'mongoose'
import { deliveriesCount } from '../deliveries/model.js'
import { ordersCount } from '../orders/model.js'
import * as T from 'fp-ts/lib/Task.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as A from 'fp-ts/lib/Array.js'
import * as O from 'fp-ts/lib/Option.js'
import { identity, pipe } from 'fp-ts/lib/function.js'
import { AppError, genericError } from '../../model.js'
import { WebHook, findWebHooks } from '../webhooks/model.js'

type ChangedData<T> = {
  _id: {
    _data: string
  }
  operationType: 'insert' | 'replace' | 'delete'
  fullDocument?: T & { _id: Types.ObjectId }
  ns: { db: string; coll: string }
  documentKey: { _id: Types.ObjectId }
}

type OutOfStockCheckResult = {
  bookId: string
  count: number
  type: 'delivery' | 'order'
}

type OutOfStockMessage = {
  url: string
  payload: {
    type: string
    book: { id: string; url: string }
  }
}

const getDeliveries = (
  bookId: string,
): TE.TaskEither<AppError, OutOfStockCheckResult> =>
  pipe(
    deliveriesCount(bookId),
    TE.map((count) => ({ bookId, count, type: 'delivery' })),
  )

const getOrders = (
  bookId: string,
): TE.TaskEither<AppError, OutOfStockCheckResult> =>
  pipe(
    ordersCount(bookId),
    TE.map((count) => ({ bookId, count, type: 'order' })),
  )

const buildMessage =
  (bookId: string) =>
  (hook: WebHook): OutOfStockMessage => ({
    url: hook.url,
    payload: {
      type: 'out_of_stock',
      book: {
        id: bookId,
        url: `${process.env.BASE_URL ?? ''}/books/${bookId}`,
      },
    },
  })

type PostResult = {
  status: number
  url: string
  bookId: string
}

const post = (
  message: OutOfStockMessage,
): TE.TaskEither<AppError, PostResult> =>
  pipe(
    TE.tryCatch(
      () =>
        fetch(message.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message.payload),
        }),
      () => genericError(`could not fetch URL ${message.url}`),
    ),
    TE.map((response) => ({
      status: response.status,
      url: message.url,
      bookId: message.payload.book.id,
    })),
  )

const mapOutOfStock =
  (bookId: string) =>
  (
    result: Array<OutOfStockCheckResult>,
  ): { bookId: string; notify: boolean } => ({
    bookId,
    notify:
      result.reduce<number>(
        (acc, cur) =>
          cur.type === 'delivery' ? acc + cur.count : acc - cur.count,
        0,
      ) === 0,
  })

const booksToNotify = (
  bookIds: Array<string>,
): TE.TaskEither<AppError, Array<string>> =>
  pipe(
    bookIds,
    A.map((bookId: string) =>
      pipe(
        [getDeliveries(bookId), getOrders(bookId)],
        A.sequence(TE.ApplicativePar),
        TE.map(mapOutOfStock(bookId)),
      ),
    ),
    A.sequence(TE.ApplicativePar),
    TE.map(A.filter((x) => x.notify)),
    TE.map(A.map((x) => x.bookId)),
  )

const sendNotification =
  (hooks: Array<WebHook>) =>
  (bookId: string): TE.TaskEither<AppError, Array<PostResult>> =>
    pipe(
      hooks,
      A.map(buildMessage(bookId)),
      A.map(post),
      A.sequence(TE.ApplicativePar),
    )

const sendNotifications = (
  bookIds: Array<string>,
): TE.TaskEither<AppError, Array<PostResult>> =>
  pipe(
    findWebHooks(),
    TE.chain((hooks) =>
      pipe(
        booksToNotify(bookIds),
        TE.chain((bookIds) =>
          pipe(
            A.map(sendNotification(hooks))(bookIds),
            A.sequence(TE.ApplicativePar),
          ),
        ),
      ),
    ),
    TE.map(A.flatten),
  )

const printResponse = (entries: Array<PostResult>): string =>
  entries
    .map((x) => `invoked URL ${x.url} for book id ${x.bookId}: ${x.status}`)
    .join('\n')

const handler = (data: ChangedData<{ bookIds: Array<string> }>): void => {
  pipe(
    sendNotifications(
      pipe(
        data,
        O.fromPredicate((x) => x.operationType === 'insert'),
        O.chain((x) => O.fromNullable(x.fullDocument?.bookIds)),
        O.fold(() => [], identity),
      ),
    ),
    TE.fold(
      (e) =>
        T.fromIO(() => {
          console.log(e)
        }),
      (response) =>
        T.fromIO(() => {
          console.log(printResponse(response))
        }),
    ),
  )()
}

export { handler }
