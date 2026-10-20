import { describe, it, expect, beforeEach } from 'vitest'
import { OrderService } from './order.service.js'
import { MockOrderRepository } from '@repositories/mocks/MockOrderRepository.js'
import type { Order } from '@models/order.model.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'
import { OrderNotFoundError, InvalidOrderStatusError, TableNotFoundError, TableNotAvailableError } from '@errors/DomainErrors.js'

describe('OrderService.updateItemStatus', () => {
    let repo: MockOrderRepository
    let service: OrderService
    let testOrder: Order

    beforeEach(async () => {
        repo = new MockOrderRepository()
        service = new OrderService(repo)

        testOrder = {
            id: 'order-1',
            restaurantId: 'rest-1',
            tableId: null,
            clientId: null,
            createdAt: new Date(),
            items: [
                { id: 'item-1', dishId: 'dish-1', quantity: 1, notes: null, status: 'pendiente' }
            ]
        }
        await repo.create(testOrder)
    })

    it('should update the status of an item successfully', async () => {
        await service.updateItemStatus('order-1', 'item-1', 'preparando')
        const updatedItem = testOrder.items[0]!
        expect(updatedItem.status).toBe('preparando')
    })

    it('should throw an error if the order does not exist', async () => {
        await expect(service.updateItemStatus('order-bad', 'item-1', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw an error if the item does not exist inside the order', async () => {
        await expect(service.updateItemStatus('order-1', 'item-bad', 'preparando'))
            .rejects.toThrow(OrderNotFoundError)
    })

    it('should throw DomainError if status is invalid', async () => {
        await expect(service.updateItemStatus('order-1', 'item-1', 'invalid-status'))
            .rejects.toThrow(InvalidOrderStatusError)
    })
})

describe('OrderService.create with tableId', () => {
    let tables: MockTableRepository
    let service: OrderService

    const request = (tableId: string | null) => ({
        restaurantId: 'rest-1',
        tableId,
        clientId: 'client-1',
        items: [{ dishId: 'dish-1', quantity: 1, notes: null }]
    })

    beforeEach(async () => {
        tables = new MockTableRepository()
        service = new OrderService(new MockOrderRepository(), tables)
        await tables.save({ id: 't-occupied', restaurantId: 'rest-1', numero: 1, descripcion: '', capacidad: 4, estado: 'ocupada' })
        await tables.save({ id: 't-free', restaurantId: 'rest-1', numero: 2, descripcion: '', capacidad: 4, estado: 'libre' })
        await tables.save({ id: 't-other', restaurantId: 'rest-2', numero: 1, descripcion: '', capacidad: 4, estado: 'ocupada' })
    })

    it('should create an order for an occupied table of the restaurant', async () => {
        const order = await service.create(request('t-occupied'))
        expect(order.tableId).toBe('t-occupied')
    })

    it('should allow orders without table', async () => {
        await expect(service.create(request(null))).resolves.toBeDefined()
    })

    it('should throw TableNotFoundError for an unknown table', async () => {
        await expect(service.create(request('nope'))).rejects.toThrow(TableNotFoundError)
    })

    it('should throw TableNotAvailableError for a table that is not occupied or belongs to another restaurant', async () => {
        await expect(service.create(request('t-free'))).rejects.toThrow(TableNotAvailableError)
        await expect(service.create(request('t-other'))).rejects.toThrow(TableNotAvailableError)
    })
})
