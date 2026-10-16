import { HttpError } from './errors.js'

export function authRateLimit({ attempts = 10, windowMs = 15 * 60 * 1000, now = Date.now } = {}) {
  const buckets = new Map()
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown'
    const time = now()
    let bucket = buckets.get(key)
    if (!bucket || bucket.until <= time) bucket = { count: 0, until: time + windowMs }
    if (bucket.count >= attempts) {
      res.set('Retry-After', String(Math.ceil((bucket.until - time) / 1000)))
      return next(new HttpError(429, 'LIMITE_REQUISICOES', 'Aguarde antes de tentar novamente.'))
    }
    bucket.count += 1
    buckets.set(key, bucket)
    next()
  }
}
