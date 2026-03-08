import * as t from 'io-ts'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { AppError } from '../../model.js'
import { WebHookMessageCodec } from './codecs.js'

type WebHookMessage = t.TypeOf<typeof WebHookMessageCodec>

type StoredWebHookMessage = WebHookMessage & {
    receivedAt: string
}

type MessageListener = (message: StoredWebHookMessage) => void

const messages: Array<StoredWebHookMessage> = []
const listeners = new Set<MessageListener>()

const saveWebHookMessage = (
    message: WebHookMessage,
): TE.TaskEither<AppError, void> =>
    TE.fromIO(() => {
        const storedMessage = {
            ...message,
            receivedAt: new Date().toISOString(),
        }

        messages.unshift(storedMessage)

        if (messages.length > 100) {
            messages.length = 100
        }

        listeners.forEach((listener) => listener(storedMessage))
    })

const findWebHookMessages = (): TE.TaskEither<
    AppError,
    Array<StoredWebHookMessage>
> => TE.right([...messages])

const subscribeToWebHookMessages = (
    listener: MessageListener,
): (() => void) => {
    listeners.add(listener)
    return () => {
        listeners.delete(listener)
    }
}

export {
    WebHookMessage,
    StoredWebHookMessage,
    saveWebHookMessage,
    findWebHookMessages,
    subscribeToWebHookMessages,
}
