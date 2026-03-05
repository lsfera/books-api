import { useEffect, useState } from 'react'
import { registerWebHook, RegisterWebHookRequest } from '../services/webhooksApi'
import ActionStatus from './ActionStatus'
import { Effect, ParseResult, Schema } from 'effect'
import { formatApiClientError } from '../services/httpErrors'
import { useActionEffect } from '../hooks/useActionEffect'

type RegistrationError = { message: string; fieldErrors?: Record<string, string> }

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

    const [{ error, data }, action, pending] = useActionEffect<globalThis.FormData, { status: 'success' }, RegistrationError>(
        (payload) =>
            Effect.gen(function* () {
                const decodedRequest = yield* decodeRegisterWebHookRequest({
                    url: payload.get('url')?.toString().trim() ?? ''
                }).pipe(
                    Effect.mapError((parseError) => {
                        const validation = toValidationError(parseError)
                        return {
                            message: validation.message,
                            fieldErrors: {
                                url: validation.fieldErrors.url
                            }
                        }
                    })
                )

                return yield* registerWebHook(decodedRequest).pipe(
                    Effect.as({ status: 'success' as const }),
                    Effect.mapError((registrationError) => ({
                        message: formatApiClientError(registrationError, 'register the webhook')
                    }))
                )
            })
    )

    useEffect(() => {
        if (data?.status === 'success') {
            setEditedSinceLastSubmit(false)
            onRegistered?.()
        }
    }, [data, onRegistered])

    const showInlineErrors = !!error?.fieldErrors && !editedSinceLastSubmit

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
                    {showInlineErrors && error.fieldErrors?.url && <div className="error">{error.fieldErrors.url}</div>}
                </div>

                <button
                    type="submit"
                    disabled={pending}
                    className="top-spacing"
                >
                    {pending ? 'Registering...' : 'Register Webhook'}
                </button>
            </form>

            {data?.status === 'success' && (
                <ActionStatus status="success" message="Webhook registered successfully!" />
            )}

            {error && (
                <ActionStatus status="error" title="Registration Failed" message={error.message ?? 'Unknown error'} className="status-margin-top" />
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
