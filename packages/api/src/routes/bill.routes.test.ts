import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'
import { bearer, insertRestaurant } from './test-helpers.js'

const client = { id: 'cli-1', role: 'cliente', restaurantId: null }
const other = { id: 'cli-2', role: 'cliente', restaurantId: null }
const waiter = { id: 'w1', role: 'camarero', restaurantId: 'rest-a' }

const insertOrder = async (id: string, clientId = 'cli-1') => {
    await dbConfig.run("INSERT INTO orders (id, restaurant_id, table_id, client_id, created_at) VALUES (?, 'rest-a', NULL, ?, '')", [id, clientId])
    for (const n of [1, 2]) {
        await dbConfig.run(
            "INSERT INTO order_items (id, order_id, dish_id, quantity, notes, status) VALUES (?, ?, 'dish-1', 1, NULL, 'pendiente')",
            [`${id}-i${n}`, id]
        )
    }
}

const insertCode = (id: string, fields: Record<string, unknown> = {}) => {
    const f = { type: 'fixed', value: 5, max_uses: null, uses: 0, active: 1, min_order: null, valid_until: null, ...fields }
    return dbConfig.run(
        'INSERT INTO discount_codes (id, restaurant_id, code, type, value, min_order, valid_until, max_uses, uses, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, 'rest-a', id.toUpperCase(), f.type, f.value, f.min_order, f.valid_until, f.max_uses, f.uses, f.active, '', '']
    )
}

const get = (orderId: string, query = '', user: any = client) =>
    request(app).get(`/api/v1/orders/${orderId}/bill${query}`).set('Authorization', bearer(user))
const post = (orderId: string, body: any = {}, user: any = client) =>
    request(app).post(`/api/v1/orders/${orderId}/bill`).set('Authorization', bearer(user)).send(body)
const uses = async (id: string) => (await dbConfig.get<{ uses: number }>('SELECT uses FROM discount_codes WHERE id = ?', [id]))?.uses
const balance = async () =>
    (await dbConfig.get<{ balance: number }>("SELECT balance FROM client_points WHERE client_id = 'cli-1'"))?.balance

describe('bill routes', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        await insertRestaurant('rest-a')
        const now = new Date().toISOString()
        // two lines of 10.00 -> subtotal 20.00
        await dbConfig.run(
            "INSERT INTO dishes (id, name, description, price, category, available, restaurant_id, created_at, updated_at) VALUES ('dish-1', 'Plato', '', 10, 'principal', 1, 'rest-a', ?, ?)",
            [now, now]
        )
        await dbConfig.run("INSERT INTO points_rules (id, restaurant_id, points, amount, created_at, updated_at) VALUES ('rule-100', 'rest-a', 100, 10, '', '')")
        await dbConfig.run("INSERT INTO client_points (client_id, restaurant_id, balance) VALUES ('cli-1', 'rest-a', 250)")
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('should require authentication and the cliente role', async () => {
        await insertOrder('o-auth')
        expect((await request(app).get('/api/v1/orders/o-auth/bill')).status).toBe(401)
        expect((await get('o-auth', '', waiter)).status).toBe(403)
        expect((await post('o-auth', {}, waiter)).status).toBe(403)
    })

    it('should answer 404 for an unknown order and for an order of another client', async () => {
        await insertOrder('o-own')
        expect((await get('nope')).status).toBe(404)
        expect((await get('o-own', '', other)).status).toBe(404)
        expect((await post('o-own', {}, other)).status).toBe(404)
    })

    it('should preview without saving anything', async () => {
        await insertOrder('o-prev')
        await insertCode('prev5')
        const res = await get('o-prev', '?code=prev5')
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ subtotal: 20, discount: 5, pointsUsed: 0, total: 15, code: 'PREV5' })
        expect(await uses('prev5')).toBe(0)
        expect((await dbConfig.get('SELECT * FROM order_bills WHERE order_id = ?', ['o-prev']))).toBeUndefined()
    })

    it('should confirm with a code, count the use and answer 409 the second time', async () => {
        await insertOrder('o-code')
        await insertCode('conf5')
        const res = await post('o-code', { code: 'conf5' })
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ subtotal: 20, discount: 5, pointsUsed: 0, total: 15, code: 'CONF5' })
        expect(await uses('conf5')).toBe(1)

        const again = await post('o-code', { code: 'conf5' })
        expect(again.status).toBe(409)
        expect(again.body.error).toBe('BillAlreadyRequestedError')
        expect(await uses('conf5')).toBe(1)

        const stored = await get('o-code')
        expect(stored.body).toEqual(res.body)
    })

    it('should never return a negative total', async () => {
        await insertOrder('o-cap')
        await insertCode('big', { value: 500 })
        const res = await post('o-cap', { code: 'big' })
        expect(res.body).toMatchObject({ discount: 20, total: 0 })
    })

    it('should confirm with points and subtract them from the balance', async () => {
        await insertOrder('o-pts')
        const before = (await balance()) as number
        const res = await post('o-pts', { pointsRuleId: 'rule-100' })
        expect(res.status).toBe(200)
        expect(res.body).toEqual({ subtotal: 20, discount: 10, pointsUsed: 100, total: 10 })
        expect(await balance()).toBe(before - 100)
    })

    it('should answer 400 when code and points arrive together', async () => {
        await insertOrder('o-both')
        expect((await post('o-both', { code: 'x', pointsRuleId: 'rule-100' })).status).toBe(400)
        expect((await get('o-both', '?code=x&pointsRuleId=rule-100')).status).toBe(400)
    })

    it.each([
        ['inactive', { active: 0 }],
        ['expired', { valid_until: '2000-01-01T00:00:00Z' }],
        ['exhausted', { max_uses: 1, uses: 1 }],
        ['min_order', { min_order: 50 }]
    ])('should answer 422 with reason %s', async (reason, fields) => {
        const id = `rej-${reason}`
        await insertOrder(`o-${id}`)
        await insertCode(id, fields)
        for (const res of [await get(`o-${id}`, `?code=${id}`), await post(`o-${id}`, { code: id })]) {
            expect(res.status).toBe(422)
            expect(res.body.reason).toBe(reason)
        }
        expect(await dbConfig.get('SELECT * FROM order_bills WHERE order_id = ?', [`o-${id}`])).toBeUndefined()
    })

    it('should answer 422 insufficient_points and 404 invalid for an unknown code', async () => {
        await insertOrder('o-poor', 'cli-1')
        await dbConfig.run("UPDATE client_points SET balance = 5 WHERE client_id = 'cli-1'")
        const poor = await post('o-poor', { pointsRuleId: 'rule-100' })
        expect(poor.status).toBe(422)
        expect(poor.body.reason).toBe('insufficient_points')
        expect(await balance()).toBe(5)

        const unknown = await post('o-poor', { code: 'nope' })
        expect(unknown.status).toBe(404)
        expect(unknown.body.reason).toBe('invalid')
    })
})
