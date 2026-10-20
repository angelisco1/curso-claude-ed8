import type { ClientPointsRepository } from '@repositories/client-points.repository.js'
import type { PointsRuleRepository } from '@repositories/points-rule.repository.js'
import type { RestaurantRepository } from '@repositories/restaurant.repository.js'
import type { IEmployeeRepository } from '@employee/domain/IEmployeeRepository.js'
import {
    RestaurantNotFoundError,
    EmployeeNotFoundError,
    InvalidPointsBalanceError
} from '@errors/DomainErrors.js'

export interface ClientBalance {
    clientId: string
    restaurantId: string
    balance: number
}

export interface PointsInfo {
    balance: number
    rules: { id: string; points: number; amount: number }[]
}

export class ClientPointsService {
    constructor(
        private readonly pointsRepository: ClientPointsRepository,
        private readonly ruleRepository: PointsRuleRepository,
        private readonly restaurantRepository: RestaurantRepository,
        private readonly employeeRepository: IEmployeeRepository
    ) {}

    async setBalance(restaurantId: string, clientId: string, balance: unknown): Promise<ClientBalance> {
        await this.ensureRestaurantExists(restaurantId)
        if (typeof balance !== 'number' || !Number.isInteger(balance) || balance < 0) {
            throw new InvalidPointsBalanceError()
        }
        const client = await this.employeeRepository.findById(clientId)
        if (!client || client.role !== 'cliente') {
            throw new EmployeeNotFoundError()
        }
        await this.pointsRepository.setBalance(clientId, restaurantId, balance)
        return { clientId, restaurantId, balance }
    }

    async getMine(restaurantId: string, clientId: string): Promise<PointsInfo> {
        await this.ensureRestaurantExists(restaurantId)
        const [balance, rules] = await Promise.all([
            this.pointsRepository.getBalance(clientId, restaurantId),
            this.ruleRepository.findByRestaurantId(restaurantId)
        ])
        return { balance, rules: rules.map(({ id, points, amount }) => ({ id, points, amount })) }
    }

    private async ensureRestaurantExists(restaurantId: string): Promise<void> {
        if (!(await this.restaurantRepository.findById(restaurantId))) {
            throw new RestaurantNotFoundError()
        }
    }
}
