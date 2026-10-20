import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { PointsRuleStore } from '../../store/points-rule.store'
import type { PointsRule } from '../../models/points-rule.model'

@Component({
  selector: 'app-points-rules',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './points-rules.component.html',
  styleUrl: './points-rules.component.css'
})
export class PointsRulesComponent implements OnInit {
  readonly store = inject(PointsRuleStore)
  private readonly route = inject(ActivatedRoute)
  restaurantId = ''

  readonly error = signal<string | null>(null)
  readonly saving = signal(false)
  readonly newPoints = signal<number | null>(null)
  readonly newAmount = signal<number | null>(null)
  readonly editingId = signal<string | null>(null)
  readonly editPoints = signal<number | null>(null)
  readonly editAmount = signal<number | null>(null)

  get discountsUrl(): string {
    return `/restaurants/${this.restaurantId}/discounts`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    if (this.restaurantId) {
      this.store.loadByRestaurant(this.restaurantId)
    }
  }

  toNumber(event: Event): number | null {
    const value = (event.target as HTMLInputElement).value
    return value === '' ? null : Number(value)
  }

  private validate(points: number | null, amount: number | null): string | null {
    if (points === null || !Number.isInteger(points) || points < 1) return 'Los puntos deben ser un entero mayor que 0.'
    if (amount === null || !(amount > 0)) return 'El descuento debe ser mayor que 0.'
    return null
  }

  private errorMessage(err: any, fallback: string): string {
    return err?.status === 409 ? 'Ya existe un tramo con esos puntos.' : err?.error?.message ?? fallback
  }

  async add(): Promise<void> {
    const points = this.newPoints()
    const amount = this.newAmount()
    const invalid = this.validate(points, amount)
    if (invalid) {
      this.error.set(invalid)
      return
    }
    this.error.set(null)
    this.saving.set(true)
    try {
      await this.store.create(this.restaurantId, { points: points!, amount: amount! })
      this.newPoints.set(null)
      this.newAmount.set(null)
    } catch (err: any) {
      this.error.set(this.errorMessage(err, 'Error al crear el tramo.'))
    } finally {
      this.saving.set(false)
    }
  }

  startEdit(rule: PointsRule): void {
    this.error.set(null)
    this.editingId.set(rule.id)
    this.editPoints.set(rule.points)
    this.editAmount.set(rule.amount)
  }

  cancelEdit(): void {
    this.editingId.set(null)
    this.error.set(null)
  }

  async saveEdit(id: string): Promise<void> {
    const points = this.editPoints()
    const amount = this.editAmount()
    const invalid = this.validate(points, amount)
    if (invalid) {
      this.error.set(invalid)
      return
    }
    this.error.set(null)
    this.saving.set(true)
    try {
      await this.store.update(this.restaurantId, id, { points: points!, amount: amount! })
      this.editingId.set(null)
    } catch (err: any) {
      this.error.set(this.errorMessage(err, 'Error al guardar el tramo.'))
    } finally {
      this.saving.set(false)
    }
  }

  async onDelete(id: string): Promise<void> {
    if (confirm('¿Estás seguro de eliminar este tramo?')) {
      try {
        await this.store.delete(this.restaurantId, id)
      } catch (err: any) {
        this.error.set(err?.error?.message ?? 'Error al eliminar el tramo.')
      }
    }
  }
}
