import { Effect, type ManagedRuntime } from 'effect'
import { useActionState } from 'react'
import { CustomRuntime } from '../custom-runtime'

type RuntimeContext = ManagedRuntime.ManagedRuntime.Context<typeof CustomRuntime>

type ActionState<A, E> =
    | { error: E; data: null }
    | { error: null; data: A }
    | { error: null; data: null }

export const useActionEffect = <Payload, A, E>(
    effect: (payload: Payload) => Effect.Effect<A, E, RuntimeContext>
) => {
    return useActionState<ActionState<A, E>, Payload>(
        (_, payload) =>
            CustomRuntime.runPromise(
                effect(payload).pipe(
                    Effect.match({
                        onFailure: (error) => ({ error, data: null }),
                        onSuccess: (data) => ({ error: null, data })
                    })
                )
            ),
        { error: null, data: null }
    )
}
