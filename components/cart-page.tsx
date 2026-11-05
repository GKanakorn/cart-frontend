
'use client'

import { useEffect, useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { store } from '../lib/store-service'
import { StoreApiError, type CartSnapshot, type Speed, type Zone } from '../lib/store-contract'
import { quantityErrorMessage, validateQuantityChange, type QuantityErrorCode } from '../lib/form-validation'
import { Button, Chip, Message, PageTitle, Shell } from './store-ui'

function errorDetails(error: unknown) {
    if (error instanceof StoreApiError) {
        return {
            message: error.message,
            code: error.code,
        }
    }

    return {
        message: error instanceof Error ? error.message : 'ทำรายการไม่สำเร็จ',
        code: '',
    }
}

function isAbortError(error: unknown, signal?: AbortSignal) {
    return (
        signal?.aborted === true ||
        (error instanceof Error && error.name === 'AbortError')
    )
}

export default function CartPage() {
    const router = useRouter()

    const [cart, setCart] = useState<CartSnapshot | null>(null)
    const [quantities, setQuantities] = useState<Record<string, string>>({})
    const [quantityErrors, setQuantityErrors] = useState<Record<string, QuantityErrorCode | undefined>>({})
    const [quantityActionErrors, setQuantityActionErrors] = useState<Record<string, { message: string; code: string } | undefined>>({})
    const [couponInput, setCouponInput] = useState('')
    const [zone, setZone] = useState<Zone>('inCity')
    const [speed, setSpeed] = useState<Speed>('standard')
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isWorking, setIsWorking] = useState(false)

    async function loadCart(signal?: AbortSignal) {
        const token = sessionStorage.getItem('access_token') ?? ''

        if (!token) {
            if (signal?.aborted) return

            setError('กรุณาเข้าสู่ระบบ')
            setErrorCode('AUTH_REQUIRED')
            setIsLoading(false)
            return
        }

        try {
            // 1. โหลด Cart
            const nextCart = await store.viewCart(token, signal)

            if (signal?.aborted) return

            setCart(nextCart)

            setQuantities(
                Object.fromEntries(
                    nextCart.items.map((item) => [
                        item.productId,
                        String(item.quantity),
                    ])
                )
            )

            // 2. ตรวจสอบกรณี Cart อยู่ในขั้นตอนชำระเงินหรือสำเร็จ
            if (
                nextCart.stage === 'ชำระเงิน' ||
                nextCart.stage === 'สำเร็จ'
            ) {
                const { orders } = await store.listOrders(token)

                if (signal?.aborted) return

                const status =
                    nextCart.stage === 'ชำระเงิน'
                        ? 'รอชำระเงิน'
                        : 'ชำระเงินแล้ว'

                const active = orders.find(
                    (order) => order.status === status
                )

                if (active) {
                    const order = await store.viewOrder(
                        token,
                        active.orderId
                    )

                    if (signal?.aborted) return

                    sessionStorage.setItem(
                        'active_order',
                        JSON.stringify(order)
                    )

                    router.replace(
                        nextCart.stage === 'ชำระเงิน'
                            ? '/checkout'
                            : '/success'
                    )
                }
            }
        } catch (requestError) {
            // ไม่แสดง Error เมื่อ Request ถูกยกเลิก
            if (isAbortError(requestError, signal)) {
                return
            }

            const details = errorDetails(requestError)

            setError(details.message)
            setErrorCode(details.code)
        } finally {
            if (!signal?.aborted) {
                setIsLoading(false)
            }
        }
    }

    useEffect(() => {
        const controller = new AbortController()

        void loadCart(controller.signal)

        return () => {
            controller.abort()
        }
    }, [])

    function setQuantityInput(
        productId: string,
        isAvailable: boolean,
        value: string
    ) {
        setError('')
        setErrorCode('')

        setQuantityActionErrors((current) => ({
            ...current,
            [productId]: undefined,
        }))

        setQuantities((current) => ({
            ...current,
            [productId]: value,
        }))

        setQuantityErrors((current) => ({
            ...current,
            [productId]: validateQuantityChange({
                operation: 'update',
                quantity: value,
                productExists: true,
                inCart: true,
                available: isAvailable,
                currentQtyInCart: 1,
                availableStock: Number.MAX_SAFE_INTEGER,
            }),
        }))
    }

    function handleQuantityChange(
        productId: string,
        isAvailable: boolean,
        event: ChangeEvent<HTMLInputElement>
    ) {
        setQuantityInput(
            productId,
            isAvailable,
            event.currentTarget.value
        )
    }

    function adjustCartQuantity(
        productId: string,
        isAvailable: boolean,
        amount: number
    ) {
        const current = Number(quantities[productId] ?? '1')
        const next = Math.max(1, Math.min(10, current + amount))

        setQuantityInput(
            productId,
            isAvailable,
            String(next)
        )
    }

    async function runCartAction(
        action: () => Promise<CartSnapshot>,
        quantityProductId?: string
    ) {
        setIsWorking(true)
        setError('')
        setErrorCode('')

        try {
            setCart(await action())
        } catch (requestError) {
            const details = errorDetails(requestError)

            if (quantityProductId) {
                setQuantityActionErrors((current) => ({
                    ...current,
                    [quantityProductId]: {
                        message: details.message,
                        code: details.code,
                    },
                }))
            } else {
                setError(details.message)
                setErrorCode(details.code)
            }
        } finally {
            setIsWorking(false)
        }
    }

    async function handleUpdate(
        productId: string,
        isAvailable: boolean
    ) {
        const quantityText = quantities[productId] ?? ''

        const validationCode = validateQuantityChange({
            operation: 'update',
            quantity: quantityText,
            productExists: true,
            inCart: true,
            available: isAvailable,
            currentQtyInCart: 1,
            availableStock: Number.MAX_SAFE_INTEGER,
        })

        setQuantityErrors((current) => ({
            ...current,
            [productId]: validationCode,
        }))

        if (validationCode !== 'OK') return

        const token = sessionStorage.getItem('access_token') ?? ''

        await runCartAction(
            () => store.updateQuantity(
                token,
                productId,
                Number(quantityText)
            ),
            productId
        )
    }

    async function handleRemove(productId: string) {
        const token = sessionStorage.getItem('access_token') ?? ''

        await runCartAction(
            () => store.removeItem(token, productId)
        )
    }

    async function handleApplyCoupon() {
        const token = sessionStorage.getItem('access_token') ?? ''

        setIsWorking(true)
        setError('')
        setErrorCode('')

        try {
            setCart(
                await store.applyCoupon(token, couponInput)
            )

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
            const result = await store.pressCheckout(
                token,
                zone,
                speed
            )

            sessionStorage.setItem(
                'active_order',
                JSON.stringify(result)
            )

            if (result.notice) {
                sessionStorage.setItem(
                    'checkout_notice',
                    JSON.stringify(result.notice)
                )
            } else {
                sessionStorage.removeItem('checkout_notice')
            }

            router.push('/checkout')
        } catch (requestError) {
            const details = errorDetails(requestError)

            setError(details.message)
            setErrorCode(details.code)
        } finally {
            setIsWorking(false)
        }
    }

    return (
        <Shell active="cart">
            <main data-testid="page-cart">
                <PageTitle>ตะกร้า</PageTitle>

                {error && errorCode !== 'COUPON_INVALID' && (
                    <Message kind="error" code={errorCode}>
                        {error}
                    </Message>
                )}

                {isLoading && (
                    <p role="status">กำลังโหลดตะกร้า...</p>
                )}

                {!isLoading && cart && (
                    <div className="two-col">
                        <section>
                            <div className="table-wrap">
                                <table className="cart-table">
                                    <thead>
                                        <tr>
                                            <th>สินค้า</th>
                                            <th className="numeric-cell">ราคาต่อชิ้น</th>
                                            <th className="center-cell">จำนวน</th>
                                            <th className="center-cell">ความพร้อมขาย</th>
                                            <th className="center-cell">จัดการ</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {cart.items.map((item) => {
                                            const quantityText =
                                                quantities[item.productId] ??
                                                String(item.quantity)

                                            const validationCode =
                                                quantityErrors[item.productId] ?? 'OK'

                                            const quantityError =
                                                validationCode === 'OK'
                                                    ? ''
                                                    : quantityErrorMessage(
                                                        validationCode,
                                                        item.quantity
                                                    )

                                            const quantityActionError =
                                                quantityActionErrors[item.productId]

                                            return (
                                                <tr
                                                    data-testid={`cart-line-${item.productId}`}
                                                    key={item.productId}
                                                >
                                                    <td data-testid="cart-line-name">
                                                        {item.name}
                                                    </td>

                                                    <td
                                                        className="numeric-cell"
                                                        data-testid="cart-line-unit-price"
                                                        data-value={item.unitPrice}
                                                    >
                                                        {`฿${item.unitPrice.toLocaleString('en-US')}`}
                                                    </td>

                                                    <td className="center-cell">
                                                        <div className="inline-field">
                                                            <label
                                                                htmlFor={`cart-qty-${item.productId}`}
                                                                className="sr-only"
                                                            >
                                                                จำนวน {item.name}
                                                            </label>

                                                            <div
                                                                className="quantity-control quantity-control-cart"
                                                                data-testid="cart-line-qty"
                                                                data-value={
                                                                    Number.isInteger(Number(quantityText))
                                                                        ? Number(quantityText)
                                                                        : item.quantity
                                                                }
                                                            >
                                                                <button
                                                                    type="button"
                                                                    className="quantity-step"
                                                                    data-testid="cart-qty-decrease"
                                                                    aria-label={`ลดจำนวน ${item.name}`}
                                                                    disabled={Number(quantityText) <= 1}
                                                                    onClick={() =>
                                                                        adjustCartQuantity(
                                                                            item.productId,
                                                                            item.available,
                                                                            -1
                                                                        )
                                                                    }
                                                                >
                                                                    −
                                                                </button>

                                                                <input
                                                                    id={`cart-qty-${item.productId}`}
                                                                    data-testid="cart-line-qty-input"
                                                                    type="number"
                                                                    min="1"
                                                                    max="10"
                                                                    step="1"
                                                                    value={quantityText}
                                                                    aria-label={`จำนวน ${item.name}`}
                                                                    aria-invalid={Boolean(quantityError)}
                                                                    onChange={(event) =>
                                                                        handleQuantityChange(
                                                                            item.productId,
                                                                            item.available,
                                                                            event
                                                                        )
                                                                    }
                                                                />

                                                                <button
                                                                    type="button"
                                                                    className="quantity-step"
                                                                    data-testid="cart-qty-increase"
                                                                    aria-label={`เพิ่มจำนวน ${item.name}`}
                                                                    disabled={Number(quantityText) >= 10}
                                                                    onClick={() =>
                                                                        adjustCartQuantity(
                                                                            item.productId,
                                                                            item.available,
                                                                            1
                                                                        )
                                                                    }
                                                                >
                                                                    +
                                                                </button>
                                                            </div>

                                                            <Button
                                                                variant="outline small"
                                                                data-testid="cart-line-update"
                                                                disabled={
                                                                    isWorking ||
                                                                    Boolean(quantityError) ||
                                                                    Number(quantityText) === item.quantity
                                                                }
                                                                onClick={() =>
                                                                    void handleUpdate(
                                                                        item.productId,
                                                                        item.available
                                                                    )
                                                                }
                                                            >
                                                                อัปเดต
                                                            </Button>
                                                        </div>

                                                        {quantityError ? (
                                                            <p
                                                                className="login-field-error"
                                                                data-testid="app-message"
                                                                data-kind="error"
                                                                data-code={validationCode}
                                                                role="alert"
                                                            >
                                                                {quantityError}
                                                            </p>
                                                        ) : (
                                                            quantityActionError && (
                                                                <p
                                                                    className="login-field-error"
                                                                    data-testid="app-message"
                                                                    data-kind="error"
                                                                    data-code={quantityActionError.code}
                                                                    role="alert"
                                                                >
                                                                    {quantityActionError.message}
                                                                </p>
                                                            )
                                                        )}
                                                    </td>

                                                    <td className="center-cell">
                                                        <Chip
                                                            status={
                                                                item.available
                                                                    ? 'พร้อมขาย'
                                                                    : 'ไม่พร้อมขาย'
                                                            }
                                                        >
                                                            <span
                                                                data-testid="cart-line-availability"
                                                                data-available={
                                                                    item.available ? 'true' : 'false'
                                                                }
                                                            >
                                                                {item.available
                                                                    ? 'พร้อมขาย'
                                                                    : 'ไม่พร้อมขาย'}
                                                            </span>
                                                        </Chip>
                                                    </td>

                                                    <td className="center-cell">
                                                        <Button
                                                            variant="danger small"
                                                            data-testid="cart-line-remove"
                                                            disabled={isWorking}
                                                            onClick={() =>
                                                                void handleRemove(item.productId)
                                                            }
                                                        >
                                                            ลบ
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {cart.itemCount === 0 && (
                                <div data-testid="cart-empty-message">
                                    <Message kind="info">ตะกร้าว่าง</Message>
                                </div>
                            )}

                            <div className="coupon-row">
                                <div className="field">
                                    <label htmlFor="coupon-input">
                                        รหัสคูปอง
                                    </label>

                                    <input
                                        id="coupon-input"
                                        data-testid="coupon-input"
                                        value={couponInput}
                                        onChange={(event) =>
                                            setCouponInput(event.currentTarget.value)
                                        }
                                    />

                                    {error && errorCode === 'COUPON_INVALID' && (
                                        <p
                                            className="login-field-error"
                                            data-testid="app-message"
                                            data-kind="error"
                                            data-code={errorCode}
                                            role="alert"
                                        >
                                            {error}
                                        </p>
                                    )}
                                </div>

                                <Button
                                    id="coupon-apply"
                                    data-testid="coupon-apply"
                                    disabled={isWorking || !couponInput}
                                    onClick={() => void handleApplyCoupon()}
                                >
                                    ใช้คูปอง
                                </Button>
                            </div>

                            {cart.couponCode && (
                                <div className="muted coupon-used">
                                    คูปองที่ใช้:{' '}
                                    <Chip status="พร้อมขาย">
                                        <span data-testid="cart-coupon-code">
                                            {cart.couponCode}
                                        </span>
                                    </Chip>
                                </div>
                            )}
                        </section>

                        <aside className="card summary" data-testid="cart-summary">
                            <h2>สรุปคำสั่งซื้อ</h2>

                            <div className="summary-line">
                                <span>ยอดรวมสินค้า</span>
                                <strong
                                    data-testid="cart-subtotal"
                                    data-value={cart.subtotal}
                                >
                                    {`฿${cart.subtotal.toLocaleString('en-US')}`}
                                </strong>
                            </div>

                            <div className="field">
                                <label htmlFor="zone-select">
                                    โซนจัดส่ง
                                </label>

                                <select
                                    id="zone-select"
                                    data-testid="zone-select"
                                    value={zone}
                                    onChange={(event) =>
                                        setZone(event.currentTarget.value as Zone)
                                    }
                                >
                                    <option value="inCity">ในเมือง</option>
                                    <option value="upcountry">ต่างจังหวัด</option>
                                    <option value="remote">พื้นที่ห่างไกล</option>
                                </select>
                            </div>

                            <div className="field">
                                <label htmlFor="speed-select">
                                    ความเร็ว
                                </label>

                                <select
                                    id="speed-select"
                                    data-testid="speed-select"
                                    value={speed}
                                    onChange={(event) =>
                                        setSpeed(event.currentTarget.value as Speed)
                                    }
                                >
                                    <option value="standard">ปกติ</option>
                                    <option value="express">ด่วน</option>
                                </select>
                            </div>

                            <Button
                                id="checkout-button"
                                data-testid="checkout-button"
                                disabled={!cart.checkoutEnabled || isWorking}
                                onClick={() => void handleCheckout()}
                            >
                                ชำระเงิน
                            </Button>
                        </aside>
                    </div>
                )}
            </main>
        </Shell>
    )
}
