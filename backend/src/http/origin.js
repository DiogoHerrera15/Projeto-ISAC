import { HttpError } from './errors.js'

export function requireSameOrigin(appOrigin) {
  return (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    if (req.get('Origin') !== appOrigin || req.get('X-ISAC-Client') !== 'web') {
      return next(new HttpError(403, 'ORIGEM_INVALIDA', 'Origem da requisição não permitida.'))
    }
    next()
  }
}
