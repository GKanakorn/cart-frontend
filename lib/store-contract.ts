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

const USER_MESSAGES_BY_ERROR_CODE: Record<string, string> = {
    AUTH_REQUIRED: 'กรุณาเข้าสู่ระบบ',
    AUTH_FORBIDDEN: 'คุณไม่มีสิทธิ์ดำเนินการนี้',
    AUTH_INVALID_CREDENTIALS: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
    VALIDATION_ERROR: 'ข้อมูลที่กรอกไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง',
    QTY_OUT_OF_RANGE: 'จำนวนต้องอยู่ระหว่าง 1 ถึง 10',
    PRODUCT_NOT_FOUND: 'ไม่พบสินค้า',
    ITEM_NOT_IN_CART: 'ไม่พบสินค้าในตะกร้า',
    PRODUCT_UNAVAILABLE: 'สินค้านี้ไม่พร้อมขาย',
    INSUFFICIENT_STOCK: 'จำนวนสินค้าในสต็อกไม่เพียงพอ',
    OPERATION_NOT_ALLOWED: 'ไม่สามารถทำรายการนี้ได้ในสถานะปัจจุบัน',
    ORDER_NOT_FOUND: 'ไม่พบออเดอร์',
    CART_EMPTY: 'ตะกร้าว่าง',
    COUPON_INVALID: 'คูปองไม่ถูกต้องหรือปิดใช้งาน',
    COUPON_NOT_APPLICABLE: 'คูปองไม่สามารถใช้กับคำสั่งซื้อนี้',
    ITEMS_UNAVAILABLE: 'มีสินค้าที่ไม่พร้อมขาย',
    WEIGHT_LIMIT_EXCEEDED: 'น้ำหนักรวมเกิน 20,000 กรัม',
    COUPON_NOT_FOUND: 'ไม่พบคูปอง',
    API_CONFIG_ERROR: 'ยังไม่ได้ตั้งค่าการเชื่อมต่อระบบ',
    API_UNAVAILABLE: 'เชื่อมต่อระบบไม่ได้ กรุณาลองใหม่อีกครั้ง',
    API_RESPONSE_INVALID: 'ระบบตอบกลับข้อมูลไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
}

function userFacingErrorMessage(message: string, code: string, productIds?: string[]) {
    if (code === 'ITEMS_UNAVAILABLE' && productIds?.length) {
        return `มีสินค้าที่ไม่พร้อมขาย (${productIds.join(', ')})`
    }

    const mappedMessage = USER_MESSAGES_BY_ERROR_CODE[code]
    if (mappedMessage) return mappedMessage

    // Do not expose untranslated backend text for unknown error codes.
    return /[\u0E00-\u0E7F]/.test(message)
        ? message
        : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
}

export class StoreApiError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly status: number,
        public readonly fields?: string[],
        public readonly productIds?: string[],
    ) {
        super(userFacingErrorMessage(message, code, productIds))
        this.name = 'StoreApiError'
    }
}
