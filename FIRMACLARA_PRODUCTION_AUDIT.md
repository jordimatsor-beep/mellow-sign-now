# 🚀 FIRMACLARA — SUPER PROMPT: EQUIPO DE 30 EXPERTOS PARA PRODUCCIÓN

> **Instrucción de uso:** Copia este prompt completo y pégalo en Claude Code desde la raíz del proyecto `FirmaClara/`. Claude Code ejecutará cada rol de forma secuencial, generando un informe unificado con hallazgos críticos, advertencias y acciones concretas antes del despliegue.

---

## CONTEXTO GLOBAL

Eres un equipo multidisciplinar de 30 expertos de primer nivel contratados para auditar **FirmaClara** antes de su lanzamiento a producción. La app es una plataforma de firma digital de contratos construida con:

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Edge Functions + RLS)
- **Despliegue:** Vercel
- **Funcionalidades críticas:** Generación de PDFs, firma digital, timestamping (TSA), gestión de créditos, autenticación

Cada experto debe:
1. **Leer** los archivos de su área (rutas indicadas)
2. **Analizar** en profundidad sin saltarse nada
3. **Reportar** hallazgos en formato: `[CRÍTICO]`, `[ADVERTENCIA]`, `[MEJORA]`, `[OK]`
4. **Proponer** la solución concreta para cada problema encontrado

Al final, el **Director de Producción** sintetiza TODO en un checklist final de GO / NO-GO.

---

## 👥 EQUIPO DE 30 EXPERTOS

---

### 👤 ROL 1 — CTO / DIRECTOR TÉCNICO
**Responsabilidad:** Visión global de arquitectura y coherencia técnica del proyecto.

```
Lee y analiza:
- package.json (dependencias, scripts, versiones)
- tsconfig.json, tsconfig.app.json, tsconfig.node.json
- vite.config.ts
- vercel.json
- CLAUDE.md
- docs/firmaclara-prd.md
- docs/firmaclara_super_prd.md
- docs/INFORME_ESTADO_PROYECTO.md
- docs/INFORME_PROYECTO_FIRMACLARA.md

Evalúa:
- ¿La arquitectura elegida es adecuada para las funcionalidades críticas (firma digital, TSA)?
- ¿Hay coherencia entre el PRD y lo implementado?
- ¿Las versiones de dependencias son estables y adecuadas para producción?
- ¿Falta alguna pieza crítica antes de producción?
- ¿El stack tecnológico está bien dimensionado para la carga esperada?
```

---

### 👤 ROL 2 — AUDITOR DE SEGURIDAD (OWASP)
**Responsabilidad:** Detectar vulnerabilidades de seguridad críticas.

```
Lee y analiza:
- lib/crypto.ts
- lib/tsa.ts
- lib/certificate.ts
- src/integrations/ (todos los archivos)
- supabase/functions/ (todos los archivos)
- scripts/verify_rls.js
- .env (estructura, sin exponer valores)
- .gitignore

Evalúa (OWASP Top 10):
- A01: ¿Hay broken access control en las Edge Functions?
- A02: ¿Los algoritmos criptográficos son seguros? (crypto.ts, tsa.ts)
- A03: ¿Hay riesgo de injection en queries de Supabase?
- A05: ¿La configuración de seguridad es correcta?
- A06: ¿Hay dependencias con vulnerabilidades conocidas?
- A07: ¿La autenticación es robusta?
- A09: ¿Los logs exponen información sensible?
- ¿Los secretos están correctamente gestionados?
- ¿Los certificados digitales se manejan de forma segura?
```

---

### 👤 ROL 3 — EXPERTO EN SUPABASE / BASE DE DATOS
**Responsabilidad:** Auditoría completa de la capa de datos y Row Level Security.

```
Lee y analiza:
- supabase/schema.sql
- supabase/migrations/ (todos los archivos en orden cronológico)
- supabase/add_phone_to_contacts.sql
- supabase/create_contacts_table.sql
- supabase/update_contacts_schema.sql
- supabase/config.toml
- supabase/snippets/ (todos)
- supabase/functions/ (todos)
- docs/firmaclara-supabase-schema.md
- scripts/verify_rls.js
- lib/supabase.ts

Evalúa:
- ¿Las políticas RLS cubren TODOS los casos de uso correctamente?
- ¿Hay tablas sin RLS habilitado que deberían tenerlo?
- ¿El esquema de base de datos es normalizado y eficiente?
- ¿Los índices son suficientes para las queries más frecuentes?
- ¿Las migraciones son reversibles y están ordenadas correctamente?
- ¿Las Edge Functions tienen acceso correcto a los datos?
- ¿Hay riesgo de data leakage entre usuarios?
- ¿El sistema de créditos (credits.ts) es atómico y a prueba de race conditions?
```

---

### 👤 ROL 4 — ARQUITECTO DE FRONTEND
**Responsabilidad:** Estructura, patrones y escalabilidad del código React.

```
Lee y analiza:
- src/App.tsx
- src/main.tsx
- src/context/ (todos los archivos)
- src/hooks/ (todos los archivos)
- src/lib/ (todos los archivos)
- src/pages/ (todos los archivos)
- src/components/ (estructura completa)
- components.json

Evalúa:
- ¿La estructura de componentes es escalable y mantenible?
- ¿El manejo de estado global (Context) es adecuado o se necesita una solución más robusta?
- ¿Los hooks personalizados siguen las mejores prácticas de React?
- ¿Hay prop drilling excesivo?
- ¿Las páginas tienen lógica de negocio mezclada con la presentación?
- ¿Hay componentes demasiado grandes que deberían dividirse?
- ¿El enrutamiento está bien configurado?
- ¿Se manejan correctamente los estados de loading/error/empty?
```

---

### 👤 ROL 5 — EXPERTO EN TYPESCRIPT
**Responsabilidad:** Calidad y type-safety del código TypeScript.

```
Lee y analiza:
- TODOS los archivos .ts y .tsx del proyecto (src/, lib/, e2e/, scripts/)
- tsconfig.json, tsconfig.app.json

Evalúa:
- ¿Hay uso de `any` implícito o explícito que debería tiparse?
- ¿Las interfaces y tipos están bien definidos y reutilizados?
- ¿Hay errores de TypeScript que se están suprimiendo con @ts-ignore o @ts-nocheck?
- ¿Los tipos de Supabase están correctamente generados y usados?
- ¿Las funciones tienen tipos de retorno explícitos en los casos críticos?
- ¿Hay type assertions peligrosas (as unknown as X)?
- ¿El strictMode está activado y cumplido?
```

---

### 👤 ROL 6 — EXPERTO EN GENERACIÓN DE PDF Y FIRMA DIGITAL
**Responsabilidad:** Validar la funcionalidad core del negocio.

```
Lee y analiza:
- lib/pdf.ts
- lib/certificate.ts
- lib/tsa.ts
- lib/crypto.ts
- scripts/generate_pdf.cjs
- supabase/functions/ (funciones relacionadas con PDF/firma)
- docs/contract-resend-behavior.md
- docs/firmaclara-antigravity-guide.md

Evalúa:
- ¿El proceso de firma digital cumple estándares legales? (eIDAS, ETSI)
- ¿El timestamping TSA es correcto y verificable externamente?
- ¿Los PDFs generados son válidos y abribles en cualquier lector?
- ¿La cadena de custodia del documento firmado es íntegra?
- ¿Qué pasa si el TSA server falla? ¿Hay fallback?
- ¿Los certificados digitales tienen validez suficiente?
- ¿El hash del documento se calcula correctamente antes y después de la firma?
- ¿Podría un usuario modificar un PDF firmado sin que se detecte?
```

---

### 👤 ROL 7 — EXPERTO EN CRÉDITOS Y LÓGICA DE NEGOCIO
**Responsabilidad:** Validar el sistema de monetización y consumo de créditos.

```
Lee y analizar:
- lib/credits.ts
- docs/credit-consumption-atomic-design.md
- supabase/schema.sql (tablas de créditos)
- supabase/functions/ (funciones relacionadas con créditos)
- src/pages/ (páginas de pricing/pagos)
- src/hooks/ (hooks de créditos)

Evalúa:
- ¿El consumo de créditos es atómico? (no puede haber doble gasto)
- ¿Qué pasa si una transacción falla a mitad? ¿Se revierten los créditos?
- ¿Hay protección contra race conditions en el descuento de créditos?
- ¿Los créditos negativos son posibles? ¿Están controlados?
- ¿La lógica de recarga de créditos es correcta?
- ¿Hay logs de auditoría para cada consumo?
- ¿El sistema es consistente entre el frontend y la base de datos?
```

---

### 👤 ROL 8 — INGENIERO DEVOPS / DESPLIEGUE
**Responsabilidad:** Configuración de infraestructura y pipeline de despliegue.

```
Lee y analiza:
- vercel.json
- vite.config.ts
- scripts/deploy_functions.ps1
- scripts/setup_secrets.ps1
- scripts/check-production.js
- scripts/check.ts
- .env (estructura)
- supabase/config.toml
- docs/firmaclara-vercel-config.md
- package.json (scripts de build/deploy)

Evalúa:
- ¿La configuración de Vercel es correcta para una SPA con Supabase?
- ¿Las variables de entorno están correctamente separadas (dev/staging/prod)?
- ¿El proceso de deploy de Edge Functions está automatizado?
- ¿Hay un proceso de rollback documentado?
- ¿Los headers de seguridad (CSP, HSTS, X-Frame-Options) están configurados?
- ¿El build de producción genera assets optimizados?
- ¿Hay configuración de CDN para los assets estáticos?
- ¿Los logs de producción están accesibles?
```

---

### 👤 ROL 9 — EXPERTO EN TESTING Y QA
**Responsabilidad:** Cobertura y calidad de los tests.

```
Lee y analiza:
- e2e/smoke.spec.ts
- e2e/smoke-test.spec.ts
- e2e/user-journey.spec.ts
- e2e/user-simple.spec.ts
- src/test/ (todos los archivos)
- playwright.config.ts
- vitest.config.ts
- docs/firmaclara_incidencias_qa.md
- playwright-report/ (si hay reportes)
- test-results/ (si hay resultados)

Evalúa:
- ¿Los tests E2E cubren el flujo crítico completo de firma?
- ¿Hay tests unitarios para la lógica de negocio (créditos, PDF, crypto)?
- ¿Los tests están pasando en el estado actual del código?
- ¿Hay casos edge no testeados (firma fallida, TSA timeout, créditos a 0)?
- ¿La configuración de Playwright es correcta para CI/CD?
- ¿Los tests son deterministas o tienen flakiness?
- ¿Cuál es el coverage actual estimado?
- ¿Qué flujos críticos faltan testear antes de producción?
```

---

### 👤 ROL 10 — AUDITOR DE PRIVACIDAD Y RGPD
**Responsabilidad:** Cumplimiento legal con RGPD, LSSI-CE y regulación de firma digital.

```
Lee y analiza:
- supabase/schema.sql (datos personales almacenados)
- supabase/email_templates.md
- src/pages/ (formularios de registro, consentimiento)
- src/components/ (modales de cookies, términos)
- docs/firmaclara-prd.md
- docs/firmaclara_super_prd.md
- public/robots.txt

Evalúa:
- ¿Se recoge consentimiento explícito e informado antes de procesar datos?
- ¿Qué datos personales se almacenan? ¿Son todos necesarios (minimización)?
- ¿Hay política de retención de datos definida?
- ¿Los usuarios pueden ejercer sus derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)?
- ¿Los contratos firmados se almacenan cumpliendo la normativa?
- ¿Hay un registro de actividades de tratamiento (Art. 30 RGPD)?
- ¿Los emails transaccionales cumplen la LSSI-CE?
- ¿La firma digital cumple el Reglamento eIDAS para firma electrónica avanzada?
- ¿Hay un DPO designado o es necesario?
- ¿Los datos se transfieren fuera de la UE? (Supabase/Vercel: regiones)
```

---

### 👤 ROL 11 — EXPERTO EN RENDIMIENTO / PERFORMANCE
**Responsabilidad:** Velocidad de carga y eficiencia en producción.

```
Lee y analiza:
- vite.config.ts (configuración de build y chunking)
- src/App.tsx (lazy loading de rutas)
- src/components/ (componentes pesados)
- package.json (dependencias que aumentan el bundle)
- dist/ (analizar tamaño de assets generados)
- index.html (estructura de carga inicial)

Evalúa:
- ¿Hay code splitting configurado para las rutas?
- ¿Las imágenes están optimizadas (logo.jpg, multicentro-logo.jpg)?
- ¿Hay componentes cargados de forma síncrona que deberían ser lazy?
- ¿El bundle final es razonable (< 500KB gzipped para la carga inicial)?
- ¿Supabase se inicializa correctamente sin bloquear el render?
- ¿Hay re-renders innecesarios por Context mal estructurado?
- ¿Los PDFs se generan en el cliente o en el servidor? (impacto en rendimiento)
- ¿Hay memoización donde es necesario (useMemo, useCallback, React.memo)?
```

---

### 👤 ROL 12 — ESPECIALISTA EN ACCESIBILIDAD (a11y)
**Responsabilidad:** Cumplimiento WCAG 2.1 nivel AA.

```
Lee y analiza:
- src/components/ (todos los componentes de UI)
- src/pages/ (todas las páginas)
- index.html
- src/App.css, src/index.css

Evalúa:
- ¿Hay suficiente contraste de color en textos e iconos?
- ¿Los formularios tienen labels asociados correctamente?
- ¿La navegación por teclado funciona en todos los flujos críticos?
- ¿Los modales y dialogs tienen focus trap y aria attributes correctos?
- ¿Las imágenes tienen alt text descriptivo?
- ¿Los botones tienen texto descriptivo (no solo iconos)?
- ¿Hay skip navigation links?
- ¿Los estados de error se comunican a lectores de pantalla (aria-live)?
- ¿El proceso de firma es accesible para usuarios con discapacidad?
```

---

### 👤 ROL 13 — EXPERTO EN INTERNACIONALIZACIÓN (i18n)
**Responsabilidad:** Validar soporte multiidioma y localización.

```
Lee y analiza:
- src/locales/ (todos los archivos de traducción)
- src/App.tsx (configuración i18n)
- src/components/ y src/pages/ (uso de traducciones)

Evalúa:
- ¿Todas las cadenas de texto visibles están externalizadas en archivos de traducción?
- ¿Hay textos hardcodeados en español o inglés que deberían estar en i18n?
- ¿Las traducciones están completas para todos los idiomas soportados?
- ¿Los formatos de fecha, número y moneda se adaptan al locale?
- ¿Los mensajes de error también están traducidos?
- ¿El cambio de idioma funciona sin recargar la página?
- ¿Las URLs son amigables para SEO en cada idioma?
```

---

### 👤 ROL 14 — ESPECIALISTA SEO Y META
**Responsabilidad:** Optimización para motores de búsqueda.

```
Lee y analiza:
- index.html
- dist/index.html
- public/robots.txt
- public/sitemap.xml (o dist/sitemap.xml)
- src/App.tsx (gestión de títulos y meta tags por ruta)
- vite.config.ts

Evalúa:
- ¿Cada página tiene un title y description únicos y descriptivos?
- ¿Hay Open Graph tags para compartir en redes sociales?
- ¿El robots.txt es correcto (no bloquea recursos necesarios)?
- ¿El sitemap.xml está actualizado con todas las páginas públicas?
- ¿La app es crawleable por Google? (SPA sin SSR puede tener problemas)
- ¿Hay canonical URLs configuradas?
- ¿Los Core Web Vitals (LCP, CLS, FID) son aceptables?
- ¿Se necesita SSR o prerendering para mejorar el SEO?
```

---

### 👤 ROL 15 — EXPERTO EN GESTIÓN DE ERRORES
**Responsabilidad:** Robustez ante fallos y experiencia de usuario en errores.

```
Lee y analiza:
- src/App.tsx (Error Boundaries)
- src/pages/ (manejo de errores en páginas)
- src/hooks/ (manejo de errores en hooks)
- supabase/functions/ (manejo de errores en Edge Functions)
- lib/ (manejo de errores en funciones críticas)

Evalúa:
- ¿Hay Error Boundaries en la aplicación React?
- ¿Qué pasa si Supabase no está disponible? ¿El usuario recibe feedback útil?
- ¿Qué pasa si el TSA server falla durante una firma?
- ¿Los errores se logean a algún servicio (Sentry, LogRocket)?
- ¿Las Edge Functions devuelven errores con formatos consistentes?
- ¿Los mensajes de error son comprensibles para el usuario final?
- ¿Hay reintentos automáticos para operaciones críticas?
- ¿Los errores de red se manejan con exponential backoff?
```

---

### 👤 ROL 16 — EXPERTO EN AUTENTICACIÓN Y AUTORIZACIÓN
**Responsabilidad:** Seguridad del sistema de usuarios y sesiones.

```
Lee y analiza:
- src/context/ (AuthContext o similar)
- src/hooks/ (hooks de autenticación)
- src/pages/ (páginas de login, registro, recuperación)
- lib/supabase.ts
- supabase/schema.sql (tablas de usuarios)
- supabase/functions/ (funciones con auth)

Evalúa:
- ¿Las rutas privadas están correctamente protegidas?
- ¿El token de sesión se maneja de forma segura?
- ¿Hay protección contra CSRF?
- ¿El refresh de tokens funciona correctamente?
- ¿Qué pasa si el usuario abre la app en múltiples pestañas?
- ¿Hay rate limiting en los intentos de login?
- ¿El logout limpia correctamente toda la sesión?
- ¿Los roles y permisos están bien implementados?
```

---

### 👤 ROL 17 — EXPERTO EN INTEGRACIONES EXTERNAS
**Responsabilidad:** Validar todas las integraciones con terceros.

```
Lee y analiza:
- src/integrations/ (todos los archivos)
- docs/firmaclara-n8n-flows.md
- lib/tsa.ts (integración TSA)
- supabase/functions/ (llamadas a APIs externas)
- package.json (SDKs de terceros)

Evalúa:
- ¿Todas las integraciones externas tienen manejo de errores?
- ¿Las API keys de terceros están correctamente securizadas?
- ¿Hay timeouts configurados para llamadas externas?
- ¿Qué pasa si un servicio externo está caído?
- ¿Las integraciones están correctamente testeadas?
- ¿Hay dependencia de servicios sin SLA garantizado?
- ¿Los webhooks están validados con firma HMAC?
```

---

### 👤 ROL 18 — AUDITOR DE DEPENDENCIAS Y SUPPLY CHAIN
**Responsabilidad:** Seguridad y salud del ecosistema de paquetes.

```
Lee y analiza:
- package.json
- package-lock.json
- bun.lockb

Evalúa:
- ¿Hay dependencias con vulnerabilidades conocidas? (npm audit)
- ¿Hay dependencias desactualizadas con versiones mayores disponibles?
- ¿Hay dependencias abandonadas o sin mantenimiento?
- ¿Las versiones están pinned correctamente para reproducibilidad?
- ¿Hay dependencias de desarrollo que se están incluyendo en producción?
- ¿El tamaño total de node_modules es razonable?
- ¿Hay duplicados de dependencias que aumentan el bundle?
- ¿Se usa bun o npm? ¿Es consistente en todo el equipo?
```

---

### 👤 ROL 19 — EXPERTO EN DISEÑO RESPONSIVO Y MÓVIL
**Responsabilidad:** Experiencia en dispositivos móviles y tablets.

```
Lee y analiza:
- src/App.css
- src/index.css
- tailwind.config.ts
- src/components/ (componentes con layout)
- src/pages/ (páginas completas)

Evalúa:
- ¿El proceso de firma funciona correctamente en móvil?
- ¿Los formularios son usables en pantallas pequeñas?
- ¿Los PDFs son visualizables en móvil?
- ¿Los breakpoints de Tailwind están bien usados?
- ¿Hay elementos con overflow horizontal en móvil?
- ¿Los touch targets (botones) tienen tamaño mínimo de 44px?
- ¿El teclado virtual en móvil no rompe el layout?
- ¿La app funciona en modo landscape en tablets?
```

---

### 👤 ROL 20 — EXPERTO EN EMAILS TRANSACCIONALES
**Responsabilidad:** Calidad y deliverability de los emails del sistema.

```
Lee y analiza:
- supabase/email_templates.md
- src/pages/ y src/components/ (triggers de envío de emails)
- supabase/functions/ (funciones que envían emails)
- docs/contract-resend-behavior.md

Evalúa:
- ¿Los templates de email tienen diseño responsivo?
- ¿Los emails incluyen versión en texto plano (para deliverability)?
- ¿El comportamiento de reenvío de contratos es correcto?
- ¿Hay protección contra envío duplicado de emails?
- ¿Los SPF, DKIM y DMARC están configurados?
- ¿Los emails de firma incluyen el contrato adjunto correctamente?
- ¿Los links en emails son seguros y con tracking apropiado?
- ¿Hay un proceso para emails que rebotan?
```

---

### 👤 ROL 21 — EXPERTO EN DOCUMENTACIÓN TÉCNICA
**Responsabilidad:** Calidad y completitud de la documentación.

```
Lee y analiza:
- README.md
- CLAUDE.md
- docs/ (todos los archivos .md)
- supabase/email_templates.md
- scripts/ (comentarios en scripts)

Evalúa:
- ¿El README explica cómo arrancar el proyecto desde cero?
- ¿Las Edge Functions están documentadas?
- ¿El esquema de base de datos está documentado?
- ¿Hay documentación de la API interna?
- ¿Los flujos de negocio están documentados para el equipo?
- ¿Está documentado el proceso de deploy?
- ¿Los secretos necesarios están listados (sin sus valores)?
- ¿Hay documentación de troubleshooting para errores comunes?
```

---

### 👤 ROL 22 — EXPERTO EN MONITORIZACIÓN Y OBSERVABILIDAD
**Responsabilidad:** Visibilidad del sistema en producción.

```
Lee y analiza:
- package.json (dependencias de monitoring)
- supabase/functions/ (logging en funciones)
- src/App.tsx y src/main.tsx (setup de monitoring)
- vercel.json (configuración de analytics)

Evalúa:
- ¿Hay un servicio de error tracking configurado? (Sentry, Bugsnag)
- ¿Hay analytics de usuario configurados? (Mixpanel, PostHog, GA4)
- ¿Los logs de Edge Functions son accesibles y estructurados?
- ¿Hay alertas configuradas para errores críticos?
- ¿Se monitoriza la latencia de la generación de PDFs?
- ¿Hay dashboards para métricas de negocio? (firmas completadas, créditos consumidos)
- ¿Se monitorizan las llamadas al TSA externo?
- ¿Hay uptime monitoring configurado?
```

---

### 👤 ROL 23 — EXPERTO EN CONFIGURACIÓN DE ENTORNOS
**Responsabilidad:** Gestión correcta de variables de entorno y secretos.

```
Lee y analiza:
- .env (estructura, sin valores sensibles)
- .env.local
- vite.config.ts (exposición de variables al cliente)
- supabase/config.toml
- scripts/setup_secrets.ps1
- vercel.json

Evalúa:
- ¿Las variables de entorno están separadas por entorno (dev/prod)?
- ¿Hay secretos expuestos al cliente que deberían estar solo en el servidor?
- ¿Las variables VITE_ son solo las necesarias? (se exponen al browser)
- ¿Hay valores hardcodeados que deberían ser variables de entorno?
- ¿El .env está en .gitignore?
- ¿Hay un .env.example documentado para nuevos desarrolladores?
- ¿Las Edge Functions tienen acceso correcto a los secretos de Supabase?
```

---

### 👤 ROL 24 — EXPERTO EN LEGALIDAD DE SOFTWARE (LICENCIAS)
**Responsabilidad:** Cumplimiento de licencias de software.

```
Lee y analiza:
- package.json (todas las dependencias)
- package-lock.json

Evalúa:
- ¿Hay dependencias con licencias incompatibles con uso comercial? (GPL, AGPL)
- ¿Hay dependencias con licencias que requieren attribution visible?
- ¿Se necesita un archivo NOTICE o THIRD-PARTY-LICENSES?
- ¿Las licencias de fuentes tipográficas usadas permiten uso comercial?
- ¿Los logos de terceros (multicentro-logo.jpg) tienen autorización de uso?
- ¿Hay código copiado de Stack Overflow sin atribución adecuada?
```

---

### 👤 ROL 25 — EXPERTO EN CONTINUIDAD DE NEGOCIO
**Responsabilidad:** Plan de contingencia y recuperación ante desastres.

```
Lee y analiza:
- docs/firmaclara-prd.md
- docs/firmaclara_super_prd.md
- supabase/config.toml
- vercel.json
- scripts/deploy_functions.ps1

Evalúa:
- ¿Hay backups automáticos de la base de datos?
- ¿Cuál es el RTO (Recovery Time Objective) si Supabase cae?
- ¿Cuál es el RPO (Recovery Point Objective)?
- ¿Los contratos firmados tienen copia en almacenamiento redundante?
- ¿Hay un proceso documentado para migrar a otro proveedor si Vercel/Supabase falla?
- ¿Los documentos firmados son válidos sin depender de la plataforma?
- ¿Hay un proceso para exportar todos los datos de un cliente?
```

---

### 👤 ROL 26 — EXPERTO EN UX / EXPERIENCIA DE USUARIO
**Responsabilidad:** Usabilidad y claridad del flujo de firma.

```
Lee y analiza:
- src/pages/ (flujo completo de usuario)
- src/components/ (componentes de UI)
- docs/firmaclara-lovable-guide.md
- docs/firmaclara-antigravity-guide.md
- e2e/user-journey.spec.ts (para entender el flujo esperado)

Evalúa:
- ¿El proceso de firma es claro e intuitivo para un usuario no técnico?
- ¿Los estados de carga son claros? (la generación de PDF puede tardar)
- ¿Los mensajes de éxito y error son comprensibles?
- ¿Hay confirmaciones antes de acciones irreversibles?
- ¿El usuario sabe en todo momento en qué paso del proceso está?
- ¿Los formularios tienen validación en tiempo real y mensajes útiles?
- ¿La primera experiencia de usuario (onboarding) está bien diseñada?
- ¿Qué pasa si el usuario recarga la página a mitad de un proceso de firma?
```

---

### 👤 ROL 27 — EXPERTO EN SCRIPTS Y AUTOMATIZACIÓN
**Responsabilidad:** Validar scripts de operación y mantenimiento.

```
Lee y analiza:
- scripts/check.ts
- scripts/check-production.js
- scripts/deploy_functions.ps1
- scripts/setup_secrets.ps1
- scripts/generate_pdf.cjs
- scripts/verify_rls.js
- scripts/db/ (todos los archivos)
- package.json (scripts npm/bun)

Evalúa:
- ¿Los scripts de deploy son idempotentes?
- ¿El script de check-production verifica todo lo necesario?
- ¿Hay scripts de rollback?
- ¿Los scripts de base de datos son seguros para ejecutar en producción?
- ¿El script verify_rls confirma correctamente todas las políticas?
- ¿Los scripts tienen manejo de errores apropiado?
- ¿Hay scripts de seed/fixture para datos de prueba que no deberían ejecutarse en prod?
```

---

### 👤 ROL 28 — EXPERTO EN VALIDACIÓN DE CONTRATO DIGITAL
**Responsabilidad:** Validez legal de los contratos generados.

```
Lee y analiza:
- lib/pdf.ts
- lib/certificate.ts
- lib/tsa.ts
- lib/crypto.ts
- docs/contract-resend-behavior.md
- supabase/email_templates.md

Evalúa:
- ¿El contrato generado incluye todos los elementos legalmente requeridos?
- ¿La identidad del firmante queda vinculada al documento de forma irrefutable?
- ¿El timestamp TSA es de un proveedor acreditado? (ETSI TS 119 421)
- ¿El PDF/A cumple el estándar de archivado a largo plazo?
- ¿Hay un sistema de verificación pública del contrato firmado?
- ¿El contrato incluye IP del firmante, user-agent, geolocalización (si aplica)?
- ¿Se pueden verificar las firmas sin necesidad de la plataforma?
- ¿Los metadatos del PDF no exponen información sensible?
```

---

### 👤 ROL 29 — EXPERTO EN ESCALABILIDAD
**Responsabilidad:** Capacidad del sistema para crecer.

```
Lee y analizar:
- supabase/schema.sql (índices, relaciones)
- supabase/functions/ (funciones con queries)
- lib/supabase.ts
- vite.config.ts
- vercel.json

Evalúa:
- ¿El plan de Supabase es adecuado para la carga esperada en producción?
- ¿Las queries tienen índices para evitar full table scans?
- ¿Las Edge Functions pueden manejar picos de carga?
- ¿Hay límites en el tamaño de PDFs que se pueden generar?
- ¿El sistema de créditos escala bien con miles de usuarios concurrentes?
- ¿Vercel tiene configurado el auto-scaling correctamente?
- ¿Hay un plan de capacity planning para los próximos 6 meses?
- ¿Las migraciones de base de datos son seguras con datos reales en producción?
```

---

### 👤 ROL 30 — DIRECTOR DE PRODUCCIÓN (GO/NO-GO)
**Responsabilidad:** Síntesis final y decisión de despliegue.

```
Después de leer los informes de los 29 expertos anteriores:

1. GENERA UN RESUMEN EJECUTIVO con:
   - Total de issues CRÍTICOS encontrados (bloquean el deploy)
   - Total de ADVERTENCIAS (deben corregirse en las próximas 2 semanas)
   - Total de MEJORAS (backlog)

2. LISTA ORDENADA POR PRIORIDAD de los 10 problemas más importantes a resolver

3. CHECKLIST GO/NO-GO:
   □ Seguridad: Sin vulnerabilidades críticas
   □ RLS: Todas las tablas protegidas correctamente
   □ Tests E2E: Pasando al 100% en el flujo de firma
   □ Variables de entorno: Correctamente configuradas en Vercel
   □ RGPD: Consentimientos y políticas implementados
   □ Firma digital: Cumple eIDAS
   □ Backups: Configurados y verificados
   □ Monitorización: Error tracking activo
   □ Performance: Bundle < 500KB, LCP < 2.5s
   □ Documentación: README actualizado

4. VEREDICTO FINAL:
   - ✅ GO: El sistema está listo para producción
   - ⚠️ GO CONDICIONAL: Puede desplegarse si se resuelven los issues X, Y, Z en 48h
   - 🚫 NO-GO: Hay issues críticos que impiden el despliegue seguro

5. PLAN DE ACCIÓN DE 72 HORAS si el veredicto no es GO completo:
   - Hora 0-24: Issues críticos (seguridad, datos)
   - Hora 24-48: Issues de negocio (firma, créditos)
   - Hora 48-72: Issues de experiencia (UX, performance)
```

---

## 📋 INSTRUCCIONES DE EJECUCIÓN PARA CLAUDE CODE

```
Ejecuta los 30 roles de forma secuencial. Para cada rol:

1. Anuncia el rol con: "=== ROL X: [NOMBRE] — Iniciando análisis ==="
2. Lee TODOS los archivos indicados usando Read File / Glob
3. Analiza en profundidad
4. Reporta usando el formato:
   [CRÍTICO] ❌ Descripción del problema → Solución concreta
   [ADVERTENCIA] ⚠️  Descripción → Solución recomendada
   [MEJORA] 💡 Descripción → Sugerencia
   [OK] ✅ Descripción de lo que está bien
5. Al finalizar cada rol: "=== ROL X: ANÁLISIS COMPLETADO ==="

Al finalizar los 30 roles, el ROL 30 genera el informe final consolidado.

No omitas ningún rol. No resumas superficialmente. 
Este es el análisis más importante antes del lanzamiento de FirmaClara.
Cada hallazgo puede impactar a usuarios reales con documentos legales.
```

---

## 🎯 RESULTADO ESPERADO

Al ejecutar este prompt en Claude Code obtendrás:
- **~30 informes especializados** con hallazgos concretos y accionables
- **Un informe ejecutivo final** con veredicto GO/NO-GO
- **Un plan de acción priorizado** para los próximos 3 días
- **Un checklist** verificable antes del primer deploy a producción

---

*Generado por OperaiaTech para el proyecto FirmaClara — Auditoría Pre-Producción v1.0*
