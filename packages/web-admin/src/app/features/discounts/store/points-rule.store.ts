import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { PointsRuleService } from '../services/points-rule.service'
import type { PointsRule, CreatePointsRuleDto, UpdatePointsRuleDto } from '../models/points-rule.model'

const byPoints = (a: PointsRule, b: PointsRule) => a.points - b.points

@Injectable({ providedIn: 'root' })
export class PointsRuleStore {
  private readonly service = inject(PointsRuleService)

  private readonly _items = signal<PointsRule[]>([])
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)

  readonly items = this._items.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()

  async loadByRestaurant(restaurantId: string): Promise<void> {
    this._loading.set(true)
    this._error.set(null)
    try {
      const data = await firstValueFrom(this.service.getAll(restaurantId))
      this._items.set([...data].sort(byPoints))
    } catch {
      this._error.set('No se pudieron cargar los tramos de puntos.')
    } finally {
      this._loading.set(false)
    }
  }

  async create(restaurantId: string, dto: CreatePointsRuleDto): Promise<void> {
    const created = await firstValueFrom(this.service.create(restaurantId, dto))
    this._items.update(list => [...list, created].sort(byPoints))
  }

  async update(restaurantId: string, id: string, dto: UpdatePointsRuleDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._items.update(list => list.map(r => r.id === id ? updated : r).sort(byPoints))
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._items.update(list => list.filter(r => r.id !== id))
  }
}
