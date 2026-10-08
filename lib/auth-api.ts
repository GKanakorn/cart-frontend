export type LoginCredentials = {
    username: string
    password: string
}

export type LoginResponse = {
    message: string
    user: {
        user_id: string | number
        username: string
        role: string
    }
    access_token: string
}

export class AuthApiError extends Error {
    constructor(message: string, public readonly status?: number) {
        super(message)
        this.name = 'AuthApiError'
    }
}

const LOGIN_ENDPOINT = '/auth/login'

function isLoginResponse(value: unknown): value is LoginResponse {
    if (typeof value !== 'object' || value === null) return false

    const response = value as Partial<LoginResponse>
    return typeof response.access_token === 'string'
        && typeof response.user?.username === 'string'
        && typeof response.user?.role === 'string'
        && (typeof response.user?.user_id === 'string' || typeof response.user?.user_id === 'number')
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')

    if (!baseUrl) {
        throw new AuthApiError('NEXT_PUBLIC_API_BASE_URL is not configured')
    }

    let response: Response
    try {
        response = await fetch(`${baseUrl}${LOGIN_ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
        })
    } catch {
        throw new AuthApiError('เชื่อมต่อ API ไม่ได้ กรุณาตรวจสอบว่า backend กำลังทำงานอยู่')
    }

    const payload: unknown = await response.json().catch(() => null)

    if (!response.ok) {
        const message = typeof payload === 'object' && payload !== null && 'message' in payload
            && typeof payload.message === 'string'
            ? payload.message
            : `Login request failed (${response.status})`
        throw new AuthApiError(message, response.status)
    }

    if (!isLoginResponse(payload)) {
        throw new AuthApiError('รูปแบบข้อมูลตอบกลับจาก login API ไม่ถูกต้อง', response.status)
    }

    return payload
}