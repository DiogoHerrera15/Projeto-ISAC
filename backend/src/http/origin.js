import { HttpError } from './errors.js'

export function requireSameOrigin(allowed, { log = console.warn } = {}) {
  const origins = [].concat(allowed)
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    if (!origins.includes(req.get('Origin')) || req.get('X-ISAC-Client') !== 'web') {
      // Ajuda a achar a diferença entre o endereço do site e o APP_ORIGIN configurado.
      log(`Origem recusada: Origin=${req.get('Origin')} X-ISAC-Client=${req.get('X-ISAC-Client')} permitidas=${origins.join(',')}`)
      return next(new HttpError(403, 'ORIGEM_INVALIDA', 'Origem da requisição não permitida.'))
    }
    next()
  }
}
