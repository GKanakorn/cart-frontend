import { PRODUCTS, money } from '../lib/mock-data'
import { Button, Chip, Field, Message, PageTitle, Shell } from './store-ui'

export default function CartPage() {
    const unavailable = true

    return (
        <Shell active="cart" message={unavailable ? <Message kind="error" code="ITEMS_UNAVAILABLE">สินค้าบางรายการไม่พร้อมขาย กรุณาลบออกก่อนชำระเงิน</Message> : undefined}>
            <main data-testid="page-cart">
                <PageTitle>ตะกร้า</PageTitle>
                <div className="two-col">
                    <section>
                        <div className="table-wrap">
                            <table>
                                <thead><tr><th>ชื่อสินค้า</th><th>ราคา/ชิ้น</th><th>จำนวน</th><th>สถานะ</th><th>ว่าง</th></tr></thead>
                                <tbody>
                                    {PRODUCTS.slice(0, 2).map((product, index) => (
                                        <tr data-testid={`cart-line-${product.id}`} key={product.id}>
                                            <td data-testid={`cart-line-name-${product.id}`}>{product.name}</td>
                                            <td data-testid={`cart-line-unit-price-${product.id}`} data-value={product.price}>{money(product.price)}</td>
                                            <td>
                                                <div className="inline-field">
                                                    <label htmlFor={`cart-qty-${product.id}`} className="sr-only">จำนวน {product.name}</label>
                                                    <input id={`cart-qty-${product.id}`} data-testid={`cart-line-qty-${product.id}`} type="text" inputMode="numeric" defaultValue="1" data-value="1" aria-label={`จำนวน ${product.name}`} />
                                                    <Button variant="outline small" data-testid={`cart-line-update-${product.id}`}>อัปเดต</Button>
                                                </div>
                                            </td>
                                            <td><Chip status={index ? 'ไม่พร้อมขาย' : 'พร้อมขาย'}><span data-testid={`cart-line-availability-${product.id}`} data-available={index ? 'false' : 'true'}>{index ? 'ไม่พร้อมขาย' : 'พร้อมขาย'}</span></Chip></td>
                                            <td><Button variant="danger small" data-testid={`cart-line-remove-${product.id}`}>ลบ</Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="coupon-row"><Field label="รหัสคูปอง" id="coupon-input" /><Button id="coupon-apply">ใช้คูปอง</Button></div>
                        <div className="muted coupon-used">คูปองที่ใช้: <Chip status="พร้อมขาย"><span data-testid="cart-coupon-code">SAVE10</span></Chip></div>
                    </section>
                    <aside className="card summary">
                        <h2>สรุปคำสั่งซื้อ</h2>
                        <div className="summary-line"><span>ยอดรวมสินค้า</span><strong data-testid="cart-subtotal" data-value="1650">฿1,650</strong></div>
                        <Field label="โซนจัดส่ง" id="zone-select"><select defaultValue="inCity"><option value="inCity">ในเมือง</option><option value="upcountry">ต่างจังหวัด</option><option value="remote">พื้นที่ห่างไกล</option></select></Field>
                        <Field label="ความเร็ว" id="speed-select"><select defaultValue="standard"><option value="standard">ปกติ</option><option value="express">ด่วน</option></select></Field>
                        <Button id="checkout-button" disabled>ชำระเงิน</Button>
                    </aside>
                </div>
            </main>
        </Shell>
    )
}