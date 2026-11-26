// CORS só para o aplicativo instalado (a página dele vem de capacitor://localhost e
// chama a API em outro endereço). O site normal é da mesma origem e não precisa disto.
// Sem credenciais: o app se identifica por token no cabeçalho Authorization, não por cookie.
export function nativeCors(nativeOrigins) {
  const allowed = new Set(nativeOrigins)
  return (req, res, next) => {
    const origin = req.get('Origin')
    if (!origin || !allowed.has(origin)) return next()
    res.set({
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Expose-Headers': 'Retry-After',
      Vary: 'Origin',
    })
    if (req.method !== 'OPTIONS') return next()
    res.set({
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ISAC-Client, Idempotency-Key',
      'Access-Control-Max-Age': '600',
    })
    res.status(204).end()
  }
}
