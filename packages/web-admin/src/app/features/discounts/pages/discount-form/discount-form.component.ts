import { Component, inject, OnInit, signal } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { firstValueFrom } from 'rxjs'
import { DiscountCodeStore } from '../../store/discount-code.store'
import { DiscountCodeService } from '../../services/discount-code.service'
import type { CreateDiscountCodeDto } from '../../models/discount-code.model'

@Component({
  selector: 'app-discount-form',
  standalone: true,
  imports: [FormsModule, RouterLink, LucideAngularModule],
  templateUrl: './discount-form.component.html',
  styleUrl: './discount-form.component.css'
})
export class DiscountFormComponent implements OnInit {
  private readonly store = inject(DiscountCodeStore)
  private readonly service = inject(DiscountCodeService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  isEditing = false
  codeId: string | null = null
  restaurantId = ''
  loading = signal(false)
  error = signal<string | null>(null)

  form = { code: '', type: 'fixed' as 'fixed' | 'percent', value: 5, active: true }
  minOrder: number | null = null
  maxUses: number | null = null
  validFrom = ''
  validUntil = ''

  get pageTitle(): string {
    return this.isEditing ? 'Editar código' : 'Nuevo código'
  }

  get listUrl(): string {
    return `/restaurants/${this.restaurantId}/discounts`
  }

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    const id = this.route.snapshot.paramMap.get('id')

    if (id && this.restaurantId) {
      this.isEditing = true
      this.codeId = id
      this.loadCode()
    }
  }

  private async loadCode(): Promise<void> {
    this.loading.set(true)
    try {
      const found = await firstValueFrom(this.service.getById(this.restaurantId, this.codeId!))
      this.form = { code: found.code, type: found.type, value: found.value, active: found.active }
      this.minOrder = found.minOrder
      this.maxUses = found.maxUses
      this.validFrom = found.validFrom ? found.validFrom.slice(0, 10) : ''
      this.validUntil = found.validUntil ? found.validUntil.slice(0, 10) : ''
    } catch {
      this.error.set('No se pudo cargar el código.')
    } finally {
      this.loading.set(false)
    }
  }

  private validate(): string | null {
    if (!this.form.code.trim()) return 'El código es obligatorio.'
    if (!(this.form.value > 0)) return 'El valor debe ser mayor que 0.'
    if (this.form.type === 'percent' && this.form.value > 100) return 'El porcentaje no puede superar 100.'
    if (this.validFrom && this.validUntil && this.validFrom > this.validUntil) {
      return 'La fecha de inicio no puede ser posterior a la de fin.'
    }
    return null
  }

  private buildDto(): CreateDiscountCodeDto {
    return {
      code: this.form.code.trim(),
      type: this.form.type,
      value: this.form.value,
      minOrder: this.minOrder ?? null,
      validFrom: this.validFrom ? new Date(`${this.validFrom}T00:00:00`).toISOString() : null,
      validUntil: this.validUntil ? new Date(`${this.validUntil}T23:59:59`).toISOString() : null,
      maxUses: this.maxUses ?? null,
      active: this.form.active
    }
  }

  async onSubmit(): Promise<void> {
    const invalid = this.validate()
    if (invalid) {
      this.error.set(invalid)
      return
    }
    this.error.set(null)
    this.loading.set(true)
    try {
      const dto = this.buildDto()
      if (this.isEditing && this.codeId) {
        await this.store.update(this.restaurantId, this.codeId, dto)
      } else {
        await this.store.create(this.restaurantId, dto)
      }
      this.router.navigate(['/restaurants', this.restaurantId, 'discounts'])
    } catch (err: any) {
      this.error.set(
        err?.status === 409
          ? 'Ya existe un código con ese nombre en este restaurante.'
          : err?.error?.message ?? 'Error al guardar el código.'
      )
    } finally {
      this.loading.set(false)
    }
  }
}
