import type { Request, Response, NextFunction } from 'express'
import type { PointsRuleService } from '@services/points-rule.service.js'

export class PointsRuleController {
    constructor(private readonly pointsRuleService: PointsRuleService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsRuleService.create(req.params.restaurantId as string, req.body ?? {})
            res.status(201).json(rule)
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            res.status(200).json(await this.pointsRuleService.list(req.params.restaurantId as string))
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsRuleService.getById(req.params.restaurantId as string, req.params.id as string)
            res.status(200).json(rule)
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const rule = await this.pointsRuleService.update(
                req.params.restaurantId as string,
                req.params.id as string,
                req.body ?? {}
            )
            res.status(200).json(rule)
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.pointsRuleService.delete(req.params.restaurantId as string, req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }
}
