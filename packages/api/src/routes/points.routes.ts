import { Router } from 'express'
import { PointsController } from '@controllers/points.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteClientPointsRepository } from '@repositories/client-points.repository.js'
import { SqlitePointsRuleRepository } from '@repositories/points-rule.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { SqliteEmployeeRepository } from '@employee/infrastructure/SqliteEmployeeRepository.js'
import { ClientPointsService } from '@services/client-points.service.js'
import { authenticate, authorize, ensureOwnRestaurant } from '@shared/infrastructure/http/middlewares.js'

const clientPointsService = new ClientPointsService(
    new SqliteClientPointsRepository(dbConfig),
    new SqlitePointsRuleRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig),
    new SqliteEmployeeRepository(dbConfig)
)
const pointsController = new PointsController(clientPointsService)

const router = Router({ mergeParams: true })

router.put(
    '/clients/:clientId/points',
    authenticate,
    authorize(['admin', 'manager']),
    ensureOwnRestaurant,
    pointsController.setClientBalance
)
router.get('/points/me', authenticate, authorize(['cliente']), pointsController.getMine)

export default router
