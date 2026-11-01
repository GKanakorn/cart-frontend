import type { Order } from '../lib/store-contract'

export type OrderSummaryVariant = 'checkout' | 'success' | 'order-detail'

export default function OrderSummary({ variant, order }: { variant: OrderSummaryVariant; order: Order }) {
    const rows = order.items
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
                        <tr data-testid={isSuccess ? `success-line-${product.productId}` : variant === 'order-detail' ? `order-line-${product.productId}` : `checkout-line-${product.productId}`} key={product.productId}>
                            <td>{product.name}</td>
                            <td data-testid={variant === 'order-detail' ? 'order-line-unit-price' : `${prefix}-unit-price-${product.productId}`} data-value={product.unitPrice}>{`฿${product.unitPrice.toLocaleString('en-US')}`}</td>
                            <td data-testid={variant === 'order-detail' ? 'order-line-qty' : `${prefix}-qty-${product.productId}`} data-value={product.quantity}>{product.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="totals">
                <div>ยอดรวมสินค้า <strong data-testid={variant === 'order-detail' ? 'order-detail-subtotal' : `${prefix}-subtotal`} data-value={order.subtotal}>{`฿${order.subtotal.toLocaleString('en-US')}`}</strong></div>
                <div>ส่วนลด <strong data-testid={variant === 'order-detail' ? 'order-detail-discount' : `${prefix}-discount`} data-value={order.discount}>{`฿${order.discount.toLocaleString('en-US')}`}</strong></div>
                <div>ค่าจัดส่ง <strong data-testid={variant === 'order-detail' ? 'order-detail-shipping' : `${prefix}-shipping`} data-value={order.shippingFee}>{`฿${order.shippingFee.toLocaleString('en-US')}`}</strong></div>
                <div className="grand">ยอดชำระสุทธิ <strong data-testid={variant === 'order-detail' ? 'order-detail-total' : `${prefix}-total`} data-value={order.netTotal}>{`฿${order.netTotal.toLocaleString('en-US')}`}</strong></div>
            </div>
            <p className="muted">โซนจัดส่ง: {order.zone} · ความเร็ว: {order.speed} · คูปอง: {order.couponCode ?? '—'}</p>
        </section>
    )
}