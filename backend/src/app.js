import express from 'express'
import { join } from 'node:path'
import { errorHandler, HttpError } from './http/errors.js'
import { requireSameOrigin } from './http/origin.js'
import { registerAuthRoutes } from './modules/auth/routes.js'
import { registerProfileRoutes } from './modules/perfis/routes.js'
import { registerCatalogRoutes } from './modules/catalogo/routes.js'
import { registerStoreRoutes } from './modules/lojas/routes.js'
import { registerProductRoutes } from './modules/produtos/routes.js'
import { registerCartRoutes } from './modules/carrinho/routes.js'
import { registerOrderRoutes } from './modules/pedidos/routes.js'
import { registerSalesRoutes } from './modules/lojas/vendas.js'
import { registerAdminRoutes } from './modules/admin/routes.js'
import { registerImageRoutes } from './modules/imagens/routes.js'

export function createApp({ pool, storage, config } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.locals.pool = pool
  app.locals.storage = storage
  app.locals.config = config
  app.use(express.json({ limit: '64kb' }))
  app.use('/api/v1', requireSameOrigin(config.appOrigin))
  app.get('/api/v1/health', (_req, res) => res.json({ data: { status: 'ok' } }))
  registerAuthRoutes(app, pool, config)
  registerProfileRoutes(app, pool)
  registerCatalogRoutes(app, pool)
  registerStoreRoutes(app, pool)
  registerProductRoutes(app, pool)
  registerCartRoutes(app, pool)
  registerOrderRoutes(app, pool)
  registerSalesRoutes(app, pool)
  registerAdminRoutes(app, pool)
  registerImageRoutes(app, pool, config)
  if (config.frontendDist) {
    const staticFiles = express.static(config.frontendDist, { index: false })
    app.use((req, res, next) => /^\/api(?:\/|$)/.test(req.path) ? next() : staticFiles(req, res, next))
    app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => res.sendFile(join(config.frontendDist, 'index.html')))
  }
  app.use((_req, _res, next) => next(new HttpError(404, 'NAO_ENCONTRADO', 'Rota não encontrada.')))
  app.use(errorHandler)
  return app
}
