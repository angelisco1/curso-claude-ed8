import { randomUUID } from 'crypto'
import type { DiscountCode } from '@models/discount-code.model.js'
import { assertValidDiscountCodeInput } from '@models/discount-code.model.js'
import type { DiscountCodeRepository } from '@repositories/discount-code.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import {
    RestaurantNotFoundError,
    DiscountCodeNotFoundError,
    DuplicatedDiscountCodeError
} from '@errors/DomainErrors.js'

export class DiscountCodeService {
    constructor(
        private readonly codeRepository: DiscountCodeRepository,
        private readonly restaurantRepository: RestaurantRepository
    ) {}

    async create(restaurantId: string, dto: Record<string, unknown>): Promise<DiscountCode> {
        await this.ensureRestaurantExists(restaurantId)
        const data = assertValidDiscountCodeInput(dto)
        await this.ensureCodeAvailable(restaurantId, data.code)

        const code: DiscountCode = { id: randomUUID(), restaurantId, uses: 0, ...data }
        await this.codeRepository.save(code)
        return code
    }

    async update(restaurantId: string, id: string, dto: Record<string, unknown>): Promise<DiscountCode> {
        const existing = await this.getById(restaurantId, id)
        const data = assertValidDiscountCodeInput(dto)
        await this.ensureCodeAvailable(restaurantId, data.code, id)

        const updated: DiscountCode = { ...existing, ...data }
        await this.codeRepository.save(updated)
        return updated
    }

    async delete(restaurantId: string, id: string): Promise<void> {
        await this.getById(restaurantId, id)
        await this.codeRepository.delete(id)
    }

    async getById(restaurantId: string, id: string): Promise<DiscountCode> {
        const code = await this.codeRepository.findById(id)
        if (!code || code.restaurantId !== restaurantId) {
            throw new DiscountCodeNotFoundError()
        }
        return code
    }

    async list(restaurantId: string): Promise<DiscountCode[]> {
        await this.ensureRestaurantExists(restaurantId)
        return this.codeRepository.findByRestaurantId(restaurantId)
    }

    private async ensureRestaurantExists(restaurantId: string): Promise<void> {
        if (!(await this.restaurantRepository.findById(restaurantId))) {
            throw new RestaurantNotFoundError()
        }
    }

    private async ensureCodeAvailable(restaurantId: string, code: string, ownId?: string): Promise<void> {
        const duplicated = await this.codeRepository.findByCode(restaurantId, code)
        if (duplicated && duplicated.id !== ownId) {
            throw new DuplicatedDiscountCodeError()
        }
    }
}
