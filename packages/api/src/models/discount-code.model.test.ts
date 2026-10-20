import { describe, it, expect } from 'vitest'
import {
    assertValidDiscountCodeInput,
    assertValidDiscountType,
    assertValidDiscountValue
} from './discount-code.model.js'
import { InvalidDiscountCodeError } from '@errors/DomainErrors.js'

const valid = { code: 'VERANO10', type: 'percent', value: 10, active: true }

describe('discount-code.model', () => {
    it('should accept and normalize a minimal valid input', () => {
        expect(assertValidDiscountCodeInput(valid)).toEqual({
            code: 'VERANO10', type: 'percent', value: 10, minOrder: null,
            validFrom: null, validUntil: null, maxUses: null, active: true
        })
    })

    it('should trim the code and keep optional fields', () => {
        const result = assertValidDiscountCodeInput({
            ...valid, code: '  Hola  ', type: 'fixed', value: 5, minOrder: 20,
            validFrom: '2026-01-01', validUntil: '2026-12-31', maxUses: 100, active: false
        })
        expect(result).toMatchObject({ code: 'Hola', minOrder: 20, maxUses: 100, active: false })
    })

    it('should default active to true when omitted', () => {
        const { active: _active, ...rest } = valid
        expect(assertValidDiscountCodeInput(rest).active).toBe(true)
    })

    it('should reject an empty or non-string code', () => {
        expect(() => assertValidDiscountCodeInput({ ...valid, code: '  ' })).toThrow(InvalidDiscountCodeError)
        expect(() => assertValidDiscountCodeInput({ ...valid, code: 5 })).toThrow(InvalidDiscountCodeError)
    })

    it('should reject an unknown type', () => {
        expect(() => assertValidDiscountType('bogus')).toThrow(InvalidDiscountCodeError)
    })

    it('should require a value greater than 0', () => {
        expect(() => assertValidDiscountValue('fixed', 0)).toThrow(InvalidDiscountCodeError)
        expect(() => assertValidDiscountValue('fixed', -1)).toThrow(InvalidDiscountCodeError)
        expect(() => assertValidDiscountValue('fixed', '3')).toThrow(InvalidDiscountCodeError)
    })

    it('should limit percent values to 100', () => {
        expect(assertValidDiscountValue('percent', 100)).toBe(100)
        expect(() => assertValidDiscountValue('percent', 100.5)).toThrow(InvalidDiscountCodeError)
    })

    it('should reject invalid dates and incoherent ranges', () => {
        expect(() => assertValidDiscountCodeInput({ ...valid, validFrom: 'nope' })).toThrow(InvalidDiscountCodeError)
        expect(() => assertValidDiscountCodeInput({
            ...valid, validFrom: '2026-12-31', validUntil: '2026-01-01'
        })).toThrow(InvalidDiscountCodeError)
    })

    it('should reject invalid minOrder, maxUses and active', () => {
        expect(() => assertValidDiscountCodeInput({ ...valid, minOrder: -1 })).toThrow(InvalidDiscountCodeError)
        expect(() => assertValidDiscountCodeInput({ ...valid, maxUses: 0 })).toThrow(InvalidDiscountCodeError)
        expect(() => assertValidDiscountCodeInput({ ...valid, maxUses: 1.5 })).toThrow(InvalidDiscountCodeError)
        expect(() => assertValidDiscountCodeInput({ ...valid, active: 'yes' })).toThrow(InvalidDiscountCodeError)
    })
})
