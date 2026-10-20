import { Router } from 'express'
import { tableController } from '@routes/table.routes.js'

const router = Router({ mergeParams: true })

router.get('/', tableController.getPublicFree)

export default router
