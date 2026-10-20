import { describe, it, expect } from 'vitest'
import { assertValidPointsRuleInput } from './points-rule.model.js'
import { InvalidPointsRuleError } from '@errors/DomainErrors.js'

describe('points-rule.model', () => {
    it('should accept a valid rule and round the amount to cents', () => {
        expect(assertValidPointsRuleInput({ points: 100, amount: 10 })).toEqual({ points: 100, amount: 10 })
        expect(assertValidPointsRuleInput({ points: 10, amount: 1.006 }).amount).toBe(1.01)
    })

    it('should reject points that are not a positive integer', () => {
        for (const points of [0, -5, 1.5, '10', undefined]) {
            expect(() => assertValidPointsRuleInput({ points, amount: 1 })).toThrow(InvalidPointsRuleError)
        }
    })

    it('should reject an amount that is not greater than 0', () => {
        for (const amount of [0, -1, '1', undefined, Number.NaN, 0.001]) {
            expect(() => assertValidPointsRuleInput({ points: 10, amount })).toThrow(InvalidPointsRuleError)
        }
    })
})
