 'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { store } from '../lib/store-service'
import { StoreApiError, type OrderStatus } from '../lib/store-contract'
import { Button, Chip, PageTitle, Shell, Message } from './store-ui'

type OrderListItem = { orderId: string; status: OrderStatus; netTotal: number; createdAt: string }

export default function OrdersPage() {
    const [orders, setOrders] = useState<OrderListItem[]>([])
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const token = sessionStorage.getItem('access_token') ?? ''
        store.listOrders(token)
            .then((result) => setOrders(result.orders))
            .catch((requestError: unknown) => {
                setError(requestError instanceof Error ? requestError.message : 'โหลดรายการออเดอร์ไม่สำเร็จ')
                setErrorCode(requestError instanceof StoreApiError ? requestError.code : '')
            })
            .finally(() => setIsLoading(false))
    }, [])

    return (
        <Shell active="orders">
            <main data-testid="page-orders">
                <PageTitle>ออเดอร์ของฉัน</PageTitle>
                {error && <Message kind="error" code={errorCode}>{error}</Message>}
                {isLoading && <p role="status">กำลังโหลดออเดอร์...</p>}
                {!isLoading && !error && orders.length === 0 && <p className="muted">ยังไม่มีออเดอร์</p>}
                {!isLoading && orders.length > 0 && <div className="table-wrap">
                    <table>
                        <thead><tr><th>หมายเลขออเดอร์</th><th>สถานะ</th><th>ยอดสุทธิ</th><th>วันที่</th><th>ว่าง</th></tr></thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr data-testid={`order-row-${order.orderId}`} key={order.orderId}>
                                    <td>{order.orderId}</td>
                                    <td><Chip status={order.status}><span data-testid="order-status">{order.status}</span></Chip></td>
                                    <td data-testid="order-total" data-value={order.netTotal}>{`฿${order.netTotal.toLocaleString('en-US')}`}</td>
                                    <td>{new Date(order.createdAt).toLocaleDateString('th-TH')}</td>
                                    <td><Link className="btn btn-link" data-testid="order-view" href={`/orders/${encodeURIComponent(order.orderId)}`}>ดูรายละเอียด</Link></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>}
            </main>
        </Shell>
    )
}