import { InvalidTableStatusError, InvalidTableNumberError, InvalidTableCapacityError } from '@errors/DomainErrors.js'

const VALID_TABLE_STATUSES = ['libre', 'ocupada', 'reservada'] as const

export type TableStatusType = typeof VALID_TABLE_STATUSES[number]

export interface Table {
    id: string
    restaurantId: string
    numero: number
    descripcion: string
    capacidad: number
    estado: TableStatusType
}

export function normalizeTableStatus(value: unknown): TableStatusType {
    if (typeof value !== 'string') {
        throw new InvalidTableStatusError('Status must be provided')
    }
    const normalized = value.trim().toLowerCase()
    if (!VALID_TABLE_STATUSES.includes(normalized as TableStatusType)) {
        throw new InvalidTableStatusError(`Invalid status: ${value}. Must be one of: ${VALID_TABLE_STATUSES.join(', ')}`)
    }
    return normalized as TableStatusType
}

export function assertValidTableNumber(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        throw new InvalidTableNumberError()
    }
    return value
}

export function assertValidTableCapacity(value: unknown): number {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        throw new InvalidTableCapacityError()
    }
    return value
}
