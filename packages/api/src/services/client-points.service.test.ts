import { describe, it, expect, beforeEach } from 'vitest'
import { ClientPointsService } from './client-points.service.js'
import { MockClientPointsRepository } from '@repositories/mocks/MockClientPointsRepository.js'
import { MockPointsRuleRepository } from '@repositories/mocks/MockPointsRuleRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import { MockEmployeeRepository } from '@employee/application/mocks/MockDependencies.js'
import { Employee } from '@employee/domain/Employee.js'
import { RestaurantNotFoundError, EmployeeNotFoundError, InvalidPointsBalanceError } from '@errors/DomainErrors.js'

const person = (id: string, role: string) => Employee.create({
    id, firstName: 'A', lastName: 'B', email: `${id}@x.com`, passwordHash: 'h', role,
    restaurantId: role === 'cliente' ? null : 'r1'
})

describe('ClientPointsService', () => {
    let points: MockClientPointsRepository
    let rules: MockPointsRuleRepository
    let restaurants: MockRestaurantRepository
    let employees: MockEmployeeRepository
    let service: ClientPointsService

    beforeEach(async () => {
        points = new MockClientPointsRepository()
        rules = new MockPointsRuleRepository()
        restaurants = new MockRestaurantRepository()
        employees = new MockEmployeeRepository()
        service = new ClientPointsService(points, rules, restaurants, employees)
        await restaurants.save({
            id: 'r1', name: 'r1', address: 'a', email: 'e@e.com', phone: '', ownerFirstName: 'o',
            ownerLastName: 'o', logoUrl: null, createdAt: '', updatedAt: ''
        })
        await employees.save(person('c1', 'cliente'))
        await employees.save(person('w1', 'camarero'))
    })

    describe('setBalance', () => {
        it('should set the balance of a client', async () => {
            expect(await service.setBalance('r1', 'c1', 120)).toEqual({ clientId: 'c1', restaurantId: 'r1', balance: 120 })
            expect(await points.getBalance('c1', 'r1')).toBe(120)
        })

        it('should accept 0', async () => {
            await expect(service.setBalance('r1', 'c1', 0)).resolves.toMatchObject({ balance: 0 })
        })

        it('should reject negative, decimal or non numeric balances', async () => {
            for (const balance of [-1, 1.5, '10', undefined, null]) {
                await expect(service.setBalance('r1', 'c1', balance)).rejects.toThrow(InvalidPointsBalanceError)
            }
        })

        it('should throw RestaurantNotFoundError for an unknown restaurant', async () => {
            await expect(service.setBalance('nope', 'c1', 10)).rejects.toThrow(RestaurantNotFoundError)
        })

        it('should throw EmployeeNotFoundError when the user is not a client', async () => {
            await expect(service.setBalance('r1', 'ghost', 10)).rejects.toThrow(EmployeeNotFoundError)
            await expect(service.setBalance('r1', 'w1', 10)).rejects.toThrow(EmployeeNotFoundError)
        })
    })

    describe('getMine', () => {
        it('should return the balance and the rules ordered by points', async () => {
            await points.setBalance('c1', 'r1', 50)
            await rules.save({ id: 'p2', restaurantId: 'r1', points: 100, amount: 10 })
            await rules.save({ id: 'p1', restaurantId: 'r1', points: 10, amount: 1 })

            expect(await service.getMine('r1', 'c1')).toEqual({
                balance: 50,
                rules: [
                    { id: 'p1', points: 10, amount: 1 },
                    { id: 'p2', points: 100, amount: 10 }
                ]
            })
        })

        it('should return 0 and no rules by default', async () => {
            expect(await service.getMine('r1', 'c1')).toEqual({ balance: 0, rules: [] })
        })

        it('should throw RestaurantNotFoundError for an unknown restaurant', async () => {
            await expect(service.getMine('nope', 'c1')).rejects.toThrow(RestaurantNotFoundError)
        })
    })
})
