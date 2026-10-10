import { store } from './store-service'
import { StoreApiError } from './store-contract'

export type { Product } from './store-contract'
export { StoreApiError as ProductsApiError }

export async function getProducts(token: string, signal?: AbortSignal) {
    return (await store.listProducts(token, signal)).products
}