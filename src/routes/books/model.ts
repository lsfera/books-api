import { BookCodec } from './codecs.js'
import * as t from 'io-ts'
import { InferSchemaType, Types } from 'mongoose'
import { BookModel, BookSchema } from './schema.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as E from 'fp-ts/lib/Either.js'
import * as O from 'fp-ts/lib/Option.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { AppError } from '../../model.js'
import { genericError, notFoundError } from '../../model.js'

const ALL_CONDITIONS = ['used', 'new', 'like new', 'good'] as const
type Condition = (typeof ALL_CONDITIONS)[number]
type Book = t.TypeOf<typeof BookCodec>

type TT = InferSchemaType<typeof BookSchema>

const bookFromSchema = (
  book: TT & { _id: Types.ObjectId },
): Book & { id: string } => ({
  id: book._id.toString(),
  title: book.title,
  isbn: book.isbn,
  conditions: book.conditions as Condition,
  authors: book.authors,
  categories: book.categories,
})

const findBook = (
  bookId: string,
): TE.TaskEither<AppError, TT & { _id: Types.ObjectId }> =>
  pipe(
    TE.tryCatch(
      () => BookModel.findById<TT & { _id: Types.ObjectId }>(bookId).exec(),
      () => genericError(`could not retrieve a book with id '${bookId}'`),
    ),
    TE.chain((book: (TT & { _id: Types.ObjectId }) | null) =>
      pipe(
        O.fromNullable(book),
        E.fromOption(() =>
          notFoundError(`could not retrieve a book with id '${bookId}'`),
        ),
        TE.fromEither,
      ),
    ),
  )

const findBooks = (): TE.TaskEither<
  AppError,
  Array<TT & { _id: Types.ObjectId }>
> =>
  pipe(
    TE.tryCatch(
      () => BookModel.find<TT & { _id: Types.ObjectId }>({}).exec(),
      () => genericError(`could not retrieve any book`),
    ),
    TE.chain((books: Array<TT & { _id: Types.ObjectId }>) =>
      pipe(
        O.fromNullable(books),
        E.fromOption(() => notFoundError('could not retrieve any book')),
        TE.fromEither,
      ),
    ),
  )

const saveBook = (book: Book): TE.TaskEither<AppError, Types.ObjectId> =>
  pipe(
    new Date(),
    (now) =>
      TE.tryCatch(
        () =>
          new BookModel({
            title: book.title,
            isbn: book.isbn,
            conditions: book.conditions,
            authors: book.authors,
            categories: book.categories,
            createdAt: now,
            updatedAt: now,
          }).save(),
        () => genericError(`book could not be saved`),
      ),
    TE.map((book: TT & { _id: Types.ObjectId }) => book._id),
  )

export {
  ALL_CONDITIONS,
  Condition,
  Book,
  findBook,
  findBooks,
  saveBook,
  bookFromSchema,
}
