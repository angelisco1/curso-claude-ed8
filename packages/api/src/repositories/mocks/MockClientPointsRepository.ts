import type { ClientPointsRepository } from '@repositories/client-points.repository.js'

export class MockClientPointsRepository implements ClientPointsRepository {
    balances: Map<string, number> = new Map()

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        return this.balances.get(`${clientId}:${restaurantId}`) ?? 0
    }

    async setBalance(clientId: string, restaurantId: string, balance: number): Promise<void> {
        this.balances.set(`${clientId}:${restaurantId}`, balance)
    }
}
