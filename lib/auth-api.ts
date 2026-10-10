import { apiRequest } from './api-client'
import { getAuthMode } from './store-service'
import { mockStore } from './mock-store'
import { StoreApiError, type AuthSession } from './store-contract'

export type LoginCredentials = { username: string; password: string }
export type LoginResponse = AuthSession
export { StoreApiError as AuthApiError }

function normalizeLoginResponse(payload: unknown): LoginResponse {
    if (typeof payload !== 'object' || payload === null) {
        throw new StoreApiError('รูปแบบข้อมูลตอบกลับจาก login API ไม่ถูกต้อง', 'API_RESPONSE_INVALID', 502)
    }

    const body = payload as Record<string, unknown>
    const legacyUser = typeof body.user === 'object' && body.user !== null
        ? body.user as Record<string, unknown>
        : undefined
    const token = typeof body.token === 'string' ? body.token : body.access_token
    const rawRole = typeof body.role === 'string' ? body.role : legacyUser?.role
    const role = typeof rawRole === 'string' ? rawRole.toLowerCase() : ''
    const memberTier = typeof body.memberTier === 'string' ? body.memberTier : legacyUser?.memberTier

    if (typeof token !== 'string' || (role !== 'customer' && role !== 'admin')) {
        throw new StoreApiError('รูปแบบข้อมูลตอบกลับจาก login API ไม่ถูกต้อง', 'API_RESPONSE_INVALID', 502)
    }

    return {
        token,
        role,
        ...(memberTier === 'normal' || memberTier === 'prime' ? { memberTier } : {}),
    }
}

export async function login(credentials: LoginCredentials): Promise<LoginResponse> {
    if (getAuthMode() === 'mock') {
        return mockStore.login(credentials.username, credentials.password)
    }

    const payload = await apiRequest<unknown>('/auth/login', {
        method: 'POST',
        body: credentials,
        fallbackErrorCode: 'AUTH_INVALID_CREDENTIALS',
    })
    return normalizeLoginResponse(payload)
}