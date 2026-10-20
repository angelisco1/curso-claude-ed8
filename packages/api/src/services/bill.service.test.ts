import { describe, it, expect, beforeEach } from 'vitest'
import { BillService } from './bill.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { MockDiscountCodeRepository } from '@repositories/mocks/MockDiscountCodeRepository.js'
import { MockPointsRuleRepository } from '@repositories/mocks/MockPointsRuleRepository.js'
import { MockClientPointsRepository } from '@repositories/mocks/MockClientPointsRepository.js'
import { MockBillRepository } from '@repositories/mocks/MockBillRepository.js'
import type { DiscountCode } from '@models/discount-code.model.js'
import {
    OrderNotFoundError,
    BillCodeInvalidError,
    BillDiscountConflictError,
    BillDiscountRejectedError,
    PointsRuleNotFoundError,
    BillAlreadyRequestedError
} from '@errors/DomainErrors.js'

const code = (overrides: Partial<DiscountCode> = {}): DiscountCode => ({
    id: 'code-1', restaurantId: 'r1', code: 'VERANO10', type: 'percent', value: 10, minOrder: null,
    validFrom: null, validUntil: null, maxUses: null, uses: 0, active: true, ...overrides
})

describe('BillService', () => {
    let orders: MockOrderRepository
    let codes: MockDiscountCodeRepository
    let rules: MockPointsRuleRepository
    let points: MockClientPointsRepository
    let bills: MockBillRepository
    let service: BillService

    beforeEach(async () => {
        orders = new MockOrderRepository()
        codes = new MockDiscountCodeRepository()
        rules = new MockPointsRuleRepository()
        points = new MockClientPointsRepository()
        bills = new MockBillRepository(codes, points)
        service = new BillService(orders, codes, rules, points, bills)

        // 10.00 + 10.00 + 5.50 = 25.50
        await orders.create({
            id: 'o1', restaurantId: 'r1', tableId: null, clientId: 'c1', createdAt: new Date(),
            items: [
                { id: 'i1', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente', dishPrice: 10 },
                { id: 'i2', dishId: 'd1', quantity: 1, notes: null, status: 'pendiente', dishPrice: 10 },
                { id: 'i3', dishId: 'd2', quantity: 1, notes: null, status: 'pendiente', dishPrice: 5.5 }
            ]
        })
        await rules.save({ id: 'p1', restaurantId: 'r1', points: 100, amount: 10 })
        await rules.save({ id: 'p-other', restaurantId: 'r2', points: 100, amount: 10 })
    })

    describe('preview', () => {
        it('should return the subtotal as total when no discount is requested', async () => {
            expect(await service.preview('o1', 'c1', {})).toEqual({ subtotal: 25.5, discount: 0, pointsUsed: 0, total: 25.5 })
        })

        it('should treat empty strings as no discount', async () => {
            expect(await service.preview('o1', 'c1', { code: '', pointsRuleId: '' })).toMatchObject({ discount: 0, total: 25.5 })
        })

        it('should apply a percent code ignoring case', async () => {
            await codes.save(code())
            expect(await service.preview('o1', 'c1', { code: 'verano10' })).toEqual({
                subtotal: 25.5, discount: 2.55, pointsUsed: 0, total: 22.95, code: 'VERANO10'
            })
        })

        it('should apply a fixed code', async () => {
            await codes.save(code({ type: 'fixed', value: 5 }))
            expect(await service.preview('o1', 'c1', { code: 'VERANO10' })).toMatchObject({ discount: 5, total: 20.5 })
        })

        it('should never produce a negative total', async () => {
            await codes.save(code({ type: 'fixed', value: 100 }))
            expect(await service.preview('o1', 'c1', { code: 'VERANO10' })).toMatchObject({ discount: 25.5, total: 0 })
        })

        it('should not modify uses or balances', async () => {
            await codes.save(code({ maxUses: 5 }))
            await points.setBalance('c1', 'r1', 500)
            await service.preview('o1', 'c1', { code: 'VERANO10' })
            await service.preview('o1', 'c1', { pointsRuleId: 'p1' })
            expect((await codes.findById('code-1'))?.uses).toBe(0)
            expect(await points.getBalance('c1', 'r1')).toBe(500)
        })

        it('should apply a points rule when the balance is enough', async () => {
            await points.setBalance('c1', 'r1', 100)
            expect(await service.preview('o1', 'c1', { pointsRuleId: 'p1' })).toEqual({
                subtotal: 25.5, discount: 10, pointsUsed: 100, total: 15.5
            })
        })

        it('should reject code and points at the same time', async () => {
            await expect(service.preview('o1', 'c1', { code: 'X', pointsRuleId: 'p1' })).rejects.toThrow(BillDiscountConflictError)
        })

        it('should throw OrderNotFoundError for an unknown order or an order of another client', async () => {
            await expect(service.preview('nope', 'c1', {})).rejects.toThrow(OrderNotFoundError)
            await expect(service.preview('o1', 'someone-else', {})).rejects.toThrow(OrderNotFoundError)
        })

        it('should throw BillCodeInvalidError for an unknown code or one of another restaurant', async () => {
            await expect(service.preview('o1', 'c1', { code: 'NOPE' })).rejects.toThrow(BillCodeInvalidError)
            await codes.save(code({ restaurantId: 'r2' }))
            await expect(service.preview('o1', 'c1', { code: 'VERANO10' })).rejects.toThrow(BillCodeInvalidError)
        })

        it.each([
            ['inactive', { active: false }],
            ['expired', { validUntil: '2000-01-01T00:00:00Z' }],
            ['expired', { validFrom: '2999-01-01T00:00:00Z' }],
            ['exhausted', { maxUses: 3, uses: 3 }],
            ['min_order', { minOrder: 30 }]
        ] as const)('should reject a code with reason %s', async (reason, overrides) => {
            await codes.save(code(overrides))
            const error = await service.preview('o1', 'c1', { code: 'VERANO10' }).catch(e => e)
            expect(error).toBeInstanceOf(BillDiscountRejectedError)
            expect(error.reason).toBe(reason)
        })

        it('should accept a code exactly at the minimum order', async () => {
            await codes.save(code({ minOrder: 25.5 }))
            await expect(service.preview('o1', 'c1', { code: 'VERANO10' })).resolves.toBeDefined()
        })

        it('should reject a points rule with insufficient balance', async () => {
            await points.setBalance('c1', 'r1', 99)
            const error = await service.preview('o1', 'c1', { pointsRuleId: 'p1' }).catch(e => e)
            expect(error).toBeInstanceOf(BillDiscountRejectedError)
            expect(error.reason).toBe('insufficient_points')
        })

        it('should throw PointsRuleNotFoundError for an unknown rule or one of another restaurant', async () => {
            await expect(service.preview('o1', 'c1', { pointsRuleId: 'nope' })).rejects.toThrow(PointsRuleNotFoundError)
            await expect(service.preview('o1', 'c1', { pointsRuleId: 'p-other' })).rejects.toThrow(PointsRuleNotFoundError)
        })

        it('should return the stored bill when the order was already billed', async () => {
            await bills.save({
                orderId: 'o1', subtotal: 2550, codeId: null, code: 'OLD', discount: 255, pointsUsed: 0, total: 2295, createdAt: ''
            })
            expect(await service.preview('o1', 'c1', {})).toEqual({
                subtotal: 25.5, discount: 2.55, pointsUsed: 0, total: 22.95, code: 'OLD'
            })
        })
    })

    describe('confirm', () => {
        it('should store the bill and return the same summary as the preview', async () => {
            await codes.save(code())
            const preview = await service.preview('o1', 'c1', { code: 'VERANO10' })
            const confirmed = await service.confirm('o1', 'c1', { code: 'VERANO10' })

            expect(confirmed).toEqual(preview)
            expect(await bills.findByOrderId('o1')).toMatchObject({ subtotal: 2550, discount: 255, total: 2295, code: 'VERANO10', codeId: 'code-1' })
        })

        it('should increment the uses of the code', async () => {
            await codes.save(code())
            await service.confirm('o1', 'c1', { code: 'VERANO10' })
            expect((await codes.findById('code-1'))?.uses).toBe(1)
        })

        it('should subtract the points of the rule from the balance', async () => {
            await points.setBalance('c1', 'r1', 250)
            const summary = await service.confirm('o1', 'c1', { pointsRuleId: 'p1' })

            expect(summary).toMatchObject({ discount: 10, pointsUsed: 100, total: 15.5 })
            expect(await points.getBalance('c1', 'r1')).toBe(150)
        })

        it('should confirm without discount', async () => {
            expect(await service.confirm('o1', 'c1', {})).toEqual({ subtotal: 25.5, discount: 0, pointsUsed: 0, total: 25.5 })
        })

        it('should throw BillAlreadyRequestedError the second time and not charge twice', async () => {
            await codes.save(code())
            await service.confirm('o1', 'c1', { code: 'VERANO10' })
            await expect(service.confirm('o1', 'c1', { code: 'VERANO10' })).rejects.toThrow(BillAlreadyRequestedError)
            expect((await codes.findById('code-1'))?.uses).toBe(1)
        })

        it('should not store anything when the discount is rejected', async () => {
            await codes.save(code({ active: false }))
            await expect(service.confirm('o1', 'c1', { code: 'VERANO10' })).rejects.toThrow(BillDiscountRejectedError)
            await expect(service.confirm('o1', 'c1', { code: 'X', pointsRuleId: 'p1' })).rejects.toThrow(BillDiscountConflictError)
            expect(await bills.findByOrderId('o1')).toBeNull()
        })

        it('should throw OrderNotFoundError for an order of another client', async () => {
            await expect(service.confirm('o1', 'someone-else', {})).rejects.toThrow(OrderNotFoundError)
        })
    })
})
