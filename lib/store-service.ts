import { mockStore } from './mock-store'
import { storeApi } from './store-api'
import type { CouponStatus, ProductStatus, Speed, Zone } from './store-contract'

export function getStoreMode() {
    return process.env.NEXT_PUBLIC_API_MODE === 'api' ? 'api' : 'mock'
}

export function getAuthMode() {
    const authMode = process.env.NEXT_PUBLIC_AUTH_MODE
    if (authMode === 'api' || authMode === 'mock') return authMode
    return getStoreMode()
}

const provider = () => getStoreMode() === 'api' ? storeApi : mockStore
const authProvider = () => getAuthMode() === 'api' ? storeApi : mockStore

export const store = {
    listProducts(token: string, signal?: AbortSignal) {
        return provider().listProducts(token, signal)
    },
    addItem(token: string, productId: string, quantity: number) {
        return provider().addItem(token, productId, quantity)
    },
    updateQuantity(token: string, productId: string, quantity: number) {
        return provider().updateQuantity(token, productId, quantity)
    },
    removeItem(token: string, productId: string) {
        return provider().removeItem(token, productId)
    },
    applyCoupon(token: string, code: string) {
        return provider().applyCoupon(token, code)
    },
    viewCart(token: string, signal?: AbortSignal) {
        return provider().viewCart(token, signal)
    },
    pressCheckout(token: string, zone: Zone, speed: Speed) {
        return provider().pressCheckout(token, zone, speed)
    },
    cancelCheckout(token: string) {
        return provider().cancelCheckout(token)
    },
    paySuccess(orderId: string) {
        return provider().paySuccess(orderId)
    },
    payFail(orderId: string) {
        return provider().payFail(orderId)
    },
    continueShopping(token: string) {
        return provider().continueShopping(token)
    },
    listOrders(token: string) {
        return provider().listOrders(token)
    },
    viewOrder(token: string, orderId: string) {
        return provider().viewOrder(token, orderId)
    },
    updateProduct(token: string, productId: string, updates: { price?: number; stock?: number }) {
        return provider().updateProduct(token, productId, updates)
    },
    setProductStatus(token: string, productId: string, status: ProductStatus) {
        return provider().setProductStatus(token, productId, status)
    },
    setCouponStatus(token: string, code: string, status: CouponStatus) {
        return provider().setCouponStatus(token, code, status)
    },
    listCoupons(token: string) {
        return provider().listCoupons(token)
    },
}