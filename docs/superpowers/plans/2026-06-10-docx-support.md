# Soporte Multiformato (DOCX → PDF) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir a los usuarios subir documentos Word (.docx, .doc), Excel (.xlsx), PowerPoint (.pptx) y otros formatos de Office, que se convierten automáticamente a PDF mediante Gotenberg (self-hosted) antes de entrar al pipeline de firma existente — sin tocar el visor, el posicionador de firma ni el firmado.

**Architecture:** El cliente envía el archivo al nuevo Edge Function `convert-to-pdf`, que lo reenvía a Gotenberg (LibreOffice backend). El Edge Function devuelve el PDF convertido como base64 JSON. El frontend reemplaza el `File` en estado con el PDF resultante y muestra un preview inline antes de continuar. Todo el pipeline posterior (sign-complete-v2, generate-audit-trail, SignaturePositionPicker) recibe siempre un PDF y no cambia.

**Tech Stack:** Deno / Supabase Edge Functions, Gotenberg 8 (Docker en Railway/Fly.io), pdf-lib (ya en proyecto), base64 transfer para evitar problemas de binary en supabase.functions.invoke

---

## Chunk 1: Infraestructura y migración

### Task 1: Desplegar Gotenberg

**Files:**
- No hay archivos de código — es infraestructura externa

- [ ] **Step 1: Crear cuenta en Railway.app** (o Fly.io/Render — elige el que prefieras)

- [ ] **Step 2: Crear nuevo proyecto Docker en Railway con esta configuración**

```
Image: gotenberg/gotenberg:8
Port: 3000
```

Variables de entorno en Railway (ninguna necesaria para uso básico).

- [ ] **Step 3: Verificar que el servicio está vivo**

```bash
curl -X GET https://<tu-gotenberg-url>/health
# Expected: {"status": "up"}
```

- [ ] **Step 4: Probar conversión con un archivo Word de prueba**

```bash
curl --request POST \
  https://<tu-gotenberg-url>/forms/libreoffice/convert \
  --form files=@test.docx \
  --output test.pdf
# Expected: se descarga test.pdf válido
```

- [ ] **Step 5: Añadir la URL de Gotenberg como secreto del proyecto Supabase**

```bash
supabase secrets set GOTENBERG_URL=https://<tu-gotenberg-url>
```

También añadir en el Dashboard de Supabase:
`Settings → Edge Functions → Secrets → GOTENBERG_URL`

---

### Task 2: Migración de base de datos

**Files:**
- Create: `supabase/migrations/20260610_add_original_format.sql`

- [ ] **Step 1: Crear el archivo de migración**

```sql
-- Registra el formato original del documento antes de la conversión a PDF.
-- NULL significa que el usuario subió directamente un PDF (sin conversión).
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS original_format VARCHAR(20)
    CHECK (original_format IN ('docx','doc','odt','rtf','xlsx','xls','ods','pptx','ppt','odp','txt','csv'));
```

- [ ] **Step 2: Aplicar la migración en Supabase**

```bash
supabase db push
# O desde el Dashboard: SQL Editor → pegar y ejecutar el SQL
```

- [ ] **Step 3: Verificar en el Dashboard de Supabase**

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'documents' AND column_name = 'original_format';
-- Expected: 1 fila con original_format, character varying, 20
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260610_add_original_format.sql
git commit -m "feat: add original_format column to documents"
```

---

## Chunk 2: Edge Function convert-to-pdf

### Task 3: Crear el Edge Function

**Files:**
- Create: `supabase/functions/convert-to-pdf/index.ts`

- [ ] **Step 1: Crear el directorio y el archivo**

```bash
mkdir supabase/functions/convert-to-pdf
```

- [ ] **Step 2: Escribir el Edge Function**

```typescript
// supabase/functions/convert-to-pdf/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1"
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'

const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword',                                                        // .doc
  'application/vnd.oasis.opendocument.text',                                  // .odt
  'application/rtf', 'text/rtf',                                              // .rtf
  'text/plain',                                                                // .txt
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',        // .xlsx
  'application/vnd.ms-excel',                                                 // .xls
  'application/vnd.oasis.opendocument.spreadsheet',                           // .ods
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',// .pptx
  'application/vnd.ms-powerpoint',                                            // .ppt
  'application/vnd.oasis.opendocument.presentation',                          // .odp
  'text/csv',                                                                  // .csv
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req);
  if (preflight) return preflight;

  try {
    // Auth guard — solo usuarios autenticados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse multipart form
    const contentType = req.headers.get('content-type') ?? '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(JSON.stringify({ error: 'Expected multipart/form-data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return new Response(JSON.stringify({ error: `Tipo de archivo no soportado: ${file.type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return new Response(JSON.stringify({ error: 'Archivo demasiado grande (máximo 10MB)' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Call Gotenberg
    const gotenbergUrl = Deno.env.get('GOTENBERG_URL');
    if (!gotenbergUrl) throw new Error('GOTENBERG_URL not configured');

    const gForm = new FormData();
    gForm.append('files', file, file.name);

    const gRes = await fetch(`${gotenbergUrl}/forms/libreoffice/convert`, {
      method: 'POST',
      body: gForm,
    });

    if (!gRes.ok) {
      const errText = await gRes.text();
      throw new Error(`Gotenberg conversion failed (${gRes.status}): ${errText.slice(0, 200)}`);
    }

    // Return PDF as base64 to avoid binary transfer issues with supabase.functions.invoke
    const pdfBytes = await gRes.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(pdfBytes)));

    return new Response(
      JSON.stringify({ pdf_base64: base64, size: pdfBytes.byteLength }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

- [ ] **Step 3: Desplegar el Edge Function**

```bash
supabase functions deploy convert-to-pdf --no-verify-jwt
# IMPORTANTE: --no-verify-jwt porque la validación de auth la hacemos manualmente
# para poder devolver errores JSON en lugar de 401 plano
```

- [ ] **Step 4: Smoke test desde curl**

```bash
curl -X POST https://<tu-proyecto>.supabase.co/functions/v1/convert-to-pdf \
  -H "Authorization: Bearer <tu-anon-key>" \
  -F "file=@test.docx" \
  | jq '.size'
# Expected: un número > 0 (bytes del PDF resultante)
```

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/convert-to-pdf/index.ts
git commit -m "feat: add convert-to-pdf edge function (Gotenberg proxy)"
```

---

## Chunk 3: Frontend — soporte multiformato

### Task 4: Constantes y helper de conversión

**Files:**
- Modify: `src/pages/NewDocument.tsx`

El objetivo de este task es añadir solo las constantes y el helper, sin tocar el JSX todavía.

- [ ] **Step 1: Añadir las constantes de formatos aceptados justo después de los imports en NewDocument.tsx (línea ~24, antes del type Step)**

```typescript
const ACCEPTED_OFFICE_FORMATS = [
  '.docx', '.doc', '.odt', '.rtf',
  '.xlsx', '.xls', '.ods',
  '.pptx', '.ppt', '.odp',
  '.txt', '.csv',
];

const OFFICE_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.oasis.opendocument.text',
  'application/rtf', 'text/rtf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.oasis.opendocument.presentation',
  'text/csv',
];

function getOriginalFormat(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  const officeExts = ['docx','doc','odt','rtf','xlsx','xls','ods','pptx','ppt','odp','txt','csv'];
  return officeExts.includes(ext) ? ext : null;
}
```

- [ ] **Step 2: Añadir los estados de conversión en el componente NewDocument, junto al resto de estados (línea ~34)**

```typescript
const [isConverting, setIsConverting] = useState(false);
const [convertedFrom, setConvertedFrom] = useState<string | null>(null); // ej. "docx"
const [conversionPreviewUrl, setConversionPreviewUrl] = useState<string | null>(null);
```

Cuando `convertedFrom` tiene valor, significa que el `file` en estado es un PDF que fue convertido desde ese formato.

- [ ] **Step 3: Añadir el helper `convertFileToPdf` como función asíncrona dentro del componente, antes de `handleCreateDocument`**

```typescript
const convertFileToPdf = async (originalFile: File): Promise<File> => {
  const formData = new FormData();
  formData.append('file', originalFile);

  // supabase.functions.invoke no gestiona bien el binary response; usamos fetch directo
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('No autenticado');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/convert-to-pdf`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error ?? 'Error en la conversión');
  }

  const { pdf_base64 } = await res.json();
  const binary = atob(pdf_base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const pdfName = originalFile.name.replace(/\.[^.]+$/, '.pdf');
  return new File([blob], pdfName, { type: 'application/pdf' });
};
```

- [ ] **Step 4: Verificar que TypeScript compila sin errores (no hace falta ejecutar la app todavía)**

```bash
npx tsc --noEmit
# Expected: sin errores en los nuevos tipos/estados
```

---

### Task 5: Actualizar los handlers de selección de archivo

**Files:**
- Modify: `src/pages/NewDocument.tsx`

- [ ] **Step 1: Reemplazar el cuerpo de `handleFileChange` (línea 147) con la versión multiformato**

El nuevo handler debe:
1. Aceptar PDF nativamente (sin conversión)
2. Aceptar Office formats → disparar conversión
3. Rechazar otros tipos

```typescript
const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const selectedFile = e.target.files?.[0];
  if (!selectedFile) return;

  const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf');
  const isOffice = OFFICE_MIME_TYPES.includes(selectedFile.type) ||
    ACCEPTED_OFFICE_FORMATS.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

  if (!isPdf && !isOffice) {
    toast.error("Formato no soportado. Usa PDF, Word, Excel o PowerPoint.");
    return;
  }
  if (selectedFile.size > 10 * 1024 * 1024) {
    toast.error("El archivo es demasiado grande. Máximo 10MB.");
    return;
  }

  if (isPdf) {
    setFile(selectedFile);
    setConvertedFrom(null);
    setConversionPreviewUrl(null);
    if (!title) setTitle(selectedFile.name.replace(/\.pdf$/i, ''));
    return;
  }

  // Office format → convert
  const originalFormat = getOriginalFormat(selectedFile);
  setIsConverting(true);
  try {
    const pdfFile = await convertFileToPdf(selectedFile);
    const previewUrl = URL.createObjectURL(pdfFile);
    setFile(pdfFile);
    setConvertedFrom(originalFormat);
    setConversionPreviewUrl(previewUrl);
    if (!title) setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
    toast.success(`${selectedFile.name} convertido a PDF correctamente`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error en la conversión';
    toast.error(`No se pudo convertir el archivo: ${msg}`);
  } finally {
    setIsConverting(false);
  }
};
```

- [ ] **Step 2: Reemplazar el cuerpo de `handleDrop` (línea 167) con la misma lógica**

```typescript
const handleDrop = async (e: React.DragEvent) => {
  e.preventDefault();
  const selectedFile = e.dataTransfer.files?.[0];
  if (!selectedFile) return;

  const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.endsWith('.pdf');
  const isOffice = OFFICE_MIME_TYPES.includes(selectedFile.type) ||
    ACCEPTED_OFFICE_FORMATS.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

  if (!isPdf && !isOffice) {
    toast.error("Formato no soportado. Usa PDF, Word, Excel o PowerPoint.");
    return;
  }
  if (selectedFile.size > 10 * 1024 * 1024) {
    toast.error("El archivo es demasiado grande. Máximo 10MB.");
    return;
  }

  if (isPdf) {
    setFile(selectedFile);
    setConvertedFrom(null);
    setConversionPreviewUrl(null);
    if (!title) setTitle(selectedFile.name.replace(/\.pdf$/i, ''));
    return;
  }

  const originalFormat = getOriginalFormat(selectedFile);
  setIsConverting(true);
  try {
    const pdfFile = await convertFileToPdf(selectedFile);
    const previewUrl = URL.createObjectURL(pdfFile);
    setFile(pdfFile);
    setConvertedFrom(originalFormat);
    setConversionPreviewUrl(previewUrl);
    if (!title) setTitle(selectedFile.name.replace(/\.[^.]+$/, ''));
    toast.success(`${selectedFile.name} convertido a PDF correctamente`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error en la conversión';
    toast.error(`No se pudo convertir el archivo: ${msg}`);
  } finally {
    setIsConverting(false);
  }
};
```

---

### Task 6: Actualizar el JSX del paso "upload"

**Files:**
- Modify: `src/pages/NewDocument.tsx`

- [ ] **Step 1: Actualizar el `<Input>` de upload (línea ~524) para aceptar los nuevos formatos**

Cambiar:
```tsx
accept=".pdf"
```
Por:
```tsx
accept=".pdf,.docx,.doc,.odt,.rtf,.xlsx,.xls,.ods,.pptx,.ppt,.odp,.txt,.csv"
```

- [ ] **Step 2: Actualizar el texto de ayuda en la zona de drag & drop (línea ~516)**

Cambiar:
```tsx
<p className="mb-2 text-sm text-muted-foreground">
  Arrastra un PDF aquí o
</p>
```
Por:
```tsx
<p className="mb-2 text-sm text-muted-foreground">
  Arrastra tu documento aquí o
</p>
<p className="text-xs text-muted-foreground mb-2">
  PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx) y más
</p>
```

- [ ] **Step 3: Añadir el estado de conversión (spinner) y el banner de preview justo debajo del input de archivo (después de la zona de drag & drop, antes del input de título)**

Añadir entre la zona de drop y el campo de título:

```tsx
{/* Estado de conversión */}
{isConverting && (
  <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
    <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
    <span className="text-sm text-amber-800">Convirtiendo a PDF...</span>
  </div>
)}

{/* Banner de conversión exitosa + preview */}
{file && convertedFrom && conversionPreviewUrl && (
  <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-2">
    <div className="flex items-center gap-2">
      <FileText className="h-4 w-4 text-green-600 shrink-0" />
      <span className="text-sm text-green-800 font-medium">
        Convertido a PDF desde .{convertedFrom}
      </span>
    </div>
    <p className="text-xs text-green-700">
      Revisa que el contenido se ve correctamente antes de continuar.
    </p>
    <a
      href={conversionPreviewUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-green-700 underline hover:text-green-900"
    >
      Abrir PDF para revisar →
    </a>
  </div>
)}
```

- [ ] **Step 4: Deshabilitar el botón "Continuar" mientras se está convirtiendo (línea ~552)**

Cambiar:
```tsx
<Button className="w-full" disabled={!file || !title} onClick={() => setStep("signer")}>
```
Por:
```tsx
<Button className="w-full" disabled={!file || !title || isConverting} onClick={() => setStep("signer")}>
```

- [ ] **Step 5: Actualizar el texto del archivo seleccionado para mostrar el formato original (línea ~534)**

El bloque que muestra el archivo seleccionado (cuando `file` existe):

```tsx
{file && (
  <div className="flex items-center gap-2 rounded-lg bg-muted p-3">
    <FileText className="h-5 w-5 text-muted-foreground" />
    <span className="flex-1 text-sm truncate">{file.name}</span>
    {convertedFrom && (
      <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium shrink-0">
        .{convertedFrom} → PDF
      </span>
    )}
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setFile(null);
        setConvertedFrom(null);
        setConversionPreviewUrl(null);
      }}
      className="h-auto p-1"
    >
      Cambiar
    </Button>
  </div>
)}
```

- [ ] **Step 6: Compilar y verificar que no hay errores TypeScript**

```bash
npx tsc --noEmit
# Expected: 0 errores
```

- [ ] **Step 7: Commit**

```bash
git add src/pages/NewDocument.tsx
git commit -m "feat: multi-format file upload with Gotenberg conversion in NewDocument"
```

---

## Chunk 4: Grabar el formato original en la BD y en el audit trail

### Task 7: Pasar `original_format` al crear el documento

**Files:**
- Modify: `src/pages/NewDocument.tsx` — función `handleCreateDocument`

- [ ] **Step 1: Añadir `original_format: convertedFrom` en el INSERT del nuevo documento (línea ~295)**

En el bloque `else` que hace el insert inicial del documento, añadir dentro del objeto:

```typescript
original_format: convertedFrom || null,
```

- [ ] **Step 2: Añadir `original_format` también en el UPDATE del draft (línea ~266)**

```typescript
original_format: convertedFrom || null,
```

- [ ] **Step 3: Verificar en Supabase después de enviar un documento Word de prueba**

```sql
SELECT id, title, original_format FROM documents ORDER BY created_at DESC LIMIT 5;
-- Expected: el documento Word muestra original_format = 'docx' (o el formato real)
```

- [ ] **Step 4: Commit**

```bash
git add src/pages/NewDocument.tsx
git commit -m "feat: record original_format when document is created from Office file"
```

---

### Task 8: Anotar la conversión en el audit trail (generate-audit-trail)

**Files:**
- Modify: `supabase/functions/generate-audit-trail/index.ts`

El objetivo es que el certificado de evidencias mencione que el documento fue convertido desde un formato Office, para que sea legalmente trazable.

- [ ] **Step 1: Leer el archivo completo para ver dónde se construye el texto del certificado**

```bash
# Buscar el bloque donde se imprime info del documento
grep -n "file_hash\|original_format\|Documento original" supabase/functions/generate-audit-trail/index.ts
```

- [ ] **Step 2: Localizar donde se imprime la información del documento en el PDF del audit trail**

Busca el bloque donde se usa `doc.title` o `doc.file_url` para imprimir metadatos del documento en el PDF. Normalmente es algo como:

```typescript
page.drawText(`Documento: ${doc.title}`, {...})
page.drawText(`Hash SHA-256: ${doc.file_hash ?? 'N/A'}`, {...})
```

- [ ] **Step 3: Añadir la línea de formato original justo después del hash, solo si `original_format` existe**

```typescript
if (doc.original_format) {
  // yPosition ya decrementado desde el hash
  yPosition -= lineHeight;
  page.drawText(
    `Formato original: .${doc.original_format} → convertido a PDF automáticamente`,
    { x: margin, y: yPosition, size: fontSize, font, color: textColor }
  );
}
```

El valor exacto de `yPosition`, `lineHeight`, `margin`, `fontSize`, `font` y `textColor` deben coincidir con los que ya se usan en el archivo — cópialos del bloque adyacente.

- [ ] **Step 4: Desplegar el Edge Function actualizado**

```bash
supabase functions deploy generate-audit-trail
```

- [ ] **Step 5: Verificar generando un audit trail de un documento convertido (puedes hacerlo desde el Dashboard de Supabase → Edge Functions → Test)**

Inspeccionar visualmente que el PDF del audit trail menciona el formato original.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/generate-audit-trail/index.ts
git commit -m "feat: include original_format in audit trail certificate"
```

---

## Chunk 5: Limpieza y validación final

### Task 9: Liberar blob URLs para evitar memory leaks

**Files:**
- Modify: `src/pages/NewDocument.tsx`

- [ ] **Step 1: Añadir un `useEffect` que limpie el `conversionPreviewUrl` cuando el componente se desmonte o cuando la URL cambie**

Añadir justo después de los estados de conversión (antes del `useEffect` de carga de borrador):

```typescript
useEffect(() => {
  return () => {
    if (conversionPreviewUrl) URL.revokeObjectURL(conversionPreviewUrl);
  };
}, [conversionPreviewUrl]);
```

- [ ] **Step 2: Verificar en DevTools → Memory que no hay blob URLs acumuladas al cambiar varias veces de archivo**

Abrir DevTools → Application → Storage → Blob URLs y verificar que se liberan al hacer "Cambiar".

- [ ] **Step 3: Commit**

```bash
git add src/pages/NewDocument.tsx
git commit -m "fix: revoke blob URLs to prevent memory leak in document conversion"
```

---

### Task 10: Tests de los helpers

**Files:**
- Create: `src/test/document-conversion.test.ts`

- [ ] **Step 1: Crear el archivo de test**

```typescript
// src/test/document-conversion.test.ts
import { describe, it, expect } from 'vitest';

// Extraer getOriginalFormat a src/lib/documentFormats.ts para poder importarlo
// (mover la función del componente)
import { getOriginalFormat, ACCEPTED_OFFICE_FORMATS, OFFICE_MIME_TYPES } from '@/lib/documentFormats';

describe('getOriginalFormat', () => {
  it('returns the extension for a Word file', () => {
    const file = new File([], 'contrato.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    expect(getOriginalFormat(file)).toBe('docx');
  });

  it('returns the extension for an Excel file', () => {
    const file = new File([], 'presupuesto.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    expect(getOriginalFormat(file)).toBe('xlsx');
  });

  it('returns null for a PDF file', () => {
    const file = new File([], 'documento.pdf', { type: 'application/pdf' });
    expect(getOriginalFormat(file)).toBeNull();
  });

  it('returns null for an unknown extension', () => {
    const file = new File([], 'archivo.xyz', { type: 'application/octet-stream' });
    expect(getOriginalFormat(file)).toBeNull();
  });

  it('is case-insensitive for extensions', () => {
    const file = new File([], 'Contrato.DOCX', { type: 'application/msword' });
    expect(getOriginalFormat(file)).toBe('docx');
  });
});
```

- [ ] **Step 2: Extraer las constantes y `getOriginalFormat` a `src/lib/documentFormats.ts`**

```typescript
// src/lib/documentFormats.ts
export const ACCEPTED_OFFICE_FORMATS = [
  '.docx', '.doc', '.odt', '.rtf',
  '.xlsx', '.xls', '.ods',
  '.pptx', '.ppt', '.odp',
  '.txt', '.csv',
];

export const OFFICE_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.oasis.opendocument.text',
  'application/rtf', 'text/rtf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
  'application/vnd.oasis.opendocument.presentation',
  'text/csv',
];

const OFFICE_EXTS = ['docx','doc','odt','rtf','xlsx','xls','ods','pptx','ppt','odp','txt','csv'];

export function getOriginalFormat(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return OFFICE_EXTS.includes(ext) ? ext : null;
}
```

- [ ] **Step 3: Actualizar `NewDocument.tsx` para importar desde el nuevo módulo (en lugar de definirlo inline)**

```typescript
import { ACCEPTED_OFFICE_FORMATS, OFFICE_MIME_TYPES, getOriginalFormat } from '@/lib/documentFormats';
```

Y eliminar las definiciones inline del componente.

- [ ] **Step 4: Ejecutar los tests**

```bash
npx vitest run src/test/document-conversion.test.ts
# Expected: 5 tests PASSED
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/documentFormats.ts src/test/document-conversion.test.ts src/pages/NewDocument.tsx
git commit -m "test: add unit tests for document format detection helpers"
```

---

### Task 11: Smoke test end-to-end manual

- [ ] **Step 1: Arrancar el servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 2: Ir a `/new-document` y subir un archivo .docx**

Verificar:
- La zona de drop acepta el archivo
- Aparece el spinner "Convirtiendo a PDF..."
- Aparece el banner verde con el enlace "Abrir PDF para revisar"
- El tag `.docx → PDF` aparece en el nombre del archivo
- El botón "Continuar" está habilitado

- [ ] **Step 3: Abrir el preview y verificar que el contenido del Word se ve correctamente en el PDF**

- [ ] **Step 4: Completar el flujo hasta enviar el documento**

Verificar en Supabase Dashboard:
```sql
SELECT title, original_format, status FROM documents ORDER BY created_at DESC LIMIT 1;
-- Expected: original_format = 'docx', status = 'sent'
```

- [ ] **Step 5: Verificar el certificado de evidencias del documento firmado**

El PDF del audit trail debe mencionar:
`Formato original: .docx → convertido a PDF automáticamente`

- [ ] **Step 6: Commit final del branch**

```bash
git add .
git commit -m "chore: finalize docx support smoke test verification"
```

---

## Resumen de archivos

| Acción | Archivo |
|--------|---------|
| CREATE | `supabase/functions/convert-to-pdf/index.ts` |
| CREATE | `supabase/migrations/20260610_add_original_format.sql` |
| CREATE | `src/lib/documentFormats.ts` |
| CREATE | `src/test/document-conversion.test.ts` |
| MODIFY | `src/pages/NewDocument.tsx` |
| MODIFY | `supabase/functions/generate-audit-trail/index.ts` |

## Dependencias externas

| Servicio | Acción necesaria |
|----------|-----------------|
| Gotenberg | Deploy Docker en Railway/Fly.io |
| Supabase Secrets | `GOTENBERG_URL` añadido vía `supabase secrets set` |
