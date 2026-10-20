import { toEuros } from '@services/bill.calculator.js'

/** Persisted bill: money in integer cents. */
export interface BillRecord {
    orderId: string
    subtotal: number
    codeId: string | null
    code: string | null
    discount: number
    pointsUsed: number
    total: number
    createdAt: string
}

/** API representation: money in euros. */
export interface BillSummary {
    subtotal: number
    discount: number
    pointsUsed: number
    total: number
    code?: string
}

export function toBillSummary(record: Pick<BillRecord, 'subtotal' | 'discount' | 'pointsUsed' | 'total' | 'code'>): BillSummary {
    return {
        subtotal: toEuros(record.subtotal),
        discount: toEuros(record.discount),
        pointsUsed: record.pointsUsed,
        total: toEuros(record.total),
        ...(record.code ? { code: record.code } : {})
    }
}
