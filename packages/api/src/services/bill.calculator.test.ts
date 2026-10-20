import { describe, it, expect } from 'vitest'
import { toCents, toEuros, calculateSubtotalCents, calculateDiscountCents } from './bill.calculator.js'

describe('bill.calculator', () => {
    describe('toCents / toEuros', () => {
        it('should convert euros to integer cents avoiding float errors', () => {
            expect(toCents(12.5)).toBe(1250)
            expect(toCents(0.1 + 0.2)).toBe(30)
            expect(toCents(19.99)).toBe(1999)
        })

        it('should convert cents back to euros with 2 decimals', () => {
            expect(toEuros(1999)).toBe(19.99)
            expect(toEuros(0)).toBe(0)
        })
    })

    describe('calculateSubtotalCents', () => {
        it('should sum price * quantity in cents', () => {
            expect(calculateSubtotalCents([{ price: 9.9, quantity: 1 }, { price: 2.2, quantity: 3 }])).toBe(1650)
        })

        it('should return 0 for no lines', () => {
            expect(calculateSubtotalCents([])).toBe(0)
        })
    })

    describe('calculateDiscountCents', () => {
        it('should apply a fixed discount in euros', () => {
            expect(calculateDiscountCents(5000, { type: 'fixed', value: 5 })).toBe(500)
        })

        it('should apply a percent discount rounding to the nearest cent', () => {
            expect(calculateDiscountCents(1999, { type: 'percent', value: 10 })).toBe(200)
            expect(calculateDiscountCents(1000, { type: 'percent', value: 15 })).toBe(150)
        })

        it('should never exceed the subtotal', () => {
            expect(calculateDiscountCents(300, { type: 'fixed', value: 10 })).toBe(300)
            expect(calculateDiscountCents(300, { type: 'percent', value: 100 })).toBe(300)
        })

        it('should return 0 when the subtotal is 0', () => {
            expect(calculateDiscountCents(0, { type: 'fixed', value: 5 })).toBe(0)
        })
    })
})
