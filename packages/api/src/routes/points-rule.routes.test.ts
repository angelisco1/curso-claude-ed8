import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'
import { bearer, insertRestaurant } from './test-helpers.js'

const manager1 = { id: 'm1', role: 'manager', restaurantId: 'rest-a' }
const manager2 = { id: 'm2', role: 'manager', restaurantId: 'rest-b' }
const client = { id: 'c1', role: 'cliente', restaurantId: null }
const base = '/api/v1/restaurants/rest-a/points-rules'

describe('points rule routes', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        await insertRestaurant('rest-a')
        await insertRestaurant('rest-b')
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('should require auth, admin/manager role and the own restaurant', async () => {
        expect((await request(app).get(base)).status).toBe(401)
        expect((await request(app).get(base).set('Authorization', bearer(client))).status).toBe(403)
        expect((await request(app).get(base).set('Authorization', bearer(manager2))).status).toBe(403)
    })

    it('should run the full CRUD and answer 409 for repeated points', async () => {
        const auth = bearer(manager1)
        const created = await request(app).post(base).set('Authorization', auth).send({ points: 10, amount: 1 })
        expect(created.status).toBe(201)
        const id = created.body.id

        const dup = await request(app).post(base).set('Authorization', auth).send({ points: 10, amount: 2 })
        expect(dup.status).toBe(409)
        expect(dup.body.error).toBe('DuplicatedPointsRuleError')

        const list = await request(app).get(base).set('Authorization', auth)
        expect(list.body).toHaveLength(1)
        expect((await request(app).get(`${base}/${id}`).set('Authorization', auth)).status).toBe(200)

        const updated = await request(app).put(`${base}/${id}`).set('Authorization', auth).send({ points: 10, amount: 1.5 })
        expect(updated.body.amount).toBe(1.5)

        expect((await request(app).delete(`${base}/${id}`).set('Authorization', auth)).status).toBe(204)
        expect((await request(app).get(`${base}/${id}`).set('Authorization', auth)).status).toBe(404)
    })

    it('should answer 400 for invalid data', async () => {
        const res = await request(app).post(base).set('Authorization', bearer(manager1)).send({ points: -1, amount: 1 })
        expect(res.status).toBe(400)
    })
})
