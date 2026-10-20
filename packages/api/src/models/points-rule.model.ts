import { InvalidPointsRuleError } from '@errors/DomainErrors.js'

export interface PointsRule {
    id: string
    restaurantId: string
    points: number
    amount: number
}

export type PointsRuleInput = Pick<PointsRule, 'points' | 'amount'>

export function assertValidPointsRuleInput(input: Record<string, unknown>): PointsRuleInput {
    const { points, amount } = input
    if (typeof points !== 'number' || !Number.isInteger(points) || points < 1) {
        throw new InvalidPointsRuleError('Points must be a positive integer')
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
        throw new InvalidPointsRuleError('Amount must be a number greater than 0')
    }
    const rounded = Math.round(amount * 100) / 100
    if (rounded <= 0) {
        throw new InvalidPointsRuleError('Amount must be a number greater than 0')
    }
    return { points, amount: rounded }
}
