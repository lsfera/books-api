interface ActionStatusProps {
    status: 'success' | 'error'
    title?: string
    message: string
    className?: string
}

export default function ActionStatus({ status, title, message, className }: ActionStatusProps) {
    if (status === 'success') {
        return (
            <div className={`success-message ${className ?? ''}`.trim()}>
                ✓ {message}
            </div>
        )
    }

    return (
        <div className={`error ${className ?? ''}`.trim()}>
            {title && <h3>{title}</h3>}
            <p>{message}</p>
        </div>
    )
}
