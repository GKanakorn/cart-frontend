import { PRODUCTS, money } from '../lib/mock-data'

export type OrderSummaryVariant = 'checkout' | 'success' | 'order-detail'

export default function OrderSummary({ variant }: { variant: OrderSummaryVariant }) {
    const rows = PRODUCTS.slice(0, 2)
    const prefix = variant
    const isCheckout = variant === 'checkout'
    const isSuccess = variant === 'success'

    return (
        <section className="card order-card">
            <h2>สรุปคำสั่งซื้อ</h2>
            <table>
                <thead><tr><th>สินค้า</th><th>ราคา/ชิ้น</th><th>จำนวน</th></tr></thead>
                <tbody>
                    {rows.map((product) => (
                        <tr data-testid={`${isSuccess ? 'success' : 'checkout'}-line-${product.id}`} key={product.id}>
                            <td>{product.name}</td>
                            <td data-testid={`${prefix}-unit-price-${product.id}`} data-value={product.price}>{money(product.price)}</td>
                            <td data-testid={`${prefix}-qty-${product.id}`} data-value="1">1</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="totals">
                <div>ยอดรวมสินค้า <strong data-testid={`${prefix}-subtotal`} data-value="1650">฿1,650</strong></div>
                <div>ส่วนลด <strong data-testid={`${prefix}-discount`} data-value={isCheckout ? '0' : '165'}>{isCheckout ? '฿0' : '−฿165'}</strong></div>
                <div>ค่าจัดส่ง <strong data-testid={`${prefix}-shipping`} data-value="0">฿0</strong></div>
                <div className="grand">ยอดชำระสุทธิ <strong data-testid={`${prefix}-total`} data-value={isCheckout ? '1650' : '1485'}>{isCheckout ? '฿1,650' : '฿1,485'}</strong></div>
            </div>
            <p className="muted">โซนจัดส่ง: ในเมือง · ความเร็ว: ปกติ · คูปอง: {isCheckout ? '—' : 'SAVE10'}</p>
        </section>
    )
}