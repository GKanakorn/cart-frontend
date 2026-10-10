import { ORDERS, money } from '../lib/mock-data'
import { Button, Chip, PageTitle, Shell } from './store-ui'

export default function OrdersPage() {
    return (
        <Shell active="orders">
            <main data-testid="page-orders">
                <PageTitle>ออเดอร์ของฉัน</PageTitle>
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>หมายเลขออเดอร์</th><th>สถานะ</th><th>ยอดสุทธิ</th><th>วันที่</th><th>ว่าง</th></tr></thead>
                        <tbody>
                            {ORDERS.map((order) => (
                                <tr data-testid={`order-row-${order.id}`} key={order.id}>
                                    <td>{order.id}</td>
                                    <td><Chip status={order.status}><span data-testid={`order-status-${order.id}`}>{order.status}</span></Chip></td>
                                    <td data-testid={`order-total-${order.id}`} data-value={order.total}>{money(order.total)}</td>
                                    <td>{order.date}</td>
                                    <td><Button variant="link" data-testid={`order-view-${order.id}`}>ดูรายละเอียด</Button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </Shell>
    )
}