import { Effect } from 'effect'
import { findBooks, BooksApiServiceLive } from '../services/booksApi'
import { useQueryEffect } from '../hooks/useQueryEffect'
import type { SearchParams } from './BookSearch'
import { formatApiClientError } from '../services/httpErrors'

type BookListProps = {
    searchParams: SearchParams
}

export default function BookList({ searchParams }: BookListProps) {
    const { data: books, error, loading } = useQueryEffect(
        findBooks(searchParams).pipe(
            Effect.provide(BooksApiServiceLive),
            Effect.mapError((cause) => formatApiClientError(cause, 'load books'))
        ),
        [searchParams]
    )

    if (loading) {
        return <div className="loading">Loading books...</div>
    }

    if (error) {
        return (
            <div className="error">
                <h3>Error loading books</h3>
                <p>{String(error)}</p>
            </div>
        )
    }

    if (!books || books.length === 0) {
        return <div>No books found</div>
    }

    return (
        <div className="book-list">
            {books.map((book) => (
                <div key={book.id} className="book-card">
                    <h3>{book.title}</h3>
                    <p><strong>ISBN:</strong> {book.isbn}</p>
                    <p><strong>Condition:</strong> {book.conditions}</p>
                    <p><strong>Authors:</strong> {book.authors.join(', ')}</p>
                    <p><strong>Categories:</strong> {book.categories.join(', ')}</p>
                </div>
            ))}
        </div>
    )
}
