import { describe, it, expect, beforeEach } from 'vitest'
import { PointsRuleService } from './points-rule.service.js'
import { MockPointsRuleRepository } from '@repositories/mocks/MockPointsRuleRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    RestaurantNotFoundError,
    PointsRuleNotFoundError,
    DuplicatedPointsRuleError,
    InvalidPointsRuleError
} from '@errors/DomainErrors.js'

describe('PointsRuleService', () => {
    let rules: MockPointsRuleRepository
    let restaurants: MockRestaurantRepository
    let service: PointsRuleService

    beforeEach(async () => {
        rules = new MockPointsRuleRepository()
        restaurants = new MockRestaurantRepository()
        service = new PointsRuleService(rules, restaurants)
        for (const id of ['r1', 'r2']) {
            await restaurants.save({
                id, name: id, address: 'a', email: 'e@e.com', phone: '', ownerFirstName: 'o',
                ownerLastName: 'o', logoUrl: null, createdAt: '', updatedAt: ''
            })
        }
    })

    it('should create a rule', async () => {
        const rule = await service.create('r1', { points: 100, amount: 10 })
        expect(rule).toMatchObject({ restaurantId: 'r1', points: 100, amount: 10 })
        expect(rule.id).toBeDefined()
    })

    it('should throw for an unknown restaurant and invalid data', async () => {
        await expect(service.create('nope', { points: 10, amount: 1 })).rejects.toThrow(RestaurantNotFoundError)
        await expect(service.create('r1', { points: 0, amount: 1 })).rejects.toThrow(InvalidPointsRuleError)
    })

    it('should throw DuplicatedPointsRuleError for repeated points in the same restaurant only', async () => {
        await service.create('r1', { points: 100, amount: 10 })
        await expect(service.create('r1', { points: 100, amount: 5 })).rejects.toThrow(DuplicatedPointsRuleError)
        await expect(service.create('r2', { points: 100, amount: 5 })).resolves.toBeDefined()
    })

    it('should update a rule allowing its own points but not another rule\'s', async () => {
        const a = await service.create('r1', { points: 10, amount: 1 })
        await service.create('r1', { points: 100, amount: 10 })

        expect(await service.update('r1', a.id, { points: 10, amount: 2 })).toMatchObject({ id: a.id, amount: 2 })
        await expect(service.update('r1', a.id, { points: 100, amount: 2 })).rejects.toThrow(DuplicatedPointsRuleError)
    })

    it('should list rules ordered by points', async () => {
        await service.create('r1', { points: 100, amount: 10 })
        await service.create('r1', { points: 10, amount: 1 })
        await service.create('r2', { points: 50, amount: 5 })
        expect((await service.list('r1')).map(r => r.points)).toEqual([10, 100])
        await expect(service.list('nope')).rejects.toThrow(RestaurantNotFoundError)
    })

    it('should get and delete scoped to the restaurant', async () => {
        const rule = await service.create('r1', { points: 10, amount: 1 })
        expect(await service.getById('r1', rule.id)).toEqual(rule)
        await expect(service.getById('r2', rule.id)).rejects.toThrow(PointsRuleNotFoundError)
        await expect(service.delete('r2', rule.id)).rejects.toThrow(PointsRuleNotFoundError)

        await service.delete('r1', rule.id)
        await expect(service.getById('r1', rule.id)).rejects.toThrow(PointsRuleNotFoundError)
    })
})
