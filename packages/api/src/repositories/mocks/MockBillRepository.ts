import type { BillRepository } from '@repositories/bill.repository.js'
import type { BillRecord } from '@models/bill.model.js'
import { BillAlreadyRequestedError } from '@errors/DomainErrors.js'

export class MockBillRepository implements BillRepository {
    bills: Map<string, BillRecord> = new Map()

    async findByOrderId(orderId: string): Promise<BillRecord | null> {
        const bill = this.bills.get(orderId)
        return bill ? { ...bill } : null
    }

    async save(bill: BillRecord): Promise<void> {
        if (this.bills.has(bill.orderId)) throw new BillAlreadyRequestedError()
        this.bills.set(bill.orderId, { ...bill })
    }
}
