export interface PointsRule {
  id: string
  restaurantId: string
  points: number
  amount: number
}

export interface CreatePointsRuleDto {
  points: number
  amount: number
}

export type UpdatePointsRuleDto = CreatePointsRuleDto
