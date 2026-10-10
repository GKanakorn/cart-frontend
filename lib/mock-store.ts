import { ORDERS, PRODUCTS } from './mock-data'
import { validateProductUpdate, validateQuantityChange } from './form-validation'
import {
    StoreApiError,
    type AuthSession,
    type CartItem,
    type CartSnapshot,
    type CheckoutResult,
    type Coupon,
    type CouponStatus,
    type MemberTier,
    type Order,
    type OrderStatus,
    type Product,
    type ProductStatus,
    type Speed,
    type StoreStage,
    type UserRole,
    type Zone,
} from './store-contract'

type CartLine = { productId: string; quantity: number }
type CustomerState = { stage: StoreStage; items: CartLine[]; couponCode: string | null; activeOrderId: string | null }
type StoredOrder = Order & { owner: string }
type MockState = {
    products: Product[]
    coupons: Coupon[]
    customers: Record<string, CustomerState>
    orders: StoredOrder[]
    nextOrderNumber: number
}

type MockUser = { username: string; role: UserRole; memberTier?: MemberTier }

const STORAGE_KEY = 'bean-cart-mock-state-v1'
const accounts: Record<string, { role: UserRole; memberTier?: MemberTier }> = {
    customermock01: { role: 'customer', memberTier: 'normal' },
    customermock02: { role: 'customer', memberTier: 'prime' },
    adminmock01: { role: 'admin' },
}
const accountPasswords: Record<string, string> = {
    customermock01: '123456',
    customermock02: '123456',
    adminmock01: '123456',
}

function createInitialState(): MockState {
    return {
        products: PRODUCTS.map((product, index) => ({
            productId: product.id,
            name: product.name,
            price: product.price,
            weightGram: Number(product.weight.replace(/[^0-9]/g, '')),
            availableStock: product.stock,
            status: 'เปิดขาย',
        })),
        coupons: [{ code: 'SAVE10', percent: 10, minSpend: 1000, status: 'เปิดใช้' }],
        customers: {},
        orders: [],
        nextOrderNumber: 1,
    }
}

function readState(): MockState {
    if (typeof window === 'undefined') return createInitialState()
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return createInitialState()

    try {
        return JSON.parse(raw) as MockState
    } catch {
        window.localStorage.removeItem(STORAGE_KEY)
        return createInitialState()
    }
}

function writeState(state: MockState) {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function getUserFromToken(token: string): MockUser {
    if (!token) throw new StoreApiError('กรุณาเข้าสู่ระบบ', 'AUTH_REQUIRED', 401)

    const usernameFromToken = token.startsWith('mock:') ? decodeURIComponent(token.slice(5)) : ''
    let storedUser: Partial<MockUser> = {}
    if (typeof window !== 'undefined') {
        try {
            storedUser = JSON.parse(window.sessionStorage.getItem('auth_user') ?? '{}') as Partial<MockUser>
        } catch {
            storedUser = {}
        }
    }

    const username = usernameFromToken || storedUser.username || ''
    const account = accounts[username]
    if (!account) throw new StoreApiError('กรุณาเข้าสู่ระบบ', 'AUTH_REQUIRED', 401)

    return { username, ...account }
}

function requireCustomer(token: string): MockUser {
    const user = getUserFromToken(token)
    if (user.role !== 'customer') throw new StoreApiError('ไม่มีสิทธิ์ดำเนินการ', 'AUTH_FORBIDDEN', 403)
    return user
}

function requireAdmin(token: string): MockUser {
    const user = getUserFromToken(token)
    if (user.role !== 'admin') throw new StoreApiError('ไม่มีสิทธิ์ดำเนินการ', 'AUTH_FORBIDDEN', 403)
    return user
}

function getCustomerState(state: MockState, username: string): CustomerState {
    state.customers[username] ??= { stage: 'ตะกร้า', items: [], couponCode: null, activeOrderId: null }
    return state.customers[username]
}

function domainError(code: string, message: string, status = 400): never {
    throw new StoreApiError(message, code, status)
}

function isAvailable(product: Product) {
    return product.status === 'เปิดขาย' && product.availableStock >= 1
}

function cartSnapshot(state: MockState, customer: CustomerState): CartSnapshot {
    const items: CartItem[] = customer.items.flatMap((line) => {
        const product = state.products.find((item) => item.productId === line.productId)
        if (!product) return []
        return [{
            productId: product.productId,
            name: product.name,
            unitPrice: product.price,
            quantity: line.quantity,
            available: isAvailable(product),
        }]
    })
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    return {
        stage: customer.stage,
        items,
        itemCount: items.length,
        subtotal,
        couponCode: customer.couponCode,
        checkoutEnabled: customer.stage === 'ตะกร้า' && items.length > 0,
        ...(items.length === 0 ? { message: 'ตะกร้าว่าง' } : {}),
    }
}

function requireCartStage(customer: CustomerState) {
    if (customer.stage !== 'ตะกร้า') domainError('OPERATION_NOT_ALLOWED', 'ไม่สามารถแก้ไขตะกร้าในสถานะปัจจุบัน')
}

function validateCartQuantity(input: {
    operation: 'add' | 'update'
    quantity: unknown
    product: Product | undefined
    line: CartLine | undefined
    state: MockState
}) {
    const { operation, quantity, product, line, state } = input
    const code = validateQuantityChange({
        operation,
        quantity,
        productExists: Boolean(product),
        inCart: Boolean(line),
        available: Boolean(product && isAvailable(product)),
        currentQtyInCart: line?.quantity ?? 0,
        availableStock: product?.availableStock ?? 0,
    })
    if (code === 'OK') return

    const messages: Record<Exclude<typeof code, 'OK'>, string> = {
        VALIDATION_ERROR: 'จำนวนต้องเป็นจำนวนเต็ม',
        QTY_OUT_OF_RANGE: 'จำนวนต้องอยู่ระหว่าง 1 ถึง 10',
        PRODUCT_NOT_FOUND: 'ไม่พบสินค้า',
        ITEM_NOT_IN_CART: 'ไม่พบสินค้าในตะกร้า',
        PRODUCT_UNAVAILABLE: 'สินค้าไม่พร้อมขาย',
        INSUFFICIENT_STOCK: `สินค้าเหลือ ${product?.availableStock ?? 0} ชิ้น`,
    }
    const status = code === 'PRODUCT_NOT_FOUND' || code === 'ITEM_NOT_IN_CART' ? 404 : 400
    domainError(code, messages[code], status)
}

function getProduct(state: MockState, productId: string) {
    return state.products.find((product) => product.productId === productId)
}

function getActiveOrder(state: MockState, customer: CustomerState, username: string) {
    const order = state.orders.find((item) => item.orderId === customer.activeOrderId && item.owner === username)
    if (!order || order.status !== 'รอชำระเงิน') domainError('ORDER_NOT_FOUND', 'ไม่พบออเดอร์', 404)
    return order
}

function classifyWeight(totalWeight: number) {
    if (totalWeight > 20000) return 'overLimit'
    if (totalWeight <= 1000) return 'light'
    if (totalWeight <= 5000) return 'medium'
    return 'heavy'
}

function shippingFee(weightTier: 'light' | 'medium' | 'heavy', zone: Zone, speed: Speed, memberTier: MemberTier) {
    const rates = {
        light: { inCity: 30, upcountry: 50, remote: 80 },
        medium: { inCity: 50, upcountry: 80, remote: 120 },
        heavy: { inCity: 80, upcountry: 120, remote: 180 },
    }
    const base = rates[weightTier][zone]
    if (memberTier === 'prime') return speed === 'standard' ? 0 : Math.floor(base / 2)
    return speed === 'standard' ? base : Math.floor(base * 3 / 2)
}

export const mockStore = {
    async login(username: string, password: string): Promise<AuthSession> {
        const account = accounts[username]
        if (!account || accountPasswords[username] !== password) {
            domainError('AUTH_INVALID_CREDENTIALS', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 401)
        }
        return { token: `mock:${encodeURIComponent(username)}`, ...account }
    },

    async listProducts(token: string, signal?: AbortSignal) {
        if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
        const user = getUserFromToken(token)
        const state = readState()
        const products = user.role === 'admin'
            ? state.products
            : state.products.filter(isAvailable).map(({ status: _status, ...product }) => product)
        return { products }
    },

    async addItem(token: string, productId: string, quantity: number): Promise<CartSnapshot> {
        const user = requireCustomer(token)
        const state = readState()
        const customer = getCustomerState(state, user.username)
        requireCartStage(customer)
        const product = getProduct(state, productId)
        const line = customer.items.find((item) => item.productId === productId)
        validateCartQuantity({ operation: 'add', quantity, product, line, state })

        if (line) line.quantity += quantity
        else customer.items.push({ productId, quantity })
        writeState(state)
        return cartSnapshot(state, customer)
    },

    async updateQuantity(token: string, productId: string, quantity: number): Promise<CartSnapshot> {
        const user = requireCustomer(token)
        const state = readState()
        const customer = getCustomerState(state, user.username)
        requireCartStage(customer)
        const product = getProduct(state, productId)
        const line = customer.items.find((item) => item.productId === productId)
        validateCartQuantity({ operation: 'update', quantity, product, line, state })
        line!.quantity = quantity
        writeState(state)
        return cartSnapshot(state, customer)
    },

    async removeItem(token: string, productId: string): Promise<CartSnapshot> {
        const user = requireCustomer(token)
        const state = readState()
        const customer = getCustomerState(state, user.username)
        requireCartStage(customer)
        if (customer.items.length === 0) domainError('CART_EMPTY', 'ไม่มีสินค้าให้ลบ')
        const index = customer.items.findIndex((item) => item.productId === productId)
        if (index < 0) domainError('ITEM_NOT_IN_CART', 'ไม่พบสินค้าในตะกร้า', 404)
        customer.items.splice(index, 1)
        writeState(state)
        return cartSnapshot(state, customer)
    },

    async applyCoupon(token: string, code: string): Promise<CartSnapshot> {
        const user = requireCustomer(token)
        const state = readState()
        const customer = getCustomerState(state, user.username)
        requireCartStage(customer)
        const coupon = state.coupons.find((item) => item.code === code && item.status === 'เปิดใช้')
        if (!coupon) domainError('COUPON_INVALID', 'คูปองไม่ถูกต้องหรือปิดใช้งาน')
        customer.couponCode = coupon.code
        writeState(state)
        return cartSnapshot(state, customer)
    },

    async viewCart(token: string): Promise<CartSnapshot> {
        const user = requireCustomer(token)
        const state = readState()
        const customer = getCustomerState(state, user.username)
        writeState(state)
        return cartSnapshot(state, customer)
    },

    async pressCheckout(token: string, zone: Zone, speed: Speed): Promise<CheckoutResult> {
        const user = requireCustomer(token)
        const state = readState()
        const customer = getCustomerState(state, user.username)
        requireCartStage(customer)
        if (!['inCity', 'upcountry', 'remote'].includes(zone) || !['standard', 'express'].includes(speed)) {
            domainError('VALIDATION_ERROR', 'โซนหรือความเร็วจัดส่งไม่ถูกต้อง')
        }
        if (customer.items.length === 0) domainError('CART_EMPTY', 'ไม่สามารถชำระเงินได้ ตะกร้าว่าง')

        const unavailable = customer.items.filter((line) => {
            const product = getProduct(state, line.productId)
            return !product || !isAvailable(product) || line.quantity > product.availableStock
        }).map((line) => line.productId)
        if (unavailable.length > 0) {
            throw new StoreApiError('มีสินค้าที่ไม่พร้อมขาย', 'ITEMS_UNAVAILABLE', 400, undefined, unavailable)
        }

        const totalWeight = customer.items.reduce((sum, line) => sum + (getProduct(state, line.productId)?.weightGram ?? 0) * line.quantity, 0)
        const tier = classifyWeight(totalWeight)
        if (tier === 'overLimit') domainError('WEIGHT_LIMIT_EXCEEDED', 'น้ำหนักรวมเกิน 20,000 กรัม')

        const items = customer.items.map((line) => {
            const product = getProduct(state, line.productId)!
            return { productId: product.productId, name: product.name, unitPrice: product.price, quantity: line.quantity }
        })
        const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
        const coupon = customer.couponCode ? state.coupons.find((item) => item.code === customer.couponCode) : undefined
        let couponCode = customer.couponCode
        let discount = 0
        let discountSource: Order['discountSource'] = 'none'
        let notice: CheckoutResult['notice']

        if (couponCode && (!coupon || coupon.status !== 'เปิดใช้' || subtotal < coupon.minSpend)) {
            couponCode = null
            customer.couponCode = null
            notice = { code: 'COUPON_NOT_APPLICABLE', message: 'คูปองไม่สามารถใช้กับคำสั่งซื้อนี้' }
        }

        if (coupon && couponCode) {
            discount = Math.floor(subtotal * coupon.percent / 100)
            discountSource = 'coupon'
        } else if (user.memberTier === 'prime') {
            discount = Math.floor(subtotal * 5 / 100)
            discountSource = 'member'
        }

        const fee = shippingFee(tier, zone, speed, user.memberTier ?? 'normal')
        const orderNumber = String(state.nextOrderNumber++).padStart(6, '0')
        const order: StoredOrder = {
            orderId: `ORD-${orderNumber}`,
            owner: user.username,
            status: 'รอชำระเงิน',
            items,
            subtotal,
            discount,
            discountSource,
            shippingFee: fee,
            netTotal: subtotal - discount + fee,
            zone,
            speed,
            couponCode,
            createdAt: new Date().toISOString(),
        }

        for (const line of customer.items) getProduct(state, line.productId)!.availableStock -= line.quantity
        state.orders.push(order)
        customer.stage = 'ชำระเงิน'
        customer.activeOrderId = order.orderId
        writeState(state)
        return { ...order, stage: 'ชำระเงิน', ...(notice ? { notice } : {}) }
    },

    async cancelCheckout(token: string) {
        const user = requireCustomer(token)
        const state = readState()
        const customer = getCustomerState(state, user.username)
        if (customer.stage !== 'ชำระเงิน') domainError('OPERATION_NOT_ALLOWED', 'ไม่สามารถยกเลิกการชำระเงินในสถานะปัจจุบัน')
        const order = getActiveOrder(state, customer, user.username)
        for (const line of order.items) {
            const product = getProduct(state, line.productId)
            if (product) product.availableStock += line.quantity
        }
        order.status = 'ยกเลิก'
        customer.stage = 'ตะกร้า'
        customer.activeOrderId = null
        writeState(state)
        return { orderId: order.orderId, status: 'ยกเลิก' as const, stage: 'ตะกร้า' as const, cart: cartSnapshot(state, customer) }
    },

    async paySuccess(orderId: string) {
        const state = readState()
        const order = state.orders.find((item) => item.orderId === orderId)
        if (!order) domainError('ORDER_NOT_FOUND', 'ไม่พบออเดอร์', 404)
        const customer = getCustomerState(state, order.owner)
        if (order.status !== 'รอชำระเงิน' || customer.stage !== 'ชำระเงิน') domainError('OPERATION_NOT_ALLOWED', 'ไม่สามารถชำระออเดอร์นี้ได้')
        order.status = 'ชำระเงินแล้ว'
        customer.items = []
        customer.couponCode = null
        customer.stage = 'สำเร็จ'
        customer.activeOrderId = order.orderId
        writeState(state)
        return { orderId, status: 'ชำระเงินแล้ว' as const, stage: 'สำเร็จ' as const }
    },

    async payFail(orderId: string) {
        const state = readState()
        const order = state.orders.find((item) => item.orderId === orderId)
        if (!order) domainError('ORDER_NOT_FOUND', 'ไม่พบออเดอร์', 404)
        const customer = getCustomerState(state, order.owner)
        if (order.status !== 'รอชำระเงิน' || customer.stage !== 'ชำระเงิน') domainError('OPERATION_NOT_ALLOWED', 'ไม่สามารถดำเนินการกับออเดอร์นี้ได้')
        return { orderId, status: 'รอชำระเงิน' as const, stage: 'ชำระเงิน' as const, message: 'การชำระเงินล้มเหลว กรุณาลองใหม่' }
    },

    async continueShopping(token: string) {
        const user = requireCustomer(token)
        const state = readState()
        const customer = getCustomerState(state, user.username)
        if (customer.stage !== 'สำเร็จ') domainError('OPERATION_NOT_ALLOWED', 'ยังไม่สามารถเลือกซื้อสินค้าต่อได้')
        customer.stage = 'ตะกร้า'
        customer.activeOrderId = null
        writeState(state)
        return { stage: 'ตะกร้า' as const, cart: cartSnapshot(state, customer) }
    },

    async listOrders(token: string) {
        const user = requireCustomer(token)
        const orders = readState().orders
            .filter((order) => order.owner === user.username)
            .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
            .map(({ orderId, status, netTotal, createdAt }) => ({ orderId, status, netTotal, createdAt }))
        return { orders }
    },

    async viewOrder(token: string, orderId: string): Promise<Order> {
        const user = requireCustomer(token)
        const order = readState().orders.find((item) => item.orderId === orderId && item.owner === user.username)
        if (!order) domainError('ORDER_NOT_FOUND', 'ไม่พบออเดอร์', 404)
        const { owner: _owner, ...publicOrder } = order
        return publicOrder
    },

    async updateProduct(token: string, productId: string, updates: { price?: number; stock?: number }) {
        requireAdmin(token)
        const state = readState()
        const product = getProduct(state, productId)
        if (!product) domainError('PRODUCT_NOT_FOUND', 'ไม่พบสินค้า', 404)
        if (updates.price === undefined && updates.stock === undefined) domainError('VALIDATION_ERROR', 'กรุณาระบุ price หรือ stock')
        const fields = validateProductUpdate(updates)
        if (fields.length > 0) throw new StoreApiError('ข้อมูลสินค้าไม่ถูกต้อง', 'VALIDATION_ERROR', 400, fields)
        if (updates.price !== undefined) product.price = updates.price
        if (updates.stock !== undefined) product.availableStock = updates.stock
        writeState(state)
        return product
    },

    async setProductStatus(token: string, productId: string, status: ProductStatus) {
        requireAdmin(token)
        const state = readState()
        const product = getProduct(state, productId)
        if (!product) domainError('PRODUCT_NOT_FOUND', 'ไม่พบสินค้า', 404)
        if (status !== 'เปิดขาย' && status !== 'ปิดขาย') domainError('VALIDATION_ERROR', 'สถานะสินค้าไม่ถูกต้อง')
        product.status = status
        writeState(state)
        return product
    },

    async setCouponStatus(token: string, code: string, status: CouponStatus) {
        requireAdmin(token)
        const state = readState()
        const coupon = state.coupons.find((item) => item.code === code)
        if (!coupon) domainError('COUPON_NOT_FOUND', 'ไม่พบคูปอง', 404)
        if (status !== 'เปิดใช้' && status !== 'ปิดใช้') domainError('VALIDATION_ERROR', 'สถานะคูปองไม่ถูกต้อง')
        coupon.status = status
        writeState(state)
        return coupon
    },

    async listCoupons(token: string) {
        requireAdmin(token)
        return { coupons: readState().coupons }
    },

    getStage(token: string) {
        const user = requireCustomer(token)
        return getCustomerState(readState(), user.username).stage
    },
}
