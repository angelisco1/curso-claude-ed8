import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'
import { bearer, insertRestaurant } from './test-helpers.js'

const manager1 = { id: 'm1', role: 'manager', restaurantId: 'rest-a' }
const manager2 = { id: 'm2', role: 'manager', restaurantId: 'rest-b' }
const client = { id: 'cli-1', role: 'cliente', restaurantId: null }

describe('points routes', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        await insertRestaurant('rest-a')
        await insertRestaurant('rest-b')
        await dbConfig.run(
            "INSERT INTO employees (id, first_name, last_name, email, password_hash, role, restaurant_id) VALUES ('cli-1', 'A', 'B', 'a@b.com', 'h', 'cliente', NULL)"
        )
        await dbConfig.run(
            "INSERT INTO points_rules (id, restaurant_id, points, amount, created_at, updated_at) VALUES ('p1', 'rest-a', 10, 1, '', '')"
        )
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    const put = (user: any, clientId: string, body: any, restaurant = 'rest-a') =>
        request(app).put(`/api/v1/restaurants/${restaurant}/clients/${clientId}/points`).set('Authorization', bearer(user)).send(body)

    it('should let a manager set the balance and the client read it', async () => {
        const res = await put(manager1, 'cli-1', { balance: 120 })
        expect(res.status).toBe(200)
        expect(res.body).toMatchObject({ clientId: 'cli-1', balance: 120 })

        const me = await request(app).get('/api/v1/restaurants/rest-a/points/me').set('Authorization', bearer(client))
        expect(me.status).toBe(200)
        expect(me.body).toEqual({ balance: 120, rules: [{ id: 'p1', points: 10, amount: 1 }] })
    })

    it('should reject a manager from another restaurant and clients setting balances', async () => {
        expect((await put(manager2, 'cli-1', { balance: 5 })).status).toBe(403)
        expect((await put(client, 'cli-1', { balance: 5 })).status).toBe(403)
    })

    it('should answer 400 for an invalid balance and 404 for an unknown client', async () => {
        expect((await put(manager1, 'cli-1', { balance: -3 })).status).toBe(400)
        expect((await put(manager1, 'ghost', { balance: 3 })).status).toBe(404)
    })

    it('should not let staff read points/me and require auth', async () => {
        expect((await request(app).get('/api/v1/restaurants/rest-a/points/me')).status).toBe(401)
        const res = await request(app).get('/api/v1/restaurants/rest-a/points/me').set('Authorization', bearer(manager1))
        expect(res.status).toBe(403)
    })

    it('should return 0 for a restaurant without balance', async () => {
        const me = await request(app).get('/api/v1/restaurants/rest-b/points/me').set('Authorization', bearer(client))
        expect(me.body).toEqual({ balance: 0, rules: [] })
    })
})
