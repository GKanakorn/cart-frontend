import { Button, Chip, PageTitle, Shell } from './store-ui'

export default function AdminCouponsPage() {
    return (
        <Shell active="admin-coupons" admin>
            <main data-testid="page-admin-coupons">
                <PageTitle>จัดการคูปอง</PageTitle>
                <div className="table-wrap">
                    <table>
                        <thead><tr><th>รหัส</th><th>ส่วนลด (%)</th><th>ยอดขั้นต่ำ</th><th>สถานะ</th><th>ว่าง</th></tr></thead>
                        <tbody>
                            <tr data-testid="admin-coupon-row-SAVE10">
                                <td>SAVE10</td>
                                <td data-testid="admin-coupon-percent" data-value="10">10%</td>
                                <td data-testid="admin-coupon-min-spend" data-value="1000">฿1,000</td>
                                <td><Chip status="เปิดใช้"><span data-testid="admin-coupon-status">เปิดใช้</span></Chip></td>
                                <td><Button variant="danger small" data-testid="admin-coupon-toggle-status">ปิดใช้</Button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </main>
        </Shell>
    )
}