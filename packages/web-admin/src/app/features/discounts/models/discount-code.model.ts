export type DiscountType = 'fixed' | 'percent'

export interface DiscountCode {
  id: string
  restaurantId: string
  code: string
  type: DiscountType
  value: number
  minOrder: number | null
  validFrom: string | null
  validUntil: string | null
  maxUses: number | null
  uses: number
  active: boolean
}

export interface CreateDiscountCodeDto {
  code: string
  type: DiscountType
  value: number
  minOrder?: number | null
  validFrom?: string | null
  validUntil?: string | null
  maxUses?: number | null
  active: boolean
}

export type UpdateDiscountCodeDto = CreateDiscountCodeDto
