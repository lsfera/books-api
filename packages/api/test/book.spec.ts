import { getBookHttpHandler } from '../src/routes/books/index.js'
import type { Request, Response } from 'express'
import type { Book } from '../src/routes/books/model.js'
import type { AppError } from '../src/model.js'
import type { SinonSandbox, SinonStub } from 'sinon'
import { createSandbox, assert as verify } from 'sinon'
import { BookModel, BookSchema } from '../src/routes/books/schema.js'
import type { InferSchemaType } from 'mongoose'
import { Query } from 'mongoose'
import { mockReq, mockRes } from 'sinon-express-mock'
type TT = InferSchemaType<typeof BookSchema>

describe('get book', () => {
  type GetBookRequest = Request<
    { bookId?: string },
    AppError | (Book & { id: string })
  >
  type GetBookResponse = Response<AppError | (Book & { id: string })>

  let sandbox: SinonSandbox
  let mocked: SinonStub

  beforeEach(() => {
    sandbox = createSandbox()
    mocked = sandbox.stub(BookModel, 'findById')
  })
  afterEach(() => {
    sandbox.restore()
  })

  it('null result', async () => {
    const req = mockReq({ params: { bookId: 'abc' } }) as mockReq.MockReq &
      GetBookRequest
    const res = mockRes() as GetBookResponse & mockRes.MockRes
    const result = {
      exec: () => new Promise<Array<TT> | null | undefined>((r) => r(null)),
    } as Query<Array<TT>, TT>
    mocked.returns(result)
    await getBookHttpHandler(req, res)
    verify.calledWith(res.status, 404)
  })

  it('db call throwing error', async () => {
    const req = mockReq({ params: { bookId: 'abc' } }) as mockReq.MockReq &
      GetBookRequest
    const res = mockRes() as GetBookResponse & mockRes.MockRes
    mocked.throws('oh my')
    await getBookHttpHandler(req, res)
    verify.calledWith(res.status, 500)
  })
})
