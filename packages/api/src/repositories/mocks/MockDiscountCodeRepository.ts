import type { DiscountCodeRepository } from '@repositories/discount-code.repository.js'
import type { DiscountCode } from '@models/discount-code.model.js'

export class MockDiscountCodeRepository implements DiscountCodeRepository {
    codes: Map<string, DiscountCode> = new Map()

    async findById(id: string): Promise<DiscountCode | null> {
        const code = this.codes.get(id)
        return code ? { ...code } : null
    }

    async findByRestaurantId(restaurantId: string): Promise<DiscountCode[]> {
        return Array.from(this.codes.values())
            .filter(c => c.restaurantId === restaurantId)
            .sort((a, b) => a.code.localeCompare(b.code))
            .map(c => ({ ...c }))
    }

    async findByCode(restaurantId: string, code: string): Promise<DiscountCode | null> {
        const found = Array.from(this.codes.values())
            .find(c => c.restaurantId === restaurantId && c.code.toLowerCase() === code.toLowerCase())
        return found ? { ...found } : null
    }

    async save(code: DiscountCode): Promise<void> {
        this.codes.set(code.id, { ...code })
    }

    async delete(id: string): Promise<void> {
        this.codes.delete(id)
    }
}
