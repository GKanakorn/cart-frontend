import { StoreApiError } from './store-contract'

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
    token?: string
    body?: unknown
    signal?: AbortSignal
    fallbackErrorCode?: string
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    if (!baseUrl) throw new StoreApiError('NEXT_PUBLIC_API_BASE_URL is not configured', 'API_CONFIG_ERROR', 0)

    const headers = new Headers()
    if (options.body !== undefined) headers.set('Content-Type', 'application/json')
    if (options.token) headers.set('Authorization', `Bearer ${options.token}`)

    let response: Response
    try {
        response = await fetch(`${baseUrl}${path}`, {
            method: options.method ?? 'GET',
            headers,
            body: options.body === undefined ? undefined : JSON.stringify(options.body),
            signal: options.signal,
        })
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error
        throw new StoreApiError('เชื่อมต่อ API ไม่ได้ กรุณาตรวจสอบว่า backend กำลังทำงานอยู่', 'API_UNAVAILABLE', 0)
    }

    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
        const body = typeof payload === 'object' && payload !== null ? payload : null
        const error = body && 'error' in body && typeof body.error === 'object' && body.error !== null
            ? body.error
            : body
        const code = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
            ? error.code
            : options.fallbackErrorCode ?? `HTTP_${response.status}`
        const message = typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
            ? error.message
            : `API request failed (${response.status})`
        const fields = typeof error === 'object' && error !== null && 'fields' in error && Array.isArray(error.fields)
            ? error.fields.filter((field): field is string => typeof field === 'string')
            : undefined
        const productIds = typeof error === 'object' && error !== null && 'productIds' in error && Array.isArray(error.productIds)
            ? error.productIds.filter((id): id is string => typeof id === 'string')
            : undefined
        throw new StoreApiError(message, code, response.status, fields, productIds)
    }

    return payload as T
}
