import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableStatusType } from '@models/table.model.js'

interface TableRow {
    id: string
    restaurantId: string
    numero: number
    descripcion: string
    capacidad: number
    estado: string
}

export interface TableFilters {
    estado?: TableStatusType | undefined
    capacidadMin?: number | undefined
}

export interface TableRepository {
    findById(id: string): Promise<Table | null>
    findByRestaurantId(restaurantId: string, filters?: TableFilters): Promise<Table[]>
    findByNumero(restaurantId: string, numero: number): Promise<Table | null>
    save(table: Table): Promise<void>
    delete(id: string): Promise<void>
    occupyIfFree(restaurantId: string, id: string): Promise<boolean>
}

const SELECT_COLUMNS = 'id, restaurant_id as restaurantId, numero, descripcion, capacidad, estado'

export class SqliteTableRepository implements TableRepository {
    constructor(private readonly db: Database) {}

    async findById(id: string): Promise<Table | null> {
        const row = await this.db.get<TableRow>(`SELECT ${SELECT_COLUMNS} FROM mesas WHERE id = ?`, [id])
        return row ? this.mapToTable(row) : null
    }

    async findByRestaurantId(restaurantId: string, filters: TableFilters = {}): Promise<Table[]> {
        const conditions = ['restaurant_id = ?']
        const params: any[] = [restaurantId]
        if (filters.estado) {
            conditions.push('estado = ?')
            params.push(filters.estado)
        }
        if (filters.capacidadMin !== undefined) {
            conditions.push('capacidad >= ?')
            params.push(filters.capacidadMin)
        }
        const rows = await this.db.all<TableRow>(
            `SELECT ${SELECT_COLUMNS} FROM mesas WHERE ${conditions.join(' AND ')} ORDER BY numero ASC`,
            params
        )
        return rows.map(row => this.mapToTable(row))
    }

    async findByNumero(restaurantId: string, numero: number): Promise<Table | null> {
        const row = await this.db.get<TableRow>(
            `SELECT ${SELECT_COLUMNS} FROM mesas WHERE restaurant_id = ? AND numero = ?`,
            [restaurantId, numero]
        )
        return row ? this.mapToTable(row) : null
    }

    async save(table: Table): Promise<void> {
        const existing = await this.findById(table.id)
        const now = new Date().toISOString()
        if (existing) {
            await this.db.run(
                'UPDATE mesas SET numero = ?, descripcion = ?, capacidad = ?, estado = ?, updated_at = ? WHERE id = ?',
                [table.numero, table.descripcion, table.capacidad, table.estado, now, table.id]
            )
        } else {
            await this.db.run(
                'INSERT INTO mesas (id, restaurant_id, numero, descripcion, capacidad, estado, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [table.id, table.restaurantId, table.numero, table.descripcion, table.capacidad, table.estado, now, now]
            )
        }
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM mesas WHERE id = ?', [id])
    }

    async occupyIfFree(restaurantId: string, id: string): Promise<boolean> {
        const result = await this.db.run(
            "UPDATE mesas SET estado = 'ocupada', updated_at = ? WHERE id = ? AND restaurant_id = ? AND estado = 'libre'",
            [new Date().toISOString(), id, restaurantId]
        )
        return result.changes > 0
    }

    private mapToTable(row: TableRow): Table {
        return {
            id: row.id,
            restaurantId: row.restaurantId,
            numero: row.numero,
            descripcion: row.descripcion,
            capacidad: row.capacidad,
            estado: normalizeTableStatus(row.estado)
        }
    }
}
