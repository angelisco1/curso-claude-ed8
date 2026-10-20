import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { MockRestaurantRepository } from '@repositories/mocks/MockRestaurantRepository.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { Order } from '@models/order.model.js'
import {
    TableNotFoundError,
    RestaurantNotFoundError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    InvalidTableStatusError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

describe('normalizeTableStatus', () => {
    it('should accept and normalize valid statuses', () => {
        expect(normalizeTableStatus('libre')).toBe('libre')
        expect(normalizeTableStatus(' OCUPADA ')).toBe('ocupada')
        expect(normalizeTableStatus('reservada')).toBe('reservada')
    })

    it('should throw InvalidTableStatusError for invalid values', () => {
        expect(() => normalizeTableStatus('roto')).toThrow(InvalidTableStatusError)
        expect(() => normalizeTableStatus(undefined)).toThrow(InvalidTableStatusError)
    })
})

describe('TableService', () => {
    let tables: MockTableRepository
    let restaurants: MockRestaurantRepository
    let orders: MockOrderRepository
    let service: TableService

    const input = { numero: 1, descripcion: 'Terraza', capacidad: 4 }

    beforeEach(async () => {
        tables = new MockTableRepository()
        restaurants = new MockRestaurantRepository()
        orders = new MockOrderRepository()
        service = new TableService(tables, restaurants, orders)
        for (const id of ['r1', 'r2']) {
            await restaurants.save({
                id, name: id, address: 'a', email: 'e@e.com', phone: '', ownerFirstName: 'o',
                ownerLastName: 'o', logoUrl: null, createdAt: '', updatedAt: ''
            })
        }
    })

    describe('create', () => {
        it('should create a free table', async () => {
            const table = await service.create('r1', input)

            expect(table.id).toBeDefined()
            expect(table).toMatchObject({ restaurantId: 'r1', numero: 1, descripcion: 'Terraza', capacidad: 4, estado: 'libre' })
            expect(await tables.findById(table.id)).not.toBeNull()
        })

        it('should default descripcion to empty string', async () => {
            const table = await service.create('r1', { numero: 2, capacidad: 2 })
            expect(table.descripcion).toBe('')
        })

        it('should throw RestaurantNotFoundError for an unknown restaurant', async () => {
            await expect(service.create('nope', input)).rejects.toThrow(RestaurantNotFoundError)
        })

        it('should throw InvalidTableNumberError for invalid numero', async () => {
            await expect(service.create('r1', { ...input, numero: 0 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.create('r1', { ...input, numero: 1.5 })).rejects.toThrow(InvalidTableNumberError)
            await expect(service.create('r1', { ...input, numero: '3' as any })).rejects.toThrow(InvalidTableNumberError)
        })

        it('should throw InvalidTableCapacityError for invalid capacidad', async () => {
            await expect(service.create('r1', { ...input, capacidad: 0 })).rejects.toThrow(InvalidTableCapacityError)
            await expect(service.create('r1', { ...input, capacidad: undefined as any })).rejects.toThrow(InvalidTableCapacityError)
        })

        it('should throw DuplicatedTableNumberError for a repeated numero in the same restaurant', async () => {
            await service.create('r1', input)
            await expect(service.create('r1', input)).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should allow the same numero in another restaurant', async () => {
            await service.create('r1', input)
            await expect(service.create('r2', input)).resolves.toBeDefined()
        })
    })

    describe('update', () => {
        it('should update data and keep the status', async () => {
            const created = await service.create('r1', input)
            await service.updateStatus('r1', created.id, 'reservada')

            const updated = await service.update('r1', created.id, { numero: 9, descripcion: 'Salón', capacidad: 8 })

            expect(updated).toMatchObject({ numero: 9, descripcion: 'Salón', capacidad: 8, estado: 'reservada' })
        })

        it('should not flag the own numero as duplicated', async () => {
            const created = await service.create('r1', input)
            await expect(service.update('r1', created.id, { ...input, capacidad: 6 })).resolves.toMatchObject({ capacidad: 6 })
        })

        it('should throw DuplicatedTableNumberError when taking another table numero', async () => {
            await service.create('r1', input)
            const second = await service.create('r1', { ...input, numero: 2 })
            await expect(service.update('r1', second.id, input)).rejects.toThrow(DuplicatedTableNumberError)
        })

        it('should throw TableNotFoundError for unknown or foreign tables', async () => {
            const created = await service.create('r1', input)
            await expect(service.update('r1', 'nope', input)).rejects.toThrow(TableNotFoundError)
            await expect(service.update('r2', created.id, input)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('delete', () => {
        it('should delete a free or reserved table', async () => {
            const free = await service.create('r1', input)
            const reserved = await service.create('r1', { ...input, numero: 2 })
            await service.updateStatus('r1', reserved.id, 'reservada')

            await service.delete('r1', free.id)
            await service.delete('r1', reserved.id)

            expect(await tables.findById(free.id)).toBeNull()
            expect(await tables.findById(reserved.id)).toBeNull()
        })

        it('should throw TableOccupiedError for an occupied table', async () => {
            const created = await service.create('r1', input)
            await service.occupy('r1', created.id)
            await expect(service.delete('r1', created.id)).rejects.toThrow(TableOccupiedError)
        })

        it('should throw TableNotFoundError for an unknown table', async () => {
            await expect(service.delete('r1', 'nope')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('getById', () => {
        it('should return the table or throw TableNotFoundError', async () => {
            const created = await service.create('r1', input)
            await expect(service.getById('r1', created.id)).resolves.toMatchObject({ id: created.id })
            await expect(service.getById('r2', created.id)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('list', () => {
        beforeEach(async () => {
            await service.create('r1', { numero: 3, capacidad: 2 })
            await service.create('r1', { numero: 1, capacidad: 6 })
            const t = await service.create('r1', { numero: 2, capacidad: 4 })
            await service.updateStatus('r1', t.id, 'ocupada')
        })

        it('should list all tables ordered by numero', async () => {
            const result = await service.list('r1', {})
            expect(result.map(t => t.numero)).toEqual([1, 2, 3])
        })

        it('should filter by estado and capacidadMin', async () => {
            expect((await service.list('r1', { estado: 'libre' })).map(t => t.numero)).toEqual([1, 3])
            expect((await service.list('r1', { capacidadMin: 4 })).map(t => t.numero)).toEqual([1, 2])
            expect((await service.list('r1', { estado: 'libre', capacidadMin: 4 })).map(t => t.numero)).toEqual([1])
        })

        it('should throw InvalidTableCapacityError for an invalid capacidadMin', async () => {
            await expect(service.list('r1', { capacidadMin: 0 })).rejects.toThrow(InvalidTableCapacityError)
        })

        it('should throw RestaurantNotFoundError for an unknown restaurant', async () => {
            await expect(service.list('nope', {})).rejects.toThrow(RestaurantNotFoundError)
        })
    })

    describe('listFree', () => {
        it('should return only free tables with enough capacity ordered by capacidad then numero', async () => {
            await service.create('r1', { numero: 1, capacidad: 6 })
            await service.create('r1', { numero: 2, capacidad: 4 })
            await service.create('r1', { numero: 3, capacidad: 4 })
            await service.create('r1', { numero: 4, capacidad: 2 })
            const busy = await service.create('r1', { numero: 5, capacidad: 4 })
            await service.updateStatus('r1', busy.id, 'ocupada')

            const result = await service.listFree('r1', 3)

            expect(result.map(t => t.numero)).toEqual([2, 3, 1])
        })
    })

    describe('updateStatus', () => {
        it('should change the status', async () => {
            const created = await service.create('r1', input)
            const result = await service.updateStatus('r1', created.id, 'reservada')
            expect(result.estado).toBe('reservada')
        })

        it('should throw InvalidTableStatusError and TableNotFoundError', async () => {
            const created = await service.create('r1', input)
            await expect(service.updateStatus('r1', created.id, 'roto')).rejects.toThrow(InvalidTableStatusError)
            await expect(service.updateStatus('r1', 'nope', 'libre')).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('occupy', () => {
        it('should occupy a free table', async () => {
            const created = await service.create('r1', input)
            const result = await service.occupy('r1', created.id)
            expect(result.estado).toBe('ocupada')
        })

        it('should throw TableNotAvailableError when the table is not free', async () => {
            const created = await service.create('r1', input)
            await service.occupy('r1', created.id)
            await expect(service.occupy('r1', created.id)).rejects.toThrow(TableNotAvailableError)

            const reserved = await service.create('r1', { ...input, numero: 2 })
            await service.updateStatus('r1', reserved.id, 'reservada')
            await expect(service.occupy('r1', reserved.id)).rejects.toThrow(TableNotAvailableError)
        })

        it('should let only one of two concurrent requests win', async () => {
            const created = await service.create('r1', input)
            const results = await Promise.allSettled([service.occupy('r1', created.id), service.occupy('r1', created.id)])
            expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1)
        })

        it('should throw TableNotFoundError for unknown or foreign tables', async () => {
            const created = await service.create('r1', input)
            await expect(service.occupy('r1', 'nope')).rejects.toThrow(TableNotFoundError)
            await expect(service.occupy('r2', created.id)).rejects.toThrow(TableNotFoundError)
        })
    })

    describe('listOccupiedWithOrders', () => {
        const buildOrder = (id: string, tableId: string | null, restaurantId = 'r1'): Order => ({
            id, restaurantId, tableId, clientId: null, createdAt: new Date(),
            items: [{ id: `${id}-i`, dishId: 'd', quantity: 1, notes: null, status: 'pendiente' }]
        })

        it('should return occupied tables with their active orders only', async () => {
            const occupied = await service.create('r1', { numero: 1, capacidad: 2 })
            const withoutOrders = await service.create('r1', { numero: 2, capacidad: 2 })
            const free = await service.create('r1', { numero: 3, capacidad: 2 })
            await service.occupy('r1', occupied.id)
            await service.occupy('r1', withoutOrders.id)
            await orders.create(buildOrder('o1', occupied.id))
            await orders.create(buildOrder('o2', free.id))
            await orders.create(buildOrder('o3', null))

            const result = await service.listOccupiedWithOrders('r1')

            expect(result.map(r => r.table.numero)).toEqual([1, 2])
            expect(result[0]!.orders.map(o => o.id)).toEqual(['o1'])
            expect(result[1]!.orders).toEqual([])
        })

        it('should throw RestaurantNotFoundError for an unknown restaurant', async () => {
            await expect(service.listOccupiedWithOrders('nope')).rejects.toThrow(RestaurantNotFoundError)
        })
    })
})
