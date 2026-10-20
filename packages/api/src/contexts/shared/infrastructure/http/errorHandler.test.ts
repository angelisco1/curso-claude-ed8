import { describe, it, expect, vi } from 'vitest'
import type { Request, Response } from 'express'
import { errorHandler } from './errorHandler.js'
import {
    DuplicatedDiscountCodeError,
    DiscountCodeNotFoundError,
    DuplicatedPointsRuleError,
    PointsRuleNotFoundError,
    BillAlreadyRequestedError,
    BillDiscountConflictError,
    BillDiscountRejectedError,
    BillCodeInvalidError
} from '@errors/DomainErrors.js'

const run = (error: unknown) => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response
    errorHandler(error, {} as Request, res, vi.fn())
    return {
        status: (res.status as any).mock.calls[0][0] as number,
        body: (res.json as any).mock.calls[0][0]
    }
}

describe('errorHandler (discounts)', () => {
    it('should map not found errors to 404', () => {
        expect(run(new DiscountCodeNotFoundError()).status).toBe(404)
        expect(run(new PointsRuleNotFoundError()).status).toBe(404)
    })

    it('should map duplicates and an already requested bill to 409', () => {
        expect(run(new DuplicatedDiscountCodeError()).status).toBe(409)
        expect(run(new DuplicatedPointsRuleError()).status).toBe(409)
        expect(run(new BillAlreadyRequestedError()).status).toBe(409)
    })

    it('should map code and points together to 400', () => {
        expect(run(new BillDiscountConflictError()).status).toBe(400)
    })

    it('should map rejected discounts to 422 including the reason', () => {
        const { status, body } = run(new BillDiscountRejectedError('expired'))
        expect(status).toBe(422)
        expect(body).toMatchObject({ error: 'BillDiscountRejectedError', reason: 'expired' })
    })

    it('should map an unknown code to 404 with reason invalid', () => {
        const { status, body } = run(new BillCodeInvalidError())
        expect(status).toBe(404)
        expect(body.reason).toBe('invalid')
    })
})
