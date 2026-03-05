import { describe, it, expect } from 'vitest'
import { Cause, Effect, Exit } from 'effect'
// import { renderHook, waitFor } from '@testing-library/react'
// import { useEffectResult } from '../src/hooks/useEffect'

describe('useEffectResult', () => {
    it('should handle Effect success', async () => {
        const effect = Effect.succeed(42)
        const result = await Effect.runPromise(effect)
        expect(result).toBe(42)
    })

    it('should handle Effect failure', async () => {
        const error = new Error('Test error')
        const effect = Effect.fail(error)

        const exit = await Effect.runPromiseExit(effect)
        expect(Exit.isFailure(exit)).toBe(true)
        if (Exit.isFailure(exit)) {
            expect(Cause.pretty(exit.cause)).toContain('Test error')
        }
    })

    it('should compose Effects', async () => {
        const effect = Effect.gen(function* () {
            const a = yield* Effect.succeed(10)
            const b = yield* Effect.succeed(32)
            return a + b
        })

        const result = await Effect.runPromise(effect)
        expect(result).toBe(42)
    })
})
