import { Component, inject, computed, OnInit, OnDestroy } from '@angular/core';
import { AuthStore } from '@resttek/web-shared';
import { TableStore } from '../../store/table.store';
import { Table, TableStatus } from '../../models/table.model';

@Component({
  selector: 'app-mesas',
  standalone: true,
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore);
  readonly tableStore = inject(TableStore);

  readonly statuses: TableStatus[] = ['libre', 'ocupada', 'reservada'];

  readonly canEdit = computed(() => {
    const role = this.authStore.userRole();
    return role === 'camarero' || role === 'manager';
  });

  private get restaurantId(): string | undefined {
    return this.authStore.user()?.restaurantId ?? undefined;
  }

  ngOnInit(): void {
    const restaurantId = this.restaurantId;
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId);
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling();
  }

  ordersOf(table: Table) {
    return this.tableStore.ordersByTable()[table.id] ?? [];
  }

  changeStatus(table: Table, estado: TableStatus): void {
    const restaurantId = this.restaurantId;
    if (!restaurantId || estado === table.estado) return;
    if (
      table.estado === 'ocupada' &&
      this.ordersOf(table).length > 0 &&
      !confirm(`La mesa ${table.numero} tiene pedidos sin entregar. ¿Cambiar su estado igualmente?`)
    ) {
      return;
    }
    this.tableStore.updateStatus(restaurantId, table.id, estado);
  }
}
