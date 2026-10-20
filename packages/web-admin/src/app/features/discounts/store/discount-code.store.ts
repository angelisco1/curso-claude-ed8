import { Injectable, inject, signal } from '@angular/core'
import { firstValueFrom } from 'rxjs'
import { DiscountCodeService } from '../services/discount-code.service'
import type { DiscountCode, CreateDiscountCodeDto, UpdateDiscountCodeDto } from '../models/discount-code.model'

@Injectable({ providedIn: 'root' })
export class DiscountCodeStore {
  private readonly service = inject(DiscountCodeService)

  private readonly _items = signal<DiscountCode[]>([])
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
      this._items.set(data)
    } catch {
      this._error.set('No se pudieron cargar los códigos de descuento.')
    } finally {
      this._loading.set(false)
    }
  }

  async create(restaurantId: string, dto: CreateDiscountCodeDto): Promise<void> {
    const created = await firstValueFrom(this.service.create(restaurantId, dto))
    this._items.update(list => [...list, created])
  }

  async update(restaurantId: string, id: string, dto: UpdateDiscountCodeDto): Promise<void> {
    const updated = await firstValueFrom(this.service.update(restaurantId, id, dto))
    this._items.update(list => list.map(c => c.id === id ? updated : c))
  }

  async delete(restaurantId: string, id: string): Promise<void> {
    await firstValueFrom(this.service.delete(restaurantId, id))
    this._items.update(list => list.filter(c => c.id !== id))
  }
}
