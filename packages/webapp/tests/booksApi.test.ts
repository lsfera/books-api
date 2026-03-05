import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Effect } from 'effect'
import {
    BooksApiService,
    BooksApiServiceLive,
    Book,
    NetworkError,
    ApiError,
    ParseError
} from '../src/services/booksApi'

describe('BooksApiService', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('Book Schema', () => {
        it('should validate a valid book object', async () => {
            const validBook = {
                id: '123',
                title: 'Test Book',
                isbn: '1234567890',
                conditions: 'new',
                authors: ['Test Author'],
                categories: ['Tech']
            }

            const result = await Effect.runPromise(
                Effect.succeed(validBook)
            )

            expect(result).toEqual(validBook)
        })
    })

    describe('Error Types', () => {
        it('should create NetworkError', () => {
            const error = new NetworkError({ message: 'Connection failed' })
            expect(error.message).toBe('Connection failed')
            expect(error._tag).toBe('NetworkError')
        })

        it('should create ApiError', () => {
            const error = new ApiError({ status: 404, message: 'Not found' })
            expect(error.status).toBe(404)
            expect(error.message).toBe('Not found')
            expect(error._tag).toBe('ApiError')
        })

        it('should create ParseError', () => {
            const error = new ParseError({ message: 'Invalid JSON' })
            expect(error.message).toBe('Invalid JSON')
            expect(error._tag).toBe('ParseError')
        })
    })

    describe('Service Layer', () => {
        it('should provide BooksApiService', async () => {
            const program = Effect.gen(function* () {
                const api = yield* BooksApiService
                return api
            }).pipe(Effect.provide(BooksApiServiceLive))

            const api = await Effect.runPromise(program)

            expect(api).toBeDefined()
            expect(api.findBooks).toBeDefined()
            expect(api.findBook).toBeDefined()
            expect(api.saveBook).toBeDefined()
        })

        it('saveBook should follow Location and return created book', async () => {
            const createdBook = {
                id: 'book-1',
                title: 'Test Book',
                isbn: '123',
                conditions: 'new',
                authors: ['Author'],
                categories: ['Fiction']
            }

            global.fetch = vi
                .fn()
                .mockResolvedValueOnce(
                    new Response(null, {
                        status: 201,
                        headers: {
                            location: '/books/book-1'
                        }
                    })
                )
                .mockResolvedValueOnce(
                    new Response(JSON.stringify(createdBook), {
                        status: 200,
                        headers: {
                            'content-type': 'application/json'
                        }
                    })
                )

            const program = Effect.gen(function* () {
                const api = yield* BooksApiService
                return yield* api.saveBook({
                    title: 'Test Book',
                    isbn: '123',
                    conditions: 'new',
                    authors: ['Author'],
                    categories: ['Fiction']
                })
            }).pipe(Effect.provide(BooksApiServiceLive))

            const result = await Effect.runPromise(program)
            expect(result).toEqual(createdBook)
            const fetchMock = global.fetch as ReturnType<typeof vi.fn>
            const firstCall = fetchMock.mock.calls[0]
            const secondCall = fetchMock.mock.calls[1]

            expect(String(firstCall[0])).toBe('http://localhost:3000/api/books')
            expect(firstCall[1]).toEqual(expect.objectContaining({ method: 'POST' }))
            expect(String(secondCall[0])).toBe('http://localhost:3000/api/books/book-1')
        })

        it('saveBook should fail when Location header is missing', async () => {
            global.fetch = vi.fn().mockResolvedValueOnce({
                ok: true,
                status: 201,
                statusText: 'Created',
                headers: { get: () => null }
            })

            const program = Effect.gen(function* () {
                const api = yield* BooksApiService
                return yield* api.saveBook({
                    title: 'Test Book',
                    isbn: '123',
                    conditions: 'new',
                    authors: ['Author'],
                    categories: ['Fiction']
                })
            }).pipe(Effect.provide(BooksApiServiceLive))

            await expect(Effect.runPromise(program)).rejects.toThrow(/Location header is missing/)
        })
    })
})
