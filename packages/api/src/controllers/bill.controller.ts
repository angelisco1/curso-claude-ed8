import type { Request, Response, NextFunction } from 'express'
import type { BillService } from '@services/bill.service.js'

export class BillController {
    constructor(private readonly billService: BillService) {}

    preview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { code, pointsRuleId } = req.query
            const bill = await this.billService.preview(req.params.id as string, (req as any).user.id, { code, pointsRuleId })
            res.status(200).json(bill)
        } catch (error) {
            next(error)
        }
    }

    confirm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const { code, pointsRuleId } = req.body ?? {}
            const bill = await this.billService.confirm(req.params.id as string, (req as any).user.id, { code, pointsRuleId })
            res.status(200).json(bill)
        } catch (error) {
            next(error)
        }
    }
}
