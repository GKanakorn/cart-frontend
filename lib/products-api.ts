export type Product = {
    productId: string
    name: string
    price: number
    weightGram: number
    availableStock: number
}

export class ProductsApiError extends Error {
    constructor(message: string, public readonly status?: number) {
        super(message)
        this.name = 'ProductsApiError'
    }
}

function isProduct(value: unknown): value is Product {
    if (typeof value !== 'object' || value === null) return false

    const product = value as Partial<Product>
    const validId = typeof product.productId === 'string' && product.productId.trim().length > 0

    return validId
        && typeof product.name === 'string'
        && product.name.trim().length > 0
        && typeof product.price === 'number'
        && Number.isFinite(product.price)
        && product.price >= 0
        && typeof product.weightGram === 'number'
        && Number.isFinite(product.weightGram)
        && product.weightGram >= 0
        && typeof product.availableStock === 'number'
        && Number.isInteger(product.availableStock)
        && product.availableStock >= 0
}

function hasUniqueProductIds(products: Product[]): boolean {
    const ids = products.map((product) => String(product.productId).trim())
    return new Set(ids).size === ids.length
}

export async function getProducts(token: string, signal?: AbortSignal): Promise<Product[]> {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '')
    if (!baseUrl) throw new ProductsApiError('NEXT_PUBLIC_API_BASE_URL is not configured')

    let response: Response
    try {
        response = await fetch(`${baseUrl}/products`, {
            headers: { Authorization: `Bearer ${token}` },
            signal,
        })
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') throw error
        throw new ProductsApiError('เชื่อมต่อ API ไม่ได้ กรุณาตรวจสอบว่า backend กำลังทำงานอยู่')
    }

    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
        const message = typeof payload === 'object' && payload !== null && 'message' in payload
            && typeof payload.message === 'string'
            ? payload.message
            : `โหลดสินค้าไม่สำเร็จ (${response.status})`
        throw new ProductsApiError(message, response.status)
    }

    if (typeof payload !== 'object' || payload === null || !('products' in payload)
        || !Array.isArray(payload.products) || !payload.products.every(isProduct)) {
        throw new ProductsApiError('รูปแบบข้อมูลสินค้าจาก API ไม่ถูกต้อง', response.status)
    }

    if (!hasUniqueProductIds(payload.products)) {
        throw new ProductsApiError('ข้อมูลสินค้าจาก API มี productId ซ้ำกัน', response.status)
    }

    return payload.products
}