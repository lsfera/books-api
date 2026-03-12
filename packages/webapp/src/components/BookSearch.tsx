import { Schema, Effect } from 'effect'
import { useEffect, useRef } from 'react'
import ActionStatus from './ActionStatus'
import { useActionEffect } from '../hooks/useActionEffect'

export const SearchParams = Schema.Struct({
    title: Schema.OptionFromNonEmptyTrimmedString,
    author: Schema.OptionFromNonEmptyTrimmedString,
    isbn: Schema.OptionFromNonEmptyTrimmedString
})

export type SearchParams = typeof SearchParams.Type

interface BookSearchProps {
    onSearch: (params: SearchParams) => void
}

export default function BookSearch({ onSearch }: BookSearchProps) {
    const submitCounter = useRef(0)

    const [{ data }, action, pending] = useActionEffect<
        globalThis.FormData,
        { params: SearchParams; submitId: number },
        never
    >(
        (payload) =>
            Effect.sync(() => {
                const params = Schema.decodeUnknownSync(SearchParams)({
                    title: payload.get('title'),
                    author: payload.get('author'),
                    isbn: payload.get('isbn')
                })
                submitCounter.current += 1

                return {
                    params,
                    submitId: submitCounter.current
                }
            })
    )

    useEffect(() => {
        if (data && data.submitId > 0) {
            onSearch(data.params)
        }
    }, [data, onSearch])

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

            {data && (
                <ActionStatus
                    status="success"
                    message="Filters updated."
                    className="status-margin-top"
                />
            )}
        </form>
    )
}
