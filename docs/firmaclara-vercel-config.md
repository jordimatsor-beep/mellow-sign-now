# Guía de Configuración: Vercel
## FirmaClara - Deployment y Hosting

---

## 1. Visión General

Vercel aloja el frontend de FirmaClara (generado con Lovable) y puede alojar también las API routes de Antigravity si se usa el modelo serverless.

### 1.1 Arquitectura de Deploy

```
┌─────────────────────────────────────────────┐
│                  VERCEL                      │
├─────────────────────────────────────────────┤
│  Frontend (React/Next.js)                    │
│  ├── /dashboard                              │
│  ├── /documents/*                            │
│  ├── /clara                                  │
│  ├── /sign/:token (página pública)          │
│  └── ...                                     │
├─────────────────────────────────────────────┤
│  API Routes (Antigravity/Serverless)         │
│  ├── /api/documents                          │
│  ├── /api/sign                               │
│  ├── /api/clara                              │
│  └── ...                                     │
└─────────────────────────────────────────────┘
           │
           ▼
    ┌──────────────┐
    │   Supabase   │
    │   (DB/Auth)  │
    └──────────────┘
```

---

## 2. Configuración Inicial

### 2.1 Crear Proyecto en Vercel

1. Ir a https://vercel.com
2. "Add New Project"
3. Importar repositorio de GitHub/GitLab
4. Seleccionar framework: Next.js (o Vite si Lovable usa Vite)

### 2.2 Variables de Entorno

En Vercel Dashboard → Settings → Environment Variables:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# App
NEXT_PUBLIC_APP_URL=https://firmaclara.com

# FreeTSA
FREETSA_URL=https://freetsa.org/tsr

# Anthropic (Clara)
ANTHROPIC_API_KEY=sk-ant-xxx

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# n8n
N8N_WEBHOOK_URL=https://n8n.xxx.com/webhook/firmaclara

# Auth
JWT_SECRET=xxx
MULTICENTROS_AUTH_SECRET=xxx
```

**Importante:** 
- Variables con `NEXT_PUBLIC_` son accesibles en el cliente
- Variables sin prefijo solo son accesibles en el servidor (API routes)

### 2.3 Configurar por Entorno

| Variable | Production | Preview | Development |
|----------|------------|---------|-------------|
| APP_URL | firmaclara.com | *.vercel.app | localhost:3000 |
| STRIPE_KEY | Live keys | Test keys | Test keys |

---

## 3. Dominio Personalizado

### 3.1 Configurar Dominio

1. Vercel Dashboard → Settings → Domains
2. Añadir: `firmaclara.com`
3. Configurar DNS en tu registrador:

```
Tipo    Nombre    Valor
A       @         76.76.21.21
CNAME   www       cname.vercel-dns.com
```

### 3.2 SSL Automático

Vercel genera certificado SSL automáticamente. No requiere configuración.

---

## 4. Archivo de Configuración

### 4.1 vercel.json

```json
{
  "version": 2,
  "framework": "nextjs",
  "regions": ["fra1"],
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET,POST,PUT,DELETE,OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/sign/:token",
      "destination": "/sign/[token]"
    }
  ],
  "redirects": [
    {
      "source": "/",
      "destination": "/dashboard",
      "permanent": false,
      "has": [
        { "type": "cookie", "key": "session" }
      ]
    }
  ],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

### 4.2 Explicación de Configuración

| Opción | Descripción |
|--------|-------------|
| `regions` | `fra1` = Frankfurt, cercano a España |
| `headers` | CORS para API |
| `rewrites` | Rutas dinámicas |
| `redirects` | Redirigir a dashboard si hay sesión |
| `functions.maxDuration` | Timeout de API (30s para TSA) |

---

## 5. Optimizaciones

### 5.1 Caching

En `next.config.js`:

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/api/sign/:token',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store', // Nunca cachear página de firma
          },
        ],
      },
    ];
  },
};
```

### 5.2 Edge Functions (Opcional)

Para la página de firma (máxima velocidad):

```typescript
// pages/sign/[token].tsx
export const config = {
  runtime: 'edge',
};
```

---

## 6. Monitorización

### 6.1 Vercel Analytics

Habilitar en Dashboard → Analytics:
- Web Vitals
- Audiencia
- Errores

### 6.2 Logs

Ver logs en tiempo real:
- Dashboard → Deployments → [Deploy] → Functions
- O usar CLI: `vercel logs`

### 6.3 Alertas

Configurar alertas en Dashboard → Settings → Notifications:
- Deploy fallido
- Error rate alto
- Uso de funciones

---

## 7. CI/CD

### 7.1 Flujo Automático

```
Push a main → Vercel Build → Deploy Production
Push a develop → Vercel Build → Deploy Preview
Pull Request → Vercel Build → Deploy Preview
```

### 7.2 Protección de Branch

En GitHub/GitLab, proteger `main`:
- Require pull request reviews
- Require status checks (Vercel build)

### 7.3 Preview Deployments

Cada PR genera URL de preview:
```
https://firmaclara-git-feature-xxx.vercel.app
```

---

## 8. Webhooks de Stripe

### 8.1 Configurar Endpoint

En Stripe Dashboard → Developers → Webhooks:

```
Endpoint URL: https://firmaclara.com/api/credits/webhook
Events:
  - checkout.session.completed
  - payment_intent.succeeded
  - payment_intent.payment_failed
```

### 8.2 Verificar Webhook Secret

El `STRIPE_WEBHOOK_SECRET` se obtiene de Stripe al crear el endpoint.

---

## 9. Seguridad

### 9.1 Headers de Seguridad

En `next.config.js`:

```javascript
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 9.2 Rate Limiting

Usar Vercel Edge Middleware para rate limiting:

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Implementar rate limiting con Vercel KV o similar
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## 10. Checklist de Deploy

### 10.1 Pre-Deploy

- [ ] Todas las variables de entorno configuradas
- [ ] Dominio configurado y DNS propagado
- [ ] SSL activo
- [ ] Webhook de Stripe configurado

### 10.2 Post-Deploy

- [ ] Verificar página principal carga
- [ ] Verificar login funciona
- [ ] Verificar flujo de firma completo
- [ ] Verificar emails se envían
- [ ] Verificar pagos funcionan (con Stripe test)
- [ ] Verificar Clara responde

### 10.3 Monitorización

- [ ] Analytics habilitado
- [ ] Alertas configuradas
- [ ] Logs accesibles

---

## 11. Comandos Útiles CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod

# Ver logs
vercel logs

# Pull env vars
vercel env pull .env.local

# Listar deployments
vercel ls
```

---

## 12. Troubleshooting

### Error: Function timeout

**Solución:** Aumentar `maxDuration` en `vercel.json`:
```json
{
  "functions": {
    "api/sign/[token].ts": {
      "maxDuration": 60
    }
  }
}
```

### Error: 504 Gateway Timeout

**Causa:** FreeTSA tarda en responder

**Solución:** 
1. Aumentar timeout
2. Implementar retry con backoff
3. Considerar TSA alternativo como backup

### Error: CORS en API

**Solución:** Verificar headers en `vercel.json` y `next.config.js`

---

**Fin de la guía Vercel**
