'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { AuthApiError, login } from '../lib/auth-api'
import { getAuthMode } from '../lib/store-service'

type LoginErrors = {
    username?: string
    password?: string
}

export default function LoginForm() {
    const router = useRouter()
    const [errors, setErrors] = useState<LoginErrors>({})
    const [apiError, setApiError] = useState('')
    const [apiErrorCode, setApiErrorCode] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        if (new URLSearchParams(window.location.search).get('error') === 'AUTH_REQUIRED') {
            setApiError('กรุณาเข้าสู่ระบบก่อน')
            setApiErrorCode('AUTH_REQUIRED')
        }
    }, [])

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()

        const formData = new FormData(event.currentTarget)
        const username = String(formData.get('username') ?? '').trim()
        const password = String(formData.get('password') ?? '')
        const nextErrors: LoginErrors = {}

        if (!username) nextErrors.username = 'กรุณากรอก Username'
        if (!password) nextErrors.password = 'กรุณากรอก Password'

        setErrors(nextErrors)
        setApiError('')
        setApiErrorCode('')
        if (Object.keys(nextErrors).length > 0) return

        setIsSubmitting(true)
        try {
            const result = await login({ username, password })
            sessionStorage.setItem('access_token', result.token)
            sessionStorage.setItem('auth_user', JSON.stringify({ username, role: result.role, memberTier: result.memberTier }))
            const requestedNext = new URLSearchParams(window.location.search).get('next')
            const allowedNext = requestedNext && (
                ['/products', '/cart', '/checkout', '/success', '/orders', '/admin/products', '/admin/coupons'].includes(requestedNext)
                || requestedNext.startsWith('/orders/')
            )
            const destination = result.role === 'admin'
                ? allowedNext && requestedNext.startsWith('/admin/') ? requestedNext : '/admin/products'
                : allowedNext && !requestedNext.startsWith('/admin/') ? requestedNext : '/products'
            router.replace(destination)
        } catch (error) {
            if (error instanceof AuthApiError && error.status === 401) {
                setApiError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
                setApiErrorCode('AUTH_INVALID_CREDENTIALS')
            } else if (error instanceof Error) {
                setApiError(error.message)
                setApiErrorCode('')
            } else {
                setApiError('เข้าสู่ระบบไม่สำเร็จ กรุณาลองอีกครั้ง')
                setApiErrorCode('')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    function clearFieldError(field: keyof LoginErrors) {
        setErrors((current) => ({ ...current, [field]: undefined }))
        setApiError('')
        setApiErrorCode('')
    }

    return (
        <main className="login-page" data-testid="page-login">
            <form className="login-card" onSubmit={handleSubmit} noValidate>
                <div className="brand login-brand">
                    <img className="login-brand-icon" src="/Icon-Coffee-transparent.png" alt="" />
                    Roast & Roll
                </div>
                <h1>เข้าสู่ระบบ</h1>
                <div className="field">
                    <label htmlFor="login-username">Username</label>
                    <input
                        id="login-username"
                        data-testid="login-username"
                        name="username"
                        autoComplete="username"
                        required
                        aria-invalid={Boolean(errors.username)}
                        aria-describedby={errors.username ? 'login-username-error' : undefined}
                        className={errors.username ? 'input-error' : ''}
                        onChange={() => clearFieldError('username')}
                    />
                    {errors.username && <p className="login-field-error" id="login-username-error" role="alert">{errors.username}</p>}
                </div>
                <div className="field">
                    <label htmlFor="login-password">Password</label>
                    <input
                        id="login-password"
                        data-testid="login-password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? 'login-password-error' : undefined}
                        className={errors.password ? 'input-error' : ''}
                        onChange={() => clearFieldError('password')}
                    />
                    {errors.password && <p className="login-field-error" id="login-password-error" role="alert">{errors.password}</p>}
                    {apiError && <div className="message message-error" data-testid="app-message" data-kind="error" data-code={apiErrorCode} role="alert">{apiError}</div>}
                </div>
                <button id="login-submit" data-testid="login-submit" type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
                <p className="muted">{getAuthMode() === 'mock' ? 'Mock: cus_normal / 123456, cus_prime / 123456, admin01 / 123456' : 'เข้าสู่ระบบด้วยบัญชีที่ลงทะเบียนในระบบ'}</p>
            </form>
        </main>
    )
}
