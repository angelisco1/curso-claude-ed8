import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { TableSessionStore } from '../store/table-session.store'

export const tableSelectedGuard: CanActivateFn = (route) => {
  const id = route.paramMap.get('id') ?? ''
  const session = inject(TableSessionStore)
  return session.hasTableFor(id) || inject(Router).createUrlTree(['/restaurants', id, 'tables'])
}
