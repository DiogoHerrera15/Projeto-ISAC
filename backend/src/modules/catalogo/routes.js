import { createCatalogController } from './controller.js'

export function registerCatalogRoutes(app, pool) {
  const controller = createCatalogController(pool)
  app.get('/api/v1/produtos', controller.listProducts)
  app.get('/api/v1/produtos/:id', controller.getProduct)
  app.get('/api/v1/lojas', controller.listStores)
  app.get('/api/v1/lojas/:id', controller.getStore)
  app.get('/api/v1/categorias', controller.listCategories)
  app.get('/api/v1/configuracoes/comissao', controller.getCommission)
}
