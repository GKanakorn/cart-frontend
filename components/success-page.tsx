import OrderSummary from './order-summary'
import { Button, Chip, Icon, Message, Shell } from './store-ui'

export default function SuccessPage() {
    return (
        <Shell active="cart" message={<Message kind="info">การชำระเงินล้มเหลว กรุณาลองใหม่</Message>}>
            <main data-testid="page-success">
                <div className="success-wrap">
                    <Icon kind="check" />
                    <h1>สั่งซื้อสำเร็จ</h1>
                    <p>หมายเลขออเดอร์ <strong data-testid="success-order-id">ORD-000001</strong></p>
                    <Chip status="ชำระเงินแล้ว">ชำระเงินแล้ว</Chip>
                </div>
                <OrderSummary variant="success" />
                <Button id="continue-shopping-button">เลือกซื้อสินค้าต่อ</Button>
            </main>
        </Shell>
    )
}