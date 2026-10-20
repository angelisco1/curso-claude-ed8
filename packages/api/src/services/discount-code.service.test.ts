import { describe, it, expect, beforeEach } from 'vitest'
import { DiscountCodeService } from './discount-code.service.js'
import { MockDiscountCodeRepository } from '@repositories/mocks/MockDiscountCodeRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import {
    RestaurantNotFoundError,
    DiscountCodeNotFoundError,
    DuplicatedDiscountCodeError,
    InvalidDiscountCodeError
} from '@errors/DomainErrors.js'

describe('DiscountCodeService', () => {
    let codes: MockDiscountCodeRepository
    let restaurants: MockRestaurantRepository
    let service: DiscountCodeService

    const input = { code: 'VERANO10', type: 'percent', value: 10 }

    beforeEach(async () => {
        codes = new MockDiscountCodeRepository()
        restaurants = new MockRestaurantRepository()
        service = new DiscountCodeService(codes, restaurants)
        for (const id of ['r1', 'r2']) {
            await restaurants.save({
                id, name: id, address: 'a', email: 'e@e.com', phone: '', ownerFirstName: 'o',
                ownerLastName: 'o', logoUrl: null, createdAt: '', updatedAt: ''
            })
        }
    })

    describe('create', () => {
        it('should create an active code with 0 uses', async () => {
            const code = await service.create('r1', input)

            expect(code.id).toBeDefined()
            expect(code).toMatchObject({ restaurantId: 'r1', code: 'VERANO10', type: 'percent', value: 10, uses: 0, active: true })
            expect(await codes.findById(code.id)).not.toBeNull()
        })

        it('should ignore uses sent by the client', async () => {
            const code = await service.create('r1', { ...input, uses: 99 })
            expect(code.uses).toBe(0)
        })

        it('should throw RestaurantNotFoundError for an unknown restaurant', async () => {
            await expect(service.create('nope', input)).rejects.toThrow(RestaurantNotFoundError)
        })

        it('should throw InvalidDiscountCodeError for invalid data', async () => {
            await expect(service.create('r1', { ...input, value: 0 })).rejects.toThrow(InvalidDiscountCodeError)
        })

        it('should throw DuplicatedDiscountCodeError ignoring case in the same restaurant', async () => {
            await service.create('r1', input)
            await expect(service.create('r1', { ...input, code: 'verano10' })).rejects.toThrow(DuplicatedDiscountCodeError)
        })

        it('should allow the same code in another restaurant', async () => {
            await service.create('r1', input)
            await expect(service.create('r2', input)).resolves.toBeDefined()
        })
    })

    describe('update', () => {
        it('should update fields and keep id and uses', async () => {
            const created = await service.create('r1', input)
            await codes.save({ ...created, uses: 4 })

            const updated = await service.update('r1', created.id, { ...input, value: 25, active: false })

            expect(updated).toMatchObject({ id: created.id, value: 25, active: false, uses: 4 })
        })

        it('should allow keeping its own code', async () => {
            const created = await service.create('r1', input)
            await expect(service.update('r1', created.id, { ...input, code: 'verano10' })).resolves.toBeDefined()
        })

        it('should throw DuplicatedDiscountCodeError when the code belongs to another one', async () => {
            await service.create('r1', input)
            const other = await service.create('r1', { ...input, code: 'OTRO' })
            await expect(service.update('r1', other.id, input)).rejects.toThrow(DuplicatedDiscountCodeError)
        })

        it('should throw DiscountCodeNotFoundError for a code of another restaurant', async () => {
            const created = await service.create('r1', input)
            await expect(service.update('r2', created.id, input)).rejects.toThrow(DiscountCodeNotFoundError)
        })
    })

    describe('getById / list / delete', () => {
        it('should get a code by id', async () => {
            const created = await service.create('r1', input)
            expect(await service.getById('r1', created.id)).toEqual(created)
        })

        it('should throw DiscountCodeNotFoundError for an unknown or foreign id', async () => {
            const created = await service.create('r1', input)
            await expect(service.getById('r1', 'nope')).rejects.toThrow(DiscountCodeNotFoundError)
            await expect(service.getById('r2', created.id)).rejects.toThrow(DiscountCodeNotFoundError)
        })

        it('should list only the codes of the restaurant', async () => {
            await service.create('r1', input)
            await service.create('r2', { ...input, code: 'OTRO' })
            const list = await service.list('r1')
            expect(list.map(c => c.code)).toEqual(['VERANO10'])
        })

        it('should throw RestaurantNotFoundError when listing an unknown restaurant', async () => {
            await expect(service.list('nope')).rejects.toThrow(RestaurantNotFoundError)
        })

        it('should delete a code', async () => {
            const created = await service.create('r1', input)
            await service.delete('r1', created.id)
            expect(await codes.findById(created.id)).toBeNull()
        })

        it('should not delete a code of another restaurant', async () => {
            const created = await service.create('r1', input)
            await expect(service.delete('r2', created.id)).rejects.toThrow(DiscountCodeNotFoundError)
        })
    })
})
