import {
  addBookHttpHandler,
  getBooksHttpHandler,
} from '../src/routes/books/index.js'
import { genericError } from '../src/model.js'
import type { Request, Response } from 'express'
import type { Book } from '../src/routes/books/model.js'
import type { AppError } from '../src/model.js'
import { createSandbox, type SinonSandbox, type SinonStub, assert } from 'sinon'
import { BookModel, BookSchema } from '../src/routes/books/schema.js'
import type { InferSchemaType } from 'mongoose'
import { Query, Types } from 'mongoose'
import { mockReq, mockRes } from 'sinon-express-mock'
import * as TE from 'fp-ts/lib/TaskEither.js'
type TT = InferSchemaType<typeof BookSchema>

describe('get books', () => {
  type GetBooksRequest = Request<
    Record<string, never>,
    AppError | { books: Array<Book & { id: string }> }
  >
  type GetBooksResponse = Response<
    AppError | { books: Array<Book & { id: string }> }
  >

  let sandbox: SinonSandbox
  let mocked: SinonStub

  beforeEach(() => {
    sandbox = createSandbox()
    mocked = sandbox.stub(BookModel, 'find')
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('empty result', async () => {
    const req = mockReq() as mockReq.MockReq & GetBooksRequest
    const res = mockRes() as GetBooksResponse & mockRes.MockRes
    const result = {
      exec: () => new Promise<Array<TT> | null | undefined>((r) => r([])),
    } as Query<Array<TT>, TT>
    mocked.returns(result)
    await getBooksHttpHandler(req, res)
    assert.calledWith(res.status, 200)
  })

  it('null result', async () => {
    const req = mockReq() as mockReq.MockReq & GetBooksRequest
    const res = mockRes() as GetBooksResponse & mockRes.MockRes
    const result = {
      exec: () => new Promise<Array<TT> | null | undefined>((r) => r(null)),
    } as Query<Array<TT>, TT>
    mocked.returns(result)
    await getBooksHttpHandler(req, res)
    assert.calledWith(res.status, 404)
  })

  it('db call throwing error', async () => {
    const req = mockReq() as mockReq.MockReq & GetBooksRequest
    const res = mockRes() as GetBooksResponse & mockRes.MockRes
    mocked.throws('oh my')
    await getBooksHttpHandler(req, res)
    assert.calledWith(res.status, 500)
  })

  it('applies title/author/isbn filters to query', async () => {
    const req = mockReq({
      query: {
        title: 'Clean',
        author: 'Martin',
        isbn: '978013',
      },
    }) as mockReq.MockReq & GetBooksRequest
    const res = mockRes() as GetBooksResponse & mockRes.MockRes
    const result = {
      exec: () => new Promise<Array<TT> | null | undefined>((r) => r([])),
    } as Query<Array<TT>, TT>

    mocked.returns(result)

    await getBooksHttpHandler(req, res)

    assert.calledOnce(mocked)

    const query = mocked.firstCall.args[0] as {
      title?: { $regex: string; $options: string }
      isbn?: { $regex: string; $options: string }
      authors?: { $elemMatch?: { $regex: string; $options: string } }
    }

    assert.match(query.title, {
      $regex: 'Clean',
      $options: 'i',
    })
    assert.match(query.isbn, {
      $regex: '978013',
      $options: 'i',
    })
    assert.match(query.authors, {
      $elemMatch: {
        $regex: 'Martin',
        $options: 'i',
      },
    })
  })
})

describe('add book', () => {
  type AddBookRequest = Request<Record<string, never>, AppError>
  type AddBookResponse = Response<AppError>

  let sandbox: SinonSandbox
  let saveBookStub: SinonStub
  let statusStub: SinonStub
  let req: AddBookRequest
  let res: AddBookResponse

  beforeEach(() => {
    sandbox = createSandbox()
    saveBookStub = sandbox.stub()

    statusStub = sandbox.stub().returnsThis()

    req = {
      body: {},
    } as AddBookRequest

    res = {
      status: statusStub,
      json: sandbox.stub().returnsThis(),
      setHeader: sandbox.stub().returnsThis(),
      end: sandbox.stub().returnsThis(),
    } as unknown as AddBookResponse
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('empty body', async () => {
    await addBookHttpHandler({ saveBook: saveBookStub })(req, res)
    assert.calledWith(statusStub, 403)
  })

  it('missing title', async () => {
    const req = mockReq({
      body: {
        title: '',
        authors: ['Donald E. Knuth'],
        isbn: '0201038064',
        conditions: 'male',
        categories: ['programming', 'computer', 'science'],
      },
    }) as mockReq.MockReq & AddBookRequest
    const res = mockRes() as AddBookResponse & mockRes.MockRes
    await addBookHttpHandler({ saveBook: saveBookStub })(req, res)
    assert.calledWith(res.status, 403)
  })

  it('missing isbn', async () => {
    const req = mockReq({
      body: {
        title: 'The Art of Computer Programming',
        authors: ['Donald E. Knuth'],
        isbn: '',
        conditions: 'male',
        categories: ['programming', 'computer', 'science'],
      },
    }) as mockReq.MockReq & AddBookRequest
    const res = mockRes() as AddBookResponse & mockRes.MockRes
    await addBookHttpHandler({ saveBook: saveBookStub })(req, res)
    assert.calledWith(res.status, 403)
  })

  it('wrong condition', async () => {
    const req = mockReq({
      body: {
        title: 'The Art of Computer Programming',
        authors: ['Donald E. Knuth'],
        isbn: '0201038064',
        conditions: 'unknown',
        categories: ['programming', 'computer', 'science'],
      },
    }) as mockReq.MockReq & AddBookRequest
    const res = mockRes() as AddBookResponse & mockRes.MockRes
    await addBookHttpHandler({ saveBook: saveBookStub })(req, res)
    assert.calledWith(res.status, 403)
  })

  it('empty category', async () => {
    req.body = {
      title: 'Clean Code',
      isbn: '9780132350884',
      conditions: 'new',
      authors: ['Robert C. Martin'],
      categories: [''], // invalid on purpose
    }

    await addBookHttpHandler({ saveBook: saveBookStub })(req, res)
    assert.calledWithExactly(statusStub, 403)
  })

  it('right payload', async () => {
    req.body = {
      title: 'Clean Code',
      isbn: '9780132350884',
      conditions: 'new',
      authors: ['Robert C. Martin'],
      categories: ['software'],
    }

    saveBookStub.returns(TE.right(new Types.ObjectId()))
    await addBookHttpHandler({ saveBook: saveBookStub })(req, res)

    assert.calledWithExactly(statusStub, 201)
  })

  it('db call throwing error', async () => {
    req.body = {
      title: 'Clean Code',
      isbn: '9780132350884',
      conditions: 'new',
      authors: ['Robert C. Martin'],
      categories: ['software'],
    }

    saveBookStub.returns(TE.left(genericError('db error')))
    await addBookHttpHandler({ saveBook: saveBookStub })(req, res)

    assert.calledWithExactly(statusStub, 500)
  })
})
