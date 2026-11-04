'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { store } from '../lib/store-service'
import { StoreApiError, type Product } from '../lib/store-contract'
import { quantityErrorMessage, validateQuantityChange, type QuantityErrorCode } from '../lib/form-validation'

type AuthUser = { username: string; role: 'customer' | 'admin'; memberTier?: 'normal' | 'prime' }

function formatPrice(price: number) {
    return `฿${price.toLocaleString('en-US')}`
}

function getErrorMessage(error: unknown) {
    if (error instanceof StoreApiError) {
        const quantityCode = error.code as QuantityErrorCode
        const knownQuantityCodes: QuantityErrorCode[] = [
            'VALIDATION_ERROR',
            'QTY_OUT_OF_RANGE',
            'PRODUCT_NOT_FOUND',
            'ITEM_NOT_IN_CART',
            'PRODUCT_UNAVAILABLE',
            'INSUFFICIENT_STOCK',
        ]
        const message = knownQuantityCodes.includes(quantityCode)
            ? quantityErrorMessage(quantityCode as Exclude<QuantityErrorCode, 'OK'>, 0)
            : error.message
        return { message, code: error.code }
    }
    return { message: error instanceof Error ? error.message : 'ทำรายการไม่สำเร็จ', code: '' }
}

export default function ProductsPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [actionError, setActionError] = useState<{ message: string; code: string; productId: string } | null>(null)
    const [hasToken, setHasToken] = useState(true)
    const [itemCount, setItemCount] = useState(0)
    const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({})
    const [quantities, setQuantities] = useState<Record<string, string>>({})
    const [quantityErrors, setQuantityErrors] = useState<Record<string, QuantityErrorCode | undefined>>({})
    const [addingProductId, setAddingProductId] = useState<string | null>(null)
    const [notice, setNotice] = useState('')

    useEffect(() => {
        const token = sessionStorage.getItem('access_token') ?? ''
        let authUser: AuthUser | null = null
        try {
            authUser = JSON.parse(sessionStorage.getItem('auth_user') ?? 'null') as AuthUser | null
        } catch {
            sessionStorage.removeItem('auth_user')
        }
        if (authUser) setUser(authUser)

        if (!token) {
            setHasToken(false)
            setIsLoading(false)
            return
        }
        if (authUser?.role === 'admin') {
            router.replace('/admin/products')
            return
        }

        const controller = new AbortController()
        async function loadPage() {
            try {
                const [productResult, cart] = await Promise.all([
                    store.listProducts(token, controller.signal),
                    store.viewCart(token, controller.signal),
                ])
                if (controller.signal.aborted) return
                setProducts(productResult.products)
                setItemCount(cart.itemCount)
                setCartQuantities(Object.fromEntries(cart.items.map((item) => [item.productId, item.quantity])))
                if (cart.stage === 'ชำระเงิน') router.replace('/checkout')
                if (cart.stage === 'สำเร็จ') router.replace('/success')
            } catch (requestError) {
                if (requestError instanceof Error && requestError.name === 'AbortError') return
                const result = getErrorMessage(requestError)
                setError(result.message)
                setErrorCode(result.code)
                if (result.code === 'AUTH_REQUIRED') {
                    sessionStorage.removeItem('access_token')
                    sessionStorage.removeItem('auth_user')
                    setHasToken(false)
                }
            } finally {
                if (!controller.signal.aborted) setIsLoading(false)
            }
        }
        void loadPage()
        return () => controller.abort()
    }, [router])

    function handleQuantityChange(product: Product, event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value
        const id = product.productId
        const available = product.status !== 'ปิดขาย' && product.availableStock > 0
        const currentQtyInCart = cartQuantities[id] ?? 0
        setQuantities((current) => ({ ...current, [id]: value }))
        setQuantityErrors((current) => ({
            ...current,
            [id]: validateQuantityChange({
                operation: 'add', quantity: value, productExists: true, inCart: currentQtyInCart > 0,
                available, currentQtyInCart, availableStock: product.availableStock,
            }),
        }))
        if (actionError?.productId === id) setActionError(null)
    }

    function adjustProductQuantity(product: Product, amount: number) {
        const current = Number(quantities[product.productId] ?? '1')
        const next = Math.max(1, Math.min(Math.min(10, product.availableStock), current + amount))
        setQuantities((values) => ({ ...values, [product.productId]: String(next) }))
        setQuantityErrors((values) => ({ ...values, [product.productId]: 'OK' }))
    }

    async function handleAddItem(product: Product) {
        const token = sessionStorage.getItem('access_token') ?? ''
        const quantity = quantities[product.productId] ?? '1'
        const available = product.status !== 'ปิดขาย' && product.availableStock > 0
        const currentQtyInCart = cartQuantities[product.productId] ?? 0
        const errorCode = validateQuantityChange({
            operation: 'add', quantity, productExists: true, inCart: currentQtyInCart > 0,
            available, currentQtyInCart, availableStock: product.availableStock,
        })
        setQuantityErrors((current) => ({ ...current, [product.productId]: errorCode }))
        // Send unavailable products to the store so its domain error is surfaced
        // as an action error (and the add button remains usable for this case).
        if ((errorCode !== 'OK' && errorCode !== 'PRODUCT_UNAVAILABLE') || !token) return

        setAddingProductId(product.productId)
        setError('')
        setActionError(null)
        setNotice('')
        try {
            const cart = await store.addItem(token, product.productId, Number(quantity))
            setItemCount(cart.itemCount)
            setCartQuantities(Object.fromEntries(cart.items.map((item) => [item.productId, item.quantity])))
            setNotice('เพิ่มสินค้าลงตะกร้าแล้ว')
        } catch (requestError) {
            const result = requestError instanceof StoreApiError && requestError.code === 'INSUFFICIENT_STOCK'
                ? { ...getErrorMessage(requestError), message: `สินค้าเหลือ ${product.availableStock} ชิ้น` }
                : getErrorMessage(requestError)
            setActionError({ ...result, productId: product.productId })
        } finally {
            setAddingProductId(null)
        }
    }

    const isAdmin = user?.role === 'admin'

    return (
        <>
            <header className="navbar">
                <div className="nav-inner">
                    <a className="brand" href="/products"><span className="brand-icon-crop"><img className="brand-icon" src="/Icon-Coffee.png" alt="" /></span>Roast &amp; Roll</a>
                    <nav aria-label="Main navigation">
                        <a data-testid={isAdmin ? 'nav-admin-products' : 'nav-products'} className="nav-active" href={isAdmin ? '/admin/products' : '/products'}>{isAdmin ? 'จัดการสินค้า' : 'สินค้า'}</a>
                        {isAdmin ? <a data-testid="nav-admin-coupons" href="/admin/coupons">จัดการคูปอง</a> : <><a data-testid="nav-cart" href="/cart">ตะกร้า <span className="badge">{itemCount}</span></a><a data-testid="nav-orders" href="/orders">ออเดอร์ของฉัน</a></>}
                    </nav>
                    <div className="nav-user">
                        <span>{user?.username ?? ''}</span>
                        {user?.role && <span className={`chip ${isAdmin ? 'chip-blue' : 'chip-green'}`}>{user.role}</span>}
                        {user && <a data-testid="logout-button" className="btn btn-outline small" href="/login" onClick={() => { sessionStorage.removeItem('access_token'); sessionStorage.removeItem('auth_user') }}>ออกจากระบบ</a>}
                    </div>
                </div>
            </header>
            <div className="content">
                <main data-testid="page-products">
                    <div className="title-row"><h1>สินค้า</h1></div>
                    {!hasToken && <div id="products-auth-error" className="message message-error" data-testid="products-auth-error" data-kind="error" data-code="AUTH_REQUIRED" role="alert">กรุณาเข้าสู่ระบบเพื่อดูสินค้า <a href="/login">เข้าสู่ระบบ</a></div>}
                    {error && <div id="products-load-error" className="message message-error" data-testid="products-load-error" data-kind="error" data-code={errorCode} role="alert">{error}</div>}
                    {notice && <div id="product-add-success-message" className="message message-info" data-testid="product-add-success-message" data-kind="info" data-code="" role="status">{notice}</div>}
                    {isLoading && <p role="status">กำลังโหลดสินค้า...</p>}
                    {!isLoading && hasToken && !error && products.length === 0 && <p className="muted">ยังไม่มีสินค้า</p>}
                    {!isLoading && !error && products.length > 0 && (
                        <div className="product-grid">
                            {products.map((product) => {
                                const quantity = quantities[product.productId] ?? '1'
                                const errorCode = quantityErrors[product.productId] ?? 'OK'
                                const quantityError = errorCode === 'OK' || errorCode === 'PRODUCT_UNAVAILABLE'
                                    ? ''
                                    : quantityErrorMessage(errorCode, product.availableStock)
                                const isAvailable = product.status !== 'ปิดขาย' && product.availableStock > 0
                                return (
                                    <article className="card product-card" data-testid={`product-row-${product.productId}`} key={product.productId}>
                                        <img className="product-card-image" src="/images/coffee-beans.png" alt={`รูปสินค้า ${product.name}`} />
                                        <h2 data-testid="product-name">{product.name}</h2>
                                        <p className="muted" data-testid="product-id">รหัสสินค้า: {product.productId}</p>
                                        <strong className="price" data-testid="product-price" data-value={product.price}>{formatPrice(product.price)}</strong>
                                        <div className="muted product-stock" data-testid="product-stock" data-value={product.availableStock}>
                                            <span data-testid="product-weight">{product.weightGram.toLocaleString('en-US')} g/ชิ้น</span>
                                            <span data-testid="product-available-stock">คงเหลือ {product.availableStock}</span>
                                        </div>
                                        <p data-testid="product-availability">{isAvailable ? 'พร้อมขาย' : 'ไม่พร้อมขาย'}</p>
                                        <div className="product-action">
                                            <div className="field">
                                                <label htmlFor={`product-add-qty-${product.productId}`}>จำนวน</label>
                                                <div className="quantity-control">
                                                    <button type="button" className="quantity-step" data-testid="product-qty-decrease" aria-label={`ลดจำนวน ${product.name}`} disabled={product.availableStock < 1 || Number(quantity) <= 1} onClick={() => adjustProductQuantity(product, -1)}>−</button>
                                                    <input id={`product-add-qty-${product.productId}`} data-testid="product-add-qty" type="number" min="1" max={Math.max(1, Math.min(10, product.availableStock))} step="1" required value={quantity} aria-invalid={Boolean(quantityError && errorCode !== 'PRODUCT_UNAVAILABLE')} aria-describedby={quantityError ? `product-quantity-error-${product.productId}` : undefined} onChange={(event) => handleQuantityChange(product, event)} />
                                                    <button type="button" className="quantity-step" data-testid="product-qty-increase" aria-label={`เพิ่มจำนวน ${product.name}`} disabled={product.availableStock < 1 || Number(quantity) >= Math.min(10, product.availableStock)} onClick={() => adjustProductQuantity(product, 1)}>+</button>
                                                </div>
                                                {quantityError && <p className="login-field-error" id={`product-quantity-error-${product.productId}`} data-testid={`product-quantity-error-${product.productId}`} data-kind="error" data-code={errorCode} role="alert">{quantityError}</p>}
                                                {actionError?.productId === product.productId && <p id={`product-add-error-${product.productId}`} className="login-field-error" data-testid={`product-add-error-${product.productId}`} data-kind="error" data-code={actionError.code} role="alert">{actionError.message}</p>}
                                            </div>
                                            <button type="button" data-testid="product-add-button" className="btn btn-primary" disabled={Boolean(quantityError && errorCode !== 'PRODUCT_UNAVAILABLE') || addingProductId === product.productId} onClick={() => handleAddItem(product)}>{addingProductId === product.productId ? 'กำลังเพิ่ม...' : 'เพิ่มลงตะกร้า'}</button>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </main>
            </div>
        </>
    )
}
