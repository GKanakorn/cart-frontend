'use client'

import { useEffect, useState } from 'react'
import type * as React from 'react'
import { store } from '../lib/store-service'

type NavUser = { username?: string; role?: 'customer' | 'admin' }

function Cup({ size = 22 }: { size?: number }) {
    return (
        <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
            <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
            <path d="M6 1v3M10 1v3M14 1v3" />
        </svg>
    )
}

export function Icon({ kind }: { kind: 'error' | 'info' | 'check' | 'cart' }) {
    if (kind === 'check') return <span className="success-icon" aria-hidden="true">✓</span>
    if (kind === 'cart') {
        return (
            <svg aria-hidden="true" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
            </svg>
        )
    }
    return (
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d={kind === 'error' ? 'M12 8v4M12 16h.01' : 'M12 16v-4M12 8h.01'} />
        </svg>
    )
}

export function Chip({ children, status }: { children: React.ReactNode; status?: string }) {
    const color = status?.includes('ยกเลิก') || status?.includes('ปิด') || status === 'ไม่พร้อมขาย'
        ? 'chip-red'
        : status === 'รอชำระเงิน'
            ? 'chip-amber'
            : status?.includes('ลูกค้า') || status?.includes('ผู้ดูแล')
                ? 'chip-blue'
                : 'chip-green'

    return <span className={`chip ${color}`} data-status={status}>{children}</span>
}

export function Message({ kind, children, code = '' }: { kind: 'error' | 'notice' | 'info'; children: string; code?: string }) {
    return (
        <div className={`message message-${kind}`} data-testid="app-message" data-kind={kind} data-code={code} role={kind === 'error' ? 'alert' : 'status'}>
            <Icon kind={kind === 'error' ? 'error' : 'info'} />
            {children}
        </div>
    )
}

export function Button({ children, variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) {
    return <button type="button" className={`btn btn-${variant}`} {...props}>{children}</button>
}

export function Field({ label, id, children, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string; children?: React.ReactNode }) {
    return <div className="field"><label htmlFor={id}>{label}</label>{children ?? <input id={id} {...props} />}</div>
}

function Navbar({ active, admin = false }: { active: string; admin?: boolean }) {
    const [user, setUser] = useState<NavUser | null>(null)
    const [cartCount, setCartCount] = useState(0)
    const isAdmin = admin || user?.role === 'admin'

    useEffect(() => {
        let storedUser: NavUser | null = null
        try {
            storedUser = JSON.parse(sessionStorage.getItem('auth_user') ?? 'null') as NavUser | null
        } catch {
            sessionStorage.removeItem('auth_user')
        }
        if (storedUser) setUser(storedUser)

        const token = sessionStorage.getItem('access_token')
        if (token && storedUser?.role !== 'admin') {
            store.viewCart(token).then((cart) => setCartCount(cart.itemCount)).catch(() => setCartCount(0))
        }
    }, [])

    return (
        <header className="navbar">
            <div className="nav-inner">
                <a className="brand" href="/products"><Cup />Bean Cart</a>
                <nav aria-label="Main navigation">
                    {isAdmin ? (
                        <>
                            <a data-testid="nav-admin-products" className={active === 'admin-products' ? 'nav-active' : ''} href="/admin/products">จัดการสินค้า</a>
                            <a data-testid="nav-admin-coupons" className={active === 'admin-coupons' ? 'nav-active' : ''} href="/admin/coupons">จัดการคูปอง</a>
                        </>
                    ) : (
                        <>
                            <a data-testid="nav-products" className={active === 'products' ? 'nav-active' : ''} href="/products">สินค้า</a>
                            <a data-testid="nav-cart" className={active === 'cart' ? 'nav-active' : ''} href="/cart">ตะกร้า <span className="badge">{cartCount}</span></a>
                            <a data-testid="nav-orders" className={active === 'orders' ? 'nav-active' : ''} href="/orders">ออเดอร์ของฉัน</a>
                        </>
                    )}
                </nav>
                <div className="nav-user">
                    <span>{user?.username ?? ''}</span>
                    {user?.role && <Chip status={isAdmin ? 'ผู้ดูแล' : 'ลูกค้า'}>{isAdmin ? 'ผู้ดูแล' : 'ลูกค้า'}</Chip>}
                    <a className="btn btn-outline small" href="/login" onClick={() => { sessionStorage.removeItem('access_token'); sessionStorage.removeItem('auth_user') }}>ออกจากระบบ</a>
                </div>
            </div>
        </header>
    )
}

export function Shell({ children, active, admin, message }: { children: React.ReactNode; active: string; admin?: boolean; message?: React.ReactNode }) {
    return <><Navbar active={active} admin={admin} />{message}<div className="content">{children}</div></>
}

export function PageTitle({ children, suffix }: { children: React.ReactNode; suffix?: React.ReactNode }) {
    return <div className="title-row"><h1>{children}</h1>{suffix}</div>
}