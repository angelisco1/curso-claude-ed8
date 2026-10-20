import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqlitePointsRuleRepository } from './points-rule.repository.js'

describe('SqlitePointsRuleRepository (Integration)', () => {
    let db: Database
    let repo: SqlitePointsRuleRepository

    beforeAll(async () => {
        db = new Database()
        await db.initialize()
        repo = new SqlitePointsRuleRepository(db)
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

    it('should save, update and find a rule', async () => {
        await repo.save({ id: 'p1', restaurantId: 'r1', points: 100, amount: 10 })
        expect(await repo.findById('p1')).toEqual({ id: 'p1', restaurantId: 'r1', points: 100, amount: 10 })

        await repo.save({ id: 'p1', restaurantId: 'r1', points: 100, amount: 12.5 })
        expect((await repo.findById('p1'))?.amount).toBe(12.5)
    })

    it('should find by points scoped to the restaurant', async () => {
        expect((await repo.findByPoints('r1', 100))?.id).toBe('p1')
        expect(await repo.findByPoints('r2', 100)).toBeNull()
    })

    it('should list by restaurant ordered by points', async () => {
        await repo.save({ id: 'p2', restaurantId: 'r1', points: 10, amount: 1 })
        const rules = await repo.findByRestaurantId('r1')
        expect(rules.map(r => r.points)).toEqual([10, 100])
    })

    it('should enforce unique points per restaurant', async () => {
        await expect(repo.save({ id: 'p3', restaurantId: 'r1', points: 10, amount: 2 })).rejects.toThrow()
        await repo.save({ id: 'p4', restaurantId: 'r2', points: 10, amount: 2 })
    })

    it('should delete a rule', async () => {
        await repo.delete('p1')
        expect(await repo.findById('p1')).toBeNull()
    })
})
