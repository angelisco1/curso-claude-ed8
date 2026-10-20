import type { OrderRepository } from '@repositories/order.repository.js'
import type { DiscountCodeRepository } from '@repositories/discount-code.repository.js'
import type { PointsRuleRepository } from '@repositories/points-rule.repository.js'
import type { ClientPointsRepository } from '@repositories/client-points.repository.js'
import type { BillRepository } from '@repositories/bill.repository.js'
import type { Order } from '@models/order.model.js'
import type { DiscountCode } from '@models/discount-code.model.js'
import type { BillRecord, BillSummary } from '@models/bill.model.js'
import { toBillSummary } from '@models/bill.model.js'
import { calculateDiscountCents, calculateSubtotalCents, toCents } from '@services/bill.calculator.js'
import {
    OrderNotFoundError,
    BillCodeInvalidError,
    BillDiscountConflictError,
    BillDiscountRejectedError,
    PointsRuleNotFoundError,
    InvalidDiscountCodeError
} from '@errors/DomainErrors.js'

export interface BillOptions {
    code?: unknown
    pointsRuleId?: unknown
}

export type BillDraft = Omit<BillRecord, 'createdAt'>

const optionalString = (value: unknown, field: string): string | undefined => {
    if (value === undefined || value === null || value === '') return undefined
    if (typeof value !== 'string') throw new InvalidDiscountCodeError(`${field} must be a string`)
    return value.trim() || undefined
}

export class BillService {
    constructor(
        private readonly orderRepository: OrderRepository,
        private readonly codeRepository: DiscountCodeRepository,
        private readonly ruleRepository: PointsRuleRepository,
        private readonly pointsRepository: ClientPointsRepository,
        private readonly billRepository: BillRepository
    ) {}

    async preview(orderId: string, clientId: string, options: BillOptions): Promise<BillSummary> {
        const order = await this.getOwnOrder(orderId, clientId)
        const existing = await this.billRepository.findByOrderId(orderId)
        if (existing) return toBillSummary(existing)

        return toBillSummary(await this.buildDraft(order, clientId, options))
    }

    protected async getOwnOrder(orderId: string, clientId: string): Promise<Order> {
        const order = await this.orderRepository.findById(orderId)
        if (!order || order.clientId !== clientId) {
            throw new OrderNotFoundError()
        }
        return order
    }

    protected async buildDraft(order: Order, clientId: string, options: BillOptions): Promise<BillDraft> {
        const code = optionalString(options.code, 'code')
        const pointsRuleId = optionalString(options.pointsRuleId, 'pointsRuleId')
        if (code && pointsRuleId) {
            throw new BillDiscountConflictError()
        }

        const subtotal = calculateSubtotalCents(
            order.items.map(item => ({ price: item.dishPrice ?? 0, quantity: item.quantity }))
        )
        const draft: BillDraft = {
            orderId: order.id, subtotal, codeId: null, code: null, discount: 0, pointsUsed: 0, total: subtotal
        }

        if (code) {
            const discountCode = await this.findApplicableCode(order.restaurantId, code, subtotal)
            draft.codeId = discountCode.id
            draft.code = discountCode.code
            draft.discount = calculateDiscountCents(subtotal, discountCode)
        } else if (pointsRuleId) {
            const rule = await this.ruleRepository.findById(pointsRuleId)
            if (!rule || rule.restaurantId !== order.restaurantId) {
                throw new PointsRuleNotFoundError()
            }
            const balance = await this.pointsRepository.getBalance(clientId, order.restaurantId)
            if (balance < rule.points) {
                throw new BillDiscountRejectedError('insufficient_points')
            }
            draft.pointsUsed = rule.points
            draft.discount = calculateDiscountCents(subtotal, { type: 'fixed', value: rule.amount })
        }

        draft.total = subtotal - draft.discount
        return draft
    }

    private async findApplicableCode(restaurantId: string, code: string, subtotal: number): Promise<DiscountCode> {
        const discountCode = await this.codeRepository.findByCode(restaurantId, code)
        if (!discountCode) {
            throw new BillCodeInvalidError()
        }
        if (!discountCode.active) {
            throw new BillDiscountRejectedError('inactive')
        }
        const now = Date.now()
        if (discountCode.validFrom && now < Date.parse(discountCode.validFrom)) {
            throw new BillDiscountRejectedError('expired')
        }
        if (discountCode.validUntil && now > Date.parse(discountCode.validUntil)) {
            throw new BillDiscountRejectedError('expired')
        }
        if (discountCode.maxUses !== null && discountCode.uses >= discountCode.maxUses) {
            throw new BillDiscountRejectedError('exhausted')
        }
        if (discountCode.minOrder !== null && subtotal < toCents(discountCode.minOrder)) {
            throw new BillDiscountRejectedError('min_order')
        }
        return discountCode
    }
}
