import { useEffect, useState } from 'react'
import { Cause, Effect, Exit, Fiber } from 'effect'
import { CustomRuntime } from '../custom-runtime'

export interface UseQueryState<A, E> {
    data: A | null
    error: E | null
    loading: boolean
}

export function useQueryEffect<A, E = never>(
    effect: Effect.Effect<A, E>,
    deps: React.DependencyList = []
): UseQueryState<A, E> {
    const [state, setState] = useState<UseQueryState<A, E>>({
        data: null,
        error: null,
        loading: true
    })

    useEffect(() => {
        let cancelled = false
        setState({ data: null, error: null, loading: true })

        const fiber = CustomRuntime.runFork(effect)

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

export type UseEffectState<A, E> = UseQueryState<A, E>

export const useEffectResult = useQueryEffect
