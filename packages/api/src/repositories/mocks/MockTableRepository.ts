import type { TableRepository, TableFilters } from '@repositories/table.repository.js'
import type { Table } from '@models/table.model.js'

export class MockTableRepository implements TableRepository {
    private tables: Map<string, Table> = new Map()

    async findById(id: string): Promise<Table | null> {
        return this.tables.get(id) || null
    }

    async findByRestaurantId(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        return Array.from(this.tables.values())
            .filter(t => t.restaurantId === restaurantId)
            .filter(t => !filters.estado || t.estado === filters.estado)
            .filter(t => filters.capacidadMin === undefined || t.capacidad >= filters.capacidadMin)
            .sort((a, b) => a.numero - b.numero)
    }

    async findByNumero(restaurantId: string, numero: number): Promise<Table | null> {
        return Array.from(this.tables.values())
            .find(t => t.restaurantId === restaurantId && t.numero === numero) || null
    }

    async save(table: Table): Promise<void> {
        this.tables.set(table.id, { ...table })
    }

    async delete(id: string): Promise<void> {
        this.tables.delete(id)
    }

    async occupyIfFree(restaurantId: string, id: string): Promise<boolean> {
        const table = this.tables.get(id)
        if (!table || table.restaurantId !== restaurantId || table.estado !== 'libre') return false
        table.estado = 'ocupada'
        return true
    }
}
