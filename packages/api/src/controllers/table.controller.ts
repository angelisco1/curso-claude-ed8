import type { Request, Response, NextFunction } from 'express'
import type { TableService } from '@services/table.service.js'
import { normalizeTableStatus } from '@models/table.model.js'

const parseCapacidadMin = (raw: unknown): number | undefined => {
    return raw === undefined ? undefined : Number(raw)
}

export class TableController {
    constructor(private readonly tableService: TableService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.create(req.params.restaurantId as string, req.body)
            res.status(201).json(table)
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const estado = req.query.estado === undefined ? undefined : normalizeTableStatus(req.query.estado)
            const tables = await this.tableService.list(req.params.restaurantId as string, {
                estado,
                capacidadMin: parseCapacidadMin(req.query.capacidadMin)
            })
            res.status(200).json(tables)
        } catch (error) {
            next(error)
        }
    }

    getPublicFree = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const tables = await this.tableService.listFree(
                req.params.restaurantId as string,
                parseCapacidadMin(req.query.capacidadMin)
            )
            res.status(200).json(tables)
        } catch (error) {
            next(error)
        }
    }

    getOccupiedWithOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const result = await this.tableService.listOccupiedWithOrders(req.params.restaurantId as string)
            res.status(200).json(result)
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.getById(req.params.restaurantId as string, req.params.id as string)
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.update(req.params.restaurantId as string, req.params.id as string, req.body)
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.tableService.delete(req.params.restaurantId as string, req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.updateStatus(
                req.params.restaurantId as string,
                req.params.id as string,
                req.body?.estado
            )
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }

    occupy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.occupy(req.params.restaurantId as string, req.params.id as string)
            res.status(200).json(table)
        } catch (error) {
            next(error)
        }
    }
}
