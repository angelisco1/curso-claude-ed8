import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteClientPointsRepository } from './client-points.repository.js'

describe('SqliteClientPointsRepository (Integration)', () => {
    let db: Database
    let repo: SqliteClientPointsRepository

    beforeAll(async () => {
        db = new Database()
        await db.initialize()
        repo = new SqliteClientPointsRepository(db)
        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'r1', 'a', 'e@e.com', '1', 'o', 'o', now, now]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('should return 0 when the client has no balance', async () => {
        expect(await repo.getBalance('c1', 'r1')).toBe(0)
    })

    it('should set and overwrite the balance', async () => {
        await repo.setBalance('c1', 'r1', 150)
        expect(await repo.getBalance('c1', 'r1')).toBe(150)
        await repo.setBalance('c1', 'r1', 20)
        expect(await repo.getBalance('c1', 'r1')).toBe(20)
    })
})
