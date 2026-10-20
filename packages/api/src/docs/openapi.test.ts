import { readFileSync } from 'node:fs'
import { describe, it, expect } from 'vitest'
import { parse } from 'yaml'
import app from '../app.js'
import { authenticate } from '@shared/infrastructure/http/middlewares.js'

const OPENAPI_PATH = new URL('../../../../docs/api/openapi.yaml', import.meta.url)
const APP_SOURCE_PATH = new URL('../app.ts', import.meta.url)

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete']

interface MountedRoute {
    method: string
    path: string
    protectedByAuth: boolean
}

const to_openapi_path = (expressPath: string): string => expressPath.replace(/:(\w+)/g, '{$1}')

const collect_mounted_routes = (): MountedRoute[] => {
    const appSource = readFileSync(APP_SOURCE_PATH, 'utf-8')
    const prefixes = [...appSource.matchAll(/app\.use\('([^']+)',\s*\w+\)/g)].map(match => match[1] as string)
    const stack = (app as any).router.stack as any[]
    const routers = stack.filter(layer => Array.isArray(layer.handle?.stack))
    const routes: MountedRoute[] = []

    expect(routers).toHaveLength(prefixes.length)

    routers.forEach((routerLayer, index) => {
        for (const layer of routerLayer.handle.stack) {
            if (!layer.route) continue
            const subPath = layer.route.path === '/' ? '' : layer.route.path
            const protectedByAuth = layer.route.stack.some((l: any) => l.handle === authenticate)
            for (const method of Object.keys(layer.route.methods)) {
                routes.push({ method, path: to_openapi_path(prefixes[index] + subPath), protectedByAuth })
            }
        }
    })

    for (const layer of stack) {
        if (layer.route) {
            for (const method of Object.keys(layer.route.methods)) {
                routes.push({ method, path: to_openapi_path(layer.route.path), protectedByAuth: false })
            }
        }
    }

    return routes
}

const load_contract = (): any => parse(readFileSync(OPENAPI_PATH, 'utf-8'))

describe('OpenAPI contract', () => {
    const contract = load_contract()

    it('declares an OpenAPI 3.x document with info and a bearer JWT scheme', () => {
        expect(contract.openapi).toMatch(/^3\./)
        expect(contract.info.title).toBeTruthy()
        expect(contract.info.version).toBeTruthy()
        expect(contract.components.securitySchemes.bearerAuth).toMatchObject({
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT'
        })
    })

    it('keeps domain enums aligned with the code', () => {
        const schemas = contract.components.schemas
        expect(schemas.DishCategory.enum).toEqual(['entrante', 'principal', 'postre', 'bebida'])
        expect(schemas.IngredientUnit.enum).toEqual(['kg', 'g', 'l', 'ml', 'unidad'])
        expect(schemas.OrderStatus.enum).toEqual(['pendiente', 'preparando', 'listo', 'entregado'])
        expect(schemas.EmployeeRole.enum).toEqual(['admin', 'manager', 'camarero', 'cocinero', 'cliente'])
        expect(schemas.Dish.properties.category.$ref).toBe('#/components/schemas/DishCategory')
        expect(schemas.Ingredient.properties.unit.$ref).toBe('#/components/schemas/IngredientUnit')
        expect(schemas.OrderItem.properties.status.$ref).toBe('#/components/schemas/OrderStatus')
    })

    describe('route coverage', () => {
        const routes = collect_mounted_routes()

        it('finds the mounted routes of the app', () => {
            expect(routes).toHaveLength(50)
        })

        it.each(routes.map(route => [`${route.method.toUpperCase()} ${route.path}`, route] as const))(
            'documents %s',
            (_label, route) => {
                const operation = contract.paths?.[route.path]?.[route.method]
                expect(operation, `missing operation in openapi.yaml`).toBeDefined()
                expect(HTTP_METHODS).toContain(route.method)

                if (route.protectedByAuth) {
                    expect(operation.security, 'protected endpoint must declare security').toEqual([{ bearerAuth: [] }])
                    expect(operation.responses).toHaveProperty('401')
                } else {
                    expect(operation.security ?? []).toEqual([])
                }
            }
        )

        it('provides an example for every request body', () => {
            const withoutExample = Object.entries(contract.paths ?? {}).flatMap(([path, item]) =>
                Object.entries(item as Record<string, any>)
                    .filter(([method, operation]) => HTTP_METHODS.includes(method) && operation.requestBody)
                    .filter(([, operation]) => {
                        const media = operation.requestBody.content['application/json']
                        return !media.example && !media.examples
                    })
                    .map(([method]) => `${method} ${path}`)
            )
            expect(withoutExample).toEqual([])
        })

        it('does not document operations that are not mounted', () => {
            const mounted = new Set(routes.map(route => `${route.method} ${route.path}`))
            const documented = Object.entries(contract.paths ?? {}).flatMap(([path, item]) =>
                Object.keys(item as object)
                    .filter(key => HTTP_METHODS.includes(key))
                    .map(method => `${method} ${path}`)
            )
            expect(documented.filter(entry => !mounted.has(entry))).toEqual([])
        })
    })
})
