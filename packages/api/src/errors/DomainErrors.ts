import { AppError } from '@errors/AppError.js'

export class FirstNameRequiredError extends AppError {
  constructor() {
    super('First name is required')
  }
}

export class LastNameRequiredError extends AppError {
  constructor() {
    super('Last name is required')
  }
}

export class PasswordHashRequiredError extends AppError {
  constructor() {
    super('Password hash is required')
  }
}

export class InvalidRoleError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid role')
  }
}

export class InvalidEmailError extends AppError {
  constructor() {
    super('Invalid email format')
  }
}

export class InvalidCredentialsError extends AppError {
  constructor() {
    super('Invalid credentials')
  }
}

export class DuplicatedEmailError extends AppError {
  constructor() {
    super('Email is already in use')
  }
}

export class EmployeeNotFoundError extends AppError {
  constructor() {
    super('Employee not found')
  }
}

export class RestaurantNameRequiredError extends AppError {
  constructor() {
    super('Restaurant name is required')
  }
}

export class RestaurantAddressRequiredError extends AppError {
  constructor() {
    super('Restaurant address is required')
  }
}

export class RestaurantEmailRequiredError extends AppError {
  constructor() {
    super('Restaurant email is required')
  }
}

export class RestaurantNotFoundError extends AppError {
  constructor() {
    super('Restaurant not found')
  }
}

export class InvalidPhoneError extends AppError {
  constructor() {
    super('Invalid phone format')
  }
}

export class OwnerFirstNameRequiredError extends AppError {
  constructor() {
    super('Owner first name is required')
  }
}

export class OwnerLastNameRequiredError extends AppError {
  constructor() {
    super('Owner last name is required')
  }
}

export class IngredientNameRequiredError extends AppError {
  constructor() {
    super('Ingredient name is required')
  }
}

export class IngredientNotFoundError extends AppError {
  constructor() {
    super('Ingredient not found')
  }
}

export class InvalidUnitError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid unit')
  }
}

export class NegativeStockError extends AppError {
  constructor() {
    super('Stock cannot be negative')
  }
}

export class RestaurantIdRequiredError extends AppError {
  constructor() {
    super('Restaurant ID is required')
  }
}

export class DishNameRequiredError extends AppError {
  constructor() {
    super('Dish name is required')
  }
}

export class InvalidPriceError extends AppError {
  constructor() {
    super('Price must be a positive number')
  }
}

export class InvalidCategoryError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid category')
  }
}

export class DishNotFoundError extends AppError {
  constructor() {
    super('Dish not found')
  }
}

export class DatabaseNotInitializedError extends AppError {
  constructor() {
    super('Database is not initialized. Call dbConfig.initialize() first.')
  }
}

export class InvalidOrderStatusError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid order status')
  }
}

export class OrderNotFoundError extends AppError {
  constructor() {
    super('Order not found')
  }
}


export class TableNotFoundError extends AppError {
  constructor() {
    super('Table not found')
  }
}

export class InvalidTableNumberError extends AppError {
  constructor() {
    super('Table number must be a positive integer')
  }
}

export class InvalidTableCapacityError extends AppError {
  constructor() {
    super('Capacity must be a positive integer')
  }
}

export class InvalidTableStatusError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid table status')
  }
}

export class DuplicatedTableNumberError extends AppError {
  constructor() {
    super('Table number already exists in this restaurant')
  }
}

export class TableNotAvailableError extends AppError {
  constructor() {
    super('Table is not available')
  }
}

export class TableOccupiedError extends AppError {
  constructor() {
    super('Occupied tables cannot be deleted')
  }
}

export class DiscountCodeNotFoundError extends AppError {
  constructor() {
    super('Discount code not found')
  }
}

export class DuplicatedDiscountCodeError extends AppError {
  constructor() {
    super('Discount code already exists in this restaurant')
  }
}

export class InvalidDiscountCodeError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid discount code')
  }
}

export class PointsRuleNotFoundError extends AppError {
  constructor() {
    super('Points rule not found')
  }
}

export class DuplicatedPointsRuleError extends AppError {
  constructor() {
    super('A points rule with these points already exists in this restaurant')
  }
}

export class InvalidPointsRuleError extends AppError {
  constructor(message?: string) {
    super(message ?? 'Invalid points rule')
  }
}

export class InvalidPointsBalanceError extends AppError {
  constructor() {
    super('Points balance must be a non-negative integer')
  }
}

export class BillAlreadyRequestedError extends AppError {
  constructor() {
    super('The bill for this order has already been requested')
  }
}

export class BillDiscountConflictError extends AppError {
  constructor() {
    super('Use either a discount code or a points rule, not both')
  }
}

export type BillRejectionReason =
  | 'invalid'
  | 'expired'
  | 'exhausted'
  | 'inactive'
  | 'min_order'
  | 'insufficient_points'

export class BillCodeInvalidError extends AppError {
  readonly reason: BillRejectionReason = 'invalid'

  constructor() {
    super('Discount code does not exist')
  }
}

const REJECTION_MESSAGES: Record<BillRejectionReason, string> = {
  invalid: 'Discount is not valid',
  expired: 'Discount code has expired',
  exhausted: 'Discount code has no uses left',
  inactive: 'Discount code is not active',
  min_order: 'Order total is below the minimum required by the code',
  insufficient_points: 'Not enough points for this rule'
}

export class BillDiscountRejectedError extends AppError {
  constructor(public readonly reason: BillRejectionReason) {
    super(REJECTION_MESSAGES[reason])
  }
}
