import { Layer, ManagedRuntime } from 'effect'
import { BooksApiService } from './booksApi'
import { WebHooksApiService } from './webhooksApi'
import { InventoryApiService } from './inventoryApi'

const MainLayer = Layer.mergeAll(
    BooksApiService.Default,
    WebHooksApiService.Default,
    InventoryApiService.Default
)

export const RuntimeClient = ManagedRuntime.make(MainLayer)

export const runClient: typeof RuntimeClient.runPromise = RuntimeClient.runPromise.bind(RuntimeClient)
