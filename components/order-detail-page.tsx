import OrderSummary from './order-summary'
import { Button, Chip, PageTitle, Shell } from './store-ui'

export default function OrderDetailPage() {
    return (
        <Shell active="orders">
            <main data-testid="page-order-detail">
                <Button variant="link back">← กลับไปรายการออเดอร์</Button>
                <PageTitle>ORD-000001 <span className="muted order-id" data-testid="order-detail-id">8 ต.ค. 2026</span><Chip status="ชำระเงินแล้ว"><span data-testid="order-detail-status">ชำระเงินแล้ว</span></Chip></PageTitle>
                <OrderSummary variant="order-detail" />
            </main>
        </Shell>
    )
}