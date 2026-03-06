import {
    FetchHttpClient,
    HttpClientRequest,
    HttpClientResponse
} from '@effect/platform'
import { Effect } from 'effect'
import { Schema } from 'effect'
import { makeJsonHttpClient } from './httpClient'
import { ApiError, mapHttpClientError, NetworkError, ParseError } from './httpErrors'

// Webhook schema
export const WebHook = Schema.Struct({
    _id: Schema.optional(Schema.String),
    url: Schema.String,
    createdAt: Schema.optional(Schema.String),
    updatedAt: Schema.optional(Schema.String)
})

export const WebHookMessage = Schema.Struct({
    type: Schema.String,
    book: Schema.Struct({
        id: Schema.String,
        url: Schema.String
    }),
    receivedAt: Schema.String
})

const FindWebHookMessagesResponse = Schema.Struct({
    messages: Schema.Array(WebHookMessage)
})

export type WebHook = typeof WebHook.Type
export type WebHookMessage = typeof WebHookMessage.Type

export const RegisterWebHookRequest = Schema.Struct({
    url: Schema.String.pipe(
        Schema.trimmed(),
        Schema.minLength(1),
        Schema.filter((url) => URL.canParse(url), { message: () => 'Must be a valid URL' })
    )
})

export type RegisterWebHookRequest = typeof RegisterWebHookRequest.Type

export class WebHooksApiService extends Effect.Service<WebHooksApiService>()('WebHooksApiService', {
    accessors: true,
    dependencies: [FetchHttpClient.layer],
    effect: Effect.gen(function* () {
        const client = yield* makeJsonHttpClient('/api')

        const registerWebHook = Effect.fn('WebHooksApiService.registerWebHook')(function* (request: RegisterWebHookRequest) {
            return yield* client
                .execute(
                    HttpClientRequest
                        .post('/webhooks')
                        .pipe(HttpClientRequest.bodyUnsafeJson(request))
                )
                .pipe(
                    Effect.flatMap(HttpClientResponse.filterStatus((status) => status === 201)),
                    Effect.asVoid,
                    Effect.mapError(mapHttpClientError)
                )
        })

        const findWebHookMessages = Effect.fn('WebHooksApiService.findWebHookMessages')(function* () {
            return yield* client
                .get('/webhook-messages')
                .pipe(
                    Effect.flatMap(HttpClientResponse.filterStatusOk),
                    Effect.flatMap(HttpClientResponse.schemaBodyJson(FindWebHookMessagesResponse)),
                    Effect.map((payload) => payload.messages),
                    Effect.mapError(mapHttpClientError)
                )
        })

        return {
            registerWebHook,
            findWebHookMessages
        }
    })
}) { }

export const registerWebHook = WebHooksApiService.registerWebHook
export const findWebHookMessages = WebHooksApiService.findWebHookMessages

export const WebHooksApiServiceLive = WebHooksApiService.Default

export { NetworkError, ApiError, ParseError }
