import { Layer, ManagedRuntime } from 'effect'
import { BooksApiService } from './services/booksApi'
import { InventoryApiService } from './services/inventoryApi'
import { WebHooksApiService } from './services/webhooksApi'

const MainLayer = Layer.mergeAll(
    BooksApiService.Default,
    WebHooksApiService.Default,
    InventoryApiService.Default
)

export const CustomRuntime = ManagedRuntime.make(MainLayer)

export const runClient: typeof CustomRuntime.runPromise = CustomRuntime.runPromise.bind(CustomRuntime)
