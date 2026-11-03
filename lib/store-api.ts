
import type {
    CartSnapshot,
    CheckoutResult,
    Coupon,
    CouponStatus,
    Order,
    OrderStatus,
    Product,
    ProductStatus,
    Speed,
    StoreStage,
    Zone,
} from './store-contract'
import { apiRequest } from './api-client'

// ========================================
// Backend response types
// ========================================

type BackendProduct = {
    product_id: string
    name: string
    price: number
    weight: number
    stock: number
    status: 'ON_SALE' | 'OFF_SALE'
}

type BackendCart = {
    cartId: number
    stage: 'CART' | 'CHECKOUT' | 'SUCCESS'
    items: {
        productId: string
        productName: string
        unitPrice: number
        quantity: number
        availableStock: number
        weightGram: number
        isAvailable: boolean
        subtotal: number
    }[]
    subtotal: number
    couponCode: string | null
}

type BackendCoupon = {
    code: string
    percent: number
    min_spend: number
    status: 'ACTIVE' | 'INACTIVE'
}

type BackendOrder = {
    order_id: number
    status: string
    subtotal: number
    discount: number
    shipping_fee: number
    total: number
    zone: string
    speed: string
    coupon_code: string | null
    created_at: string
    order_items?: {
        order_item_id?: number
        product_id: string
        product_name: string
        unit_price: number
        quantity: number
    }[]
}

type BackendOrderDetail = {
    order: BackendOrder
}

type BackendCheckoutResult = {
    message: string
    order: {
        orderId: number
        status: string
        subtotal: number
        discount: number
        shippingFee: number
        total: number
        zone: string
        speed: string
        couponCode: string | null
    }
    notice?: {
        code: 'COUPON_NOT_APPLICABLE'
        message: string
    }
}

// ========================================
// Mapping helpers
// ========================================

function mapProductStatus(status: string): ProductStatus {
    return status === 'ON_SALE' ? 'เปิดขาย' : 'ปิดขาย'
}

function mapCouponStatus(status: string): CouponStatus {
    return status === 'ACTIVE' ? 'เปิดใช้' : 'ปิดใช้'
}

function mapOrderStatus(status: string): OrderStatus {
    switch (status) {
        case 'PAID':
            return 'ชำระเงินแล้ว'
        case 'CANCELLED':
            return 'ยกเลิก'
        default:
            return 'รอชำระเงิน'
    }
}

function mapStoreStage(stage: string): StoreStage {
    switch (stage) {
        case 'CHECKOUT':
            return 'ชำระเงิน'
        case 'SUCCESS':
            return 'สำเร็จ'
        default:
            return 'ตะกร้า'
    }
}

function mapZone(zone: string): Zone {
    if (zone === 'upcountry' || zone === 'remote') {
        return zone
    }
    return 'inCity'
}

function mapSpeed(speed: string): Speed {
    return speed === 'express' ? 'express' : 'standard'
}

function mapProduct(product: BackendProduct): Product {
    return {
        productId: product.product_id,
        name: product.name,
        price: Number(product.price),
        weightGram: Number(product.weight),
        availableStock: Number(product.stock),
        status: mapProductStatus(product.status),
    }
}

function mapCart(cart: BackendCart): CartSnapshot {
    const items = cart.items.map((item) => ({
        productId: item.productId,
        name: item.productName,
        unitPrice: Number(item.unitPrice),
        quantity: Number(item.quantity),
        available: item.isAvailable,
    }))

    return {
        stage: mapStoreStage(cart.stage),
        items,
        itemCount: items.reduce((total, item) => total + item.quantity, 0),
        subtotal: Number(cart.subtotal),
        couponCode: cart.couponCode,
        checkoutEnabled:
            items.length > 0 &&
            items.every((item) => item.available),
    }
}

function mapCoupon(coupon: BackendCoupon): Coupon {
    return {
        code: coupon.code,
        percent: Number(coupon.percent),
        minSpend: Number(coupon.min_spend),
        status: mapCouponStatus(coupon.status),
    }
}

function mapOrder(order: BackendOrder): Order {
    const items = (order.order_items ?? []).map((item) => ({
        productId: item.product_id,
        name: item.product_name,
        unitPrice: Number(item.unit_price),
        quantity: Number(item.quantity),
    }))

    const couponCode = order.coupon_code ?? null
    const discount = Number(order.discount)

    return {
        orderId: String(order.order_id),
        status: mapOrderStatus(order.status),
        items,
        subtotal: Number(order.subtotal),
        discount,
        discountSource:
            couponCode !== null
                ? 'coupon'
                : discount > 0
                    ? 'member'
                    : 'none',
        shippingFee: Number(order.shipping_fee),
        netTotal: Number(order.total),
        zone: mapZone(order.zone),
        speed: mapSpeed(order.speed),
        couponCode,
        createdAt: order.created_at,
    }
}

// ========================================
// Store API
// ========================================

export const storeApi = {
    // ------------------------------------
    // Products
    // ------------------------------------

    listProducts(token: string, signal?: AbortSignal) {
        return apiRequest<{ products: BackendProduct[] }>(
            '/products',
            { token, signal },
        ).then((result) => ({
            products: result.products.map(mapProduct),
        }))
    },

    // ------------------------------------
    // Cart
    // ------------------------------------

    async addItem(
        token: string,
        productId: string,
        quantity: number,
        signal?: AbortSignal,
    ) {
        await apiRequest<{
            message: string
            productId: string
            quantity: number
        }>('/cart/items', {
            method: 'POST',
            token,
            body: { productId, quantity },
            signal,
        })

        return this.viewCart(token, signal)
    },

    async updateQuantity(
        token: string,
        productId: string,
        quantity: number,
        signal?: AbortSignal,
    ) {
        await apiRequest<{
            message: string
            productId: string
            quantity: number
        }>(`/cart/items/${encodeURIComponent(productId)}`, {
            method: 'PATCH',
            token,
            body: { quantity },
            signal,
        })

        return this.viewCart(token, signal)
    },

    async removeItem(
        token: string,
        productId: string,
        signal?: AbortSignal,
    ) {
        await apiRequest<{
            message: string
            productId: string
        }>(`/cart/items/${encodeURIComponent(productId)}`, {
            method: 'DELETE',
            token,
            signal,
        })

        return this.viewCart(token, signal)
    },

    async applyCoupon(
        token: string,
        code: string,
        signal?: AbortSignal,
    ) {
        await apiRequest<{
            message: string
            coupon: {
                code: string
                percent: number
                minSpend: number
            }
        }>('/cart/coupon', {
            method: 'POST',
            token,
            body: { code },
            signal,
        })

        return this.viewCart(token, signal)
    },

    async viewCart(token: string, signal?: AbortSignal) {
        const result = await apiRequest<BackendCart>(
            '/cart',
            { token, signal },
        )

        return mapCart(result)
    },

    // ------------------------------------
    // Checkout
    // ------------------------------------

    async pressCheckout(
        token: string,
        zone: Zone,
        speed: Speed,
        signal?: AbortSignal,
    ): Promise<CheckoutResult> {
        // เก็บข้อมูลสินค้าในตะกร้าก่อน Checkout
        const cart = await this.viewCart(token, signal)

        const result = await apiRequest<BackendCheckoutResult>(
            '/cart/checkout',
            {
                method: 'POST',
                token,
                body: { zone, speed },
                signal,
            },
        )

        const order = result.order

        return {
            orderId: String(order.orderId),
            status: mapOrderStatus(order.status),
            items: cart.items.map((item) => ({
                productId: item.productId,
                name: item.name,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
            })),
            subtotal: Number(order.subtotal),
            discount: Number(order.discount),
            discountSource:
                order.couponCode !== null
                    ? 'coupon'
                    : Number(order.discount) > 0
                        ? 'member'
                        : 'none',
            shippingFee: Number(order.shippingFee),
            netTotal: Number(order.total),
            zone: mapZone(order.zone),
            speed: mapSpeed(order.speed),
            couponCode: order.couponCode,
            createdAt: new Date().toISOString(),
            stage: 'ชำระเงิน',
            notice: result.notice,
        }
    },

    // ------------------------------------
    // Continue shopping
    // ------------------------------------

    async continueShopping(token: string, signal?: AbortSignal) {
        await apiRequest<{
            message: string
            cart: {
                cartId: number
                stage: 'CART'
            }
        }>('/cart/continue-shopping', {
            method: 'POST',
            token,
            signal,
        })

        return this.viewCart(token, signal)
    },

    // ------------------------------------
    // Orders
    // ------------------------------------

    listOrders(token: string, signal?: AbortSignal) {
        return apiRequest<{ orders: BackendOrder[] }>(
            '/orders',
            { token, signal },
        ).then((result) => ({
            orders: result.orders.map(mapOrder),
        }))
    },

    viewOrder(token: string, orderId: string, signal?: AbortSignal) {
        return apiRequest<BackendOrderDetail>(
            `/orders/${encodeURIComponent(orderId)}`,
            { token, signal },
        ).then((result) => mapOrder(result.order))
    },

    async cancelCheckout(
        token: string,
        orderId: string,
        signal?: AbortSignal,
    ) {
        const result = await apiRequest<{
            message: string
            order: {
                orderId: number
                status: string
                cartId: number
            }
        }>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
            method: 'POST',
            token,
            signal,
        })

        return {
            orderId: String(result.order.orderId),
            status: mapOrderStatus(result.order.status),
        }
    },

    // ------------------------------------
    // Payment
    // ------------------------------------

    async paySuccess(
        token: string,
        orderId: string,
        signal?: AbortSignal,
    ) {
        const result = await apiRequest<{
            message: string
            order: {
                orderId: number
                status: string
            }
            cart: {
                stage: string
                items: unknown[]
                couponCode: string | null
            }
        }>(`/orders/${encodeURIComponent(orderId)}/pay-success`, {
            method: 'POST',
            token,
            signal,
        })

        return {
            orderId: String(result.order.orderId),
            status: mapOrderStatus(result.order.status),
            stage: mapStoreStage(result.cart.stage),
        }
    },

    async payFail(
        token: string,
        orderId: string,
        signal?: AbortSignal,
    ) {
        const result = await apiRequest<{
            message: string
            order: {
                orderId: number
                status: string
            }
            cart: {
                cartId: number
                stage: string
            }
        }>(`/orders/${encodeURIComponent(orderId)}/pay-fail`, {
            method: 'POST',
            token,
            signal,
        })

        return {
            orderId: String(result.order.orderId),
            status: mapOrderStatus(result.order.status),
            stage: mapStoreStage(result.cart.stage),
            message: result.message,
        }
    },

    // ------------------------------------
    // Admin: Products
    // ------------------------------------

    updateProduct(
        token: string,
        productId: string,
        updates: {
            name?: string
            price?: number
            weight?: number
            stock?: number
        },
        signal?: AbortSignal,
    ) {
        return apiRequest<{
            message: string
            product: BackendProduct
        }>(`/products/${encodeURIComponent(productId)}`, {
            method: 'PATCH',
            token,
            body: updates,
            signal,
        }).then((result) => mapProduct(result.product))
    },

    setProductStatus(
        token: string,
        productId: string,
        status: ProductStatus,
        signal?: AbortSignal,
    ) {
        const backendStatus =
            status === 'เปิดขาย' ? 'ON_SALE' : 'OFF_SALE'

        return apiRequest<{
            message: string
            product: BackendProduct
        }>(`/products/${encodeURIComponent(productId)}/status`, {
            method: 'PATCH',
            token,
            body: { status: backendStatus },
            signal,
        }).then((result) => mapProduct(result.product))
    },

    // ------------------------------------
    // Admin: Coupons
    // ------------------------------------

    setCouponStatus(
        token: string,
        code: string,
        status: CouponStatus,
        signal?: AbortSignal,
    ) {
        const backendStatus =
            status === 'เปิดใช้' ? 'ACTIVE' : 'INACTIVE'

        return apiRequest<{
            message: string
            coupon: BackendCoupon
        }>(`/coupons/${encodeURIComponent(code)}/status`, {
            method: 'PATCH',
            token,
            body: { status: backendStatus },
            signal,
        }).then((result) => mapCoupon(result.coupon))
    },

    listCoupons(token: string, signal?: AbortSignal) {
        return apiRequest<{
            message: string
            coupons: BackendCoupon[]
        }>('/coupons', {
            token,
            signal,
        }).then((result) => ({
            coupons: result.coupons.map(mapCoupon),
        }))
    },
}
