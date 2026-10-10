'use client'

import { useState, type FormEvent } from 'react'
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
            const destination = result.role === 'admin' ? '/admin/products' : '/products'
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
                    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                        <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8Z" />
                        <path d="M6 1v3M10 1v3M14 1v3" />
                    </svg>
                    Bean Cart
                </div>
                <h1>เข้าสู่ระบบ</h1>
                {apiError && <div className="message message-error" data-testid="app-message" data-kind="error" data-code={apiErrorCode} role="alert">{apiError}</div>}
                {!apiError && (errors.username || errors.password) && <div className="message message-error" data-testid="app-message" data-kind="error" data-code="VALIDATION_ERROR" role="alert">กรุณากรอก Username และ Password ให้ครบ</div>}
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
                </div>
                <button id="login-submit" data-testid="login-submit" type="submit" className="btn btn-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
                <p className="muted">{getAuthMode() === 'mock' ? 'Mock: customermock01 / 123456, customermock02 / 123456, adminmock01 / 123456' : 'เข้าสู่ระบบด้วยบัญชีที่ลงทะเบียนในระบบ'}</p>
            </form>
        </main>
    )
}