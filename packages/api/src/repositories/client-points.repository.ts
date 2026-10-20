import { Database } from '@config/database.js'

export interface ClientPointsRepository {
    getBalance(clientId: string, restaurantId: string): Promise<number>
    setBalance(clientId: string, restaurantId: string, balance: number): Promise<void>
}

export class SqliteClientPointsRepository implements ClientPointsRepository {
    constructor(private readonly db: Database) {}

    async getBalance(clientId: string, restaurantId: string): Promise<number> {
        const row = await this.db.get<{ balance: number }>(
            'SELECT balance FROM client_points WHERE client_id = ? AND restaurant_id = ?',
            [clientId, restaurantId]
        )
        return row?.balance ?? 0
    }

    async setBalance(clientId: string, restaurantId: string, balance: number): Promise<void> {
        await this.db.run(
            `INSERT INTO client_points (client_id, restaurant_id, balance) VALUES (?, ?, ?)
             ON CONFLICT(client_id, restaurant_id) DO UPDATE SET balance = excluded.balance`,
            [clientId, restaurantId, balance]
        )
    }
}
