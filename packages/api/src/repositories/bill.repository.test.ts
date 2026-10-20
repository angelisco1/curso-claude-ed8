import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Database } from '@config/database.js'
import { SqliteBillRepository } from './bill.repository.js'
import { BillAlreadyRequestedError } from '@errors/DomainErrors.js'
import type { BillRecord } from '@models/bill.model.js'

const record = (overrides: Partial<BillRecord> = {}): BillRecord => ({
    orderId: 'o1', subtotal: 2000, codeId: null, code: null, discount: 0, pointsUsed: 0, total: 2000,
    createdAt: '2026-01-01T00:00:00.000Z', ...overrides
})

describe('SqliteBillRepository (Integration)', () => {
    let db: Database
    let repo: SqliteBillRepository

    beforeAll(async () => {
        db = new Database()
        await db.initialize()
        repo = new SqliteBillRepository(db)
        const now = new Date().toISOString()
        await db.run(
            'INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            ['r1', 'r1', 'a', 'e@e.com', '1', 'o', 'o', now, now]
        )
        for (const id of ['o1', 'o2']) {
            await db.run('INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, NULL, NULL, ?)', [id, 'r1', now])
        }
    })

    afterAll(async () => {
        await db.close()
    })

    it('should return null when the order has no bill', async () => {
        expect(await repo.findByOrderId('o1')).toBeNull()
    })

    it('should save and find a bill by order id', async () => {
        await repo.save(record())
        expect(await repo.findByOrderId('o1')).toEqual(record())
    })

    it('should throw BillAlreadyRequestedError for a second bill of the same order', async () => {
        await expect(repo.save(record())).rejects.toThrow(BillAlreadyRequestedError)
    })

    it('should keep the code snapshot of a bill', async () => {
        await repo.save(record({ orderId: 'o2', code: 'VERANO10', discount: 200, total: 1800 }))
        expect(await repo.findByOrderId('o2')).toMatchObject({ code: 'VERANO10', codeId: null, discount: 200, total: 1800 })
    })
})
