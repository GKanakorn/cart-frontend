 'use client'

import { useEffect, useState } from 'react'
import { store } from '../lib/store-service'
import { StoreApiError, type Coupon } from '../lib/store-contract'
import { Button, Chip, PageTitle, Shell, Message } from './store-ui'

export default function AdminCouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    async function loadCoupons() {
        const token = sessionStorage.getItem('access_token') ?? ''
        try {
            const result = await store.listCoupons(token)
            setCoupons(result.coupons)
            setError('')
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'โหลดคูปองไม่สำเร็จ')
            setErrorCode(requestError instanceof StoreApiError ? requestError.code : '')
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { void loadCoupons() }, [])

    async function toggleCoupon(coupon: Coupon) {
        const token = sessionStorage.getItem('access_token') ?? ''
        const status = coupon.status === 'เปิดใช้' ? 'ปิดใช้' : 'เปิดใช้'
        try {
            const updated = await store.setCouponStatus(token, coupon.code, status)
            setCoupons((current) => current.map((item) => item.code === updated.code ? updated : item))
            setError('')
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'เปลี่ยนสถานะคูปองไม่สำเร็จ')
            setErrorCode(requestError instanceof StoreApiError ? requestError.code : '')
        }
    }

    return (
        <Shell active="admin-coupons" admin>
            <main data-testid="page-admin-coupons">
                <PageTitle>จัดการคูปอง</PageTitle>
                {error && <Message kind="error" code={errorCode}>{error}</Message>}
                {isLoading && <p role="status">กำลังโหลดคูปอง...</p>}
                {!isLoading && !error && coupons.length === 0 && <p className="muted">ไม่มีคูปอง</p>}
                {!isLoading && coupons.length > 0 && <div className="table-wrap">
                    <table>
                        <thead><tr><th>รหัส</th><th>ส่วนลด (%)</th><th>ยอดขั้นต่ำ</th><th>สถานะ</th><th>ว่าง</th></tr></thead>
                        <tbody>
                            {coupons.map((coupon) => (
                                <tr data-testid={`admin-coupon-row-${coupon.code}`} key={coupon.code}>
                                    <td>{coupon.code}</td>
                                    <td data-testid="admin-coupon-percent" data-value={coupon.percent}>{coupon.percent}%</td>
                                    <td data-testid="admin-coupon-min-spend" data-value={coupon.minSpend}>{`฿${coupon.minSpend.toLocaleString('en-US')}`}</td>
                                    <td><Chip status={coupon.status}><span data-testid="admin-coupon-status">{coupon.status}</span></Chip></td>
                                    <td><Button variant={coupon.status === 'เปิดใช้' ? 'danger small' : 'outline small'} data-testid="admin-coupon-toggle-status" onClick={() => void toggleCoupon(coupon)}>{coupon.status === 'เปิดใช้' ? 'ปิดใช้' : 'เปิดใช้'}</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>}
            </main>
        </Shell>
    )
}