import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { SqliteRestaurantRepository } from '@repositories/restaurant.repository.js'
import { SqliteOrderRepository } from '@repositories/order.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const tableService = new TableService(
    new SqliteTableRepository(dbConfig),
    new SqliteRestaurantRepository(dbConfig),
    new SqliteOrderRepository(dbConfig)
)
export const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

const staff = authorize(['admin', 'manager', 'camarero', 'cocinero'])
const managers = authorize(['admin', 'manager'])

router.get('/', authenticate, staff, tableController.getAll)
router.post('/', authenticate, managers, tableController.create)
router.get('/active-orders', authenticate, staff, tableController.getOccupiedWithOrders)
router.get('/:id', authenticate, staff, tableController.getById)
router.put('/:id', authenticate, managers, tableController.update)
router.delete('/:id', authenticate, managers, tableController.delete)
router.patch('/:id/status', authenticate, authorize(['admin', 'manager', 'camarero']), tableController.updateStatus)
router.post('/:id/occupy', authenticate, authorize(['cliente']), tableController.occupy)

export default router
