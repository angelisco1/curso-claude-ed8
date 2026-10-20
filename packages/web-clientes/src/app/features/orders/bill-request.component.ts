import { Component, inject, input, OnInit } from '@angular/core'
import { DecimalPipe } from '@angular/common'
import { BillStore } from '../../core/store/bill.store'

@Component({
  selector: 'app-bill-request',
  standalone: true,
  imports: [DecimalPipe],
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
