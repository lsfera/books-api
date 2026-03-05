import { Schema, Effect } from 'effect'
import { useActionState, useEffect } from 'react'
import { runClient } from '../services/RuntimeClient'
import ActionStatus from './ActionStatus'

export const SearchParams = Schema.Struct({
    title: Schema.optional(Schema.String),
    author: Schema.optional(Schema.String),
    isbn: Schema.optional(Schema.String)
})

export type SearchParams = typeof SearchParams.Type

const normalize = (value: FormDataEntryValue | null): string | undefined => {
    const stringValue = value?.toString().trim() ?? ''
    return stringValue.length > 0 ? stringValue : undefined
}

interface BookSearchProps {
    onSearch: (params: SearchParams) => void
}

export default function BookSearch({ onSearch }: BookSearchProps) {
    const [result, action, pending] = useActionState<
        { status: 'idle' | 'submitted'; params: SearchParams; submitId: number },
        globalThis.FormData
    >(
        async (previous, payload) =>
            runClient(
                Effect.sync(() => {
                    const params = {
                        title: normalize(payload.get('title')),
                        author: normalize(payload.get('author')),
                        isbn: normalize(payload.get('isbn'))
                    }

                    return {
                        status: 'submitted' as const,
                        params,
                        submitId: previous.submitId + 1
                    }
                })
            ),
        { status: 'idle', params: {}, submitId: 0 }
    )

    useEffect(() => {
        if (result.status === 'submitted' && result.submitId > 0) {
            onSearch(result.params)
        }
    }, [result.status, result.submitId, result.params, onSearch])

    return (
        <form action={action} className="form-section">
            <h2>Search Books</h2>
            <div className="form-row">
                <input
                    name="title"
                    type="text"
                    placeholder="Title"
                    disabled={pending}
                    className="input-control"
                />
                <input
                    name="author"
                    type="text"
                    placeholder="Author"
                    disabled={pending}
                    className="input-control"
                />
                <input
                    name="isbn"
                    type="text"
                    placeholder="ISBN"
                    disabled={pending}
                    className="input-control"
                />
                <button type="submit" disabled={pending}>{pending ? 'Searching...' : 'Search'}</button>
            </div>

            {result.status === 'submitted' && (
                <ActionStatus
                    status="success"
                    message="Filters updated."
                    className="status-margin-top"
                />
            )}
        </form>
    )
}
