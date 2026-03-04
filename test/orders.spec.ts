import { placeOrderHttpHandler } from '../src/routes/orders/index.js'
import type { Request, Response } from 'express'
import type { AppError } from '../src/model.js'
import type { SinonSandbox, SinonStub } from 'sinon'
import { createSandbox, assert } from 'sinon'
import { Types } from 'mongoose'
import { mockReq, mockRes } from 'sinon-express-mock'
import * as TE from 'fp-ts/lib/TaskEither.js'

describe('record order', () => {
  type RecordOrderRequest = Request<
    Record<string, never>,
    AppError | void,
    unknown
  >
  type RecordOrderResponse = Response<AppError | void>

  let sandbox: SinonSandbox
  let placeOrderStub: SinonStub

  beforeEach(() => {
    sandbox = createSandbox()
    placeOrderStub = sandbox.stub()
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('empty body', async () => {
    const req = mockReq({
      body: {},
    }) as mockReq.MockReq & RecordOrderRequest
    const res = mockRes() as RecordOrderResponse & mockRes.MockRes
    await placeOrderHttpHandler({ placeOrder: placeOrderStub })(req, res)
    assert.calledWith(res.status as SinonStub, 403)
  })

  it('missing purchaser', async () => {
    const req = mockReq({
      body: {
        purchaser: '',
        bookIds: ['ABC'],
      },
    }) as mockReq.MockReq & RecordOrderRequest
    const res = mockRes() as RecordOrderResponse & mockRes.MockRes
    await placeOrderHttpHandler({ placeOrder: placeOrderStub })(req, res)
    assert.calledWith(res.status as SinonStub, 403)
  })

  it('empty bookIds', async () => {
    const req = mockReq({
      body: {
        purchaser: 'someone',
        bookIds: [''],
      },
    }) as mockReq.MockReq & RecordOrderRequest
    const res = mockRes() as RecordOrderResponse & mockRes.MockRes
    await placeOrderHttpHandler({ placeOrder: placeOrderStub })(req, res)
    assert.calledWith(res.status as SinonStub, 403)
  })

  it('right payload', async () => {
    const req = mockReq({
      body: {
        purchaser: 'someone',
        bookIds: ['ABC'],
      },
    }) as mockReq.MockReq & RecordOrderRequest
    const res = mockRes() as RecordOrderResponse & mockRes.MockRes
    res.setHeader = (): RecordOrderResponse & mockRes.MockRes => {
      return res
    } // HACK (https://github.com/danawoodman/sinon-express-mock/pull/23)
    placeOrderStub.returns(
      TE.right<AppError, Types.ObjectId>(new Types.ObjectId()),
    )
    await placeOrderHttpHandler({ placeOrder: placeOrderStub })(req, res)
    assert.calledWith(res.status as SinonStub, 201)
  })
})
