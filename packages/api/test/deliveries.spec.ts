import { recordDeliveryHttpHandler } from '../src/routes/deliveries/index.js'
import type { Request, Response } from 'express'
import { createSandbox, assert, type SinonSandbox, type SinonStub } from 'sinon'
import { Types } from 'mongoose'
import { mockReq, mockRes } from 'sinon-express-mock'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type { AppError } from '../src/model.js'

describe('record delivery', () => {
  type RecordDeliveryRequest = Request<Record<string, never>, AppError | void>
  type RecordDeliveryResponse = Response<AppError | void>

  let sandbox: SinonSandbox
  let recordDeliveryStub: SinonStub
  let req: RecordDeliveryRequest
  let res: RecordDeliveryResponse

  beforeEach(() => {
    sandbox = createSandbox()
    recordDeliveryStub = sandbox.stub()

    req = { body: {} } as RecordDeliveryRequest
    res = {
      status: sandbox.stub().returnsThis(),
      json: sandbox.stub().returnsThis(),
      setHeader: sandbox.stub().returnsThis(),
      end: sandbox.stub().returnsThis(),
    } as unknown as RecordDeliveryResponse
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('empty body', async () => {
    await recordDeliveryHttpHandler({ recordDelivery: recordDeliveryStub })(
      req,
      res,
    )
    assert.calledWith(res.status as SinonStub, 403)
  })

  it('missing supplier', async () => {
    const req = mockReq({
      body: {
        supplier: '',
        bookIds: ['ABC'],
      },
    }) as mockReq.MockReq & RecordDeliveryRequest
    const res = mockRes() as RecordDeliveryResponse & mockRes.MockRes
    await recordDeliveryHttpHandler({ recordDelivery: recordDeliveryStub })(
      req,
      res,
    )
    assert.calledWith(res.status as SinonStub, 403)
  })

  it('empty bookIds', async () => {
    const req = mockReq({
      body: {
        supplier: 'someone',
        bookIds: [''],
      },
    }) as mockReq.MockReq & RecordDeliveryRequest
    const res = mockRes() as RecordDeliveryResponse & mockRes.MockRes
    await recordDeliveryHttpHandler({ recordDelivery: recordDeliveryStub })(
      req,
      res,
    )
    assert.calledWith(res.status as SinonStub, 403)
  })

  it('right payload', async () => {
    const req = mockReq({
      body: {
        supplier: 'someone',
        bookIds: ['ABC'],
      },
    }) as mockReq.MockReq & RecordDeliveryRequest
    const res = mockRes() as RecordDeliveryResponse & mockRes.MockRes
    res.setHeader = (): RecordDeliveryResponse & mockRes.MockRes => {
      return res
    } // HACK (https://github.com/danawoodman/sinon-express-mock/pull/23)
    recordDeliveryStub.returns(
      TE.right<AppError, Types.ObjectId>(new Types.ObjectId()),
    )
    await recordDeliveryHttpHandler({ recordDelivery: recordDeliveryStub })(
      req,
      res,
    )
    assert.calledWith(res.status as SinonStub, 201)
  })
})
