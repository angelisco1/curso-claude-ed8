import { describe, it, expect } from 'vitest'
import { toBillSummary } from './bill.model.js'

describe('toBillSummary', () => {
    it('should convert cents to euros and include the code when present', () => {
        expect(toBillSummary({ subtotal: 2550, discount: 255, pointsUsed: 0, total: 2295, code: 'VERANO10' }))
            .toEqual({ subtotal: 25.5, discount: 2.55, pointsUsed: 0, total: 22.95, code: 'VERANO10' })
    })

    it('should omit the code when there is none', () => {
        const summary = toBillSummary({ subtotal: 1000, discount: 100, pointsUsed: 100, total: 900, code: null })
        expect(summary).toEqual({ subtotal: 10, discount: 1, pointsUsed: 100, total: 9 })
        expect('code' in summary).toBe(false)
    })
})
