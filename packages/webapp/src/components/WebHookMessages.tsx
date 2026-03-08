import { useEffect, useState } from 'react'
import { Effect } from 'effect'
import { useQueryEffect } from '../hooks/useQueryEffect'
import {
    findWebHookMessages,
    WebHookMessage,
    WebHooksApiServiceLive,
} from '../services/webhooksApi'
import { formatApiClientError } from '../services/httpErrors'

export default function WebHookMessages() {
    const [messages, setMessages] = useState<Array<WebHookMessage>>([])
    const [streamError, setStreamError] = useState<string | null>(null)

    const { data: initialMessages, error, loading } = useQueryEffect(
        findWebHookMessages().pipe(
            Effect.provide(WebHooksApiServiceLive),
            Effect.mapError((cause) => formatApiClientError(cause, 'load webhook messages'))
        ),
        []
    )

    useEffect(() => {
        if (initialMessages) {
            setMessages([...initialMessages])
        }
    }, [initialMessages])

    useEffect(() => {
        const source = new EventSource('/api/webhook-messages/stream')

        source.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data) as WebHookMessage
                setMessages((current) => [parsed, ...current].slice(0, 100))
                setStreamError(null)
            } catch {
                setStreamError('Could not parse incoming webhook stream message.')
            }
        }

        source.onerror = () => {
            setStreamError('Live updates are temporarily unavailable. Retrying...')
        }

        return () => {
            source.close()
        }
    }, [])

    return (
        <div className="webhook-messages">
            <div className="webhook-messages-header">
                <h2 className="webhook-messages-title">Webhook Messages</h2>
            </div>

            {loading && <div className="loading top-spacing">Loading messages...</div>}

            {error && (
                <div className="error top-spacing">
                    <h3>Error loading webhook messages</h3>
                    <p>{String(error)}</p>
                </div>
            )}

            {!error && streamError && <div className="top-spacing">{streamError}</div>}

            {!loading && !error && messages.length === 0 && (
                <div className="top-spacing">No webhook messages received yet.</div>
            )}

            {!loading && !error && messages.length > 0 && (
                <div className="webhook-messages-list">
                    {messages.map((message, index) => (
                        <div key={`${message.receivedAt}-${index}`} className="book-card">
                            <p><strong>Type:</strong> {message.type}</p>
                            <p><strong>Book ID:</strong> {message.book.id}</p>
                            <p><strong>Book URL:</strong> {message.book.url}</p>
                            <p><strong>Received At:</strong> {new Date(message.receivedAt).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
