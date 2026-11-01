export type MockProduct = {
    id: string
    name: string
    price: number
    weight: string
    stock: number
}

export type MockOrder = {
    id: string
    status: string
    total: number
    date: string
}

export const PRODUCTS: MockProduct[] = [
    { id: 'P1', name: 'Coffee Beans 250g', price: 450, weight: '300 g', stock: 20 },
    { id: 'P2', name: 'Drip Kettle', price: 1200, weight: '900 g', stock: 3 },
    { id: 'P3', name: 'Espresso Machine', price: 15000, weight: '8,000 g', stock: 5 },
]

export const ORDERS: MockOrder[] = [
    { id: 'ORD-000003', status: 'รอชำระเงิน', total: 15000, date: '8 ต.ค. 2026' },
    { id: 'ORD-000002', status: 'ยกเลิก', total: 1200, date: '5 ต.ค. 2026' },
    { id: 'ORD-000001', status: 'ชำระเงินแล้ว', total: 1485, date: '1 ต.ค. 2026' },
]

export function money(value: number) {
    return `฿${value.toLocaleString('en-US')}`
}