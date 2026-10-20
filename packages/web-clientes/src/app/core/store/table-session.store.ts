import { Injectable, signal } from '@angular/core'
import { Table } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableSessionStore {
  private readonly _table = signal<Table | null>(null)

  readonly table = this._table.asReadonly()

  set(table: Table): void {
    this._table.set(table)
  }

  clear(): void {
    this._table.set(null)
  }

  hasTableFor(restaurantId: string): boolean {
    return this._table()?.restaurantId === restaurantId
  }
}
