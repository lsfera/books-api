import { useActionState, useState } from 'react'
import { Effect, ParseResult, Schema } from 'effect'
import ActionStatus from './ActionStatus'
import { formatApiClientError } from '../services/apiClient'
import { PlaceOrderRequest, placeOrder, RecordDeliveryRequest, recordDelivery } from '../services/inventoryApi'
import { runClient } from '../services/RuntimeClient'

type ActionResult =
    | { status: 'idle' }
    | { status: 'success'; message: string }
    | { status: 'error'; message: string; fieldErrors?: Record<string, string> }

interface InventoryActionsProps {
    onDataChanged: () => void
}

const parseBookIds = (value: FormDataEntryValue | null): string[] =>
    value
        ?.toString()
        .split(',')
        .map((bookId) => bookId.trim())
        .filter((bookId) => bookId.length > 0) ?? []

const decodePlaceOrderRequest = Schema.decodeUnknown(PlaceOrderRequest)
const decodeRecordDeliveryRequest = Schema.decodeUnknown(RecordDeliveryRequest)

const toValidationError = (error: ParseResult.ParseError): { message: string; fieldErrors: Record<string, string> } => {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(error)
    const firstMessage = issues[0]?.message
    const fieldErrors: Record<string, string> = {}

    for (const issue of issues) {
        const key = String(issue.path[issue.path.length - 1] ?? '')
        if (key && !fieldErrors[key]) {
            fieldErrors[key] = issue.message
        }
    }

    return {
        message: firstMessage ? `Validation error: ${firstMessage}` : 'Validation error: invalid payload',
        fieldErrors
    }
}

export default function InventoryActions({ onDataChanged }: InventoryActionsProps) {
    const [orderEditedSinceSubmit, setOrderEditedSinceSubmit] = useState(false)
    const [deliveryEditedSinceSubmit, setDeliveryEditedSinceSubmit] = useState(false)

    const [orderResult, orderAction, orderPending] = useActionState<ActionResult, globalThis.FormData>(
        async (_, payload) =>
            runClient(
                Effect.gen(function* () {
                    const purchaser = payload.get('purchaser')?.toString().trim() ?? ''
                    const bookIds = parseBookIds(payload.get('orderBookIds'))

                    return yield* decodePlaceOrderRequest({ purchaser, bookIds }).pipe(
                        Effect.flatMap((request) =>
                            placeOrder(request).pipe(
                                Effect.map(() => ({ status: 'success' as const, message: 'Order placed successfully!' })),
                                Effect.tap(() => Effect.sync(() => onDataChanged())),
                                Effect.catchTags({
                                    NetworkError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'place an order') }),
                                    ApiError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'place an order') }),
                                    ParseError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'place an order') })
                                })
                            )
                        ),
                        Effect.catchTag('ParseError', (error) => {
                            const validation = toValidationError(error)
                            return Effect.succeed({
                                status: 'error' as const,
                                message: validation.message,
                                fieldErrors: {
                                    purchaser: validation.fieldErrors.purchaser,
                                    orderBookIds: validation.fieldErrors.bookIds
                                }
                            })
                        })
                    )
                })
            ),
        { status: 'idle' }
    )

    const [deliveryResult, deliveryAction, deliveryPending] = useActionState<ActionResult, globalThis.FormData>(
        async (_, payload) =>
            runClient(
                Effect.gen(function* () {
                    const supplier = payload.get('supplier')?.toString().trim() ?? ''
                    const bookIds = parseBookIds(payload.get('deliveryBookIds'))

                    return yield* decodeRecordDeliveryRequest({ supplier, bookIds }).pipe(
                        Effect.flatMap((request) =>
                            recordDelivery(request).pipe(
                                Effect.map(() => ({ status: 'success' as const, message: 'Delivery recorded successfully!' })),
                                Effect.tap(() => Effect.sync(() => onDataChanged())),
                                Effect.catchTags({
                                    NetworkError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'record a delivery') }),
                                    ApiError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'record a delivery') }),
                                    ParseError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'record a delivery') })
                                })
                            )
                        ),
                        Effect.catchTag('ParseError', (error) => {
                            const validation = toValidationError(error)
                            return Effect.succeed({
                                status: 'error' as const,
                                message: validation.message,
                                fieldErrors: {
                                    supplier: validation.fieldErrors.supplier,
                                    deliveryBookIds: validation.fieldErrors.bookIds
                                }
                            })
                        })
                    )
                })
            ),
        { status: 'idle' }
    )

    const showOrderInlineErrors = orderResult.status === 'error' && !!orderResult.fieldErrors && !orderEditedSinceSubmit
    const showDeliveryInlineErrors = deliveryResult.status === 'error' && !!deliveryResult.fieldErrors && !deliveryEditedSinceSubmit

    return (
        <>
            <form
                action={orderAction}
                onSubmitCapture={() => setOrderEditedSinceSubmit(false)}
                onInputCapture={() => setOrderEditedSinceSubmit(true)}
                className="form-section"
            >
                <h2>Place Order</h2>
                <div className="form-row">
                    <input
                        name="purchaser"
                        type="text"
                        placeholder="Purchaser"
                        required
                        disabled={orderPending}
                        className="input-control"
                    />
                    {showOrderInlineErrors && orderResult.fieldErrors?.purchaser && <div className="error">{orderResult.fieldErrors.purchaser}</div>}
                    <input
                        name="orderBookIds"
                        type="text"
                        placeholder="Book IDs (comma-separated)"
                        required
                        disabled={orderPending}
                        className="input-control input-control--xwide"
                    />
                    {showOrderInlineErrors && orderResult.fieldErrors?.orderBookIds && <div className="error">{orderResult.fieldErrors.orderBookIds}</div>}
                    <button type="submit" disabled={orderPending}>{orderPending ? 'Placing...' : 'Place Order'}</button>
                </div>
                {orderResult.status === 'success' && <ActionStatus status="success" message={orderResult.message} />}
                {orderResult.status === 'error' && <ActionStatus status="error" title="Order Failed" message={orderResult.message} className="status-margin-top" />}
            </form>

            <form
                action={deliveryAction}
                onSubmitCapture={() => setDeliveryEditedSinceSubmit(false)}
                onInputCapture={() => setDeliveryEditedSinceSubmit(true)}
                className="form-section"
            >
                <h2>Record Delivery</h2>
                <div className="form-row">
                    <input
                        name="supplier"
                        type="text"
                        placeholder="Supplier"
                        required
                        disabled={deliveryPending}
                        className="input-control"
                    />
                    {showDeliveryInlineErrors && deliveryResult.fieldErrors?.supplier && <div className="error">{deliveryResult.fieldErrors.supplier}</div>}
                    <input
                        name="deliveryBookIds"
                        type="text"
                        placeholder="Book IDs (comma-separated)"
                        required
                        disabled={deliveryPending}
                        className="input-control input-control--xwide"
                    />
                    {showDeliveryInlineErrors && deliveryResult.fieldErrors?.deliveryBookIds && <div className="error">{deliveryResult.fieldErrors.deliveryBookIds}</div>}
                    <button type="submit" disabled={deliveryPending}>{deliveryPending ? 'Recording...' : 'Record Delivery'}</button>
                </div>
                {deliveryResult.status === 'success' && <ActionStatus status="success" message={deliveryResult.message} />}
                {deliveryResult.status === 'error' && <ActionStatus status="error" title="Delivery Failed" message={deliveryResult.message} className="status-margin-top" />}
            </form>
        </>
    )
}
