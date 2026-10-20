import type { BillRepository, BillContext } from '@repositories/bill.repository.js'
import type { BillRecord } from '@models/bill.model.js'
import type { MockDiscountCodeRepository } from '@repositories/mocks/MockDiscountCodeRepository.js'
import type { MockClientPointsRepository } from '@repositories/mocks/MockClientPointsRepository.js'
import { BillAlreadyRequestedError } from '@errors/DomainErrors.js'

export class MockBillRepository implements BillRepository {
    bills: Map<string, BillRecord> = new Map()

    constructor(
        private readonly codes?: MockDiscountCodeRepository,
        private readonly points?: MockClientPointsRepository
    ) {}

    async findByOrderId(orderId: string): Promise<BillRecord | null> {
        const bill = this.bills.get(orderId)
        return bill ? { ...bill } : null
    }

    async save(bill: BillRecord): Promise<void> {
        if (this.bills.has(bill.orderId)) throw new BillAlreadyRequestedError()
        this.bills.set(bill.orderId, { ...bill })
    }

    async confirm(bill: BillRecord, context: BillContext): Promise<void> {
        await this.save(bill)
        if (bill.codeId && this.codes) {
            const code = await this.codes.findById(bill.codeId)
            if (code) await this.codes.save({ ...code, uses: code.uses + 1 })
        }
        if (bill.pointsUsed > 0 && this.points) {
            const balance = await this.points.getBalance(context.clientId, context.restaurantId)
            await this.points.setBalance(context.clientId, context.restaurantId, balance - bill.pointsUsed)
        }
    }
}
