import { Database } from '@config/database.js'
import type { PointsRule } from '@models/points-rule.model.js'

interface PointsRuleRow {
    id: string
    restaurantId: string
    points: number
    amount: number
}

export interface PointsRuleRepository {
    findById(id: string): Promise<PointsRule | null>
    findByRestaurantId(restaurantId: string): Promise<PointsRule[]>
    findByPoints(restaurantId: string, points: number): Promise<PointsRule | null>
    save(rule: PointsRule): Promise<void>
    delete(id: string): Promise<void>
}

const SELECT_COLUMNS = 'id, restaurant_id as restaurantId, points, amount'

export class SqlitePointsRuleRepository implements PointsRuleRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<PointsRule | null> {
        const row = await this.db.get<PointsRuleRow>(`SELECT ${SELECT_COLUMNS} FROM points_rules WHERE id = ?`, [id])
        return row ?? null
    }

    async findByRestaurantId(restaurantId: string): Promise<PointsRule[]> {
        return this.db.all<PointsRuleRow>(
            `SELECT ${SELECT_COLUMNS} FROM points_rules WHERE restaurant_id = ? ORDER BY points ASC`,
            [restaurantId]
        )
    }

    async findByPoints(restaurantId: string, points: number): Promise<PointsRule | null> {
        const row = await this.db.get<PointsRuleRow>(
            `SELECT ${SELECT_COLUMNS} FROM points_rules WHERE restaurant_id = ? AND points = ?`,
            [restaurantId, points]
        )
        return row ?? null
    }

    async save(rule: PointsRule): Promise<void> {
        const existing = await this.findById(rule.id)
        const now = new Date().toISOString()
        if (existing) {
            await this.db.run(
                'UPDATE points_rules SET points = ?, amount = ?, updated_at = ? WHERE id = ?',
                [rule.points, rule.amount, now, rule.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO points_rules (id, restaurant_id, points, amount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
                [rule.id, rule.restaurantId, rule.points, rule.amount, now, now]
            )
        }
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM points_rules WHERE id = ?', [id])
    }
}
