import { Schema } from 'effect'

export class NetworkError extends Schema.TaggedError<NetworkError>()('NetworkError', {
    message: Schema.String
}) { }

export class ApiError extends Schema.TaggedError<ApiError>()('ApiError', {
    status: Schema.Number,
    message: Schema.String
}) { }

export class ParseError extends Schema.TaggedError<ParseError>()('ParseError', {
    message: Schema.String
}) { }

export type ApiClientError = NetworkError | ApiError | ParseError

export const formatApiClientError = (error: unknown, operation: string): string => {
    if (error instanceof NetworkError) {
        return `Network error while trying to ${operation}. Please check your connection and try again.`
    }

    if (error instanceof ApiError) {
        if (error.status === 400) {
            return `Invalid request while trying to ${operation}.`
        }

        if (error.status === 404) {
            return `Requested resource was not found while trying to ${operation}.`
        }

        if (error.status >= 500) {
            return `Server error while trying to ${operation}. Please try again later.`
        }

        return `Request failed (${error.status}) while trying to ${operation}.`
    }

    if (error instanceof ParseError) {
        return `Received an invalid response while trying to ${operation}.`
    }

    return `Unexpected error while trying to ${operation}: ${String(error)}`
}

export const mapHttpClientError = (error: unknown): ApiClientError => {
    if (typeof error === 'object' && error !== null && '_tag' in error) {
        const taggedError = error as {
            _tag: string
            reason?: string
            response?: { status: number }
            message?: string
        }

        if (taggedError._tag === 'RequestError') {
            return new NetworkError({ message: String(taggedError.message ?? error) })
        }

        if (taggedError._tag === 'ResponseError') {
            if (taggedError.reason === 'StatusCode') {
                return new ApiError({
                    status: taggedError.response?.status ?? 500,
                    message: String(taggedError.message ?? error)
                })
            }

            return new ParseError({ message: String(taggedError.message ?? error) })
        }
    }

    return new ParseError({ message: String(error) })
}
