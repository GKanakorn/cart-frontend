'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { store } from '../lib/store-service'
import { StoreApiError, type Order } from '../lib/store-contract'
import OrderSummary from './order-summary'
import { Button, Icon, Message, Shell } from './store-ui'

export default function SuccessPage() {
    const router = useRouter()
    const [order, setOrder] = useState<Order | null>(null)
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')

    useEffect(() => {
        const token = sessionStorage.getItem('access_token') ?? ''
        if (!token) {
            router.replace('/login')
            return
        }

        async function loadOrder() {
            try {
                const cached = JSON.parse(sessionStorage.getItem('active_order') ?? 'null') as Order | null
                if (cached?.status === 'ชำระเงินแล้ว') {
                    setOrder(cached)
                    return
                }
                const { orders } = await store.listOrders(token)
                const paidOrder = orders.find((item) => item.status === 'ชำระเงินแล้ว')
                if (!paidOrder) {
                    router.replace('/cart')
                    return
                }
                const details = await store.viewOrder(token, paidOrder.orderId)
                setOrder(details)
                sessionStorage.setItem('active_order', JSON.stringify(details))
            } catch (loadError) {
                setError(loadError instanceof Error ? loadError.message : 'โหลดออเดอร์ไม่สำเร็จ')
                setErrorCode(loadError instanceof StoreApiError ? loadError.code : '')
            }
        }
        void loadOrder()
    }, [router])

    async function continueShopping() {
        const token = sessionStorage.getItem('access_token') ?? ''
        try {
            await store.continueShopping(token)
            sessionStorage.removeItem('active_order')
            router.replace('/cart')
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : 'ทำรายการไม่สำเร็จ')
            setErrorCode(actionError instanceof StoreApiError ? actionError.code : '')
        }
    }

    return (
        <Shell active="cart">
            <main data-testid="page-success">
                {error && <Message kind="error" code={errorCode}>{error}</Message>}
                {order && <>
                    <div className="success-wrap">
                        <Icon kind="check" />
                        <h1>สั่งซื้อสำเร็จ</h1>
                        <p>หมายเลขออเดอร์ <strong data-testid="success-order-id">{order.orderId}</strong></p>
                        <span className="chip chip-green" data-status={order.status}>{order.status}</span>
                    </div>
                    <OrderSummary variant="success" order={order} />
                    <Button id="continue-shopping-button" onClick={continueShopping}>เลือกซื้อสินค้าต่อ</Button>
                </>}
            </main>
        </Shell>
    )
}