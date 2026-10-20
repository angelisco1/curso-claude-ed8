import { randomUUID } from 'crypto'
import type { Table, TableStatusType } from '@models/table.model.js'
import { assertValidTableCapacity, assertValidTableNumber, normalizeTableStatus } from '@models/table.model.js'
import type { Order } from '@models/order.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import type { OrderRepository } from '@repositories/order.repository.js'
import {
    RestaurantNotFoundError,
    TableNotFoundError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableOccupiedError
} from '@errors/DomainErrors.js'

export interface TableDTO {
    numero: number
    descripcion?: string
    capacidad: number
}

export interface TableListFilters {
    estado?: TableStatusType | undefined
    capacidadMin?: number | undefined
}

export interface TableWithOrders {
    table: Table
    orders: Order[]
}

export class TableService {
    constructor(
        private readonly tableRepository: TableRepository,
        private readonly restaurantRepository: RestaurantRepository,
        private readonly orderRepository: OrderRepository
    ) {}

    async create(restaurantId: string, dto: TableDTO): Promise<Table> {
        await this.ensureRestaurantExists(restaurantId)
        const numero = assertValidTableNumber(dto.numero)
        const capacidad = assertValidTableCapacity(dto.capacidad)
        await this.ensureNumeroAvailable(restaurantId, numero)

        const table: Table = {
            id: randomUUID(),
            restaurantId,
            numero,
            descripcion: dto.descripcion ?? '',
            capacidad,
            estado: 'libre'
        }
        await this.tableRepository.save(table)
        return table
    }

    async update(restaurantId: string, id: string, dto: TableDTO): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const numero = assertValidTableNumber(dto.numero)
        const capacidad = assertValidTableCapacity(dto.capacidad)
        await this.ensureNumeroAvailable(restaurantId, numero, id)

        const updated: Table = { ...existing, numero, descripcion: dto.descripcion ?? '', capacidad }
        await this.tableRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        const existing = await this.getById(restaurantId, id)
        if (existing.estado === 'ocupada') {
            throw new TableOccupiedError()
        }
        await this.tableRepository.delete(id)
    }

    async getById(restaurantId: string, id: string): Promise<Table> {
        const table = await this.tableRepository.findById(id)
        if (!table || table.restaurantId !== restaurantId) {
            throw new TableNotFoundError()
        }
        return table
    }

    async list(restaurantId: string, filters: TableListFilters): Promise<Table[]> {
        await this.ensureRestaurantExists(restaurantId)
        if (filters.capacidadMin !== undefined) {
            assertValidTableCapacity(filters.capacidadMin)
        }
        return this.tableRepository.findByRestaurantId(restaurantId, filters)
    }

    async listFree(restaurantId: string, capacidadMin?: number): Promise<Table[]> {
        const tables = await this.list(restaurantId, { estado: 'libre', capacidadMin })
        return tables.sort((a, b) => a.capacidad - b.capacidad || a.numero - b.numero)
    }

    async updateStatus(restaurantId: string, id: string, estado: unknown): Promise<Table> {
        const normalized = normalizeTableStatus(estado)
        const existing = await this.getById(restaurantId, id)
        const updated: Table = { ...existing, estado: normalized }
        await this.tableRepository.save(updated)
        return updated
    }

    async occupy(restaurantId: string, id: string): Promise<Table> {
        const existing = await this.getById(restaurantId, id)
        const occupied = await this.tableRepository.occupyIfFree(restaurantId, id)
        if (!occupied) {
            throw new TableNotAvailableError()
        }
        return { ...existing, estado: 'ocupada' }
    }

    async listOccupiedWithOrders(restaurantId: string): Promise<TableWithOrders[]> {
        await this.ensureRestaurantExists(restaurantId)
        const occupied = await this.tableRepository.findByRestaurantId(restaurantId, { estado: 'ocupada' })
        const activeOrders = await this.orderRepository.findActiveByRestaurant(restaurantId)
        return occupied.map(table => ({
            table,
            orders: activeOrders.filter(order => order.tableId === table.id)
        }))
    }

    private async ensureRestaurantExists(restaurantId: string): Promise<void> {
        if (!(await this.restaurantRepository.findById(restaurantId))) {
            throw new RestaurantNotFoundError()
        }
    }

    private async ensureNumeroAvailable(restaurantId: string, numero: number, ownId?: string): Promise<void> {
        const duplicated = await this.tableRepository.findByNumero(restaurantId, numero)
        if (duplicated && duplicated.id !== ownId) {
            throw new DuplicatedTableNumberError()
        }
    }
}
