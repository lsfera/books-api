import * as t from 'io-ts'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { AppError } from '../../model.js'
import { WebHookMessageCodec } from './codecs.js'

type WebHookMessage = t.TypeOf<typeof WebHookMessageCodec>

type StoredWebHookMessage = WebHookMessage & {
    receivedAt: string
}

const messages: Array<StoredWebHookMessage> = []

const saveWebHookMessage = (
    message: WebHookMessage,
): TE.TaskEither<AppError, void> =>
    TE.fromIO(() => {
        messages.unshift({
            ...message,
            receivedAt: new Date().toISOString(),
        })

        if (messages.length > 100) {
            messages.length = 100
        }
    })

const findWebHookMessages = (): TE.TaskEither<
    AppError,
    Array<StoredWebHookMessage>
> => TE.right([...messages])

export { WebHookMessage, StoredWebHookMessage, saveWebHookMessage, findWebHookMessages }
