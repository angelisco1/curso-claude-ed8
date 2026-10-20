import { Component, inject, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { TableService } from '../../core/services/table.service'
import { TableSessionStore } from '../../core/store/table-session.store'
import { Table } from '../../core/models/table.model'

@Component({
  selector: 'app-table-select',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="container">
      <div class="page-header">
        <div>
          <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
          <h1>Elige tu mesa</h1>
        </div>
      </div>

      <div class="card people-card">
        <label for="people">¿Cuántas personas sois?</label>
        <div class="quantity-selector">
          <button class="qty-btn" (click)="changePeople(-1)" [disabled]="people() <= 1">-</button>
          <span id="people">{{ people() }}</span>
          <button class="qty-btn" (click)="changePeople(1)">+</button>
        </div>
        <button class="btn btn-primary" (click)="search()" [disabled]="loading()">Ver mesas disponibles</button>
      </div>

      @if (loading()) {
        <div class="spinner"></div>
      } @else if (searched()) {
        @if (tables().length === 0) {
          <div class="empty-state card">
            <p>No hay mesas libres para {{ people() }} personas</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button class="table-card card" [class.selected]="selected()?.id === table.id" (click)="selected.set(table)">
                <h3>Mesa {{ table.numero }}</h3>
                @if (table.descripcion) {
                  <p class="desc">{{ table.descripcion }}</p>
                }
                <p class="capacity">Capacidad: {{ table.capacidad }}</p>
              </button>
            }
          </div>
          <button class="btn btn-primary continue" [disabled]="!selected() || occupying()" (click)="continue()">
            {{ occupying() ? 'Reservando mesa...' : 'Continuar' }}
          </button>
        }
      }

      @if (error()) {
        <div class="alert-error">{{ error() }}</div>
      }
    </div>
  `,
  styles: [`
    .container { max-width: 900px; margin: 0 auto; }
    .people-card { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; padding: 20px; margin-bottom: 24px; }
    .quantity-selector { display: flex; align-items: center; gap: 8px; background: var(--bg-input); border-radius: var(--radius-sm); padding: 4px; }
    .qty-btn { width: 28px; height: 28px; border-radius: 4px; background: var(--bg-hover); color: var(--text-primary); font-weight: 600; }
    .tables-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
    .table-card { padding: 16px; text-align: left; border: 1px solid var(--border-color); }
    .table-card.selected { border-color: var(--green-medium); background: var(--green-glow); }
    .table-card h3 { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .desc, .capacity { color: var(--text-muted); font-size: 13px; }
    .continue { margin-top: 20px; }
  `]
})
export class TableSelectComponent {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly tableSession = inject(TableSessionStore)

  private readonly restaurantId = this.route.snapshot.paramMap.get('id') ?? ''

  readonly people = signal(2)
  readonly tables = signal<Table[]>([])
  readonly selected = signal<Table | null>(null)
  readonly loading = signal(false)
  readonly occupying = signal(false)
  readonly searched = signal(false)
  readonly error = signal<string | null>(null)

  changePeople(delta: number): void {
    this.people.update(n => Math.max(1, n + delta))
    this.searched.set(false)
    this.selected.set(null)
  }

  search(): void {
    this.loading.set(true)
    this.error.set(null)
    this.selected.set(null)
    this.tableService.getFreeTables(this.restaurantId, this.people()).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.searched.set(true)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas')
        this.loading.set(false)
      }
    })
  }

  continue(): void {
    const table = this.selected()
    if (!table) return

    this.occupying.set(true)
    this.error.set(null)
    this.tableService.occupy(this.restaurantId, table.id).subscribe({
      next: (occupied) => {
        this.tableSession.set(occupied)
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err) => {
        this.occupying.set(false)
        if (err.status === 409) {
          this.search()
          this.error.set('Esa mesa acaba de ser ocupada. Elige otra.')
        } else {
          this.error.set('Error al ocupar la mesa')
        }
      }
    })
  }
}
