import { useEffect, useState } from 'react'
import { Effect, ParseResult, Schema } from 'effect'
import { CreateBookRequest, saveBook } from '../services/booksApi'
import ActionStatus from './ActionStatus'
import { formatApiClientError } from '../services/httpErrors'
import { useActionEffect } from '../hooks/useActionEffect'

type SaveSuccess = { status: 'success' }

type SaveError = {
    message: string
    fieldErrors?: Partial<Record<'title' | 'isbn' | 'conditions' | 'authors' | 'categories', string>>
}

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

    const [{ error, data }, action, pending] = useActionEffect<globalThis.FormData, SaveSuccess, SaveError>(
        (payload) =>
            Effect.gen(function* () {
                const title = payload.get('title')?.toString().trim() ?? ''
                const isbn = payload.get('isbn')?.toString().trim() ?? ''
                const conditions = payload.get('conditions')?.toString().trim() ?? ''
                const authors = parseCsv(payload.get('authors'))
                const categories = parseCsv(payload.get('categories'))

                const decodedBook = yield* decodeCreateBookRequest({
                    title,
                    isbn,
                    conditions,
                    authors,
                    categories
                }).pipe(
                    Effect.mapError((parseError) => {
                        const validation = toValidationError(parseError)
                        return {
                            message: validation.message,
                            fieldErrors: validation.fieldErrors
                        }
                    })
                )

                return yield* saveBook(decodedBook).pipe(
                    Effect.as({ status: 'success' as const }),
                    Effect.mapError((saveError) => ({
                        message: formatApiClientError(saveError, 'save the book')
                    }))
                )
            })
    )

    useEffect(() => {
        if (data?.status === 'success') {
            setFormValues(INITIAL_FORM_VALUES)
            setEditedSinceLastSubmit(false)
            onDataChanged()
        }
    }, [data, onDataChanged])

    const showInlineErrors = !!error?.fieldErrors && !editedSinceLastSubmit

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
                {showInlineErrors && error.fieldErrors?.title && <div className="error">{error.fieldErrors.title}</div>}
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
                {showInlineErrors && error.fieldErrors?.isbn && <div className="error">{error.fieldErrors.isbn}</div>}
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
                {showInlineErrors && error.fieldErrors?.conditions && <div className="error">{error.fieldErrors.conditions}</div>}
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
                {showInlineErrors && error.fieldErrors?.authors && <div className="error">{error.fieldErrors.authors}</div>}
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
                {showInlineErrors && error.fieldErrors?.categories && <div className="error">{error.fieldErrors.categories}</div>}
                <button type="submit" disabled={pending}>{pending ? 'Saving...' : 'Save Book'}</button>
            </div>

            {data?.status === 'success' && (
                <ActionStatus status="success" message="Book saved successfully!" />
            )}

            {error && (
                <ActionStatus status="error" title="Save Failed" message={error.message} className="status-margin-top" />
            )}
        </form>
    )
}
