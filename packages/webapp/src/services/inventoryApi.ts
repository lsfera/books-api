import {
    FetchHttpClient,
    HttpClientRequest,
    HttpClientResponse
} from '@effect/platform'
import { Effect } from 'effect'
import { Schema } from 'effect'
import { ApiError, mapHttpClientError, makeApiClient, NetworkError, ParseError } from './apiClient'

export const PlaceOrderRequest = Schema.Struct({
    purchaser: Schema.String.pipe(Schema.trimmed(), Schema.minLength(1)),
    bookIds: Schema.Array(Schema.String.pipe(Schema.trimmed(), Schema.minLength(1))).pipe(Schema.minItems(1))
})

export type PlaceOrderRequest = typeof PlaceOrderRequest.Type

export const RecordDeliveryRequest = Schema.Struct({
    supplier: Schema.String.pipe(Schema.trimmed(), Schema.minLength(1)),
    bookIds: Schema.Array(Schema.String.pipe(Schema.trimmed(), Schema.minLength(1))).pipe(Schema.minItems(1))
})

export type RecordDeliveryRequest = typeof RecordDeliveryRequest.Type

export class InventoryApiService extends Effect.Service<InventoryApiService>()('InventoryApiService', {
    accessors: true,
    dependencies: [FetchHttpClient.layer],
    effect: Effect.gen(function* () {
        const client = yield* makeApiClient('/api')

        const placeOrder = Effect.fn('InventoryApiService.placeOrder')(function* (request: PlaceOrderRequest) {
            return yield* client
                .execute(
                    HttpClientRequest
                        .post('/orders')
                        .pipe(HttpClientRequest.bodyUnsafeJson(request))
                )
                .pipe(
                    Effect.flatMap(HttpClientResponse.filterStatus((status) => status === 201)),
                    Effect.asVoid,
                    Effect.mapError(mapHttpClientError)
                )
        })

        const recordDelivery = Effect.fn('InventoryApiService.recordDelivery')(function* (request: RecordDeliveryRequest) {
            return yield* client
                .execute(
                    HttpClientRequest
                        .post('/deliveries')
                        .pipe(HttpClientRequest.bodyUnsafeJson(request))
                )
                .pipe(
                    Effect.flatMap(HttpClientResponse.filterStatus((status) => status === 201)),
                    Effect.asVoid,
                    Effect.mapError(mapHttpClientError)
                )
        })

        return {
            placeOrder,
            recordDelivery
        }
    })
}) { }

export const placeOrder = InventoryApiService.placeOrder
export const recordDelivery = InventoryApiService.recordDelivery

export const InventoryApiServiceLive = InventoryApiService.Default

export { NetworkError, ApiError, ParseError }
