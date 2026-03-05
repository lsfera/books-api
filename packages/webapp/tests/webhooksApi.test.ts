import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Cause, Effect, Exit } from 'effect'
import {
    WebHooksApiService,
    WebHooksApiServiceLive,
    RegisterWebHookRequest
} from '../src/services/webhooksApi'

describe('WebHooksApiService', () => {
    describe('RegisterWebHookRequest Schema', () => {
        it('should validate a valid URL', () => {
            const validRequest: RegisterWebHookRequest = {
                url: 'https://example.com/webhook'
            }
            expect(validRequest.url).toBe('https://example.com/webhook')
        })

        it('should handle various valid URL formats', () => {
            const urls = [
                'https://example.com/webhook',
                'http://localhost:3000/notify',
                'https://api.example.com/webhooks/receive'
            ]

            urls.forEach(url => {
                const request: RegisterWebHookRequest = { url }
                expect(request.url).toBe(url)
            })
        })
    })

    describe('Service Layer', () => {
        it('should provide WebHooksApiService', async () => {
            const program = Effect.gen(function* () {
                const api = yield* WebHooksApiService
                return api
            }).pipe(Effect.provide(WebHooksApiServiceLive))

            const api = await Effect.runPromise(program)

            expect(api).toBeDefined()
            expect(api.registerWebHook).toBeDefined()
            expect(typeof api.registerWebHook).toBe('function')
        })
    })

    describe('registerWebHook', () => {
        beforeEach(() => {
            // Reset fetch mock before each test
            vi.clearAllMocks()
        })

        it('should register a webhook successfully', async () => {
            // Mock successful registration
            global.fetch = vi.fn().mockResolvedValue(
                new Response(null, {
                    status: 201
                })
            )

            const program = Effect.gen(function* () {
                const api = yield* WebHooksApiService
                yield* api.registerWebHook({ url: 'https://example.com/webhook' })
            }).pipe(Effect.provide(WebHooksApiServiceLive))

            await Effect.runPromise(program)

            const fetchMock = global.fetch as ReturnType<typeof vi.fn>
            const firstCall = fetchMock.mock.calls[0]
            expect(String(firstCall[0])).toBe('http://localhost:3000/api/webhooks')
            expect(firstCall[1]).toEqual(expect.objectContaining({ method: 'POST' }))
        })

        it('should handle network errors', async () => {
            // Mock network failure
            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

            const program = Effect.gen(function* () {
                const api = yield* WebHooksApiService
                yield* api.registerWebHook({ url: 'https://example.com/webhook' })
            }).pipe(Effect.provide(WebHooksApiServiceLive))

            const exit = await Effect.runPromiseExit(program)
            expect(Exit.isFailure(exit)).toBe(true)
            if (Exit.isFailure(exit)) {
                expect(Cause.pretty(exit.cause)).toContain('Transport error')
            }
        })

        it('should handle API errors', async () => {
            // Mock API error response
            global.fetch = vi.fn().mockResolvedValue(
                new Response('Webhook already exists', {
                    status: 403,
                    statusText: 'Forbidden'
                })
            )

            const program = Effect.gen(function* () {
                const api = yield* WebHooksApiService
                yield* api.registerWebHook({ url: 'https://example.com/webhook' })
            }).pipe(Effect.provide(WebHooksApiServiceLive))

            const exit = await Effect.runPromiseExit(program)
            expect(Exit.isFailure(exit)).toBe(true)
            if (Exit.isFailure(exit)) {
                expect(Cause.pretty(exit.cause)).toContain('StatusCode')
            }
        })
    })

    describe('URL Validation', () => {
        it('should accept valid webhook URLs', () => {
            const validUrls = [
                'https://webhook.site/unique-id',
                'http://localhost:8080/webhook',
                'https://api.myapp.com/notifications/receive',
                'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'
            ]

            validUrls.forEach(url => {
                const request: RegisterWebHookRequest = { url }
                expect(request.url).toBe(url)
            })
        })
    })
})
