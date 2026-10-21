import { requireSession } from '../auth/sessions.js'
import { createImageController } from './controller.js'
import { createImageUpload } from './upload.js'

export function registerImageRoutes(app, pool, config) {
  const directory = config.uploadDir || './uploads'
  const controller = createImageController(pool, directory)
  const upload = createImageUpload(directory)
  app.post('/api/v1/minha-loja/imagens', requireSession(pool), controller.requireStore,
    upload.single('arquivo'), controller.uploadImage)
  app.get('/api/v1/imagens/:id', controller.getImage)
}
