import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { environment } from '../../../../environments/environment'
import type { PointsRule, CreatePointsRuleDto, UpdatePointsRuleDto } from '../models/points-rule.model'

@Injectable({ providedIn: 'root' })
export class PointsRuleService {
  private readonly http = inject(HttpClient)

  private buildUrl(restaurantId: string): string {
    return `${environment.apiUrl}/restaurants/${restaurantId}/points-rules`
  }

  getAll(restaurantId: string) {
    return this.http.get<PointsRule[]>(this.buildUrl(restaurantId))
  }

  create(restaurantId: string, dto: CreatePointsRuleDto) {
    return this.http.post<PointsRule>(this.buildUrl(restaurantId), dto)
  }

  update(restaurantId: string, id: string, dto: UpdatePointsRuleDto) {
    return this.http.put<PointsRule>(`${this.buildUrl(restaurantId)}/${id}`, dto)
  }

  delete(restaurantId: string, id: string) {
    return this.http.delete<void>(`${this.buildUrl(restaurantId)}/${id}`)
  }
}
