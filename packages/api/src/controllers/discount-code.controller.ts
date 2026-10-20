import type { Request, Response, NextFunction } from 'express'
import type { DiscountCodeService } from '@services/discount-code.service.js'

export class DiscountCodeController {
    constructor(private readonly discountCodeService: DiscountCodeService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const code = await this.discountCodeService.create(req.params.restaurantId as string, req.body ?? {})
            res.status(201).json(code)
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const codes = await this.discountCodeService.list(req.params.restaurantId as string)
            res.status(200).json(codes)
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const code = await this.discountCodeService.getById(req.params.restaurantId as string, req.params.id as string)
            res.status(200).json(code)
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const code = await this.discountCodeService.update(
                req.params.restaurantId as string,
                req.params.id as string,
                req.body ?? {}
            )
            res.status(200).json(code)
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.discountCodeService.delete(req.params.restaurantId as string, req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }
}
