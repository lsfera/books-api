import { useActionState, useEffect, useState } from 'react'
import { Effect, ParseResult, Schema } from 'effect'
import { CreateBookRequest, saveBook } from '../services/booksApi'
import { runClient } from '../services/RuntimeClient'
import ActionStatus from './ActionStatus'
import { formatApiClientError } from '../services/apiClient'

type SaveResult =
    | { status: 'idle' }
    | { status: 'success' }
    | { status: 'error'; message: string; fieldErrors?: Partial<Record<'title' | 'isbn' | 'conditions' | 'authors' | 'categories', string>> }

interface BookCreateFormProps {
    onDataChanged: () => void
}

type BookFormValues = {
    title: string
    isbn: string
    conditions: string
    authors: string
    categories: string
}

const INITIAL_FORM_VALUES: BookFormValues = {
    title: '',
    isbn: '',
    conditions: '',
    authors: '',
    categories: ''
}

const parseCsv = (value: FormDataEntryValue | null): string[] =>
    value
        ?.toString()
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0) ?? []

const decodeCreateBookRequest = Schema.decodeUnknown(CreateBookRequest)

const toValidationError = (error: ParseResult.ParseError): {
    message: string
    fieldErrors: Partial<Record<'title' | 'isbn' | 'conditions' | 'authors' | 'categories', string>>
} => {
    const issues = ParseResult.ArrayFormatter.formatErrorSync(error)
    const firstMessage = issues[0]?.message
    const fieldErrors: Partial<Record<'title' | 'isbn' | 'conditions' | 'authors' | 'categories', string>> = {}

    for (const issue of issues) {
        const key = String(issue.path[issue.path.length - 1] ?? '')
        if ((key === 'title' || key === 'isbn' || key === 'conditions' || key === 'authors' || key === 'categories') && !fieldErrors[key]) {
            fieldErrors[key] = issue.message
        }
    }

    return {
        message: firstMessage ? `Validation error: ${firstMessage}` : 'Validation error: invalid book payload',
        fieldErrors
    }
}

export default function BookCreateForm({ onDataChanged }: BookCreateFormProps) {
    const [formValues, setFormValues] = useState<BookFormValues>(INITIAL_FORM_VALUES)
    const [editedSinceLastSubmit, setEditedSinceLastSubmit] = useState(false)

    const [result, action, pending] = useActionState<SaveResult, globalThis.FormData>(
        async (_, payload) =>
            runClient(
                Effect.gen(function* () {
                    const title = payload.get('title')?.toString().trim() ?? ''
                    const isbn = payload.get('isbn')?.toString().trim() ?? ''
                    const conditions = payload.get('conditions')?.toString().trim() ?? ''
                    const authors = parseCsv(payload.get('authors'))
                    const categories = parseCsv(payload.get('categories'))

                    return yield* decodeCreateBookRequest({
                        title,
                        isbn,
                        conditions,
                        authors,
                        categories
                    }).pipe(
                        Effect.flatMap((decodedBook) =>
                            saveBook(decodedBook).pipe(
                                Effect.map(() => ({ status: 'success' as const })),
                                Effect.catchTags({
                                    NetworkError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'save the book') }),
                                    ApiError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'save the book') }),
                                    ParseError: (error) => Effect.succeed({ status: 'error' as const, message: formatApiClientError(error, 'save the book') })
                                })
                            )
                        ),
                        Effect.catchTag('ParseError', (error) => {
                            const validation = toValidationError(error)
                            return Effect.succeed({
                                status: 'error' as const,
                                message: validation.message,
                                fieldErrors: validation.fieldErrors
                            })
                        })
                    )
                })
            ),
        { status: 'idle' }
    )

    useEffect(() => {
        if (result.status === 'success') {
            setFormValues(INITIAL_FORM_VALUES)
            setEditedSinceLastSubmit(false)
            onDataChanged()
        }
    }, [result.status, onDataChanged])

    const showInlineErrors = result.status === 'error' && !!result.fieldErrors && !editedSinceLastSubmit

    return (
        <form
            action={action}
            onSubmitCapture={() => setEditedSinceLastSubmit(false)}
            className="form-section"
        >
            <h2>Add Book</h2>
            <div className="form-row">
                <input
                    name="title"
                    type="text"
                    placeholder="Title"
                    required
                    disabled={pending}
                    value={formValues.title}
                    onChange={(event) => {
                        setEditedSinceLastSubmit(true)
                        setFormValues((previous) => ({ ...previous, title: event.target.value }))
                    }}
                    className="input-control" />
                {showInlineErrors && result.fieldErrors?.title && <div className="error">{result.fieldErrors.title}</div>}
                <input
                    name="isbn"
                    type="text"
                    placeholder="ISBN"
                    required
                    disabled={pending}
                    value={formValues.isbn}
                    onChange={(event) => {
                        setEditedSinceLastSubmit(true)
                        setFormValues((previous) => ({ ...previous, isbn: event.target.value }))
                    }}
                    className="input-control" />
                {showInlineErrors && result.fieldErrors?.isbn && <div className="error">{result.fieldErrors.isbn}</div>}
                <select
                    name="conditions"
                    required
                    disabled={pending}
                    value={formValues.conditions}
                    onChange={(event) => {
                        setEditedSinceLastSubmit(true)
                        setFormValues((previous) => ({ ...previous, conditions: event.target.value }))
                    }}
                    className="input-control">
                    <option value="">Condition</option>
                    <option value="new">new</option>
                    <option value="used">used</option>
                    <option value="like new">like new</option>
                    <option value="good">good</option>
                </select>
                {showInlineErrors && result.fieldErrors?.conditions && <div className="error">{result.fieldErrors.conditions}</div>}
                <input
                    name="authors"
                    type="text"
                    placeholder="Authors (comma-separated)"
                    required
                    disabled={pending}
                    value={formValues.authors}
                    onChange={(event) => {
                        setEditedSinceLastSubmit(true)
                        setFormValues((previous) => ({ ...previous, authors: event.target.value }))
                    }}
                    className="input-control input-control--wide" />
                {showInlineErrors && result.fieldErrors?.authors && <div className="error">{result.fieldErrors.authors}</div>}
                <input
                    name="categories"
                    type="text"
                    placeholder="Categories (comma-separated)"
                    required
                    disabled={pending}
                    value={formValues.categories}
                    onChange={(event) => {
                        setEditedSinceLastSubmit(true)
                        setFormValues((previous) => ({ ...previous, categories: event.target.value }))
                    }}
                    className="input-control input-control--wide" />
                {showInlineErrors && result.fieldErrors?.categories && <div className="error">{result.fieldErrors.categories}</div>}
                <button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Book'}</button>
            </div>

            {result.status === 'success' && (
                <ActionStatus status="success" message="Book saved successfully!" />
            )}

            {result.status === 'error' && (
                <ActionStatus status="error" title="Save Failed" message={result.message} className="status-margin-top" />
            )}
        </form>
    )
}
