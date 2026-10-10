'use client'

import { useEffect, useState } from 'react'
import { store } from '../lib/store-service'
import { StoreApiError, type Product, type ProductStatus } from '../lib/store-contract'
import { validateProductUpdate } from '../lib/form-validation'
import { Button, Chip, Field, Message, PageTitle, Shell } from './store-ui'

type ProductEdits = Record<string, { price: string; stock: string }>
type ProductEditErrors = Record<string, { price?: string; stock?: string; form?: string }>

function formatPrice(value: number) {
    return `฿${value.toLocaleString('en-US')}`
}

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [edits, setEdits] = useState<ProductEdits>({})
    const [editErrors, setEditErrors] = useState<ProductEditErrors>({})
    const [error, setError] = useState('')
    const [errorCode, setErrorCode] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [workingProductId, setWorkingProductId] = useState<string | null>(null)

    useEffect(() => {
        const token = sessionStorage.getItem('access_token') ?? ''
        store.listProducts(token)
            .then((result) => setProducts(result.products))
            .catch((requestError: unknown) => {
                setError(requestError instanceof Error ? requestError.message : 'โหลดสินค้าไม่สำเร็จ')
                setErrorCode(requestError instanceof StoreApiError ? requestError.code : '')
            })
            .finally(() => setIsLoading(false))
    }, [])

    function handleProductEdit(id: string, field: 'price' | 'stock', value: string) {
        setEdits((current) => ({
            ...current,
            [id]: { price: current[id]?.price ?? '', stock: current[id]?.stock ?? '', [field]: value },
        }))
        setEditErrors((current) => ({ ...current, [id]: { ...current[id], [field]: undefined, form: undefined } }))
    }

    async function handleSaveProduct(productId: string) {
        const values = edits[productId] ?? { price: '', stock: '' }
        if (!values.price && !values.stock) {
            setEditErrors((current) => ({ ...current, [productId]: { form: 'กรุณากรอกราคาใหม่หรือสต็อกใหม่' } }))
            return
        }

        const invalidFields = validateProductUpdate({
            price: values.price || undefined,
            stock: values.stock || undefined,
        })
        if (invalidFields.length > 0) {
            setEditErrors((current) => ({
                ...current,
                [productId]: {
                    price: invalidFields.includes('price') ? 'ราคาต้องเป็นจำนวนเต็ม 1 ถึง 50,000' : undefined,
                    stock: invalidFields.includes('stock') ? 'สต็อกต้องเป็นจำนวนเต็ม 0 ถึง 9,999' : undefined,
                },
            }))
            return
        }

        const token = sessionStorage.getItem('access_token') ?? ''
        const updates = {
            ...(values.price ? { price: Number(values.price) } : {}),
            ...(values.stock ? { stock: Number(values.stock) } : {}),
        }
        setWorkingProductId(productId)
        setError('')
        try {
            const updated = await store.updateProduct(token, productId, updates)
            setProducts((current) => current.map((product) => product.productId === productId ? updated : product))
            setEdits((current) => ({ ...current, [productId]: { price: '', stock: '' } }))
            setEditErrors((current) => ({ ...current, [productId]: {} }))
        } catch (requestError) {
            const fields = requestError instanceof StoreApiError ? requestError.fields ?? [] : []
            setEditErrors((current) => ({
                ...current,
                [productId]: {
                    price: fields.includes('price') ? 'ราคาต้องเป็นจำนวนเต็ม 1 ถึง 50,000' : undefined,
                    stock: fields.includes('stock') ? 'สต็อกต้องเป็นจำนวนเต็ม 0 ถึง 9,999' : undefined,
                    form: fields.length ? undefined : requestError instanceof Error ? requestError.message : 'บันทึกไม่สำเร็จ',
                },
            }))
            setErrorCode(requestError instanceof StoreApiError ? requestError.code : '')
        } finally {
            setWorkingProductId(null)
        }
    }

    async function handleToggleStatus(product: Product) {
        const token = sessionStorage.getItem('access_token') ?? ''
        const status: ProductStatus = product.status === 'เปิดขาย' ? 'ปิดขาย' : 'เปิดขาย'
        setWorkingProductId(product.productId)
        setError('')
        try {
            const updated = await store.setProductStatus(token, product.productId, status)
            setProducts((current) => current.map((item) => item.productId === product.productId ? updated : item))
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'เปลี่ยนสถานะสินค้าไม่สำเร็จ')
            setErrorCode(requestError instanceof StoreApiError ? requestError.code : '')
        } finally {
            setWorkingProductId(null)
        }
    }

    return (
        <Shell active="admin-products" admin>
            <main data-testid="page-admin-products">
                <PageTitle>จัดการสินค้า</PageTitle>
                {error && <Message kind="error" code={errorCode}>{error}</Message>}
                {isLoading && <p role="status">กำลังโหลดสินค้า...</p>}
                {!isLoading && !error && products.length === 0 && <p className="muted">ไม่มีสินค้า</p>}
                {!isLoading && products.length > 0 && <div className="table-wrap">
                    <table>
                        <thead><tr><th>ชื่อสินค้า</th><th>ราคา</th><th>สต็อก</th><th>สถานะ</th><th>ราคาใหม่</th><th>สต็อกใหม่</th><th>บันทึก</th><th>สถานะ</th></tr></thead>
                        <tbody>
                            {products.map((product) => (
                                <tr data-testid={`admin-product-row-${product.productId}`} key={product.productId}>
                                    <td>{product.name}</td>
                                    <td data-testid="admin-product-price" data-value={product.price}>{formatPrice(product.price)}</td>
                                    <td data-testid="admin-product-stock" data-value={product.availableStock}>{product.availableStock}</td>
                                    <td><Chip status={product.status}><span data-testid="admin-product-status">{product.status ?? '—'}</span></Chip></td>
                                    <td>
                                        <Field label="ราคาใหม่" id={`admin-price-${product.productId}`} data-testid="admin-product-price-input" type="number" min="1" max="50000" step="1" aria-label={`ราคาใหม่ ${product.name}`} value={edits[product.productId]?.price ?? ''} aria-invalid={Boolean(editErrors[product.productId]?.price)} onChange={(event) => handleProductEdit(product.productId, 'price', event.currentTarget.value)} />
                                        {editErrors[product.productId]?.price && <p className="login-field-error">{editErrors[product.productId].price}</p>}
                                    </td>
                                    <td>
                                        <Field label="สต็อกใหม่" id={`admin-stock-${product.productId}`} data-testid="admin-product-stock-input" type="number" min="0" max="9999" step="1" aria-label={`สต็อกใหม่ ${product.name}`} value={edits[product.productId]?.stock ?? ''} aria-invalid={Boolean(editErrors[product.productId]?.stock)} onChange={(event) => handleProductEdit(product.productId, 'stock', event.currentTarget.value)} />
                                        {editErrors[product.productId]?.stock && <p className="login-field-error">{editErrors[product.productId].stock}</p>}
                                    </td>
                                    <td>
                                        <Button variant="small" data-testid="admin-product-save" disabled={workingProductId === product.productId} onClick={() => void handleSaveProduct(product.productId)}>บันทึก</Button>
                                        {(editErrors[product.productId]?.price || editErrors[product.productId]?.stock || editErrors[product.productId]?.form) && <p className="login-field-error" data-testid="app-message" data-kind="error" data-code={editErrors[product.productId]?.form ? errorCode : 'VALIDATION_ERROR'} role="alert">{editErrors[product.productId]?.form || 'กรุณาตรวจสอบค่าราคาและสต็อก'}</p>}
                                    </td>
                                    <td><Button variant={product.status === 'เปิดขาย' ? 'danger small' : 'outline green small'} data-testid="admin-product-toggle-status" disabled={workingProductId === product.productId} onClick={() => void handleToggleStatus(product)}>{product.status === 'เปิดขาย' ? 'ปิดการขาย' : 'เปิดการขาย'}</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>}
            </main>
        </Shell>
    )
}
