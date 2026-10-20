import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteDiscountCodeRepository } from './discount-code.repository.js'
import type { DiscountCode } from '@models/discount-code.model.js'

const sample = (overrides: Partial<DiscountCode> = {}): DiscountCode => ({
    id: 'c1', restaurantId: 'r1', code: 'Verano10', type: 'percent', value: 10, minOrder: null,
    validFrom: null, validUntil: null, maxUses: null, uses: 0, active: true, ...overrides
})

describe('SqliteDiscountCodeRepository (Integration)', () => {
    let db: Database
    let repo: SqliteDiscountCodeRepository

    beforeAll(async () => {
        db = new Database()
        await db.initialize()
        repo = new SqliteDiscountCodeRepository(db)
        const now = new Date().toISOString()
        for (const id of ['r1', 'r2']) {
            await db.run(
                'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [id, id, 'a', 'e@e.com', '1', 'o', 'o', now, now]
            )
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and find a code by id with booleans and nulls mapped', async () => {
        await repo.save(sample())
        expect(await repo.findById('c1')).toEqual(sample())
    })

    it('should update an existing code', async () => {
        await repo.save(sample({ value: 15, active: false, maxUses: 3, minOrder: 20.5, validFrom: '2026-01-01', validUntil: '2026-12-31' }))
        expect(await repo.findById('c1')).toMatchObject({ value: 15, active: false, maxUses: 3, minOrder: 20.5, uses: 0 })
    })

    it('should find by code ignoring case and scoped to the restaurant', async () => {
        expect((await repo.findByCode('r1', 'VERANO10'))?.id).toBe('c1')
        expect(await repo.findByCode('r2', 'verano10')).toBeNull()
    })

    it('should enforce a unique code per restaurant ignoring case', async () => {
        await expect(repo.save(sample({ id: 'c2', code: 'verano10' }))).rejects.toThrow()
        await repo.save(sample({ id: 'c3', restaurantId: 'r2', code: 'verano10' }))
    })

    it('should list by restaurant', async () => {
        const list = await repo.findByRestaurantId('r1')
        expect(list.map(c => c.id)).toEqual(['c1'])
    })

    it('should delete a code', async () => {
        await repo.delete('c1')
        expect(await repo.findById('c1')).toBeNull()
    })
})
