import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import app from '../app.js'
import { dbConfig } from '@config/database.js'
import { bearer, insertRestaurant } from './test-helpers.js'

const manager1 = { id: 'm1', role: 'manager', restaurantId: 'rest-a' }
const manager2 = { id: 'm2', role: 'manager', restaurantId: 'rest-b' }
const admin = { id: 'ad', role: 'admin', restaurantId: null }
const waiter = { id: 'w1', role: 'camarero', restaurantId: 'rest-a' }
const client = { id: 'c1', role: 'cliente', restaurantId: null }

const base = '/api/v1/restaurants/rest-a/discount-codes'
const body = { code: 'VERANO10', type: 'percent', value: 10 }

describe('discount code routes', () => {
    beforeAll(async () => {
        await dbConfig.initialize()
        await insertRestaurant('rest-a')
        await insertRestaurant('rest-b')
    })

    afterAll(async () => {
        await dbConfig.close()
    })

    it('should require authentication', async () => {
        expect((await request(app).get(base)).status).toBe(401)
    })

    it('should reject roles other than admin and manager', async () => {
        expect((await request(app).get(base).set('Authorization', bearer(waiter))).status).toBe(403)
        expect((await request(app).post(base).set('Authorization', bearer(client)).send(body)).status).toBe(403)
    })

    it('should reject a manager of another restaurant', async () => {
        expect((await request(app).get(base).set('Authorization', bearer(manager2))).status).toBe(403)
        expect((await request(app).post(base).set('Authorization', bearer(manager2)).send(body)).status).toBe(403)
    })

    it('should run the full CRUD for a manager', async () => {
        const created = await request(app).post(base).set('Authorization', bearer(manager1)).send(body)
        expect(created.status).toBe(201)
        expect(created.body).toMatchObject({ code: 'VERANO10', uses: 0, active: true, restaurantId: 'rest-a' })
        const id = created.body.id

        const list = await request(app).get(base).set('Authorization', bearer(manager1))
        expect(list.status).toBe(200)
        expect(list.body).toHaveLength(1)

        const one = await request(app).get(`${base}/${id}`).set('Authorization', bearer(admin))
        expect(one.status).toBe(200)

        const updated = await request(app).put(`${base}/${id}`).set('Authorization', bearer(manager1))
            .send({ ...body, value: 20, active: false })
        expect(updated.status).toBe(200)
        expect(updated.body).toMatchObject({ value: 20, active: false })

        expect((await request(app).delete(`${base}/${id}`).set('Authorization', bearer(manager1))).status).toBe(204)
        expect((await request(app).get(`${base}/${id}`).set('Authorization', bearer(manager1))).status).toBe(404)
    })

    it('should answer 409 for a duplicated code ignoring case', async () => {
        await request(app).post(base).set('Authorization', bearer(manager1)).send(body)
        const dup = await request(app).post(base).set('Authorization', bearer(manager1)).send({ ...body, code: 'verano10' })
        expect(dup.status).toBe(409)
        expect(dup.body.error).toBe('DuplicatedDiscountCodeError')
    })

    it('should answer 400 for invalid data and 404 for an unknown restaurant', async () => {
        const bad = await request(app).post(base).set('Authorization', bearer(manager1)).send({ ...body, value: -1 })
        expect(bad.status).toBe(400)
        const unknown = await request(app).get('/api/v1/restaurants/nope/discount-codes').set('Authorization', bearer(admin))
        expect(unknown.status).toBe(404)
    })
})
