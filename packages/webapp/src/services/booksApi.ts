import {
    FetchHttpClient,
    Headers,
    HttpClientRequest,
    HttpClientResponse
} from '@effect/platform'
import { Effect, Option } from 'effect'
import { Schema } from 'effect'
import { makeJsonHttpClient } from './httpClient'
import { ApiError, mapHttpClientError, NetworkError, ParseError } from './httpErrors'

// Book schema matching the API
export const BookCondition = Schema.Literal('used', 'new', 'like new', 'good')

export const Book = Schema.Struct({
    id: Schema.String,
    title: Schema.String,
    isbn: Schema.String,
    conditions: BookCondition,
    authors: Schema.Array(Schema.String),
    categories: Schema.Array(Schema.String)
})

export const CreateBookRequest = Schema.Struct({
    title: Schema.String.pipe(Schema.trimmed(), Schema.minLength(1)),
    isbn: Schema.String.pipe(Schema.trimmed(), Schema.minLength(1)),
    conditions: BookCondition,
    authors: Schema.Array(Schema.String.pipe(Schema.trimmed(), Schema.minLength(1))).pipe(Schema.minItems(1)),
    categories: Schema.Array(Schema.String.pipe(Schema.trimmed(), Schema.minLength(1))).pipe(Schema.minItems(1))
})

const FindBooksResponse = Schema.Struct({
    books: Schema.Array(Book)
})

export type Book = typeof Book.Type
export type CreateBookRequest = typeof CreateBookRequest.Type

const getPathFromLocation = (location: string): string => {
    return URL.canParse(location, 'http://localhost')
        ? new URL(location, 'http://localhost').pathname
        : location
}

export class BooksApiService extends Effect.Service<BooksApiService>()('BooksApiService', {
    accessors: true,
    dependencies: [FetchHttpClient.layer],
    effect: Effect.gen(function* () {
        const client = yield* makeJsonHttpClient()

        const findBooks = Effect.fn('BooksApiService.findBooks')(function* (params: {
            title?: string
            author?: string
            isbn?: string
        } = {}) {
            const queryParams = new URLSearchParams()
            if (params.title) queryParams.set('title', params.title)
            if (params.author) queryParams.set('author', params.author)
            if (params.isbn) queryParams.set('isbn', params.isbn)

            const path = `/books${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

            return yield* client
                .get(path)
                .pipe(
                    Effect.flatMap(HttpClientResponse.filterStatusOk),
                    Effect.flatMap(HttpClientResponse.schemaBodyJson(FindBooksResponse)),
                    Effect.map((payload) => payload.books),
                    Effect.mapError(mapHttpClientError)
                )
        })

        const findBook = Effect.fn('BooksApiService.findBook')(function* (id: string) {
            return yield* client
                .get(`/books/${id}`)
                .pipe(
                    Effect.flatMap(HttpClientResponse.filterStatusOk),
                    Effect.flatMap(HttpClientResponse.schemaBodyJson(Book)),
                    Effect.mapError(mapHttpClientError)
                )
        })

        const saveBook = Effect.fn('BooksApiService.saveBook')(function* (book: CreateBookRequest) {
            const createdResponse = yield* client
                .execute(
                    HttpClientRequest
                        .post('/books')
                        .pipe(HttpClientRequest.bodyUnsafeJson(book))
                )
                .pipe(
                    Effect.flatMap(HttpClientResponse.filterStatus((status) => status === 201)),
                    Effect.mapError(mapHttpClientError)
                )

            const location = Headers.get(createdResponse.headers, 'location')

            const locationPath = Option.getOrElse(location, () => '')
            if (!locationPath) {
                return yield* Effect.fail(
                    new ApiError({
                        status: createdResponse.status,
                        message: 'Book created but Location header is missing'
                    })
                )
            }

            return yield* client
                .get(getPathFromLocation(locationPath))
                .pipe(
                    Effect.flatMap(HttpClientResponse.filterStatusOk),
                    Effect.flatMap(HttpClientResponse.schemaBodyJson(Book)),
                    Effect.mapError(mapHttpClientError)
                )
        })

        return {
            findBooks,
            findBook,
            saveBook
        }
    })
}) { }

export const findBooks = BooksApiService.findBooks
export const findBook = BooksApiService.findBook
export const saveBook = BooksApiService.saveBook

export const BooksApiServiceLive = BooksApiService.Default

export { NetworkError, ApiError, ParseError }
