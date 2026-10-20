import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Table, TableWithOrders, UpdateTableStatusDto } from '../models/table.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient);

  private url(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/tables`;
  }

  getTables(restaurantId: string): Observable<Table[]> {
    return this.http.get<Table[]>(this.url(restaurantId));
  }

  getOccupiedWithOrders(restaurantId: string): Observable<TableWithOrders[]> {
    return this.http.get<TableWithOrders[]>(`${this.url(restaurantId)}/active-orders`);
  }

  updateStatus(restaurantId: string, tableId: string, dto: UpdateTableStatusDto): Observable<Table> {
    return this.http.patch<Table>(`${this.url(restaurantId)}/${tableId}/status`, dto);
  }
}
