import { randomUUID } from 'crypto'
import type { PointsRule } from '@models/points-rule.model.js'
import { assertValidPointsRuleInput } from '@models/points-rule.model.js'
import type { PointsRuleRepository } from '@repositories/points-rule.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    RestaurantNotFoundError,
    PointsRuleNotFoundError,
    DuplicatedPointsRuleError
} from '@errors/DomainErrors.js'

export class PointsRuleService {
    constructor(
        private readonly ruleRepository: PointsRuleRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(restaurantId: string, dto: Record<string, unknown>): Promise<PointsRule> {
        await this.ensureRestaurantExists(restaurantId)
        const data = assertValidPointsRuleInput(dto)
        await this.ensurePointsAvailable(restaurantId, data.points)

        const rule: PointsRule = { id: randomUUID(), restaurantId, ...data }
        await this.ruleRepository.save(rule)
        return rule
    }

    async update(restaurantId: string, id: string, dto: Record<string, unknown>): Promise<PointsRule> {
        const existing = await this.getById(restaurantId, id)
        const data = assertValidPointsRuleInput(dto)
        await this.ensurePointsAvailable(restaurantId, data.points, id)

        const updated: PointsRule = { ...existing, ...data }
        await this.ruleRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        await this.getById(restaurantId, id)
        await this.ruleRepository.delete(id)
    }

    async getById(restaurantId: string, id: string): Promise<PointsRule> {
        const rule = await this.ruleRepository.findById(id)
        if (!rule || rule.restaurantId !== restaurantId) {
            throw new PointsRuleNotFoundError()
        }
        return rule
    }

    async list(restaurantId: string): Promise<PointsRule[]> {
        await this.ensureRestaurantExists(restaurantId)
        return this.ruleRepository.findByRestaurantId(restaurantId)
    }

    private async ensureRestaurantExists(restaurantId: string): Promise<void> {
        if (!(await this.restaurantRepository.findById(restaurantId))) {
            throw new RestaurantNotFoundError()
        }
    }

    private async ensurePointsAvailable(restaurantId: string, points: number, ownId?: string): Promise<void> {
        const duplicated = await this.ruleRepository.findByPoints(restaurantId, points)
        if (duplicated && duplicated.id !== ownId) {
            throw new DuplicatedPointsRuleError()
        }
    }
}
