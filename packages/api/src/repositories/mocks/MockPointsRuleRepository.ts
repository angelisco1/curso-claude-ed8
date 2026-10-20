import type { PointsRuleRepository } from '@repositories/points-rule.repository.js'
import type { PointsRule } from '@models/points-rule.model.js'

export class MockPointsRuleRepository implements PointsRuleRepository {
    rules: Map<string, PointsRule> = new Map()

    async findById(id: string): Promise<PointsRule | null> {
        const rule = this.rules.get(id)
        return rule ? { ...rule } : null
    }

    async findByRestaurantId(restaurantId: string): Promise<PointsRule[]> {
        return Array.from(this.rules.values())
            .filter(r => r.restaurantId === restaurantId)
            .sort((a, b) => a.points - b.points)
            .map(r => ({ ...r }))
    }

    async findByPoints(restaurantId: string, points: number): Promise<PointsRule | null> {
        const found = Array.from(this.rules.values()).find(r => r.restaurantId === restaurantId && r.points === points)
        return found ? { ...found } : null
    }

    async save(rule: PointsRule): Promise<void> {
        this.rules.set(rule.id, { ...rule })
    }

    async delete(id: string): Promise<void> {
        this.rules.delete(id)
    }
}
