'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { store } from '../lib/store-service'
import { StoreApiError, type Order } from '../lib/store-contract'
import OrderSummary from './order-summary'
import { Button, Chip, Message, PageTitle, Shell } from './store-ui'

export default function OrderDetailPage() {
    const params = useParams<{ orderId: string }>()
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
        store.viewOrder(token, params.orderId)
            .then(setOrder)
            .catch((requestError: unknown) => {
                setError(requestError instanceof Error ? requestError.message : 'โหลดออเดอร์ไม่สำเร็จ')
                setErrorCode(requestError instanceof StoreApiError ? requestError.code : '')
            })
    }, [params.orderId, router])

    return (
        <Shell active="orders">
            <main data-testid="page-order-detail">
                <Button variant="link back" onClick={() => router.push('/orders')}>← กลับไปรายการออเดอร์</Button>
                {error && <Message kind="error" code={errorCode}>{error}</Message>}
                {order && <>
                    <PageTitle><span data-testid="order-detail-id">{order.orderId}</span> <span className="muted order-id">{new Date(order.createdAt).toLocaleDateString('th-TH')}</span><Chip status={order.status}><span data-testid="order-detail-status">{order.status}</span></Chip></PageTitle>
                    <OrderSummary variant="order-detail" order={order} />
                </>}
            </main>
        </Shell>
    )
}