'use client'

import { useState, type ChangeEvent } from 'react'
import { PRODUCTS, money } from '../lib/mock-data'
import { Button, Chip, Field, PageTitle, Shell } from './store-ui'

export default function AdminProductsPage() {
    const [image, setImage] = useState<string | null>(null)
    const [fileName, setFileName] = useState('')
    const [editedImages, setEditedImages] = useState<Record<string, string>>({})

    function handleImage(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        const reader = new FileReader()
        reader.onload = () => setImage(String(reader.result))
        reader.readAsDataURL(file)
    }

    function handleEditImage(id: string, event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => setEditedImages((current) => ({ ...current, [id]: String(reader.result) }))
        reader.readAsDataURL(file)
    }

    return (
        <Shell active="admin-products" admin>
            <main data-testid="page-admin-products">
                <PageTitle>จัดการสินค้า</PageTitle>
                <section className="card product-form" data-testid="add-product-form">
                    <h2>เพิ่มสินค้า</h2>
                    <div className="product-form-grid">
                        <Field label="ชื่อสินค้า" id="admin-product-name" placeholder="เช่น Coffee Beans 250g" />
                        <Field label="ราคา" id="admin-product-price" type="text" inputMode="numeric" placeholder="0" />
                        <Field label="สต็อก" id="admin-product-stock" type="text" inputMode="numeric" placeholder="0" />
                        <div className="field">
                            <label htmlFor="admin-product-image">รูปสินค้า</label>
                            <input id="admin-product-image" data-testid="admin-product-image" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImage} />
                            <span className="muted file-name" data-testid="admin-product-image-name">{fileName || 'รองรับ PNG, JPG, WEBP'}</span>
                        </div>
                    </div>
                    {image && <img className="product-image-preview" data-testid="admin-product-image-preview" src={image} alt="ตัวอย่างรูปสินค้า" />}
                    <Button id="admin-product-add" data-testid="admin-product-add">เพิ่มสินค้า</Button>
                </section>
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>รูปสินค้า</th><th>ชื่อสินค้า</th><th>ราคา</th><th>สต็อก</th><th>สถานะ</th><th>ราคาใหม่</th><th>สต็อกใหม่</th><th>ว่าง</th><th>ว่าง</th></tr></thead>
                        <tbody>
                            {PRODUCTS.map((product, index) => (
                                <tr data-testid={`admin-product-row-${product.id}`} key={product.id}>
                                    <td>
                                        <label className="image-edit" htmlFor={`admin-product-image-${product.id}`}>
                                            <img src={editedImages[product.id] || '/placeholder.svg'} alt={`รูป ${product.name}`} />
                                            <span>แก้ไขรูป</span>
                                        </label>
                                        <input className="sr-only" id={`admin-product-image-${product.id}`} data-testid={`admin-product-image-${product.id}`} type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => handleEditImage(product.id, event)} />
                                    </td>
                                    <td>{product.name}</td>
                                    <td data-testid={`admin-product-price-${product.id}`} data-value={product.price}>{money(product.price)}</td>
                                    <td data-testid={`admin-product-stock-${product.id}`} data-value={product.stock}>{product.stock}</td>
                                    <td><Chip status={index === 2 ? 'ปิดขาย' : 'เปิดขาย'}><span data-testid={`admin-product-status-${product.id}`}>{index === 2 ? 'ปิดขาย' : 'เปิดขาย'}</span></Chip></td>
                                    <td><Field label="ราคาใหม่" id={`admin-price-${product.id}`} type="text" inputMode="numeric" aria-label={`ราคาใหม่ ${product.name}`} /></td>
                                    <td><Field label="สต็อกใหม่" id={`admin-stock-${product.id}`} type="text" inputMode="numeric" aria-label={`สต็อกใหม่ ${product.name}`} /></td>
                                    <td><Button variant="small" data-testid={`admin-product-save-${product.id}`}>บันทึก</Button></td>
                                    <td><Button variant={index === 2 ? 'outline green small' : 'danger small'} data-testid={`admin-product-toggle-status-${product.id}`}>{index === 2 ? 'เปิดการขาย' : 'ปิดการขาย'}</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </Shell>
    )
}