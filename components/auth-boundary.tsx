'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Message } from './store-ui'

type AuthUser = { role?: 'customer' | 'admin' }

function roleForPath(pathname: string): AuthUser['role'] | null {
    if (pathname.startsWith('/admin/')) return 'admin'
    if (['/products', '/cart', '/checkout', '/success', '/orders'].includes(pathname) || pathname.startsWith('/orders/')) return 'customer'
    return null
}

export default function AuthBoundary({ children }: { children: ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const requiredRole = roleForPath(pathname)
    const [readyPath, setReadyPath] = useState<string | null>(null)
    const [forbiddenMessage, setForbiddenMessage] = useState(false)

    useEffect(() => {
        if (sessionStorage.getItem('auth_forbidden_flash') === '1') {
            sessionStorage.removeItem('auth_forbidden_flash')
            setForbiddenMessage(true)
        }

        if (!requiredRole) {
            setReadyPath(pathname)
            return
        }

        const token = sessionStorage.getItem('access_token')
        let user: AuthUser | null = null
        try {
            user = JSON.parse(sessionStorage.getItem('auth_user') ?? 'null') as AuthUser | null
        } catch {
            sessionStorage.removeItem('auth_user')
        }
        if (!user?.role) {
            const roleHint = sessionStorage.getItem('auth_role_hint')
            if (roleHint === 'customer' || roleHint === 'admin') user = { role: roleHint }
        }

        if (!token || !user?.role) {
            const query = new URLSearchParams(window.location.search).toString()
            const next = `${pathname}${query ? `?${query}` : ''}`
            const errorCode = user?.role && user.role !== requiredRole
                ? 'AUTH_FORBIDDEN'
                : 'AUTH_REQUIRED'
            router.replace(`/login?next=${encodeURIComponent(next)}&error=${errorCode}`)
            return
        }

        if (user.role !== requiredRole) {
            sessionStorage.setItem('auth_forbidden_flash', '1')
            router.replace(user.role === 'admin' ? '/admin/products' : '/products')
            return
        }

        setReadyPath(pathname)
    }, [pathname, requiredRole, router])

    useEffect(() => {
        if (!forbiddenMessage) return
        const timeout = window.setTimeout(() => setForbiddenMessage(false), 8000)
        return () => window.clearTimeout(timeout)
    }, [forbiddenMessage])

    if (requiredRole && readyPath !== pathname) {
        return <main role="status" aria-live="polite">กำลังตรวจสอบการเข้าสู่ระบบ...</main>
    }

    return (
        <>
            {forbiddenMessage && (
                <div className="auth-boundary-message">
                    <Message kind="error" code="AUTH_FORBIDDEN">คุณไม่มีสิทธิ์เข้าถึงหน้านี้</Message>
                </div>
            )}
            {children}
        </>
    )
}
