# FirmaClara — Plan de Correcciones Post-Auditoría

> **For agentic workers:** REQUIRED: Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corregir los 15 hallazgos de la auditoría de junio 2026, ordenados por impacto legal/negocio.

**Architecture:** SPA React + Vite. Backend Supabase (PostgreSQL + Edge Functions). Deploy Vercel. No hay SSR: todos los cambios son client-side salvo las migraciones SQL y la configuración de `vercel.json`.

**Tech Stack:** React 18, React Router 7, TanStack Query 5, Tailwind CSS 3, shadcn/ui, Supabase JS, Stripe, i18next.

---

## ESTADO DEL CÓDIGO (hallazgos de la revisión)

Antes de ejecutar, ten en cuenta lo que ya está resuelto y lo que no:

| Task | Estado real en código |
|------|-----------------------|
| TASK-02 (cookies) | ✅ Clarity y Sentry YA están correctamente gateados por consentimiento (`CookieConsent.tsx` + `main.tsx`). Pero Sentry no se activa mid-session si el usuario consiente en esta visita. Mejora requerida. |
| TASK-04 (N+1) | ⚠️ Ya usa `Promise.all` con 3 queries paralelas. No es N+1 real, pero se puede mejorar con 1 RPC. |
| TASK-08 (créditos UI) | ✅ `PlanUsageCard` ya muestra cuota, créditos de pack y fecha de renovación. Solo ajuste de texto. |

---

## BLOQUE 1 — CRÍTICO LEGAL (ejecutar primero)

---

### TASK-01 · Aviso Legal conforme al Art. 10 LSSI

**Archivos:**
- Crear: `src/pages/AvisoLegal.tsx`
- Modificar: `src/App.tsx` (añadir ruta y redirect)
- Modificar: `src/components/layout/Footer.tsx` (enlace en columna Legal)

**Contexto:** `/legal` sirve contenido SEO (FAQ de validez eIDAS) y debe mantenerse. Crear `/aviso-legal` con los datos obligatorios del Art. 10 LSSI. El footer actualmente tiene `LegalModals` para Términos/Privacidad y un `<Link to="/legal">` — añadir enlace "Aviso Legal" a `/aviso-legal`.

- [ ] **Paso 1: Crear `src/pages/AvisoLegal.tsx`**

```tsx
export default function AvisoLegal() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-16">
      <h1 className="mb-2 text-3xl font-bold">Aviso Legal</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Información obligatoria conforme al Art. 10 de la Ley 34/2002 de Servicios
        de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE)
      </p>

      <div className="prose prose-slate max-w-none text-slate-600 space-y-8">

        <section>
          <h2 className="text-xl font-semibold text-slate-800">1. Titular del sitio web</h2>
          <ul className="list-none space-y-1 mt-2">
            <li><strong>Denominación social:</strong> Operia Soluciones Inteligentes, S.L.</li>
            <li><strong>NIF/CIF:</strong> B26772665</li>
            <li>
              <strong>Domicilio social:</strong> Av. de les Corts Catalanes, 5,
              08173 Sant Cugat del Vallès (Barcelona), España
            </li>
            <li>
              <strong>Datos registrales:</strong> Inscrita en el Registro Mercantil de
              Barcelona (pendiente de completar con tomo, folio y hoja)
            </li>
            <li>
              <strong>Email:</strong>{" "}
              <a href="mailto:contacto@operiatech.es" className="text-blue-600 hover:underline">
                contacto@operiatech.es
              </a>
            </li>
            <li><strong>Teléfono:</strong> 936 940 749</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">2. Objeto y ámbito de aplicación</h2>
          <p>
            El presente Aviso Legal regula el acceso y uso del sitio web{" "}
            <a href="https://firmaclara.es" className="text-blue-600 hover:underline">
              firmaclara.es
            </a>{" "}
            y sus subdominios, titularidad de Operia Soluciones Inteligentes, S.L.
            (en adelante, "FirmaClara" o "el titular").
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">3. Propiedad intelectual e industrial</h2>
          <p>
            Todos los contenidos del sitio web, incluyendo textos, imágenes, logotipos,
            iconos, código fuente y diseño gráfico, son propiedad exclusiva del titular o de
            sus licenciantes, y están protegidos por la legislación española e internacional
            de propiedad intelectual e industrial.
          </p>
          <p className="mt-2">
            Queda prohibida su reproducción, distribución, comunicación pública o
            transformación sin autorización expresa y por escrito del titular.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">4. Exclusión de garantías y responsabilidad</h2>
          <p>
            El titular no se responsabiliza de los daños o perjuicios que pudieran derivarse
            del uso del sitio web, de la imposibilidad de acceso al mismo, de los fallos en
            las transmisiones de datos o de las interrupciones del servicio por causas ajenas
            al control del titular.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">5. Política de privacidad y cookies</h2>
          <p>
            El tratamiento de los datos personales recabados a través del sitio web se regula
            en la{" "}
            <a href="/privacy" className="text-blue-600 hover:underline">
              Política de Privacidad
            </a>{" "}
            y en la{" "}
            <a href="/privacy#cookies" className="text-blue-600 hover:underline">
              Política de Cookies
            </a>
            , de conformidad con el RGPD (UE) 2016/679 y la LOPD-GDD 3/2018.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">6. Condiciones de uso del servicio</h2>
          <p>
            El uso del servicio de firma electrónica de FirmaClara se rige por los{" "}
            <a href="/terms" className="text-blue-600 hover:underline">
              Términos y Condiciones de Uso
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">7. Ley aplicable y jurisdicción</h2>
          <p>
            El presente Aviso Legal se rige por la legislación española. Para cualquier
            controversia derivada del acceso o uso del sitio web, las partes se someten,
            con renuncia expresa a cualquier otro fuero, a la jurisdicción de los Juzgados
            y Tribunales de Barcelona.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-slate-800">8. Modificaciones</h2>
          <p>
            El titular se reserva el derecho de modificar el presente Aviso Legal en cualquier
            momento. Los cambios serán efectivos desde su publicación en el sitio web.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Última actualización: junio de 2026
          </p>
        </section>

      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Añadir ruta `/aviso-legal` y redirect desde `/legal-notice` en `src/App.tsx`**

En el bloque `<Route element={<PublicLayout />}>`, añadir ANTES de `</Route>`:

```tsx
// Importar al inicio del archivo junto al resto de lazy:
const AvisoLegal = lazy(() => import("@/pages/AvisoLegal"));

// En las rutas públicas, dentro de <Route element={<PublicLayout />}>:
<Route path="/aviso-legal" element={<AvisoLegal />} />
<Route path="/legal-notice" element={<Navigate to="/aviso-legal" replace />} />
// NOTA: /legal se mantiene (contenido SEO de validez eIDAS)
```

- [ ] **Paso 3: Añadir enlace en el footer (`src/components/layout/Footer.tsx`)**

En la columna "Legal y Cumplimiento", añadir ANTES del primer `<li>` de `LegalModal`:

```tsx
<li>
  <Link to="/aviso-legal" className="text-slate-400 hover:text-white transition-colors">
    Aviso Legal
  </Link>
</li>
```

- [ ] **Paso 4: Completar datos registrales**

Obtener del Registro Mercantil: Tomo, Folio, Sección y Hoja de inscripción de Operia Soluciones Inteligentes, S.L. y rellenar el placeholder en `AvisoLegal.tsx`.

- [ ] **Paso 5: Verificar en local**

Navegar a `/aviso-legal` y confirmar que muestra los datos correctos. Navegar a `/legal-notice` y confirmar que redirige a `/aviso-legal`.

- [ ] **Paso 6: Commit**

```bash
git add src/pages/AvisoLegal.tsx src/App.tsx src/components/layout/Footer.tsx
git commit -m "legal: add /aviso-legal page (LSSI Art. 10) and footer link"
```

---

### TASK-02 · Mejoras al banner de cookies (LSSI Art. 22)

**Archivos:**
- Modificar: `src/main.tsx` (activar Sentry tras consentimiento in-session)
- Modificar: `src/components/CookieConsent.tsx` (añadir anchor `#cookies` y activar Sentry en callback)
- Modificar: `src/pages/Privacy.tsx` (añadir sección Política de Cookies con anchor)

**Contexto:** Clarity y Sentry YA están gateados por consentimiento. El problema real: si el usuario consiente en la sesión actual, Sentry no se activa hasta la siguiente carga de página. Mejora: escuchar el evento `cookieConsentUpdated` en main.tsx y re-inicializar Sentry.

- [ ] **Paso 1: Escuchar el evento de consentimiento en `src/main.tsx`**

```tsx
// Añadir DESPUÉS de Sentry.init({...}):

// Activa Sentry en la misma sesión si el usuario consiente por primera vez.
window.addEventListener('cookieConsentUpdated', (e: Event) => {
  const consent = (e as CustomEvent).detail;
  if (consent?.analytics === true && import.meta.env.PROD) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.MODE,
      enabled: true,
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
  }
});
```

- [ ] **Paso 2: Actualizar el enlace de privacidad en `CookieConsent.tsx`**

Cambiar `<Link to="/privacy">` por `<Link to="/privacy#cookies">` para que enlace directamente a la sección de cookies:

```tsx
// Línea ~84 en CookieConsent.tsx:
<Link to="/privacy#cookies" className="text-blue-600 hover:underline">
  Política de cookies
</Link>
```

- [ ] **Paso 3: Añadir sección "Política de Cookies" en `src/pages/Privacy.tsx`**

Al final del documento, añadir una nueva sección con id `cookies`:

```tsx
<section id="cookies">
  <h2 className="text-xl font-semibold text-slate-800">
    11. Política de Cookies
  </h2>
  <p>
    FirmaClara usa los siguientes tipos de cookies:
  </p>
  <div className="overflow-x-auto mt-4">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-100">
          <th className="text-left p-2 border border-slate-200 font-semibold">Categoría</th>
          <th className="text-left p-2 border border-slate-200 font-semibold">Proveedor</th>
          <th className="text-left p-2 border border-slate-200 font-semibold">Finalidad</th>
          <th className="text-left p-2 border border-slate-200 font-semibold">Base legal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="p-2 border border-slate-200">Necesarias</td>
          <td className="p-2 border border-slate-200">Supabase</td>
          <td className="p-2 border border-slate-200">Sesión autenticada (JWT en localStorage)</td>
          <td className="p-2 border border-slate-200">Art. 6.1.b RGPD — ejecución del contrato</td>
        </tr>
        <tr className="bg-slate-50">
          <td className="p-2 border border-slate-200">Analíticas</td>
          <td className="p-2 border border-slate-200">Microsoft Clarity (Microsoft Corp., EE. UU.)</td>
          <td className="p-2 border border-slate-200">Grabaciones de sesión, mapas de calor, análisis de comportamiento</td>
          <td className="p-2 border border-slate-200">Art. 6.1.a RGPD — consentimiento explícito</td>
        </tr>
        <tr>
          <td className="p-2 border border-slate-200">Analíticas</td>
          <td className="p-2 border border-slate-200">Sentry (Functional Software, EE. UU.)</td>
          <td className="p-2 border border-slate-200">Monitorización de errores técnicos</td>
          <td className="p-2 border border-slate-200">Art. 6.1.a RGPD — consentimiento explícito</td>
        </tr>
        <tr className="bg-slate-50">
          <td className="p-2 border border-slate-200">Marketing</td>
          <td className="p-2 border border-slate-200">—</td>
          <td className="p-2 border border-slate-200">Actualmente no se usan cookies de publicidad o retargeting</td>
          <td className="p-2 border border-slate-200">—</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p className="mt-4">
    Las cookies analíticas solo se activan tras tu consentimiento explícito. Puedes
    revocar o modificar tus preferencias en cualquier momento haciendo clic en "Configurar cookies"
    en el pie de página, o borrando los datos del navegador (clave: <code>firmaclara_cookie_consent</code>).
  </p>
</section>
```

- [ ] **Paso 4: Añadir enlace "Configurar cookies" en el footer**

En `Footer.tsx`, bajo la columna "Legal y Cumplimiento", añadir:

```tsx
<li>
  <button
    className="text-slate-400 hover:text-white transition-colors"
    onClick={() => {
      localStorage.removeItem('firmaclara_cookie_consent');
      window.location.reload();
    }}
  >
    Configurar cookies
  </button>
</li>
```

- [ ] **Paso 5: Commit**

```bash
git add src/main.tsx src/components/CookieConsent.tsx src/pages/Privacy.tsx src/components/layout/Footer.tsx
git commit -m "privacy: activate Sentry mid-session on consent, add cookie policy section"
```

---

## BLOQUE 2 — BUG CRÍTICO UX

---

### TASK-03 · Fix freeze en `/documents/new` en navegación directa

**Archivos:**
- Modificar: `src/pages/NewDocument.tsx` (añadir AbortController + timeout en loadDraft y loadTemplate)

**Contexto:** Los `useEffect` de `loadDraft` y `loadTemplate` (líneas ~160-217 y ~222-271 en NewDocument.tsx) hacen queries a Supabase sin AbortController ni timeout. Si la sesión no está hidratada aún, la query puede quedar pendiente indefinidamente. Además, `useCredits()` y `usePlanStatus()` tienen `enabled: !!user`, por lo que esperan al usuario — si el AuthContext tarda, el spinner no se muestra correctamente.

- [ ] **Paso 1: Envolver loadDraft con AbortController y timeout**

Reemplazar el `useEffect` de `draftId` (líneas 160-217):

```tsx
useEffect(() => {
  if (!draftId) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const loadDraft = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', draftId)
        .abortSignal(controller.signal)
        .single();

      if (error) {
        if (error.name === 'AbortError') return; // timeout silencioso
        toast.error("Error al cargar el borrador");
        if (import.meta.env.DEV) console.error(error);
        return;
      }

      if (data) {
        const draft = data as any;
        setTitle(draft.title || '');
        setSignerName(draft.signer_name || '');
        setSignerEmail(draft.signer_email || '');
        setSignerNif(draft.signer_tax_id || '');
        setSignerAddress(draft.signer_address || '');
        setSignerPhone(draft.signer_phone || '');
        setCustomMessage(draft.custom_message || '');

        if (typeof draft.signature_page === 'number') setSignaturePage(draft.signature_page);
        if (typeof draft.signature_x === 'number') setSignatureX(draft.signature_x);
        if (typeof draft.signature_y === 'number') setSignatureY(draft.signature_y);

        if (draft.signature_page === 0) setSignaturePosition("new_page");
        else if (typeof draft.signature_page === 'number' && draft.signature_page > 0) setSignaturePosition("custom");
        else setSignaturePosition("last_page");

        if (draft.security_level) {
          setSecurityLevel(draft.security_level);
          setWhatsappVerification(draft.security_level === 'whatsapp_otp');
        }

        if (draft.file_url) {
          setDraftFileUrl(draft.file_url);
          setFile(new File([], draft.title ? `${draft.title}.pdf` : "documento_guardado.pdf", { type: "application/pdf" }));
          setStep('signer');
          setDocType('otro');
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      toast.error("Error al cargar el borrador");
      if (import.meta.env.DEV) console.error(err);
    } finally {
      clearTimeout(timeout);
    }
  };

  loadDraft();
  return () => { controller.abort(); clearTimeout(timeout); };
}, [draftId]);
```

- [ ] **Paso 2: Envolver loadTemplate con AbortController y timeout**

Reemplazar el `useEffect` de `templateId` (líneas 222-271) de forma análoga:

```tsx
useEffect(() => {
  if (!templateId) return;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  const loadTemplate = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('id', templateId)
        .abortSignal(controller.signal)
        .single();

      if (error || !data) {
        if (error?.name === 'AbortError') return;
        toast.error("No se pudo cargar la plantilla");
        if (import.meta.env.DEV) console.error(error);
        return;
      }

      const tpl = data as any;
      setTitle(tpl.title || '');
      setSignerName(tpl.signer_name || '');
      setSignerEmail(tpl.signer_email || '');
      setSignerNif(tpl.signer_tax_id || '');
      setSignerAddress(tpl.signer_address || '');
      setSignerPhone(tpl.signer_phone || '');
      setCustomMessage(tpl.custom_message || '');

      if (typeof tpl.signature_page === 'number') setSignaturePage(tpl.signature_page);
      if (typeof tpl.signature_x === 'number') setSignatureX(tpl.signature_x);
      if (typeof tpl.signature_y === 'number') setSignatureY(tpl.signature_y);
      if (tpl.signature_page === 0) setSignaturePosition("new_page");
      else if (typeof tpl.signature_page === 'number' && tpl.signature_page > 0) setSignaturePosition("custom");
      else setSignaturePosition("last_page");

      if (tpl.security_level) {
        setSecurityLevel(tpl.security_level);
        setWhatsappVerification(tpl.security_level === 'whatsapp_otp');
      }

      if (tpl.file_url) {
        setDraftFileUrl(tpl.file_url);
        setFile(new File([], tpl.title ? `${tpl.title}.pdf` : "documento.pdf", { type: "application/pdf" }));
        setDocType('otro');
        setStep('signer');
      }

      toast.success("Plantilla cargada. Revisa el firmante y envía.");
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      toast.error("No se pudo cargar la plantilla");
      if (import.meta.env.DEV) console.error(err);
    } finally {
      clearTimeout(timeout);
    }
  };

  loadTemplate();
  return () => { controller.abort(); clearTimeout(timeout); };
}, [templateId]);
```

- [ ] **Paso 3: Añadir estado de carga visible para navegación directa con draftId/templateId**

Al inicio del `return` de `NewDocument`, añadir spinner condicional mientras carga borrador/plantilla:

```tsx
// Añadir estado en el componente:
const [isDraftLoading, setIsDraftLoading] = useState(!!draftId || !!templateId);

// Dentro del renderStep(), antes del switch:
// Añadir al inicio de loadDraft y loadTemplate: setIsDraftLoading(true) al principio y setIsDraftLoading(false) en finally

// En el return del componente, añadir ANTES de <Card>:
{isDraftLoading && (
  <div className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <p className="text-sm">Cargando documento…</p>
  </div>
)}
```

- [ ] **Paso 4: Verificar manualmente**

Abrir una nueva pestaña del navegador, pegar `http://localhost:8080/documents/new?draftId=XXXX` con un draftId real o inventado. Verificar:
- Con draftId válido: carga los datos y avanza al paso "Firmante".
- Con draftId inválido: muestra toast de error y no se queda en spinner infinito.
- Sin draftId: muestra el paso "Tipo" directamente.

- [ ] **Paso 5: Commit**

```bash
git add src/pages/NewDocument.tsx
git commit -m "fix: add AbortController+timeout to draft/template loaders, fix direct URL freeze"
```

---

## BLOQUE 3 — PERFORMANCE

---

### TASK-04 · Optimizar queries de conteo en dashboard

**Archivos:**
- Crear: migración SQL `supabase/migrations/YYYYMMDD_get_document_counts.sql`
- Modificar: `src/pages/Dashboard.tsx` (reemplazar 3 queries por 1 RPC)

**Contexto:** El dashboard actualmente usa `Promise.all` con 3 queries de conteo separadas (total, pending, signed). Consolidar en 1 RPC SQL que devuelve los 3 valores.

- [ ] **Paso 1: Crear la función RPC en Supabase**

Ejecutar en el SQL Editor de Supabase (proyecto `pmzfwwtgjvlvuawxguiw`):

```sql
-- Función para obtener los conteos de documentos del usuario actual en una sola query
CREATE OR REPLACE FUNCTION get_document_counts()
RETURNS TABLE(
  total   BIGINT,
  pending BIGINT,
  signed  BIGINT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT
    COUNT(*)                                                   AS total,
    COUNT(*) FILTER (WHERE status IN ('sent', 'viewed'))       AS pending,
    COUNT(*) FILTER (WHERE status = 'signed')                  AS signed
  FROM documents
  WHERE user_id = auth.uid()
    AND is_template = false;
$$;

-- Asegurar que solo usuarios autenticados pueden llamar la función
REVOKE ALL ON FUNCTION get_document_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_document_counts() TO authenticated;
```

Guardar también en `supabase/migrations/20260624_get_document_counts.sql`.

- [ ] **Paso 2: Reemplazar las 3 queries por la RPC en `src/pages/Dashboard.tsx`**

Reemplazar el query `['dashboard-documents-counts']` (líneas ~65-83):

```tsx
const { data: docCounts, error: countsError, status: countsStatus } = useQuery({
  queryKey: ['dashboard-documents-counts'] as const,
  queryFn: async () => {
    const { data, error } = await supabase.rpc('get_document_counts');
    if (error) throw error;
    const row = data?.[0] ?? { total: 0, pending: 0, signed: 0 };
    return {
      total: Number(row.total),
      pending: Number(row.pending),
      signed: Number(row.signed),
    };
  },
  enabled: !!user,
});
```

- [ ] **Paso 3: Verificar en local**

Cargar el dashboard. Abrir DevTools → Network. Verificar que solo hay 1 llamada RPC para los conteos en lugar de 3. Los números deben coincidir.

- [ ] **Paso 4: Commit**

```bash
git add supabase/migrations/20260624_get_document_counts.sql src/pages/Dashboard.tsx
git commit -m "perf: replace 3 count queries with single RPC get_document_counts"
```

---

### TASK-05 · Skeleton screens en rutas con carga lenta

**Archivos:**
- Crear: `src/components/skeletons/DashboardSkeleton.tsx`
- Crear: `src/components/skeletons/DocumentsSkeleton.tsx`
- Modificar: `src/App.tsx` (mejorar fallback de Suspense)
- Modificar: `src/pages/Dashboard.tsx` (mostrar skeleton mientras cargan los datos)

**Contexto:** El `PageLoader` en App.tsx muestra solo un spinner centrado. La experiencia percibida mejora notablemente con skeletons que muestran la forma del contenido.

- [ ] **Paso 1: Crear `src/components/skeletons/DashboardSkeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border shadow-sm bg-white">
            <CardContent className="flex items-center gap-3 p-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-8" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan usage card */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>

      {/* Recent documents */}
      <div className="space-y-3">
        <Skeleton className="h-6 w-40" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Crear `src/components/skeletons/DocumentsSkeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function DocumentsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-3 w-36" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Paso 3: Actualizar el fallback de Suspense en `src/App.tsx`**

Importar los skeletons y crear un fallback inteligente basado en la ruta. El modo más sencillo: usar el `DashboardSkeleton` como fallback genérico para el área autenticada.

```tsx
// Importar en App.tsx:
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";

// El Suspense existente envuelve todas las rutas. Cambiar el fallback:
<Suspense fallback={
  <div className="flex h-screen items-center justify-center p-6">
    <div className="w-full max-w-3xl">
      <DashboardSkeleton />
    </div>
  </div>
}>
```

- [ ] **Paso 4: Commit**

```bash
git add src/components/skeletons/ src/App.tsx
git commit -m "ux: add skeleton screens for dashboard and documents loading states"
```

---

## BLOQUE 4 — UX Y PRODUCTO

---

### TASK-06 · Seleccionar plantilla en Paso 2 del wizard

**Archivos:**
- Modificar: `src/pages/NewDocument.tsx` (añadir tab "Usar plantilla" en el case "upload")

**Contexto:** `NewDocument.tsx` ya soporta `?templateId=` en la URL. La mejora es añadir la selección de plantilla dentro del propio wizard en el paso "upload", sin salir a otra página.

- [ ] **Paso 1: Añadir estado de tab en `NewDocument.tsx`**

```tsx
// Añadir junto al resto de useState al inicio:
const [uploadTab, setUploadTab] = useState<"upload" | "template">("upload");
const [templates, setTemplates] = useState<Array<{ id: string; title: string; created_at: string }>>([]);
const [templatesLoading, setTemplatesLoading] = useState(false);
```

- [ ] **Paso 2: Cargar plantillas al montar (si el usuario va al tab de plantillas)**

```tsx
// Añadir useEffect:
useEffect(() => {
  if (uploadTab !== "template") return;
  const controller = new AbortController();
  setTemplatesLoading(true);

  supabase
    .from('documents')
    .select('id, title, created_at')
    .eq('is_template', true)
    .order('created_at', { ascending: false })
    .abortSignal(controller.signal)
    .then(({ data }) => setTemplates(data ?? []))
    .catch(() => setTemplates([]))
    .finally(() => setTemplatesLoading(false));

  return () => controller.abort();
}, [uploadTab]);
```

- [ ] **Paso 3: Reemplazar el `case "upload"` con tabs**

Al inicio del `case "upload":`, añadir el toggle:

```tsx
case "upload":
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Subir documento</h2>

      {/* Toggle Subir / Plantilla */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        <button
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            uploadTab === "upload"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setUploadTab("upload")}
        >
          Subir archivo
        </button>
        <button
          className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            uploadTab === "template"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setUploadTab("template")}
        >
          Usar plantilla
        </button>
      </div>

      {uploadTab === "upload" ? (
        /* ... contenido actual del dropzone y campo de título ... */
        <> {/* pegar aquí todo el contenido existente del case "upload" */ }</>
      ) : (
        /* Grid de plantillas */
        <div className="space-y-3">
          {templatesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No tienes plantillas guardadas todavía.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Guarda cualquier documento como plantilla desde su página de detalle.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  className="w-full flex items-center gap-3 rounded-lg border p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
                  onClick={() => navigate(`/documents/new?templateId=${tpl.id}`)}
                >
                  <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{tpl.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Guardada {formatDistanceToNow(new Date(tpl.created_at), { addSuffix: true, locale: es })}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
```

**NOTA:** Necesitarás añadir `import { formatDistanceToNow } from 'date-fns'` y `import { es } from 'date-fns/locale'` si no están ya (en `Dashboard.tsx` ya están).

- [ ] **Paso 4: Commit**

```bash
git add src/pages/NewDocument.tsx
git commit -m "feat: add template selection tab in document upload step"
```

---

### TASK-07 · Corregir mensaje "pocos créditos" en plan Gratis

**Archivos:**
- Modificar: `src/pages/Dashboard.tsx` (hacer el umbral plan-aware)

**Contexto:** `LOW_CREDITS_THRESHOLD = 5` en `constants.ts`. Para usuarios del plan Gratis (límite = 2 créditos de prueba), 2 < 5 = true, por lo que SIEMPRE ven "Te quedan pocos créditos (2)" aunque tengan la cuota completa intacta. Hay que hacer el umbral relativo al plan.

- [ ] **Paso 1: Calcular umbral relativo al plan en `Dashboard.tsx`**

El `planStatus` ya está disponible en el componente. Añadir lógica tras `const isProfesional`:

```tsx
// Umbral de aviso de saldo bajo, relativo al plan actual.
// Plan Gratis: límite 2 → umbral 0 (nunca avisa mientras quede cuota)
// Plan Básico: límite 10 → umbral 2
// Plan Profesional: overage, no aplica
const lowCreditsThreshold = (() => {
  if (!planStatus || isProfesional) return 0;
  const planLimit = planStatus.limite ?? 0;
  if (planLimit <= 2) return 0; // gratis: no avisar
  return Math.max(2, Math.floor(planLimit * 0.2));
})();
```

- [ ] **Paso 2: Usar el umbral dinámico en la condición de aviso**

Reemplazar en Dashboard.tsx la línea que referencia `LOW_CREDITS_THRESHOLD` (línea ~174):

```tsx
{/* Antes: credits <= LOW_CREDITS_THRESHOLD */}
{!loadingCredits && hasSentDocument && credits > 0 && lowCreditsThreshold > 0 && credits <= lowCreditsThreshold && !isProfesional && (
  // ... el Card de "Te quedan pocos créditos" existente ...
)}
```

- [ ] **Paso 3: Eliminar el import de LOW_CREDITS_THRESHOLD si ya no se usa**

```tsx
// Eliminar de los imports:
import { LOW_CREDITS_THRESHOLD } from "@/lib/constants";
```

- [ ] **Paso 4: Commit**

```bash
git add src/pages/Dashboard.tsx
git commit -m "fix: make low-credits warning threshold plan-aware (free plan never warns)"
```

---

### TASK-08 · Aclarar distinción entre firmas del plan y créditos adicionales

**Archivos:**
- Modificar: `src/components/plan/PlanUsageCard.tsx` (mejorar labels y tooltips)

**Contexto:** `PlanUsageCard` ya muestra los datos correctamente, pero la distinción entre "firmas incluidas en el plan" (cuota mensual) y "créditos de pack" (no caducan) no es obvia. Añadir subtext aclaratorio.

- [ ] **Paso 1: Mejorar el label de la cuota mensual**

En `PlanUsageCard.tsx`, el bloque "Firmas este mes" (líneas ~95-106):

```tsx
{/* Cuota mensual */}
<div className="space-y-1.5">
  <div className="flex items-center justify-between text-sm">
    <div>
      <span className="text-muted-foreground">Firmas incluidas en tu plan</span>
      {nextRenewal && (
        <p className="text-[11px] text-muted-foreground/70">
          Se renuevan el {format(nextRenewal, "d 'de' MMM", { locale: es })}
        </p>
      )}
    </div>
    <span className={cn("font-medium", nearLimit ? "text-amber-600" : "text-foreground")}>
      {firmas_usadas_mes}/{limite}
    </span>
  </div>
  <Progress value={pct} className={cn(nearLimit && "[&>div]:bg-amber-500")} />
</div>
```

- [ ] **Paso 2: Mejorar el label de créditos de pack**

```tsx
{firmas_creditos > 0 && (
  <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
    <div className="flex items-center gap-2 text-sm">
      <CreditCard className="h-4 w-4 text-primary shrink-0" />
      <div>
        <span className="font-semibold text-foreground">{firmas_creditos} créditos adicionales</span>
        <p className="text-xs text-muted-foreground">
          No caducan · se usan cuando se agota la cuota del plan
        </p>
      </div>
    </div>
  </div>
)}
```

- [ ] **Paso 3: Commit**

```bash
git add src/components/plan/PlanUsageCard.tsx
git commit -m "ux: clarify plan quota vs addon credits distinction in usage card"
```

---

### TASK-09 · Redirigir `/referrals` → `/invita`

**Archivos:**
- Modificar: `src/App.tsx`

- [ ] **Paso 1: Añadir la ruta de redirect en `src/App.tsx`**

En el bloque de rutas públicas (antes del `<Route element={<PublicLayout />}>`), añadir:

```tsx
{/* Redirect legacy URL /referrals → /invita */}
<Route path="/referrals" element={<Navigate to="/invita" replace />} />
```

- [ ] **Paso 2: Commit**

```bash
git add src/App.tsx
git commit -m "fix: redirect /referrals to /invita (301 equivalent)"
```

---

### TASK-10 · Corregir error gramatical en página Invita y Gana

**Archivos:**
- Modificar: `src/components/referral/ReferralStats.tsx` (línea 60)

**Contexto:** El `progressLabel` usa siempre "personas" aunque el número sea 1. Cuando `Math.max(1, ...) === 1` dice "1 personas" en lugar de "1 persona".

- [ ] **Paso 1: Añadir singular/plural en `ReferralStats.tsx`**

Reemplazar la línea 60:

```tsx
// Antes:
: `Invita a ${Math.max(1, Math.ceil((nextMilestone - stats.credits_earned) / 5))} personas más para ganar tus próximas 5 firmas`

// Después:
: (() => {
    const n = Math.max(1, Math.ceil((nextMilestone - stats.credits_earned) / 5));
    return `Invita a ${n} ${n === 1 ? 'persona' : 'personas'} más para ganar tus próximas 5 firmas`;
  })()
```

- [ ] **Paso 2: Commit**

```bash
git add src/components/referral/ReferralStats.tsx
git commit -m "fix: singular/plural 'persona/personas' in referral progress label"
```

---

## BLOQUE 5 — SEGURIDAD

---

### TASK-11 · Limpiar Content-Security-Policy

**Archivos:**
- Modificar: `vercel.json`

**Contexto:** El CSP actual tiene `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`. `unsafe-inline` es necesario porque Tailwind CSS genera estilos inline en algunos casos (animaciones, tema shadcn). Sin poder usar nonces en una SPA sin SSR, la opción pragmática es añadir un `report-uri` para monitorización y documentar que `unsafe-inline` es requerido por el stack.

**Mejoras reales posibles sin romper la app:**
1. Añadir `report-uri` para detectar violaciones CSP.
2. Añadir `Cross-Origin-Opener-Policy` y `Cross-Origin-Embedder-Policy`.
3. Añadir `Permissions-Policy` más restrictivo.

- [ ] **Paso 1: Actualizar `vercel.json` con mejoras CSP**

```json
{
  "key": "Content-Security-Policy",
  "value": "default-src 'self'; script-src 'self' 'sha256-aAHjYApLPGxXemC7sRYmhYbH/YTHLwH6eaaKr43Jbvg=' https://js.stripe.com https://m.stripe.network https://www.clarity.ms https://*.clarity.ms; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://*.supabase.co https://*.supabase.in https://*.clarity.ms; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co https://*.supabase.in https://api.stripe.com https://m.stripe.network https://*.clarity.ms https://c.bing.com https://o4509504567042048.ingest.sentry.io; frame-src 'self' https://js.stripe.com https://hooks.stripe.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; report-uri https://o4509504567042048.ingest.sentry.io/api/4509504567042048/security/?sentry_key=b11f7fe2a64feaf8b3daaa41f1e2ea44"
}
```

**NOTA:** Sustituir el `report-uri` por el endpoint real de Sentry CSP de tu proyecto. Se encuentra en Sentry → Security Headers → CSP.

También añadir headers de aislamiento:

```json
{
  "key": "Cross-Origin-Opener-Policy",
  "value": "same-origin-allow-popups"
},
{
  "key": "Cross-Origin-Resource-Policy",
  "value": "same-site"
}
```

**Por qué `same-origin-allow-popups` y no `same-origin`:** Stripe.js abre un popup para autenticación 3D Secure. Con `same-origin` strict, el popup no puede comunicarse con la página padre y Stripe falla.

- [ ] **Paso 2: Añadir Sentry al `connect-src`**

Verificar que `https://o4509504567042048.ingest.sentry.io` está en `connect-src` para que Sentry pueda enviar eventos.

- [ ] **Paso 3: Commit**

```bash
git add vercel.json
git commit -m "security: add CSP report-uri and CORP/COOP headers"
```

---

### TASK-12 · Sanitizar errores de Supabase expuestos al cliente

**Archivos:**
- Modificar: `src/integrations/supabase/client.ts` (o crear `src/lib/supabaseErrorHandler.ts`)

**Contexto:** Supabase devuelve mensajes de error que revelan nombres de funciones internas (e.g., `is_admin`). Hay que crear un wrapper que sanitice los mensajes antes de mostrarlos.

- [ ] **Paso 1: Crear `src/lib/supabaseErrorHandler.ts`**

```ts
// Convierte errores de Supabase en mensajes seguros para el usuario.
// Nunca expone nombres de funciones SQL, tablas o detalles internos.
export function sanitizeSupabaseError(error: { message?: string; code?: string } | null): string {
  if (!error) return "Error desconocido";

  // Errores conocidos con mensajes amigables
  const safeMessages: Record<string, string> = {
    "PGRST116": "No se encontró el recurso solicitado",
    "23505": "Ya existe un registro con esos datos",
    "42501": "No tienes permisos para realizar esta acción",
    "JWT expired": "Tu sesión ha caducado, vuelve a iniciar sesión",
    "Invalid login credentials": "Email o contraseña incorrectos",
  };

  const code = error.code ?? "";
  const msg = error.message ?? "";

  // Buscar código exacto
  if (safeMessages[code]) return safeMessages[code];

  // Buscar substring en el mensaje
  for (const [key, safe] of Object.entries(safeMessages)) {
    if (msg.includes(key)) return safe;
  }

  // Detectar mensajes que revelan internals (función, tabla, schema)
  const internalPatterns = [/function\s+\w+/i, /relation\s+"\w+"/, /column\s+"\w+"/, /schema\s+"\w+"/];
  if (internalPatterns.some(p => p.test(msg))) {
    return "Error del servidor. Por favor, inténtalo de nuevo.";
  }

  // Fallback: mensaje original pero solo en desarrollo
  if (import.meta.env.DEV) return msg;
  return "Error del servidor. Por favor, inténtalo de nuevo.";
}
```

- [ ] **Paso 2: Usar `sanitizeSupabaseError` en los componentes críticos**

En los puntos donde se hace `toast.error(error.message)` con errores de Supabase, reemplazar por:

```tsx
import { sanitizeSupabaseError } from "@/lib/supabaseErrorHandler";
// ...
toast.error(sanitizeSupabaseError(error));
```

Archivos principales donde aplicar: `Dashboard.tsx`, `Documents.tsx`, `NewDocument.tsx`, `Settings.tsx`.

- [ ] **Paso 3: Commit**

```bash
git add src/lib/supabaseErrorHandler.ts src/pages/Dashboard.tsx src/pages/Documents.tsx
git commit -m "security: sanitize Supabase error messages to prevent internal name leakage"
```

---

### TASK-13 · Enmascarar campos sensibles para Microsoft Clarity

**Archivos:**
- Modificar: `src/pages/NewDocument.tsx` (añadir `data-clarity-mask` a inputs del wizard)

**Contexto:** Clarity en modo "Balanced" (por defecto) puede capturar texto de inputs. Hay que añadir el atributo `data-clarity-mask="True"` a los campos que contienen datos personales del firmante.

**ADEMÁS:** Configurar Clarity en modo Strict en el panel: Clarity Dashboard → Settings → Masking → "Strict".

- [ ] **Paso 1: Añadir `data-clarity-mask` a inputs sensibles en `NewDocument.tsx`**

En el `case "signer"`, en todos los `<Input>` que contengan datos personales:

```tsx
// Campo nombre:
<Input id="name" data-clarity-mask="True" ... />

// Campo email:
<ContactEmailAutocomplete id="email" ... />
// (En ContactEmailAutocomplete, el <input> interno debe recibir data-clarity-mask)

// Campo NIF:
<Input id="nif" data-clarity-mask="True" ... />

// Campo dirección:
<Input id="address" data-clarity-mask="True" ... />

// Campo teléfono:
<Input id="phone" type="tel" data-clarity-mask="True" ... />
```

También en el campo de título del documento (step "upload"):

```tsx
<Input id="title" data-clarity-mask="True" ... />
```

- [ ] **Paso 2: Verificar en panel de Clarity**

Ir a Microsoft Clarity → tu proyecto → Settings → Masking → seleccionar "Strict" o verificar que los campos enmascarados no aparecen en las grabaciones. Hacer una grabación de prueba.

- [ ] **Paso 3: Commit**

```bash
git add src/pages/NewDocument.tsx
git commit -m "security: add data-clarity-mask to sensitive form fields"
```

---

## BLOQUE 6 — LEGAL COMPLEMENTARIO

---

### TASK-14 · Aviso de IA en interfaz de Clara (EU AI Act Art. 52)

**Archivos:**
- Modificar: `src/pages/Clara.tsx` (añadir badge de IA)
- Modificar: `src/components/ClaraChat.tsx` (añadir disclaimer en el header del chat)

**Contexto:** El EU AI Act Art. 52 exige informar al usuario cuando interactúa con un sistema de IA conversacional. Clara usa Gemini 1.5 Flash. El aviso debe ser visible en la interfaz.

- [ ] **Paso 1: Añadir badge de IA en `src/pages/Clara.tsx`**

```tsx
import { Bot } from "lucide-react"; // o usar Sparkles ya importado

export default function Clara() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Asistente Inteligente</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Redacta presupuestos, contratos y comunicaciones formales en segundos.
        </p>
        {/* EU AI Act Art. 52 — transparencia de sistema IA */}
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
          <Bot className="h-3.5 w-3.5" />
          Este asistente es un sistema de inteligencia artificial (Google Gemini).
          Sus respuestas pueden contener errores — revisa siempre los documentos legales.
        </div>
      </div>
      <ClaraChat />
    </div>
  );
}
```

- [ ] **Paso 2: Añadir disclaimer sutil en `ClaraChat.tsx`**

Al inicio de la lista de mensajes (antes del `ScrollArea` o justo dentro), añadir un mensaje de sistema inicial visible:

Verificar que el mensaje inicial de Clara (el primer mensaje con id "1") ya incluye algo sobre ser una IA. Si no, actualizar el `initialMessage` del estado:

```tsx
// En ClaraChat.tsx, el useState inicial de messages:
const [messages, setMessages] = useState<Message[]>(() => [
  {
    id: "1",
    role: "clara",
    content: "¡Hola! Soy Clara, un asistente de inteligencia artificial de FirmaClara. " +
             "Puedo ayudarte a redactar presupuestos, contratos y comunicaciones. " +
             "Recuerda revisar siempre los documentos antes de enviarlos. ¿En qué te ayudo hoy?",
  },
]);
```

- [ ] **Paso 3: Commit**

```bash
git add src/pages/Clara.tsx src/components/ClaraChat.tsx
git commit -m "legal: add AI system disclosure badge in Clara (EU AI Act Art. 52)"
```

---

### TASK-15 · Tabla de transferencias internacionales en Política de Privacidad

**Archivos:**
- Modificar: `src/pages/Privacy.tsx` (añadir sección de encargados y transferencias)

**Contexto:** GDPR Art. 46 exige documentar las transferencias a terceros países y el mecanismo legal. FirmaClara usa proveedores en EE. UU. (Supabase, Stripe, Google/Gemini, Microsoft Clarity, Sentry, Twilio, Vercel, Resend). Solo FreeTSA está en la UE.

- [ ] **Paso 1: Añadir sección de encargados del tratamiento en `Privacy.tsx`**

Añadir tras la sección "Derechos del interesado" (o antes de la sección de cookies):

```tsx
<section>
  <h2 className="text-xl font-semibold text-slate-800">10. Encargados del tratamiento y transferencias internacionales</h2>
  <p>
    Para prestar el servicio, FirmaClara utiliza los siguientes encargados del tratamiento.
    Las transferencias a países fuera del Espacio Económico Europeo (EEE) se amparan en
    las Cláusulas Contractuales Tipo (CCT) aprobadas por la Comisión Europea, salvo que se
    indique otro mecanismo.
  </p>
  <div className="overflow-x-auto mt-4">
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-slate-100">
          <th className="text-left p-2 border border-slate-200 font-semibold">Proveedor</th>
          <th className="text-left p-2 border border-slate-200 font-semibold">País</th>
          <th className="text-left p-2 border border-slate-200 font-semibold">Finalidad</th>
          <th className="text-left p-2 border border-slate-200 font-semibold">Datos transferidos</th>
          <th className="text-left p-2 border border-slate-200 font-semibold">Base legal transferencia</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="p-2 border border-slate-200 font-medium">Supabase</td>
          <td className="p-2 border border-slate-200">EE. UU. / AWS eu-west-1</td>
          <td className="p-2 border border-slate-200">Base de datos, autenticación, almacenamiento de documentos</td>
          <td className="p-2 border border-slate-200">Todos los datos de cuenta y documentos</td>
          <td className="p-2 border border-slate-200">CCT (art. 46.2.c RGPD)</td>
        </tr>
        <tr className="bg-slate-50">
          <td className="p-2 border border-slate-200 font-medium">Stripe</td>
          <td className="p-2 border border-slate-200">EE. UU.</td>
          <td className="p-2 border border-slate-200">Procesamiento de pagos</td>
          <td className="p-2 border border-slate-200">Email, datos de pago (tokenizados)</td>
          <td className="p-2 border border-slate-200">CCT + decisión adecuación EE. UU. (Data Privacy Framework)</td>
        </tr>
        <tr>
          <td className="p-2 border border-slate-200 font-medium">Google (Gemini API)</td>
          <td className="p-2 border border-slate-200">EE. UU.</td>
          <td className="p-2 border border-slate-200">Asistente IA Clara (generación de texto)</td>
          <td className="p-2 border border-slate-200">Contenido de los mensajes al asistente</td>
          <td className="p-2 border border-slate-200">CCT + Data Privacy Framework</td>
        </tr>
        <tr className="bg-slate-50">
          <td className="p-2 border border-slate-200 font-medium">Microsoft Clarity</td>
          <td className="p-2 border border-slate-200">EE. UU.</td>
          <td className="p-2 border border-slate-200">Analítica web (solo con consentimiento)</td>
          <td className="p-2 border border-slate-200">Interacciones de sesión (datos de comportamiento)</td>
          <td className="p-2 border border-slate-200">CCT + Data Privacy Framework</td>
        </tr>
        <tr>
          <td className="p-2 border border-slate-200 font-medium">Sentry</td>
          <td className="p-2 border border-slate-200">EE. UU.</td>
          <td className="p-2 border border-slate-200">Monitorización de errores (solo con consentimiento)</td>
          <td className="p-2 border border-slate-200">Datos técnicos de error, URL, user agent</td>
          <td className="p-2 border border-slate-200">CCT</td>
        </tr>
        <tr className="bg-slate-50">
          <td className="p-2 border border-slate-200 font-medium">Twilio</td>
          <td className="p-2 border border-slate-200">EE. UU.</td>
          <td className="p-2 border border-slate-200">Envío de OTP por SMS/WhatsApp</td>
          <td className="p-2 border border-slate-200">Número de teléfono del firmante</td>
          <td className="p-2 border border-slate-200">CCT + Data Privacy Framework</td>
        </tr>
        <tr>
          <td className="p-2 border border-slate-200 font-medium">Vercel</td>
          <td className="p-2 border border-slate-200">EE. UU. / Global CDN</td>
          <td className="p-2 border border-slate-200">Hosting y CDN de la aplicación web</td>
          <td className="p-2 border border-slate-200">IPs, logs de acceso</td>
          <td className="p-2 border border-slate-200">CCT</td>
        </tr>
        <tr className="bg-slate-50">
          <td className="p-2 border border-slate-200 font-medium">Resend</td>
          <td className="p-2 border border-slate-200">EE. UU.</td>
          <td className="p-2 border border-slate-200">Envío de emails transaccionales</td>
          <td className="p-2 border border-slate-200">Email del remitente y del firmante, nombre</td>
          <td className="p-2 border border-slate-200">CCT</td>
        </tr>
        <tr>
          <td className="p-2 border border-slate-200 font-medium">FreeTSA</td>
          <td className="p-2 border border-slate-200">UE (Bélgica)</td>
          <td className="p-2 border border-slate-200">Sellado de tiempo RFC 3161</td>
          <td className="p-2 border border-slate-200">Hash del documento firmado</td>
          <td className="p-2 border border-slate-200">No requiere transferencia fuera del EEE</td>
        </tr>
      </tbody>
    </table>
  </div>
  <p className="mt-4 text-sm">
    Puedes solicitar copia de las CCT vigentes escribiendo a{" "}
    <a href="mailto:dpo@firmaclara.es" className="text-blue-600 hover:underline">
      dpo@firmaclara.es
    </a>
    .
  </p>
</section>
```

- [ ] **Paso 2: Actualizar la fecha "Última actualización" en Privacy.tsx**

Cambiar la fecha al día de implementación.

- [ ] **Paso 3: Commit**

```bash
git add src/pages/Privacy.tsx
git commit -m "legal: add international transfers table in Privacy Policy (GDPR Art. 46)"
```

---

## ORDEN DE COMMITS RECOMENDADO

```
1. TASK-09: redirect /referrals             → git commit (15 min)
2. TASK-10: error gramatical personas       → git commit (5 min)
3. TASK-01: aviso legal /aviso-legal        → git commit (1h)
4. TASK-02: mejoras cookie banner           → git commit (30 min)
5. TASK-07: umbral créditos plan-aware      → git commit (30 min)
6. TASK-03: fix freeze /documents/new       → git commit (1-2h)
7. TASK-04: RPC get_document_counts         → git commit (1h)
8. TASK-05: skeleton screens                → git commit (2h)
9. TASK-14: aviso IA Clara                  → git commit (30 min)
10. TASK-11: CSP report-uri                 → git commit (1h)
11. TASK-12: sanitizar errores Supabase     → git commit (2h)
12. TASK-13: Clarity masking                → git commit (1h)
13. TASK-08: claridad créditos UI           → git commit (1h)
14. TASK-06: plantillas en wizard           → git commit (2-3h)
15. TASK-15: tabla transferencias Privacy   → git commit (1h)
```

**Estimación total: ~16-20 horas de implementación**

---

## NOTAS PARA EL EJECUTOR

1. **Supabase proyecto:** `pmzfwwtgjvlvuawxguiw`. Las migraciones SQL ejecutarlas primero en el SQL Editor antes de desplegar el frontend.
2. **TASK-04 requiere despliegue en Supabase ANTES de desplegar en Vercel.** Si se despliega el frontend primero con la llamada RPC y la función no existe, el dashboard mostrará error.
3. **TASK-11 (CSP):** Actualizar el `report-uri` con el endpoint real de Sentry CSP del proyecto. Encontrar en: Sentry → Settings → Projects → tu-proyecto → Security Headers.
4. **TASK-15 (Privacy):** Los números de sección pueden variar según el contenido actual de `Privacy.tsx`. Ajustar la numeración al insertar la sección.
5. **TASK-01 (datos registrales):** Los datos del Registro Mercantil (tomo/folio/hoja) deben obtenerse del Registro o de la escritura de constitución de Operia.
