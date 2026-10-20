import { Component, inject, OnInit } from '@angular/core'
import { DatePipe } from '@angular/common'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { DiscountCodeStore } from '../../store/discount-code.store'
import type { DiscountCode } from '../../models/discount-code.model'

@Component({
  selector: 'app-discount-list',
  standalone: true,
  imports: [RouterLink, DatePipe, LucideAngularModule],
  templateUrl: './discount-list.component.html',
  styleUrl: './discount-list.component.css'
})
export class DiscountListComponent implements OnInit {
  readonly store = inject(DiscountCodeStore)
  private readonly route = inject(ActivatedRoute)
  restaurantId = ''

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    if (this.restaurantId) {
      this.store.loadByRestaurant(this.restaurantId)
    }
  }

  formatValue(code: DiscountCode): string {
    return code.type === 'percent' ? `${code.value} %` : `${code.value.toFixed(2)} €`
  }

  async onDelete(id: string): Promise<void> {
    if (!this.restaurantId) return
    if (confirm('¿Estás seguro de eliminar este código?')) {
      try {
        await this.store.delete(this.restaurantId, id)
      } catch (err: any) {
        alert(err?.error?.message ?? 'Error al eliminar el código.')
      }
    }
  }
}
