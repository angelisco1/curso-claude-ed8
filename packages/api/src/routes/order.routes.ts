import { Router } from 'express'
import { OrderController } from '@controllers/order.controller.js'
import { OrderService } from '@services/order.service.js'
import { BillController } from '@controllers/bill.controller.js'
import { BillService } from '@services/bill.service.js'
import { SqliteDiscountCodeRepository } from '@repositories/discount-code.repository.js'
import { SqlitePointsRuleRepository } from '@repositories/points-rule.repository.js'
import { SqliteClientPointsRepository } from '@repositories/client-points.repository.js'
import { SqliteBillRepository } from '@repositories/bill.repository.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { dbConfig } from '@config/database.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const orderRepository = new SqliteOrderRepository(dbConfig)
const orderService = new OrderService(orderRepository, new SqliteTableRepository(dbConfig))
const orderController = new OrderController(orderService)
const billController = new BillController(new BillService(
    orderRepository,
    new SqliteDiscountCodeRepository(dbConfig),
    new SqlitePointsRuleRepository(dbConfig),
    new SqliteClientPointsRepository(dbConfig),
    new SqliteBillRepository(dbConfig)
))

const router = Router()

router.post('/', authenticate, orderController.createOrder.bind(orderController))
router.get('/active', authenticate, orderController.getActiveOrders.bind(orderController))
router.get('/mine', authenticate, orderController.getMyOrders.bind(orderController))
router.get('/:id', authenticate, orderController.getById.bind(orderController))
router.get('/:id/bill', authenticate, authorize(['cliente']), billController.preview)
router.post('/:id/bill', authenticate, authorize(['cliente']), billController.confirm)
router.patch('/:orderId/items/:itemId/status', authenticate, orderController.updateItemStatus.bind(orderController))

export default router
