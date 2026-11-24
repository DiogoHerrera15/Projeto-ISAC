// Política de conteúdo para o site servido pelo próprio Node (build do Vite):
// scripts, estilos externos, fontes e imagens só da própria origem. Estilos em
// linha (atributo style do React), imagens data:/blob: (prévia de foto) e
// fontes data: (assets pequenos embutidos pelo Vite) são permitidos.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ')

export function createSecurityHeaders({ production = false } = {}) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
  }
  // Só em produção: HSTS e CSP assumem HTTPS e o build final do site.
  if (production) {
    headers['Strict-Transport-Security'] = 'max-age=15552000'
    headers['Content-Security-Policy'] = CSP
  }
  return (_req, res, next) => {
    res.set(headers)
    next()
  }
}

export const securityHeaders = createSecurityHeaders()
