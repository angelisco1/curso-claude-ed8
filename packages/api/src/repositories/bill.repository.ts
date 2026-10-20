import { Database } from '@config/database.js'
import type { BillRecord } from '@models/bill.model.js'
import { BillAlreadyRequestedError } from '@errors/DomainErrors.js'

interface BillRow {
    orderId: string
    subtotal: number
    codeId: string | null
    code: string | null
    discount: number
    pointsUsed: number
    total: number
    createdAt: string
}

export interface BillRepository {
    findByOrderId(orderId: string): Promise<BillRecord | null>
    save(bill: BillRecord): Promise<void>
}

const SELECT_COLUMNS = `order_id as orderId, subtotal, code_id as codeId, code, discount,
    points_used as pointsUsed, total, created_at as createdAt`

const isUniqueViolation = (error: unknown): boolean =>
    error instanceof Error && 'code' in error && (error as { code?: string }).code === 'SQLITE_CONSTRAINT'

export class SqliteBillRepository implements BillRepository {
    constructor(private readonly db: Database) {}

    async findByOrderId(orderId: string): Promise<BillRecord | null> {
        const row = await this.db.get<BillRow>(`SELECT ${SELECT_COLUMNS} FROM order_bills WHERE order_id = ?`, [orderId])
        return row ?? null
    }

    async save(bill: BillRecord): Promise<void> {
        try {
            await this.insert(bill)
        } catch (error) {
            if (isUniqueViolation(error)) throw new BillAlreadyRequestedError()
            throw error
        }
    }

    protected async insert(bill: BillRecord): Promise<void> {
        await this.db.run(
            `INSERT INTO order_bills (order_id, subtotal, code_id, code, discount, points_used, total, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [bill.orderId, bill.subtotal, bill.codeId, bill.code, bill.discount, bill.pointsUsed, bill.total, bill.createdAt]
        )
    }
}
