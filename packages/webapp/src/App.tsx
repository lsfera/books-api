import { useCallback, useEffect, useState } from 'react'
import { Effect } from 'effect'
import BookList from './components/BookList'
import BookSearch, { type SearchParams } from './components/BookSearch'
import BookCreateForm from './components/BookCreateForm'
import InventoryActions from './components/InventoryActions'
import WebHookMessages from './components/WebHookMessages'
import ActionStatus from './components/ActionStatus'
import { registerWebHook } from './services/webhooksApi'
import { runClient } from './custom-runtime'

type AutoWebhookStatus = 'idle' | 'registered' | 'error'

function App() {
    const [searchParams, setSearchParams] = useState<SearchParams>({})
    const [autoWebhookStatus, setAutoWebhookStatus] = useState<AutoWebhookStatus>('idle')
    const [autoWebhookError, setAutoWebhookError] = useState<string | null>(null)

    const webhookUrl = import.meta.env.VITE_WEBHOOK_URL?.trim()

    const handleSearch = useCallback((params: SearchParams) => {
        setSearchParams({ ...params })
    }, [])

    const handleBooksDataChanged = useCallback(() => {
        setSearchParams((previous) => ({ ...previous }))
    }, [])

    useEffect(() => {
        if (!webhookUrl) {
            return
        }

        let cancelled = false

        void runClient(
            registerWebHook({ url: webhookUrl }).pipe(
                Effect.as<'registered'>('registered'),
                Effect.catchTag('ApiError', (error) =>
                    error.status === 403
                        ? Effect.succeed<'registered'>('registered')
                        : Effect.fail(error)
                ),
                Effect.catchTags({
                    NetworkError: () => Effect.succeed<'error'>('error'),
                    ApiError: () => Effect.succeed<'error'>('error'),
                    ParseError: () => Effect.succeed<'error'>('error')
                })
            )
        ).then((status) => {
            if (cancelled) {
                return
            }

            if (status === 'registered') {
                setAutoWebhookStatus('registered')
                setAutoWebhookError(null)
                return
            }

            setAutoWebhookStatus('error')
            setAutoWebhookError(`Unable to auto-register webhook URL: ${webhookUrl}`)
        })

        return () => {
            cancelled = true
        }
    }, [webhookUrl])

    return (
        <>
            <h1>Booksland</h1>

            <div className="card">
                {webhookUrl && autoWebhookStatus === 'registered' && (
                    <ActionStatus status="success" message={`App webhook registered: ${webhookUrl}`} className="status-margin-bottom" />
                )}
                {webhookUrl && autoWebhookStatus === 'error' && autoWebhookError && (
                    <ActionStatus status="error" title="Auto-registration failed" message={autoWebhookError} className="status-margin-bottom" />
                )}

                <WebHookMessages />
                <BookCreateForm onDataChanged={handleBooksDataChanged} />
                <InventoryActions onDataChanged={handleBooksDataChanged} />
                <BookSearch onSearch={handleSearch} />
                <BookList searchParams={searchParams} />
            </div>
        </>
    )
}

export default App
