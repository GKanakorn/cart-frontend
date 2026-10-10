'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { store } from '../lib/store-service'
import { StoreApiError, type Order } from '../lib/store-contract'
import OrderSummary from './order-summary'
import { Button, Chip, Message, PageTitle, Shell } from './store-ui'

function messageFrom(error: unknown) {
    if (error instanceof StoreApiError) return { message: error.message, code: error.code }
    return { message: error instanceof Error ? error.message : 'ทำรายการไม่สำเร็จ', code: '' }
}

export default function CheckoutPage() {
    const router = useRouter()
    const [order, setOrder] = useState<Order | null>(null)
    const [notice, setNotice] = useState('')
    const [noticeCode, setNoticeCode] = useState('')
    const [noticeKind, setNoticeKind] = useState<'notice' | 'info'>('notice')
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isWorking, setIsWorking] = useState(false)

    useEffect(() => {
        const token = sessionStorage.getItem('access_token') ?? ''
        try {
            const cached = JSON.parse(sessionStorage.getItem('active_order') ?? 'null') as Order | null
            if (cached?.orderId) setOrder(cached)
            const checkoutNotice = JSON.parse(sessionStorage.getItem('checkout_notice') ?? 'null') as { code?: string; message?: string } | null
            if (checkoutNotice?.message) {
                setNotice(checkoutNotice.message)
                setNoticeCode(checkoutNotice.code ?? 'COUPON_NOT_APPLICABLE')
            }
        } catch {
            sessionStorage.removeItem('active_order')
        }

        if (!token) {
            router.replace('/login')
            return
        }

        async function restoreOrder() {
            try {
                const cached = JSON.parse(sessionStorage.getItem('active_order') ?? 'null') as Order | null
                if (cached?.orderId) return
                const { orders } = await store.listOrders(token)
                const pendingOrder = orders.find((item) => item.status === 'รอชำระเงิน')
                if (!pendingOrder) {
                    router.replace('/cart')
                    return
                }
                const currentOrder = await store.viewOrder(token, pendingOrder.orderId)
                setOrder(currentOrder)
                sessionStorage.setItem('active_order', JSON.stringify(currentOrder))
            } catch (loadError) {
                const result = messageFrom(loadError)
                setError(result.message)
                setErrorCode(result.code)
            } finally {
                setIsLoading(false)
            }
        }
        void restoreOrder()
    }, [router])

    async function handlePaySuccess() {
        if (!order) return
        setIsWorking(true)
        try {
            await store.paySuccess(order.orderId)
            sessionStorage.setItem('active_order', JSON.stringify({ ...order, status: 'ชำระเงินแล้ว' }))
            sessionStorage.removeItem('checkout_notice')
            router.replace('/success')
        } catch (paymentError) {
            const result = messageFrom(paymentError)
            setError(result.message)
            setErrorCode(result.code)
        } finally {
            setIsWorking(false)
        }
    }

    async function handlePayFail() {
        if (!order) return
        setIsWorking(true)
        setError('')
        try {
            const result = await store.payFail(order.orderId)
            setNotice(result.message)
            setNoticeCode('')
            setNoticeKind('info')
        } catch (paymentError) {
            const result = messageFrom(paymentError)
            setError(result.message)
            setErrorCode(result.code)
        } finally {
            setIsWorking(false)
        }
    }

    async function handleCancel() {
        const token = sessionStorage.getItem('access_token') ?? ''
        setIsWorking(true)
        try {
            await store.cancelCheckout(token)
            sessionStorage.removeItem('active_order')
            sessionStorage.removeItem('checkout_notice')
            router.replace('/cart')
        } catch (cancelError) {
            const result = messageFrom(cancelError)
            setError(result.message)
            setErrorCode(result.code)
        } finally {
            setIsWorking(false)
        }
    }

    return (
        <Shell active="cart" message={notice ? <Message kind={noticeKind} code={noticeCode}>{notice}</Message> : undefined}>
            <main data-testid="page-checkout">
                <PageTitle>ชำระเงิน <span className="muted order-id" data-testid="checkout-order-id">{order?.orderId ?? 'กำลังโหลด...'}</span><Chip status="รอชำระเงิน">รอชำระเงิน</Chip></PageTitle>
                {error && <Message kind="error" code={errorCode}>{error}</Message>}
                {isLoading && <p role="status">กำลังโหลดออเดอร์...</p>}
                {order && <OrderSummary variant="checkout" order={order} />}
                {order && <div className="gateway">
                    <strong>จำลอง Payment Gateway (test only)</strong>
                    <p className="muted">ใช้สำหรับทดสอบผลลัพธ์การชำระเงินเท่านั้น</p>
                    <Button id="gateway-pay-success" disabled={isWorking} onClick={handlePaySuccess}>จำลองชำระสำเร็จ</Button>
                    <Button variant="grey" id="gateway-pay-fail" disabled={isWorking} onClick={handlePayFail}>จำลองชำระล้มเหลว</Button>
                </div>}
                {order && <Button variant="danger" id="cancel-checkout-button" disabled={isWorking} onClick={handleCancel}>ยกเลิกการชำระเงิน</Button>}
            </main>
        </Shell>
    )
}