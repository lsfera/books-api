import { useState } from 'react'
import { Effect } from 'effect'
import { useEffectResult } from '../hooks/useEffect'
import { findWebHookMessages, WebHooksApiServiceLive } from '../services/webhooksApi'
import { formatApiClientError } from '../services/apiClient'

export default function WebHookMessages() {
    const [refreshToken, setRefreshToken] = useState(0)

    const { data: messages, error, loading } = useEffectResult(
        findWebHookMessages().pipe(
            Effect.provide(WebHooksApiServiceLive),
            Effect.mapError((cause) => formatApiClientError(cause, 'load webhook messages'))
        ),
        [refreshToken]
    )

    return (
        <div className="webhook-messages">
            <div className="webhook-messages-header">
                <h2 className="webhook-messages-title">Webhook Messages</h2>
                <button onClick={() => setRefreshToken((value) => value + 1)} disabled={loading}>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {loading && <div className="loading top-spacing">Loading messages...</div>}

            {error && (
                <div className="error top-spacing">
                    <h3>Error loading webhook messages</h3>
                    <p>{String(error)}</p>
                </div>
            )}

            {!loading && !error && (!messages || messages.length === 0) && (
                <div className="top-spacing">No webhook messages received yet.</div>
            )}

            {!loading && !error && messages && messages.length > 0 && (
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
