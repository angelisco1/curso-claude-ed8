import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { PointsInfo } from '../models/discount.model'

@Injectable({ providedIn: 'root' })
export class PointsService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  getMyPoints(restaurantId: string): Observable<PointsInfo> {
    return this.http.get<PointsInfo>(`${this.apiUrl}/restaurants/${restaurantId}/points/me`)
  }
}
