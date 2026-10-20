import type { Request, Response, NextFunction } from 'express'
import type { ClientPointsService } from '@services/client-points.service.js'

export class PointsController {
    constructor(private readonly clientPointsService: ClientPointsService) {}

    setClientBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.clientPointsService.setBalance(
                req.params.restaurantId as string,
                req.params.clientId as string,
                req.body?.balance
            )
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    }

    getMine = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const info = await this.clientPointsService.getMine(req.params.restaurantId as string, (req as any).user.id)
            res.status(200).json(info)
        } catch (error) {
            next(error)
        }
    }
}
