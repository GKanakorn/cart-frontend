import type {
    CartSnapshot,
    CheckoutResult,
    Coupon,
    CouponStatus,
    Order,
    Product,
    ProductStatus,
    Speed,
    StoreStage,
    Zone,
} from './store-contract'
import { apiRequest } from './api-client'

export const storeApi = {
    listProducts(token: string, signal?: AbortSignal) {
        return apiRequest<{ products: Product[] }>('/product', { token, signal })
    },
    addItem(token: string, productId: string, quantity: number, signal?: AbortSignal) {
        return apiRequest<CartSnapshot>('/cart/items', { method: 'POST', token, body: { productId, quantity }, signal })
    },
    updateQuantity(token: string, productId: string, quantity: number, signal?: AbortSignal) {
        return apiRequest<CartSnapshot>(`/cart/items/${encodeURIComponent(productId)}`, { method: 'PUT', token, body: { quantity }, signal })
    },
    removeItem(token: string, productId: string, signal?: AbortSignal) {
        return apiRequest<CartSnapshot>(`/cart/items/${encodeURIComponent(productId)}`, { method: 'DELETE', token, signal })
    },
    applyCoupon(token: string, code: string, signal?: AbortSignal) {
        return apiRequest<CartSnapshot>('/cart/coupon', { method: 'PUT', token, body: { code }, signal })
    },
    viewCart(token: string, signal?: AbortSignal) {
        return apiRequest<CartSnapshot>('/cart', { token, signal })
    },
    pressCheckout(token: string, zone: Zone, speed: Speed, signal?: AbortSignal) {
        return apiRequest<CheckoutResult>('/orders', { method: 'POST', token, body: { zone, speed }, signal })
    },
    cancelCheckout(token: string, signal?: AbortSignal) {
        return apiRequest<{ orderId: string; status: 'ยกเลิก'; stage: 'ตะกร้า'; cart: CartSnapshot }>('/checkout/cancel', { method: 'POST', token, signal })
    },
    paySuccess(orderId: string, signal?: AbortSignal) {
        return apiRequest<{ orderId: string; status: 'ชำระเงินแล้ว'; stage: 'สำเร็จ' }>(`/payments/${encodeURIComponent(orderId)}/success`, { method: 'POST', signal })
    },
    payFail(orderId: string, signal?: AbortSignal) {
        return apiRequest<{ orderId: string; status: 'รอชำระเงิน'; stage: 'ชำระเงิน'; message: string }>(`/payments/${encodeURIComponent(orderId)}/fail`, { method: 'POST', signal })
    },
    continueShopping(token: string, signal?: AbortSignal) {
        return apiRequest<{ stage: 'ตะกร้า'; cart: CartSnapshot }>('/cart/continue', { method: 'POST', token, signal })
    },
    listOrders(token: string, signal?: AbortSignal) {
        return apiRequest<{ orders: Pick<Order, 'orderId' | 'status' | 'netTotal' | 'createdAt'>[] }>('/orders', { token, signal })
    },
    viewOrder(token: string, orderId: string, signal?: AbortSignal) {
        return apiRequest<Order>(`/orders/${encodeURIComponent(orderId)}`, { token, signal })
    },
    updateProduct(token: string, productId: string, updates: { price?: number; stock?: number }, signal?: AbortSignal) {
        return apiRequest<Product>(`/admin/products/${encodeURIComponent(productId)}`, { method: 'PATCH', token, body: updates, signal })
    },
    setProductStatus(token: string, productId: string, status: ProductStatus, signal?: AbortSignal) {
        return apiRequest<Product>(`/admin/products/${encodeURIComponent(productId)}/status`, { method: 'PUT', token, body: { status }, signal })
    },
    setCouponStatus(token: string, code: string, status: CouponStatus, signal?: AbortSignal) {
        return apiRequest<Coupon>(`/admin/coupons/${encodeURIComponent(code)}/status`, { method: 'PUT', token, body: { status }, signal })
    },
    listCoupons(token: string, signal?: AbortSignal) {
        return apiRequest<{ coupons: Coupon[] }>('/admin/coupons', { token, signal })
    },
}