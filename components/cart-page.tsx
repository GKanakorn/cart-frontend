'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { store } from '../lib/store-service'
import { StoreApiError, type CartSnapshot, type Speed, type Zone } from '../lib/store-contract'
import { quantityErrorMessage, validateQuantityChange, type QuantityErrorCode } from '../lib/form-validation'
import { Button, Chip, Message, PageTitle, Shell } from './store-ui'

function errorDetails(error: unknown) {
    if (error instanceof StoreApiError) return { message: error.message, code: error.code, productIds: error.productIds }
    return { message: error instanceof Error ? error.message : 'ทำรายการไม่สำเร็จ', code: '', productIds: undefined }
}

export default function CartPage() {
    const router = useRouter()
    const [cart, setCart] = useState<CartSnapshot | null>(null)
    const [quantities, setQuantities] = useState<Record<string, string>>({})
    const [quantityErrors, setQuantityErrors] = useState<Record<string, QuantityErrorCode | undefined>>({})
    const [couponInput, setCouponInput] = useState('')
    const [zone, setZone] = useState<Zone>('inCity')
    const [speed, setSpeed] = useState<Speed>('standard')
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [errorProductIds, setErrorProductIds] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isWorking, setIsWorking] = useState(false)

    async function loadCart(signal?: AbortSignal) {
        const token = sessionStorage.getItem('access_token') ?? ''
        if (!token) {
            setError('กรุณาเข้าสู่ระบบ')
            setErrorCode('AUTH_REQUIRED')
            setIsLoading(false)
            return
        }

        try {
            const nextCart = await store.viewCart(token, signal)
            if (signal?.aborted) return
            setCart(nextCart)
            setQuantities(Object.fromEntries(nextCart.items.map((item) => [item.productId, String(item.quantity)])))
            if (nextCart.stage === 'ชำระเงิน' || nextCart.stage === 'สำเร็จ') {
                const { orders } = await store.listOrders(token)
                const status = nextCart.stage === 'ชำระเงิน' ? 'รอชำระเงิน' : 'ชำระเงินแล้ว'
                const active = orders.find((order) => order.status === status)
                if (active) {
                    const order = await store.viewOrder(token, active.orderId)
                    sessionStorage.setItem('active_order', JSON.stringify(order))
                    router.replace(nextCart.stage === 'ชำระเงิน' ? '/checkout' : '/success')
                }
            }
        } catch (requestError) {
            const details = errorDetails(requestError)
            setError(details.message)
            setErrorCode(details.code)
        } finally {
            if (!signal?.aborted) setIsLoading(false)
        }
    }

    useEffect(() => {
        const controller = new AbortController()
        void loadCart(controller.signal)
        return () => controller.abort()
    }, [])

    function handleQuantityChange(productId: string, isAvailable: boolean, event: ChangeEvent<HTMLInputElement>) {
        const value = event.currentTarget.value
        setQuantities((current) => ({ ...current, [productId]: value }))
        setQuantityErrors((current) => ({
            ...current,
            [productId]: validateQuantityChange({
                operation: 'update', quantity: value, productExists: true, inCart: true,
                available: isAvailable, currentQtyInCart: 1, availableStock: Number.MAX_SAFE_INTEGER,
            }),
        }))
    }

    async function runCartAction(action: () => Promise<CartSnapshot>) {
        setIsWorking(true)
        setError('')
        setErrorCode('')
        setErrorProductIds([])
        try {
            setCart(await action())
        } catch (requestError) {
            const details = errorDetails(requestError)
            setError(details.message)
            setErrorCode(details.code)
            setErrorProductIds(details.productIds ?? [])
        } finally {
            setIsWorking(false)
        }
    }

    async function handleUpdate(productId: string, isAvailable: boolean) {
        const quantityText = quantities[productId] ?? ''
        const errorCode = validateQuantityChange({
            operation: 'update', quantity: quantityText, productExists: true, inCart: true,
            available: isAvailable, currentQtyInCart: 1, availableStock: Number.MAX_SAFE_INTEGER,
        })
        setQuantityErrors((current) => ({ ...current, [productId]: errorCode }))
        if (errorCode !== 'OK') return
        const token = sessionStorage.getItem('access_token') ?? ''
        await runCartAction(() => store.updateQuantity(token, productId, Number(quantityText)))
    }

    async function handleRemove(productId: string) {
        const token = sessionStorage.getItem('access_token') ?? ''
        await runCartAction(() => store.removeItem(token, productId))
    }

    async function handleApplyCoupon() {
        const token = sessionStorage.getItem('access_token') ?? ''
        setIsWorking(true)
        setError('')
        try {
            setCart(await store.applyCoupon(token, couponInput))
            setCouponInput('')
        } catch (requestError) {
            const details = errorDetails(requestError)
            setError(details.message)
            setErrorCode(details.code)
        } finally {
            setIsWorking(false)
        }
    }

    async function handleCheckout() {
        const token = sessionStorage.getItem('access_token') ?? ''
        setIsWorking(true)
        setError('')
        setErrorCode('')
        try {
            const result = await store.pressCheckout(token, zone, speed)
            sessionStorage.setItem('active_order', JSON.stringify(result))
            if (result.notice) sessionStorage.setItem('checkout_notice', JSON.stringify(result.notice))
            else sessionStorage.removeItem('checkout_notice')
            router.push('/checkout')
        } catch (requestError) {
            const details = errorDetails(requestError)
            setError(details.message)
            setErrorCode(details.code)
            setErrorProductIds(details.productIds ?? [])
        } finally {
            setIsWorking(false)
        }
    }

    return (
        <Shell active="cart">
            <main data-testid="page-cart">
                <PageTitle>ตะกร้า</PageTitle>
                {error && <Message kind="error" code={errorCode}>{`${error}${errorProductIds.length > 0 ? ` (${errorProductIds.join(', ')})` : ''}`}</Message>}
                {isLoading && <p role="status">กำลังโหลดตะกร้า...</p>}
                {!isLoading && cart && (
                    <div className="two-col">
                        <section>
                            <div className="table-wrap">
                                <table>
                                    <thead><tr><th>ชื่อสินค้า</th><th>ราคา/ชิ้น</th><th>จำนวน</th><th>สถานะ</th><th>ว่าง</th></tr></thead>
                                    <tbody>
                                        {cart.items.map((item) => {
                                            const quantityText = quantities[item.productId] ?? String(item.quantity)
                                            const errorCode = quantityErrors[item.productId] ?? 'OK'
                                            const quantityError = errorCode === 'OK' ? '' : quantityErrorMessage(errorCode, item.quantity)
                                            return (
                                                <tr data-testid={`cart-line-${item.productId}`} key={item.productId}>
                                                    <td data-testid="cart-line-name">{item.name}</td>
                                                    <td data-testid="cart-line-unit-price" data-value={item.unitPrice}>{`฿${item.unitPrice.toLocaleString('en-US')}`}</td>
                                                    <td>
                                                        <div className="inline-field">
                                                            <label htmlFor={`cart-qty-${item.productId}`} className="sr-only">จำนวน {item.name}</label>
                                                            <span data-testid="cart-line-qty" data-value={item.quantity}>{item.quantity}</span>
                                                            <input id={`cart-qty-${item.productId}`} data-testid="cart-line-qty-input" type="number" min="1" max="10" step="1" value={quantityText} aria-label={`จำนวน ${item.name}`} aria-invalid={Boolean(quantityError)} onChange={(event) => handleQuantityChange(item.productId, item.available, event)} />
                                                            <Button variant="outline small" data-testid="cart-line-update" disabled={isWorking || Boolean(quantityError)} onClick={() => void handleUpdate(item.productId, item.available)}>อัปเดต</Button>
                                                        </div>
                                                        {quantityError && <p className="login-field-error" data-testid="app-message" data-kind="error" data-code={errorCode} role="alert">{quantityError}</p>}
                                                    </td>
                                                    <td><Chip status={item.available ? 'พร้อมขาย' : 'ไม่พร้อมขาย'}><span data-testid="cart-line-availability" data-available={item.available ? 'true' : 'false'}>{item.available ? 'พร้อมขาย' : 'ไม่พร้อมขาย'}</span></Chip></td>
                                                    <td><Button variant="danger small" data-testid="cart-line-remove" disabled={isWorking} onClick={() => void handleRemove(item.productId)}>ลบ</Button></td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {cart.itemCount === 0 && <Message kind="info">ตะกร้าว่าง</Message>}
                            <div className="coupon-row">
                                <div className="field"><label htmlFor="coupon-input">รหัสคูปอง</label><input id="coupon-input" data-testid="coupon-input" value={couponInput} onChange={(event) => setCouponInput(event.currentTarget.value)} /></div>
                                <Button id="coupon-apply" data-testid="coupon-apply" disabled={isWorking || !couponInput} onClick={() => void handleApplyCoupon()}>ใช้คูปอง</Button>
                            </div>
                            {cart.couponCode && <div className="muted coupon-used">คูปองที่ใช้: <Chip status="พร้อมขาย"><span data-testid="cart-coupon-code">{cart.couponCode}</span></Chip></div>}
                        </section>
                        <aside className="card summary">
                            <h2>สรุปคำสั่งซื้อ</h2>
                            <div className="summary-line"><span>ยอดรวมสินค้า</span><strong data-testid="cart-subtotal" data-value={cart.subtotal}>{`฿${cart.subtotal.toLocaleString('en-US')}`}</strong></div>
                            <div className="field"><label htmlFor="zone-select">โซนจัดส่ง</label><select id="zone-select" data-testid="zone-select" value={zone} onChange={(event) => setZone(event.currentTarget.value as Zone)}><option value="inCity">ในเมือง</option><option value="upcountry">ต่างจังหวัด</option><option value="remote">พื้นที่ห่างไกล</option></select></div>
                            <div className="field"><label htmlFor="speed-select">ความเร็ว</label><select id="speed-select" data-testid="speed-select" value={speed} onChange={(event) => setSpeed(event.currentTarget.value as Speed)}><option value="standard">ปกติ</option><option value="express">ด่วน</option></select></div>
                            <Button id="checkout-button" data-testid="checkout-button" disabled={!cart.checkoutEnabled || isWorking} onClick={() => void handleCheckout()}>ชำระเงิน</Button>
                        </aside>
                    </div>
                )}
            </main>
        </Shell>
    )
}
