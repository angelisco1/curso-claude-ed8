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

    describe('confirm', () => {
        const ctx = { restaurantId: 'r1', clientId: 'c1' }
        const insertOrder = (id: string) =>
            db.run('INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, ?, NULL, ?, ?)', [id, 'r1', 'c1', ''])
        const insertCode = (id: string, maxUses: number | null = null) =>
            db.run(
                "INSERT INTO discount_codes (id, restaurant_id, code, type, value, max_uses, uses, active, created_at, updated_at) VALUES (?, 'r1', ?, 'fixed', 5, ?, 0, 1, '', '')",
                [id, id.toUpperCase(), maxUses]
            )
        const uses = async (id: string) => (await db.get<{ uses: number }>('SELECT uses FROM discount_codes WHERE id = ?', [id]))?.uses

        it('should save the bill and increment the uses of the code', async () => {
            await insertOrder('c-o1')
            await insertCode('k1')
            await repo.confirm(record({ orderId: 'c-o1', codeId: 'k1', code: 'K1', discount: 500, total: 1500 }), ctx)

            expect(await repo.findByOrderId('c-o1')).toMatchObject({ codeId: 'k1', total: 1500 })
            expect(await uses('k1')).toBe(1)
        })

        it('should save the bill and subtract the points', async () => {
            await insertOrder('c-o2')
            await db.run("INSERT INTO client_points (client_id, restaurant_id, balance) VALUES ('c1', 'r1', 150)")
            await repo.confirm(record({ orderId: 'c-o2', discount: 1000, pointsUsed: 100, total: 1000 }), ctx)

            expect((await db.get<{ balance: number }>("SELECT balance FROM client_points WHERE client_id = 'c1'"))?.balance).toBe(50)
        })

        it('should roll everything back when the code has no uses left', async () => {
            await insertOrder('c-o3')
            await insertCode('k2', 1)
            await db.run("UPDATE discount_codes SET uses = 1 WHERE id = 'k2'")

            await expect(repo.confirm(record({ orderId: 'c-o3', codeId: 'k2', code: 'K2' }), ctx))
                .rejects.toMatchObject({ reason: 'exhausted' })
            expect(await repo.findByOrderId('c-o3')).toBeNull()
            expect(await uses('k2')).toBe(1)
        })

        it('should roll everything back when the balance is not enough', async () => {
            await insertOrder('c-o4')
            await expect(repo.confirm(record({ orderId: 'c-o4', pointsUsed: 9999 }), ctx))
                .rejects.toMatchObject({ reason: 'insufficient_points' })
            expect(await repo.findByOrderId('c-o4')).toBeNull()
        })

        it('should confirm only once when called concurrently for the same order', async () => {
            await insertOrder('c-o5')
            await insertCode('k3')
            const attempt = () => repo.confirm(record({ orderId: 'c-o5', codeId: 'k3', code: 'K3', discount: 500, total: 1500 }), ctx)
            const results = await Promise.allSettled([attempt(), attempt(), attempt()])

            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
            expect(results.filter(r => r.status === 'rejected').every(r => (r as PromiseRejectedResult).reason instanceof BillAlreadyRequestedError)).toBe(true)
            expect(await uses('k3')).toBe(1)
        })

        it('should not exceed maxUses under concurrent confirmations of different orders', async () => {
            await insertCode('k4', 2)
            for (const id of ['c-o6', 'c-o7', 'c-o8']) await insertOrder(id)
            const results = await Promise.allSettled(
                ['c-o6', 'c-o7', 'c-o8'].map(id => repo.confirm(record({ orderId: id, codeId: 'k4', code: 'K4', discount: 500, total: 1500 }), ctx))
            )
            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(2)
            expect(await uses('k4')).toBe(2)
        })
    })
})
