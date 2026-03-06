import { HttpClient, HttpClientRequest } from '@effect/platform'
import { Effect, flow } from 'effect'

export const makeJsonHttpClient = (prefix = '/api') =>
    Effect.gen(function* () {
        const baseClient = yield* HttpClient.HttpClient

        return baseClient.pipe(
            HttpClient.mapRequest(
                flow(
                    HttpClientRequest.prependUrl(prefix),
                    HttpClientRequest.acceptJson
                )
            )
        )
    })
