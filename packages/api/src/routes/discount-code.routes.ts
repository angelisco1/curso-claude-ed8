import { Router } from 'express'
import { DiscountCodeController } from '@controllers/discount-code.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteDiscountCodeRepository } from '@repositories/discount-code.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { DiscountCodeService } from '@services/discount-code.service.js'
import { authenticate, authorize, ensureOwnRestaurant } from '@shared/infrastructure/http/middlewares.js'

const discountCodeService = new DiscountCodeService(
    new SqliteDiscountCodeRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig)
)
const discountCodeController = new DiscountCodeController(discountCodeService)

const router = Router({ mergeParams: true })

const guard = [authenticate, authorize(['admin', 'manager']), ensureOwnRestaurant]

router.get('/', ...guard, discountCodeController.getAll)
router.post('/', ...guard, discountCodeController.create)
router.get('/:id', ...guard, discountCodeController.getById)
router.put('/:id', ...guard, discountCodeController.update)
router.delete('/:id', ...guard, discountCodeController.delete)

export default router
