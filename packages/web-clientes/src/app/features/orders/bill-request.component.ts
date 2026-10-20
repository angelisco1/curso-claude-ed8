import { Component, inject, input, OnInit } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { BillStore } from '../../core/store/bill.store'

@Component({
  selector: 'app-bill-request',
  standalone: true,
  imports: [DecimalPipe, FormsModule],
  template: `
    <div class="bill">
      @if (store.summary(); as bill) {
        @if (bill.discount > 0 || store.requested()) {
          <div class="bill-line"><span>Subtotal</span><span>{{ bill.subtotal | number:'1.2-2' }} €</span></div>
          @if (bill.discount > 0) {
            <div class="bill-line discount">
              <span>Descuento{{ bill.code ? ' (' + bill.code + ')' : '' }}{{ bill.pointsUsed ? ' (' + bill.pointsUsed + ' pts)' : '' }}</span>
              <span>-{{ bill.discount | number:'1.2-2' }} €</span>
            </div>
          }
          <div class="bill-line bill-total"><span>Total a pagar</span><strong>{{ bill.total | number:'1.2-2' }} €</strong></div>
        }
      }

      @if (!store.requested()) {
        <div class="mode-tabs">
          <button class="btn btn-secondary" [class.active]="store.mode() === 'code'"
            (click)="store.setMode(store.mode() === 'code' ? 'none' : 'code')">Tengo un código</button>
          @if (store.rules().length > 0) {
            <button class="btn btn-secondary" [class.active]="store.mode() === 'points'"
              (click)="store.setMode(store.mode() === 'points' ? 'none' : 'points')">Canjear puntos</button>
          }
        </div>

        @if (store.mode() === 'code') {
          <form class="code-form" (ngSubmit)="store.applyCode()">
            <input name="code" placeholder="Código de descuento" autocomplete="off"
              [ngModel]="store.code()" (ngModelChange)="store.setCode($event)">
            <button type="submit" class="btn btn-secondary" [disabled]="store.loading()">Aplicar</button>
          </form>
        }
      }

      @if (!store.requested() && store.mode() === 'points') {
        <div class="points">
          <p class="points-balance">Tu saldo: <strong>{{ store.balance() }} pts</strong></p>
          @for (rule of store.rules(); track rule.id) {
            <button class="btn btn-secondary rule" [class.active]="store.selectedRuleId() === rule.id"
              [disabled]="rule.points > store.balance() || store.loading()" (click)="store.selectRule(rule.id)">
              {{ rule.points }} pts = {{ rule.amount | number:'1.2-2' }} €
            </button>
          }
        </div>
      }

      @if (store.error()) {
        <div class="alert-error">{{ store.error() }}</div>
      }

      @if (store.requested()) {
        <p class="bill-done">Cuenta pedida</p>
      } @else {
        <button class="btn btn-primary" [disabled]="store.loading()" (click)="store.request()">
          Pedir la cuenta
        </button>
      }
    </div>
  `,
  styles: [`
    .bill {
      display: flex;
      flex-direction: column;
      gap: 8px;
      font-family: 'Inter', sans-serif;
    }
    .bill-line {
      display: flex;
      justify-content: space-between;
      font-size: 14px;
    }
    .mode-tabs {
      display: flex;
      gap: 8px;
    }
    .mode-tabs .active {
      border-color: var(--green-medium);
      color: var(--green-light);
    }
    .points {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .points-balance {
      font-size: 13px;
      color: var(--text-muted);
    }
    .rule.active {
      border-color: var(--green-medium);
      color: var(--green-light);
    }
    .code-form {
      display: flex;
      gap: 8px;
    }
    .code-form input {
      flex: 1;
      text-transform: uppercase;
    }
    .bill-total {
      font-size: 16px;
      font-weight: 700;
    }
    .discount {
      color: var(--green-light);
    }
    .bill-done {
      text-align: center;
      color: var(--green-light);
      font-weight: 600;
    }
  `]
})
export class BillRequestComponent implements OnInit {
  readonly store = inject(BillStore)
  readonly orderId = input.required<string>()
  readonly restaurantId = input.required<string>()

  ngOnInit(): void {
    this.store.init(this.orderId(), this.restaurantId())
  }
}
