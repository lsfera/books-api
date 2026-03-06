import { useState } from 'react'
import { Effect, ParseResult, Schema } from 'effect'
import ActionStatus from './ActionStatus'
import { formatApiClientError } from '../services/httpErrors'
import { PlaceOrderRequest, placeOrder, RecordDeliveryRequest, recordDelivery } from '../services/inventoryApi'
import { useActionEffect } from '../hooks/useActionEffect'

type ActionSuccess = { message: string }
type ActionError = { message: string; fieldErrors?: Record<string, string> }

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

    const [{ error: orderError, data: orderData }, orderAction, orderPending] = useActionEffect<
        globalThis.FormData,
        ActionSuccess,
        ActionError
    >(
        (payload) =>
            Effect.gen(function* () {
                const purchaser = payload.get('purchaser')?.toString().trim() ?? ''
                const bookIds = parseBookIds(payload.get('orderBookIds'))

                const request = yield* decodePlaceOrderRequest({ purchaser, bookIds }).pipe(
                    Effect.mapError((parseError) => {
                        const validation = toValidationError(parseError)
                        return {
                            message: validation.message,
                            fieldErrors: {
                                purchaser: validation.fieldErrors.purchaser,
                                orderBookIds: validation.fieldErrors.bookIds
                            }
                        }
                    })
                )

                return yield* placeOrder(request).pipe(
                    Effect.tap(() => Effect.sync(() => onDataChanged())),
                    Effect.as({ message: 'Order placed successfully!' }),
                    Effect.mapError((placeOrderError) => ({
                        message: formatApiClientError(placeOrderError, 'place an order')
                    }))
                )
            })
    )

    const [{ error: deliveryError, data: deliveryData }, deliveryAction, deliveryPending] = useActionEffect<
        globalThis.FormData,
        ActionSuccess,
        ActionError
    >(
        (payload) =>
            Effect.gen(function* () {
                const supplier = payload.get('supplier')?.toString().trim() ?? ''
                const bookIds = parseBookIds(payload.get('deliveryBookIds'))

                const request = yield* decodeRecordDeliveryRequest({ supplier, bookIds }).pipe(
                    Effect.mapError((parseError) => {
                        const validation = toValidationError(parseError)
                        return {
                            message: validation.message,
                            fieldErrors: {
                                supplier: validation.fieldErrors.supplier,
                                deliveryBookIds: validation.fieldErrors.bookIds
                            }
                        }
                    })
                )

                return yield* recordDelivery(request).pipe(
                    Effect.tap(() => Effect.sync(() => onDataChanged())),
                    Effect.as({ message: 'Delivery recorded successfully!' }),
                    Effect.mapError((recordDeliveryError) => ({
                        message: formatApiClientError(recordDeliveryError, 'record a delivery')
                    }))
                )
            })
    )

    const showOrderInlineErrors = !!orderError?.fieldErrors && !orderEditedSinceSubmit
    const showDeliveryInlineErrors = !!deliveryError?.fieldErrors && !deliveryEditedSinceSubmit

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
                    {showOrderInlineErrors && orderError.fieldErrors?.purchaser && <div className="error">{orderError.fieldErrors.purchaser}</div>}
                    <input
                        name="orderBookIds"
                        type="text"
                        placeholder="Book IDs (comma-separated)"
                        required
                        disabled={orderPending}
                        className="input-control input-control--xwide"
                    />
                    {showOrderInlineErrors && orderError.fieldErrors?.orderBookIds && <div className="error">{orderError.fieldErrors.orderBookIds}</div>}
                    <button type="submit" disabled={orderPending}>{orderPending ? 'Placing...' : 'Place Order'}</button>
                </div>
                {orderData && <ActionStatus status="success" message={orderData.message} />}
                {orderError && <ActionStatus status="error" title="Order Failed" message={orderError.message} className="status-margin-top" />}
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
                    {showDeliveryInlineErrors && deliveryError.fieldErrors?.supplier && <div className="error">{deliveryError.fieldErrors.supplier}</div>}
                    <input
                        name="deliveryBookIds"
                        type="text"
                        placeholder="Book IDs (comma-separated)"
                        required
                        disabled={deliveryPending}
                        className="input-control input-control--xwide"
                    />
                    {showDeliveryInlineErrors && deliveryError.fieldErrors?.deliveryBookIds && <div className="error">{deliveryError.fieldErrors.deliveryBookIds}</div>}
                    <button type="submit" disabled={deliveryPending}>{deliveryPending ? 'Recording...' : 'Record Delivery'}</button>
                </div>
                {deliveryData && <ActionStatus status="success" message={deliveryData.message} />}
                {deliveryError && <ActionStatus status="error" title="Delivery Failed" message={deliveryError.message} className="status-margin-top" />}
            </form>
        </>
    )
}
