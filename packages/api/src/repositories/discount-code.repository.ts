import { Database } from '@config/database.js'
import type { DiscountCode } from '@models/discount-code.model.js'
import { assertValidDiscountType } from '@models/discount-code.model.js'

interface DiscountCodeRow {
    id: string
    restaurantId: string
    code: string
    type: string
    value: number
    minOrder: number | null
    validFrom: string | null
    validUntil: string | null
    maxUses: number | null
    uses: number
    active: number
}

export interface DiscountCodeRepository {
    findById(id: string): Promise<DiscountCode | null>
    findByRestaurantId(restaurantId: string): Promise<DiscountCode[]>
    findByCode(restaurantId: string, code: string): Promise<DiscountCode | null>
    save(code: DiscountCode): Promise<void>
    delete(id: string): Promise<void>
}

const SELECT_COLUMNS = `id, restaurant_id as restaurantId, code, type, value, min_order as minOrder,
    valid_from as validFrom, valid_until as validUntil, max_uses as maxUses, uses, active`

export class SqliteDiscountCodeRepository implements DiscountCodeRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<DiscountCode | null> {
        const row = await this.db.get<DiscountCodeRow>(`SELECT ${SELECT_COLUMNS} FROM discount_codes WHERE id = ?`, [id])
        return row ? this.mapToCode(row) : null
    }

    async findByRestaurantId(restaurantId: string): Promise<DiscountCode[]> {
        const rows = await this.db.all<DiscountCodeRow>(
            `SELECT ${SELECT_COLUMNS} FROM discount_codes WHERE restaurant_id = ? ORDER BY code ASC`,
            [restaurantId]
        )
        return rows.map(row => this.mapToCode(row))
    }

    async findByCode(restaurantId: string, code: string): Promise<DiscountCode | null> {
        const row = await this.db.get<DiscountCodeRow>(
            `SELECT ${SELECT_COLUMNS} FROM discount_codes WHERE restaurant_id = ? AND code = ? COLLATE NOCASE`,
            [restaurantId, code]
        )
        return row ? this.mapToCode(row) : null
    }

    async save(code: DiscountCode): Promise<void> {
        const existing = await this.findById(code.id)
        const now = new Date().toISOString()
        if (existing) {
            await this.db.run(
                `UPDATE discount_codes SET code = ?, type = ?, value = ?, min_order = ?, valid_from = ?, valid_until = ?,
                 max_uses = ?, active = ?, updated_at = ? WHERE id = ?`,
                [code.code, code.type, code.value, code.minOrder, code.validFrom, code.validUntil, code.maxUses, code.active ? 1 : 0, now, code.id]
            )
        } else {
            await this.db.run(
                `INSERT INTO discount_codes (id, restaurant_id, code, type, value, min_order, valid_from, valid_until,
                 max_uses, uses, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [code.id, code.restaurantId, code.code, code.type, code.value, code.minOrder, code.validFrom, code.validUntil, code.maxUses, code.uses, code.active ? 1 : 0, now, now]
            )
        }
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM discount_codes WHERE id = ?', [id])
    }

    private mapToCode(row: DiscountCodeRow): DiscountCode {
        return { ...row, type: assertValidDiscountType(row.type), active: row.active === 1 }
    }
}
