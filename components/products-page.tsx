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
    if (error instanceof StoreApiError) return { message: error.message, code: error.code }
    return { message: error instanceof Error ? error.message : 'ทำรายการไม่สำเร็จ', code: '' }
}

export default function ProductsPage() {
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [hasToken, setHasToken] = useState(true)
    const [itemCount, setItemCount] = useState(0)
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
        setQuantities((current) => ({ ...current, [id]: value }))
        setQuantityErrors((current) => ({
            ...current,
            [id]: validateQuantityChange({
                operation: 'add', quantity: value, productExists: true, inCart: false,
                available: product.availableStock > 0, currentQtyInCart: 0, availableStock: product.availableStock,
            }),
        }))
    }

    async function handleAddItem(product: Product) {
        const token = sessionStorage.getItem('access_token') ?? ''
        const quantity = quantities[product.productId] ?? '1'
        const errorCode = validateQuantityChange({
            operation: 'add', quantity, productExists: true, inCart: false,
            available: product.availableStock > 0, currentQtyInCart: 0, availableStock: product.availableStock,
        })
        setQuantityErrors((current) => ({ ...current, [product.productId]: errorCode }))
        if (errorCode !== 'OK' || !token) return

        setAddingProductId(product.productId)
        setError('')
        setNotice('')
        try {
            const cart = await store.addItem(token, product.productId, Number(quantity))
            setItemCount(cart.itemCount)
            setNotice('เพิ่มสินค้าลงตะกร้าแล้ว')
        } catch (requestError) {
            const result = getErrorMessage(requestError)
            setError(result.message)
            setErrorCode(result.code)
        } finally {
            setAddingProductId(null)
        }
    }

    const isAdmin = user?.role === 'admin'

    return (
        <>
            <header className="navbar">
                <div className="nav-inner">
                    <a className="brand" href="/products"><span aria-hidden="true">☕</span>Bean Cart</a>
                    <nav aria-label="Main navigation">
                        <a data-testid={isAdmin ? 'nav-admin-products' : 'nav-products'} className="nav-active" href={isAdmin ? '/admin/products' : '/products'}>{isAdmin ? 'จัดการสินค้า' : 'สินค้า'}</a>
                        {isAdmin ? <a data-testid="nav-admin-coupons" href="/admin/coupons">จัดการคูปอง</a> : <><a data-testid="nav-cart" href="/cart">ตะกร้า <span className="badge">{itemCount}</span></a><a data-testid="nav-orders" href="/orders">ออเดอร์ของฉัน</a></>}
                    </nav>
                    <div className="nav-user">
                        <span>{user?.username ?? ''}</span>
                        {user?.role && <span className={`chip ${isAdmin ? 'chip-blue' : 'chip-green'}`}>{user.role}</span>}
                        <a className="btn btn-outline small" href="/login" onClick={() => { sessionStorage.removeItem('access_token'); sessionStorage.removeItem('auth_user') }}>ออกจากระบบ</a>
                    </div>
                </div>
            </header>
            <div className="content">
                <main data-testid="page-products">
                    <div className="title-row"><h1>สินค้า</h1></div>
                    {!hasToken && <div className="message message-error" data-testid="app-message" data-kind="error" data-code="AUTH_REQUIRED" role="alert">กรุณาเข้าสู่ระบบเพื่อดูสินค้า <a href="/login">เข้าสู่ระบบ</a></div>}
                    {error && <div className="message message-error" data-testid="app-message" data-kind="error" data-code={errorCode} role="alert">{error}</div>}
                    {notice && <div className="message message-info" data-testid="app-message" data-kind="info" data-code="" role="status">{notice}</div>}
                    {isLoading && <p role="status">กำลังโหลดสินค้า...</p>}
                    {!isLoading && hasToken && !error && products.length === 0 && <p className="muted">ยังไม่มีสินค้า</p>}
                    {!isLoading && !error && products.length > 0 && (
                        <div className="product-grid">
                            {products.map((product) => {
                                const quantity = quantities[product.productId] ?? '1'
                                const errorCode = quantityErrors[product.productId] ?? 'OK'
                                const quantityError = errorCode === 'OK' ? '' : quantityErrorMessage(errorCode, product.availableStock)
                                return (
                                    <article className="card product-card" data-testid={`product-row-${product.productId}`} key={product.productId}>
                                        <img className="product-card-image" src="/images/coffee-beans.png" alt={`รูปสินค้า ${product.name}`} />
                                        <h2 data-testid="product-name">{product.name}</h2>
                                        <strong className="price" data-testid="product-price" data-value={product.price}>{formatPrice(product.price)}</strong>
                                        <div className="muted product-stock" data-testid="product-stock" data-value={product.availableStock}>
                                            <span>{product.weightGram.toLocaleString('en-US')} g</span><span>คงเหลือ {product.availableStock}</span>
                                        </div>
                                        <div className="product-action">
                                            <div className="field">
                                                <label htmlFor={`product-add-qty-${product.productId}`}>จำนวน</label>
                                                <input id={`product-add-qty-${product.productId}`} data-testid="product-add-qty" type="number" min="1" max={Math.min(10, product.availableStock)} step="1" required value={quantity} disabled={product.availableStock < 1} aria-invalid={Boolean(quantityError)} aria-describedby={quantityError ? `product-add-qty-error-${product.productId}` : undefined} onChange={(event) => handleQuantityChange(product, event)} />
                                                {quantityError && <p className="login-field-error" id={`product-add-qty-error-${product.productId}`} data-testid="app-message" data-kind="error" data-code={errorCode} role="alert">{quantityError}</p>}
                                            </div>
                                            <button type="button" data-testid="product-add-button" className="btn btn-primary" disabled={product.availableStock < 1 || Boolean(quantityError) || addingProductId === product.productId} onClick={() => handleAddItem(product)}>{addingProductId === product.productId ? 'กำลังเพิ่ม...' : 'เพิ่มลงตะกร้า'}</button>
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
