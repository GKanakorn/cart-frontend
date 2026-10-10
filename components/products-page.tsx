'use client'

import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { getProducts, ProductsApiError, type Product } from '../lib/products-api'

type AuthUser = {
    username?: string
    role?: string
}

function formatPrice(price: number) {
    return `฿${price.toLocaleString('en-US')}`
}

function validateQuantity(value: string, availableStock: number) {
    if (!value.trim()) return 'กรุณากรอกจำนวน'

    const quantity = Number(value)
    if (!Number.isInteger(quantity)) return 'จำนวนต้องเป็นจำนวนเต็ม'
    if (quantity < 1) return 'จำนวนต้องอย่างน้อย 1'
    if (quantity > availableStock) return `มีสินค้าเหลือ ${availableStock} ชิ้น`

    return ''
}

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [user, setUser] = useState<AuthUser | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [hasToken, setHasToken] = useState(true)
    const [quantities, setQuantities] = useState<Record<string, string>>({})
    const [quantityErrors, setQuantityErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        const token = sessionStorage.getItem('access_token')
        const storedUser = sessionStorage.getItem('auth_user')

        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser) as AuthUser)
            } catch {
                sessionStorage.removeItem('auth_user')
            }
        }

        if (!token) {
            setHasToken(false)
            setIsLoading(false)
            return
        }

        const controller = new AbortController()
        getProducts(token, controller.signal)
            .then(setProducts)
            .catch((requestError: unknown) => {
                if (requestError instanceof Error && requestError.name === 'AbortError') return
                if (requestError instanceof ProductsApiError && requestError.status === 401) {
                    sessionStorage.removeItem('access_token')
                    sessionStorage.removeItem('auth_user')
                    setHasToken(false)
                    setError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง')
                    return
                }
                setError(requestError instanceof Error ? requestError.message : 'โหลดสินค้าไม่สำเร็จ')
            })
            .finally(() => setIsLoading(false))

        return () => controller.abort()
    }, [])

    async function reloadProducts() {
        const token = sessionStorage.getItem('access_token')
        if (!token) {
            setHasToken(false)
            return
        }

        setIsLoading(true)
        setError('')
        try {
            setProducts(await getProducts(token))
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'โหลดสินค้าไม่สำเร็จ')
        } finally {
            setIsLoading(false)
        }
    }

    const isAdmin = user?.role?.toLowerCase() === 'admin'

    function handleQuantityChange(product: Product, event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value
        const id = String(product.productId)
        setQuantities((current) => ({ ...current, [id]: value }))
        setQuantityErrors((current) => ({
            ...current,
            [id]: validateQuantity(value, product.availableStock),
        }))
    }

    return (
        <>
            <header className="navbar">
                <div className="nav-inner">
                    <a className="brand" href="/products">
                        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
                            <path d="M6 1v3M10 1v3M14 1v3" />
                        </svg>
                        Bean Cart
                    </a>
                    <nav aria-label="Main navigation">
                        <a className="nav-active" href="/products">สินค้า</a>
                        <a href="/cart">ตะกร้า <span className="badge">2</span></a>
                        <a href="/orders">ออเดอร์ของฉัน</a>
                    </nav>
                    <div className="nav-user">
                        <span>{user?.username ?? ''}</span>
                        {user?.role && <span className={`chip ${isAdmin ? 'chip-blue' : 'chip-green'}`}>{user.role}</span>}
                        <a className="btn btn-outline small" href="/login" onClick={() => {
                            sessionStorage.removeItem('access_token')
                            sessionStorage.removeItem('auth_user')
                        }}>ออกจากระบบ</a>
                    </div>
                </div>
            </header>
            <div className="content">
                <main data-testid="page-products">
                    <div className="title-row"><h1>สินค้า</h1></div>
                    {!hasToken && (
                        <div className="message message-error" role="alert">
                            {error || 'กรุณาเข้าสู่ระบบเพื่อดูสินค้า'} <a href="/login">เข้าสู่ระบบ</a>
                        </div>
                    )}
                    {hasToken && error && (
                        <div className="message message-error" role="alert">
                            {error} <button type="button" className="btn btn-outline small" onClick={reloadProducts}>ลองอีกครั้ง</button>
                        </div>
                    )}
                    {isLoading && <p role="status">กำลังโหลดสินค้า...</p>}
                    {!isLoading && hasToken && !error && products.length === 0 && <p className="muted">ยังไม่มีสินค้า</p>}
                    {!isLoading && !error && products.length > 0 && (
                        <div className="product-grid">
                            {products.map((product) => {
                                const id = String(product.productId)
                                const quantity = quantities[id] ?? '1'
                                const quantityError = quantityErrors[id] || (quantity !== '1' ? validateQuantity(quantity, product.availableStock) : '')

                                return (
                                    <article className="card product-card" data-testid={`product-row-${product.productId}`} key={product.productId}>
                                        <img className="product-card-image" src="/images/coffee-beans.png" alt={`รูปสินค้า ${product.name}`} />
                                        <h2 data-testid={`product-name-${product.productId}`}>{product.name}</h2>
                                        <strong className="price" data-testid={`product-price-${product.productId}`} data-value={product.price}>{formatPrice(product.price)}</strong>
                                        <div className="muted product-stock" data-testid={`product-stock-${product.productId}`} data-value={product.availableStock}>
                                            <span>{product.weightGram.toLocaleString('en-US')} g</span>
                                            <span>คงเหลือ {product.availableStock}</span>
                                        </div>
                                        <div className="product-action">
                                            <div className="field">
                                                <label htmlFor={`product-add-qty-${product.productId}`}>จำนวน</label>
                                                <input
                                                    id={`product-add-qty-${product.productId}`}
                                                    type="number"
                                                    min="1"
                                                    max={product.availableStock}
                                                    step="1"
                                                    required
                                                    value={quantity}
                                                    disabled={product.availableStock < 1}
                                                    aria-invalid={Boolean(quantityError)}
                                                    aria-describedby={quantityError ? `product-add-qty-error-${product.productId}` : undefined}
                                                    onChange={(event) => handleQuantityChange(product, event)}
                                                />
                                                {quantityError && <p className="login-field-error" id={`product-add-qty-error-${product.productId}`} role="alert">{quantityError}</p>}
                                            </div>
                                            <button type="button" className="btn btn-primary" disabled={product.availableStock < 1 || Boolean(quantityError)}>เพิ่มลงตะกร้า</button>
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