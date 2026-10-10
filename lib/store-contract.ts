export type StoreMode = 'mock' | 'api'
export type UserRole = 'customer' | 'admin'
export type MemberTier = 'normal' | 'prime'
export type StoreStage = 'ตะกร้า' | 'ชำระเงิน' | 'สำเร็จ'
export type ProductStatus = 'เปิดขาย' | 'ปิดขาย'
export type CouponStatus = 'เปิดใช้' | 'ปิดใช้'
export type OrderStatus = 'รอชำระเงิน' | 'ชำระเงินแล้ว' | 'ยกเลิก'
export type Zone = 'inCity' | 'upcountry' | 'remote'
export type Speed = 'standard' | 'express'

export type AuthSession = {
    token: string
    role: UserRole
    memberTier?: MemberTier
}

export type Product = {
    productId: string
    name: string
    price: number
    weightGram: number
    availableStock: number
    status?: ProductStatus
}

export type CartItem = {
    productId: string
    name: string
    unitPrice: number
    quantity: number
    available: boolean
}

export type CartSnapshot = {
    stage: StoreStage
    items: CartItem[]
    itemCount: number
    subtotal: number
    couponCode: string | null
    checkoutEnabled: boolean
    message?: string
}

export type Coupon = {
    code: string
    percent: number
    minSpend: number
    status: CouponStatus
}

export type OrderItem = {
    productId: string
    name: string
    unitPrice: number
    quantity: number
}

export type Order = {
    orderId: string
    status: OrderStatus
    items: OrderItem[]
    subtotal: number
    discount: number
    discountSource: 'coupon' | 'member' | 'none'
    shippingFee: number
    netTotal: number
    zone: Zone
    speed: Speed
    couponCode: string | null
    createdAt: string
}

export type CheckoutResult = Order & {
    stage: 'ชำระเงิน'
    notice?: { code: 'COUPON_NOT_APPLICABLE'; message: string }
}

export class StoreApiError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly status: number,
        public readonly fields?: string[],
        public readonly productIds?: string[],
    ) {
        super(message)
        this.name = 'StoreApiError'
    }
}