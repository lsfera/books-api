import { Component, type ErrorInfo, type ReactNode } from 'react'

type ErrorBoundaryState = {
    error: Error | null
}

type ErrorBoundaryProps = {
    children: ReactNode
}

const toError = (value: unknown): Error => {
    if (value instanceof Error) {
        return value
    }

    if (typeof value === 'string') {
        return new Error(value)
    }

    return new Error(JSON.stringify(value))
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        error: null,
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error }
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        console.error('React ErrorBoundary caught an exception:', error, errorInfo)
    }

    componentDidMount(): void {
        window.addEventListener('error', this.handleWindowError)
        window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
    }

    componentWillUnmount(): void {
        window.removeEventListener('error', this.handleWindowError)
        window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    }

    private handleWindowError = (event: ErrorEvent): void => {
        this.setState({ error: event.error instanceof Error ? event.error : new Error(event.message) })
    }

    private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
        this.setState({ error: toError(event.reason) })
    }

    private handleReset = (): void => {
        this.setState({ error: null })
    }

    render(): ReactNode {
        if (this.state.error) {
            return (
                <div className="error error-boundary">
                    <h2>Unexpected error</h2>
                    <p>{this.state.error.message}</p>
                    {this.state.error.stack && (
                        <pre className="error-boundary-stack">{this.state.error.stack}</pre>
                    )}
                    <button onClick={this.handleReset}>Try again</button>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
