import { useEffect, useState } from 'react'
import { Cause, Effect, Exit, Fiber } from 'effect'

export interface UseEffectState<A, E> {
    data: A | null
    error: E | null
    loading: boolean
}

export function useEffectResult<A, E = never>(
    effect: Effect.Effect<A, E>,
    deps: React.DependencyList = []
): UseEffectState<A, E> {
    const [state, setState] = useState<UseEffectState<A, E>>({
        data: null,
        error: null,
        loading: true
    })

    useEffect(() => {
        let cancelled = false
        setState({ data: null, error: null, loading: true })

        const fiber = Effect.runFork(effect)

        fiber.addObserver((exit) => {
            if (cancelled) {
                return
            }

            Exit.match(exit, {
                onSuccess: (value) => {
                    setState({ data: value, error: null, loading: false })
                },
                onFailure: (cause) => {
                    setState({ data: null, error: Cause.squash(cause) as E, loading: false })
                }
            })
        })

        return () => {
            cancelled = true
            Effect.runFork(Fiber.interrupt(fiber))
        }
    }, deps)

    return state
}
