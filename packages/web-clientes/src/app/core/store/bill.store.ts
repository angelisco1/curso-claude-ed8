import { Injectable, inject, signal, computed } from '@angular/core'
import { HttpErrorResponse } from '@angular/common/http'
import { OrderService } from '../services/order.service'
import { PointsService } from '../services/points.service'
import { Bill, BillErrorReason, PointsInfo } from '../models/discount.model'

export type DiscountMode = 'none' | 'code' | 'points'

const REASON_MESSAGES: Record<BillErrorReason, string> = {
  invalid: 'El código no existe',
  expired: 'El código está caducado o aún no es válido',
  exhausted: 'El código ha alcanzado su límite de usos',
  inactive: 'El código no está activo',
  min_order: 'El pedido no alcanza el importe mínimo para este código',
  insufficient_points: 'No tienes puntos suficientes para este tramo'
}

/** Bill state for one order. Provide it in the component that owns the order. */
@Injectable()
export class BillStore {
  private readonly orderService = inject(OrderService)
  private readonly pointsService = inject(PointsService)

  private orderId: string | null = null

  private readonly _mode = signal<DiscountMode>('none')
  private readonly _code = signal('')
  private readonly _selectedRuleId = signal<string | null>(null)
  private readonly _summary = signal<Bill | null>(null)
  private readonly _requested = signal(false)
  private readonly _loading = signal(false)
  private readonly _error = signal<string | null>(null)
  private readonly _points = signal<PointsInfo | null>(null)

  readonly mode = this._mode.asReadonly()
  readonly code = this._code.asReadonly()
  readonly selectedRuleId = this._selectedRuleId.asReadonly()
  /** Amounts always come from the server. */
  readonly summary = this._summary.asReadonly()
  readonly requested = this._requested.asReadonly()
  readonly loading = this._loading.asReadonly()
  readonly error = this._error.asReadonly()
  readonly points = this._points.asReadonly()

  readonly balance = computed(() => this._points()?.balance ?? 0)
  readonly rules = computed(() => this._points()?.rules ?? [])

  /** Loads the saved bill (if any) and the points of the client. */
  init(orderId: string, restaurantId: string): void {
    this.orderId = orderId
    this.orderService.previewBill(orderId).subscribe({
      next: bill => {
        this._summary.set(bill)
        // The API cannot tell "no bill" from "bill without discount"; a discount proves it was requested.
        if (bill.discount > 0 || bill.pointsUsed > 0) this._requested.set(true)
      },
      error: () => {}
    })
    this.pointsService.getMyPoints(restaurantId).subscribe({
      next: info => this._points.set(info),
      error: () => this._points.set(null)
    })
  }

  setMode(mode: DiscountMode): void {
    if (this._requested()) return
    this._mode.set(mode)
    this._error.set(null)
    this._code.set('')
    this._selectedRuleId.set(null)
    this.preview({})
  }

  setCode(code: string): void {
    this._code.set(code)
  }

  applyCode(): void {
    const code = this._code().trim()
    if (!code) {
      this._error.set('Introduce un código')
      return
    }
    this.preview({ code })
  }

  selectRule(ruleId: string): void {
    this._selectedRuleId.set(ruleId)
    this.preview({ pointsRuleId: ruleId })
  }

  request(): void {
    if (!this.orderId || this._requested()) return
    this._loading.set(true)
    this._error.set(null)
    this.orderService.requestBill(this.orderId, this.currentOptions()).subscribe({
      next: bill => {
        this._summary.set(bill)
        this._requested.set(true)
        this._loading.set(false)
      },
      error: err => this.handleRequestError(err)
    })
  }

  private currentOptions() {
    if (this._mode() === 'code') return { code: this._code().trim() }
    if (this._mode() === 'points' && this._selectedRuleId()) return { pointsRuleId: this._selectedRuleId()! }
    return {}
  }

  private preview(options: { code?: string; pointsRuleId?: string }): void {
    if (!this.orderId) return
    this._loading.set(true)
    this._error.set(null)
    this.orderService.previewBill(this.orderId, options).subscribe({
      next: bill => {
        this._summary.set(bill)
        this._loading.set(false)
      },
      error: err => {
        this._error.set(this.messageFor(err))
        this._loading.set(false)
      }
    })
  }

  private handleRequestError(err: HttpErrorResponse): void {
    if (err.status === 409 && this.orderId) {
      // Already requested elsewhere: show the saved bill.
      this.orderService.previewBill(this.orderId).subscribe({
        next: bill => {
          this._summary.set(bill)
          this._requested.set(true)
          this._loading.set(false)
        },
        error: () => {
          this._error.set('La cuenta de este pedido ya se había pedido')
          this._loading.set(false)
        }
      })
      return
    }
    this._error.set(this.messageFor(err))
    this._loading.set(false)
  }

  private messageFor(err: HttpErrorResponse): string {
    const reason = err.error?.reason as BillErrorReason | undefined
    if (reason && REASON_MESSAGES[reason]) return REASON_MESSAGES[reason]
    if (err.status === 404) return 'Pedido no encontrado'
    if (err.status === 400) return 'Elige un código o un tramo de puntos, no ambos'
    return 'No se pudo calcular la cuenta. Inténtalo de nuevo'
  }
}
