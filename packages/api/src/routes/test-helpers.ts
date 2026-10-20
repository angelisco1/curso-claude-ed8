import jwt from 'jsonwebtoken'
import { dbConfig } from '@config/database.js'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-resttek-key'

export const tokenFor = (user: { id: string; role: string; restaurantId?: string | null }): string =>
    jwt.sign({ id: user.id, role: user.role, restaurantId: user.restaurantId ?? null }, JWT_SECRET)

export const bearer = (user: { id: string; role: string; restaurantId?: string | null }): string =>
    `Bearer ${tokenFor(user)}`

export const insertRestaurant = async (id: string): Promise<void> => {
    const now = new Date().toISOString()
    await dbConfig.run(
        'INSERT OR IGNORE INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, id, 'a', 'e@e.com', '1', 'o', 'o', now, now]
    )
}
