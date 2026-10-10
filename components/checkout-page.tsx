import OrderSummary from './order-summary'
import { Button, Chip, Message, PageTitle, Shell } from './store-ui'

export default function CheckoutPage() {
    return (
        <Shell active="cart" message={<Message kind="notice" code="COUPON_NOT_APPLICABLE">คูปองไม่สามารถใช้กับคำสั่งซื้อนี้</Message>}>
            <main data-testid="page-checkout">
                <PageTitle>ชำระเงิน <span className="muted order-id" data-testid="checkout-order-id">ORD-000001</span><Chip status="รอชำระเงิน">รอชำระเงิน</Chip></PageTitle>
                <OrderSummary variant="checkout" />
                <div className="gateway">
                    <strong>จำลอง Payment Gateway (test only)</strong>
                    <p className="muted">ใช้สำหรับทดสอบผลลัพธ์การชำระเงินเท่านั้น</p>
                    <Button id="gateway-pay-success">จำลองชำระสำเร็จ</Button>
                    <Button variant="grey" id="gateway-pay-fail">จำลองชำระล้มเหลว</Button>
                </div>
                <Button variant="danger" id="cancel-checkout-button">ยกเลิกการชำระเงิน</Button>
            </main>
        </Shell>
    )
}