import { Router } from 'express'
import { PointsRuleController } from '@controllers/points-rule.controller.js'
import { dbConfig } from '@config/database.js'
import { SqlitePointsRuleRepository } from '@repositories/points-rule.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { PointsRuleService } from '@services/points-rule.service.js'
import { authenticate, authorize, ensureOwnRestaurant } from '@shared/infrastructure/http/middlewares.js'

const pointsRuleService = new PointsRuleService(
    new SqlitePointsRuleRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig)
)
const pointsRuleController = new PointsRuleController(pointsRuleService)

const router = Router({ mergeParams: true })

const guard = [authenticate, authorize(['admin', 'manager']), ensureOwnRestaurant]

router.get('/', ...guard, pointsRuleController.getAll)
router.post('/', ...guard, pointsRuleController.create)
router.get('/:id', ...guard, pointsRuleController.getById)
router.put('/:id', ...guard, pointsRuleController.update)
router.delete('/:id', ...guard, pointsRuleController.delete)

export default router
