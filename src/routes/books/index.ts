import type { Request, Response } from 'express'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as T from 'fp-ts/lib/Task.js'
import { pipe } from 'fp-ts/lib/function.js'
import { BookCodec } from './codecs.js'
import { findBook, findBooks, saveBook, bookFromSchema } from './model.js'
import type { Book } from './model.js'
import { flattenValidationErrors } from '../../model.js'
import type { AppError } from '../../model.js'
import { context, trace } from '@opentelemetry/api'
import { replyToError, getParam } from '../../utils.js'
import { ordersCount } from '../orders/model.js'
import { deliveriesCount } from '../deliveries/model.js'

const getBooksHttpHandler = async (
  _: Request<
    Record<string, never>,
    AppError | { books: Array<Book & { id: string }> }
  >,
  res: Response<AppError | { books: Array<Book & { id: string }> }>,
): Promise<void> => {
  /*
  #swagger.summary = 'List all books.'
  #swagger.description = 'List all books.'
  #swagger.operationId = 'find_books'
  #swagger.responses[200] = {
    description: '',
    content: {
      "application/json": {
        schema:{
          $ref: "#/components/schemas/findBooks"
        }
      }
    }
  }
  #swagger.responses[403] = { description: 'Validation/already exists error' }
  #swagger.responses[404] = { description: 'Resource not found' }
  #swagger.responses[500] = { description: 'Internal server error' }
*/
  const span = trace.getSpan(context.active())
  await pipe(
    findBooks(),
    TE.fold(replyToError(res, span), (x) =>
      T.of(res.status(200).json({ books: x.map((y) => bookFromSchema(y)) })),
    ),
  )()
}

const getBookHttpHandler = async (
  req: Request<{ bookId?: string }, AppError | (Book & { id: string })>,
  res: Response<AppError | (Book & { id: string })>,
): Promise<void> => {
  /*
  #swagger.summary = 'Get a book.'
  #swagger.description = 'Get a book.'
  #swagger.operationId = 'find_book'
  #swagger.responses[200] = {
    description: '',
    content: {
      "application/json": {
        schema:{
          $ref: "#/components/schemas/findBook"
        }
      }
    }
  }
  #swagger.responses[403] = { description: 'Validation/already exists error' }
  #swagger.responses[404] = { description: 'Resource not found' }
  #swagger.responses[500] = { description: 'Internal server error' }
*/
  const span = trace.getSpan(context.active())
  span?.setAttribute('bookId', req.params.bookId ?? '<null>')
  await pipe(
    req.params.bookId,
    getParam,
    TE.fromEither,
    TE.chain(findBook),
    TE.fold(replyToError(res, span), (x) =>
      T.of(
        res
          .status(200)
          .setHeader('Last-Modified', x.updatedAt.toUTCString())
          .json(bookFromSchema(x)),
      ),
    ),
  )()
}

type AddBookDeps = {
  saveBook: typeof saveBook
}

const addBookHttpHandler =
  (deps: AddBookDeps = { saveBook }) =>
  async (req: Request, res: Response): Promise<void> => {
    /*
        #swagger.summary = 'Insert a book.'
        #swagger.description = 'Insert a book.'
        #swagger.operationId = 'save_book'
        #swagger.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: {
                ref: "#/components/schemas/saveBook"
              }
            }
          }
        }
        #swagger.responses[201] = {
          description: "Book added",
          content: {}
        }
        #swagger.responses[403] = { description: 'Validation/already exists error' }
        #swagger.responses[404] = { description: 'Resource not found' }
        #swagger.responses[500] = { description: 'Internal server error' }
        */
    const span = trace.getSpan(context.active())
    await pipe(
      TE.fromEither(BookCodec.decode(req.body)),
      TE.mapLeft(flattenValidationErrors),
      TE.chain(deps.saveBook),
      TE.fold(replyToError(res, span), (x) =>
        T.of(
          res
            .status(201)
            .setHeader('Location', `/books/${x._id.toString()}`)
            .end(),
        ),
      ),
    )()
  }

const bookAvailabilityHttpHandler = async (
  req: Request<{ bookId?: string }, AppError | { count: number }>,
  res: Response<AppError | { count: number }>,
): Promise<void> => {
  /*
  #swagger.summary = 'Retrieve book availability.'
  #swagger.description = 'Retrieve book availability.'
  #swagger.operationId = 'book_availability'
  #swagger.responses[200] = {
    description: '',
    content: {
      "application/json": {
        schema:{
          $ref: "#/components/schemas/bookAvailability"
        }
      }
    }
  }
  #swagger.responses[403] = { description: 'Validation/already exists error' }
  #swagger.responses[404] = { description: 'Resource not found' }
  #swagger.responses[500] = { description: 'Internal server error' }
*/
  const span = trace.getSpan(context.active())
  span?.setAttribute('bookId', req.params.bookId ?? '<null>')
  await pipe(
    req.params.bookId,
    getParam,
    TE.fromEither,
    TE.chain((bookId: string) =>
      pipe(
        ordersCount(bookId),
        TE.chain((count1) =>
          pipe(
            deliveriesCount(bookId),
            TE.map((count2) => count2 - count1),
          ),
        ),
      ),
    ),
    TE.fold(replyToError(res, span), (x) =>
      T.of(res.status(200).json({ count: x })),
    ),
  )()
}

export {
  getBooksHttpHandler,
  getBookHttpHandler,
  addBookHttpHandler,
  bookAvailabilityHttpHandler,
}
