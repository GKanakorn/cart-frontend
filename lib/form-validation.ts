export type QuantityErrorCode =
    | 'VALIDATION_ERROR'
    | 'QTY_OUT_OF_RANGE'
    | 'PRODUCT_NOT_FOUND'
    | 'ITEM_NOT_IN_CART'
    | 'PRODUCT_UNAVAILABLE'
    | 'INSUFFICIENT_STOCK'
    | 'OK'

export function validateQuantityChange(input: {
    operation: 'add' | 'update'
    quantity: unknown
    productExists: boolean
    inCart: boolean
    available: boolean
    currentQtyInCart: number
    availableStock: number
}): QuantityErrorCode {
    const quantity = typeof input.quantity === 'string' && input.quantity.trim() !== ''
        ? Number(input.quantity)
        : input.quantity

    if (typeof quantity !== 'number' || !Number.isInteger(quantity)) return 'VALIDATION_ERROR'
    if (quantity < 1 || quantity > 10) return 'QTY_OUT_OF_RANGE'
    if (input.operation === 'add' ? !input.productExists : !input.inCart) {
        return input.operation === 'add' ? 'PRODUCT_NOT_FOUND' : 'ITEM_NOT_IN_CART'
    }
    if (!input.available) return 'PRODUCT_UNAVAILABLE'
    if (input.operation === 'add' && input.currentQtyInCart + quantity > 10) return 'QTY_OUT_OF_RANGE'

    const resultingQuantity = input.operation === 'add'
        ? input.currentQtyInCart + quantity
        : quantity
    if (resultingQuantity > input.availableStock) return 'INSUFFICIENT_STOCK'

    return 'OK'
}

export type ProductUpdateField = 'price' | 'stock'

export function validateProductUpdate(input: { price?: unknown; stock?: unknown }): ProductUpdateField[] {
    const invalidFields: ProductUpdateField[] = []

    if (input.price !== undefined) {
        const price = typeof input.price === 'string' && input.price.trim() !== ''
            ? Number(input.price)
            : input.price
        if (typeof price !== 'number' || !Number.isInteger(price) || price < 1 || price > 50000) {
            invalidFields.push('price')
        }
    }

    if (input.stock !== undefined) {
        const stock = typeof input.stock === 'string' && input.stock.trim() !== ''
            ? Number(input.stock)
            : input.stock
        if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0 || stock > 9999) {
            invalidFields.push('stock')
        }
    }

    return invalidFields
}

export function quantityErrorMessage(code: Exclude<QuantityErrorCode, 'OK'>, availableStock: number) {
    switch (code) {
        case 'VALIDATION_ERROR':
            return 'จำนวนต้องเป็นจำนวนเต็ม'
        case 'QTY_OUT_OF_RANGE':
            return 'จำนวนต้องอยู่ระหว่าง 1 ถึง 10'
        case 'PRODUCT_NOT_FOUND':
            return 'ไม่พบสินค้า'
        case 'ITEM_NOT_IN_CART':
            return 'ไม่พบสินค้าในตะกร้า'
        case 'PRODUCT_UNAVAILABLE':
            return 'สินค้านี้ไม่พร้อมขาย'
        case 'INSUFFICIENT_STOCK':
            return `สินค้าเหลือ ${availableStock} ชิ้น`
    }
}
