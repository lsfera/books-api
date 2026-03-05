import { useActionState, useEffect, useState } from 'react'
import { registerWebHook, RegisterWebHookRequest } from '../services/webhooksApi'
import { runClient } from '../services/RuntimeClient'
import ActionStatus from './ActionStatus'
import { Effect, ParseResult, Schema } from 'effect'
import { formatApiClientError } from '../services/apiClient'

interface WebHookRegistrationProps {
    onRegistered?: () => void
}

export default function WebHookRegistration({ onRegistered }: WebHookRegistrationProps) {
    const [editedSinceLastSubmit, setEditedSinceLastSubmit] = useState(false)
    const decodeRegisterWebHookRequest = Schema.decodeUnknown(RegisterWebHookRequest)
    const toValidationError = (error: ParseResult.ParseError): { message: string; fieldErrors: Record<string, string> } => {
        const issues = ParseResult.ArrayFormatter.formatErrorSync(error)
        const firstMessage = issues[0]?.message
        const fieldErrors: Record<string, string> = {}

        for (const issue of issues) {
            const key = String(issue.path[issue.path.length - 1] ?? '')
            if (key && !fieldErrors[key]) {
                fieldErrors[key] = issue.message
            }
        }

        return {
            message: firstMessage ? `Validation error: ${firstMessage}` : 'Validation error: invalid webhook payload',
            fieldErrors
        }
    }

    const [result, action, pending] = useActionState<
        { status: 'idle' | 'success' | 'error'; message?: string; fieldErrors?: Record<string, string> },
        globalThis.FormData
    >(
        async (_, payload) =>
            runClient(
                Effect.gen(function* () {
                    return yield* decodeRegisterWebHookRequest({
                        url: payload.get('url')?.toString().trim() ?? ''
                    }).pipe(
                        Effect.flatMap((decodedRequest) =>
                            registerWebHook(decodedRequest).pipe(
                                Effect.map(() => ({ status: 'success' as const })),
                                Effect.catchTags({
                                    NetworkError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'register the webhook') }),
                                    ApiError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'register the webhook') }),
                                    ParseError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'register the webhook') })
                                })
                            )
                        ),
                        Effect.catchTag('ParseError', (error) => {
                            const validation = toValidationError(error)
                            return Effect.succeed({
                                status: 'error' as const,
                                message: validation.message,
                                fieldErrors: {
                                    url: validation.fieldErrors.url
                                }
                            })
                        })
                    )
                })
            ),
        { status: 'idle' }
    )

    useEffect(() => {
        if (result.status === 'success') {
            setEditedSinceLastSubmit(false)
            onRegistered?.()
        }
    }, [result.status, onRegistered])

    const showInlineErrors = result.status === 'error' && !!result.fieldErrors && !editedSinceLastSubmit

    return (
        <div className="webhook-registration">
            <h2>Register Webhook</h2>
            <p className="webhook-description">
                Register a webhook URL to receive notifications when books go out of stock.
                Your webhook will receive POST requests with book information.
            </p>

            <form
                action={action}
                onSubmitCapture={() => setEditedSinceLastSubmit(false)}
                onInputCapture={() => setEditedSinceLastSubmit(true)}
            >
                <div className="form-group">
                    <input
                        name="url"
                        type="url"
                        placeholder="https://your-webhook-url.com/notify"
                        required
                        disabled={pending}
                        className="input-control input-control--full"
                    />
                    {showInlineErrors && result.fieldErrors?.url && <div className="error">{result.fieldErrors.url}</div>}
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="top-spacing"
                >
                    {pending ? 'Registering...' : 'Register Webhook'}
                </button>
            </form>

            {result.status === 'success' && (
                <ActionStatus status="success" message="Webhook registered successfully!" />
            )}

            {result.status === 'error' && (
                <ActionStatus status="error" title="Registration Failed" message={result.message ?? 'Unknown error'} className="status-margin-top" />
            )}

            <div className="webhook-info">
                <h3>Webhook Payload Example</h3>
                <pre>
                    {`{
    "type": "out_of_stock",
  "book": {
    "id": "507f1f77bcf86cd799439011",
    "url": "http://localhost:3001/books/507f..."
  }
}`}
                </pre>
                <p className="webhook-info-note">
                    Your webhook endpoint should accept POST requests and return a 2xx status code.
                </p>
            </div>
        </div>
    )
}
