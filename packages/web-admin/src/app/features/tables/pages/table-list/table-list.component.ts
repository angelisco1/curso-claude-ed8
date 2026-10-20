import { Component, inject, OnInit } from '@angular/core'
import { ActivatedRoute, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import type { TableStatus } from '../../models/table.model'

@Component({
  selector: 'app-table-list',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './table-list.component.html',
  styleUrl: './table-list.component.css'
})
export class TableListComponent implements OnInit {
  readonly store = inject(TableStore)
  private readonly route = inject(ActivatedRoute)
  restaurantId = ''

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada']

  ngOnInit(): void {
    this.restaurantId = this.route.parent?.snapshot.params['restaurantId'] ?? ''
    if (this.restaurantId) {
      this.store.loadByRestaurant(this.restaurantId)
    }
  }

  async onStatusChange(id: string, event: Event): Promise<void> {
    const estado = (event.target as HTMLSelectElement).value as TableStatus
    try {
      await this.store.updateStatus(this.restaurantId, id, estado)
    } catch (err: any) {
      alert(err?.error?.message ?? 'Error al cambiar el estado de la mesa.')
    }
  }

  async onDelete(id: string): Promise<void> {
    if (!this.restaurantId) return
    if (confirm('¿Estás seguro de eliminar esta mesa?')) {
      try {
        await this.store.delete(this.restaurantId, id)
      } catch (err: any) {
        alert(err?.error?.message ?? 'Error al eliminar la mesa.')
      }
    }
  }
}
