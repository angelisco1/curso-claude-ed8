import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Order } from '../models/order.model'
import { Bill, BillOptions } from '../models/discount.model'

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  createOrder(restaurantId: string, tableId: string | null, items: { dishId: string; quantity: number; notes: string | null }[]): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/orders`, {
      restaurantId,
      tableId,
      items
    })
  }

  getMyOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/orders/mine`)
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/orders/${id}`)
  }

  previewBill(orderId: string, options: BillOptions = {}): Observable<Bill> {
    let params = new HttpParams()
    if (options.code) params = params.set('code', options.code)
    if (options.pointsRuleId) params = params.set('pointsRuleId', options.pointsRuleId)
    return this.http.get<Bill>(`${this.apiUrl}/orders/${orderId}/bill`, { params })
  }

  requestBill(orderId: string, options: BillOptions = {}): Observable<Bill> {
    const body: BillOptions = {}
    if (options.code) body.code = options.code
    if (options.pointsRuleId) body.pointsRuleId = options.pointsRuleId
    return this.http.post<Bill>(`${this.apiUrl}/orders/${orderId}/bill`, body)
  }
}
