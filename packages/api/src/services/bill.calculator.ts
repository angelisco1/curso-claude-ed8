export interface DiscountSpec {
    type: 'fixed' | 'percent'
    value: number
}

export interface PricedLine {
    price: number
    quantity: number
}

export const toCents = (euros: number): number => Math.round(euros * 100)

export const toEuros = (cents: number): number => cents / 100

export const calculateSubtotalCents = (lines: PricedLine[]): number =>
    lines.reduce((total, line) => total + toCents(line.price) * line.quantity, 0)

export const calculateDiscountCents = (subtotalCents: number, discount: DiscountSpec): number => {
    const raw = discount.type === 'fixed'
        ? toCents(discount.value)
        : Math.round((subtotalCents * discount.value) / 100)
    return Math.max(0, Math.min(raw, subtotalCents))
}
