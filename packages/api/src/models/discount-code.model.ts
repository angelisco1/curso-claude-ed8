import { InvalidDiscountCodeError } from '@errors/DomainErrors.js'

const VALID_DISCOUNT_TYPES = ['fixed', 'percent'] as const

export type DiscountType = typeof VALID_DISCOUNT_TYPES[number]

export interface DiscountCode {
    id: string
    restaurantId: string
    code: string
    type: DiscountType
    value: number
    minOrder: number | null
    validFrom: string | null
    validUntil: string | null
    maxUses: number | null
    uses: number
    active: boolean
}

export type DiscountCodeInput = Pick<DiscountCode, 'code' | 'type' | 'value' | 'minOrder' | 'validFrom' | 'validUntil' | 'maxUses' | 'active'>

const isPresent = (value: unknown): boolean => value !== undefined && value !== null

export function assertValidDiscountType(value: unknown): DiscountType {
    if (!VALID_DISCOUNT_TYPES.includes(value as DiscountType)) {
        throw new InvalidDiscountCodeError(`Type must be one of: ${VALID_DISCOUNT_TYPES.join(', ')}`)
    }
    return value as DiscountType
}

export function assertValidDiscountValue(type: DiscountType, value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
        throw new InvalidDiscountCodeError('Value must be a number greater than 0')
    }
    if (type === 'percent' && value > 100) {
        throw new InvalidDiscountCodeError('Percent value cannot exceed 100')
    }
    return value
}

function assertValidDate(value: unknown, field: string): string | null {
    if (!isPresent(value)) return null
    if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
        throw new InvalidDiscountCodeError(`${field} must be a valid date`)
    }
    return value
}

export function assertValidDiscountCodeInput(input: Record<string, unknown>): DiscountCodeInput {
    if (typeof input.code !== 'string' || input.code.trim() === '') {
        throw new InvalidDiscountCodeError('Code is required')
    }
    const type = assertValidDiscountType(input.type)
    const value = assertValidDiscountValue(type, input.value)

    let minOrder: number | null = null
    if (isPresent(input.minOrder)) {
        if (typeof input.minOrder !== 'number' || !Number.isFinite(input.minOrder) || input.minOrder < 0) {
            throw new InvalidDiscountCodeError('minOrder must be a number greater than or equal to 0')
        }
        minOrder = input.minOrder
    }

    const validFrom = assertValidDate(input.validFrom, 'validFrom')
    const validUntil = assertValidDate(input.validUntil, 'validUntil')
    if (validFrom && validUntil && Date.parse(validFrom) > Date.parse(validUntil)) {
        throw new InvalidDiscountCodeError('validFrom cannot be after validUntil')
    }

    let maxUses: number | null = null
    if (isPresent(input.maxUses)) {
        if (typeof input.maxUses !== 'number' || !Number.isInteger(input.maxUses) || input.maxUses < 1) {
            throw new InvalidDiscountCodeError('maxUses must be a positive integer')
        }
        maxUses = input.maxUses
    }

    let active = true
    if (isPresent(input.active)) {
        if (typeof input.active !== 'boolean') {
            throw new InvalidDiscountCodeError('active must be a boolean')
        }
        active = input.active
    }

    return { code: input.code.trim(), type, value, minOrder, validFrom, validUntil, maxUses, active }
}
