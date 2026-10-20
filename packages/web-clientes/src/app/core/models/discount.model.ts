export interface Bill {
  subtotal: number
  discount: number
  pointsUsed: number
  total: number
  code?: string
}

export interface PointsRule {
  id: string
  points: number
  amount: number
}

export interface PointsInfo {
  balance: number
  rules: PointsRule[]
}

export type BillErrorReason =
  | 'invalid'
  | 'expired'
  | 'exhausted'
  | 'inactive'
  | 'min_order'
  | 'insufficient_points'

export interface BillOptions {
  code?: string
  pointsRuleId?: string
}
