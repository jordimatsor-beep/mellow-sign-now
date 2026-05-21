# Guía de Implementación: Antigravity (Backend)
## FirmaClara - API y Lógica de Negocio

---

## 1. Visión General

Esta guía detalla la implementación del backend de FirmaClara usando Antigravity. El backend maneja la lógica de negocio, generación de PDFs, integración con FreeTSA, y el asistente Clara.

### 1.1 Responsabilidades del Backend

| Área | Responsabilidad |
|------|-----------------|
| Autenticación | Validar tokens de Multicentros, gestionar sesiones |
| Documentos | CRUD, almacenamiento, estados, metadatos |
| Firma | Validación, captura evidencias, generación certificados |
| PDFs | Generación PDF firmado, certificado de evidencias |
| TSA | Integración con FreeTSA (RFC 3161) |
| Clara | Orquestación LLM, prompts, generación contratos |
| Créditos | Gestión packs, consumo, validación |
| Notificaciones | Triggers para n8n (emails) |

### 1.2 Stack Backend

- **Runtime:** Node.js
- **Framework:** Antigravity (serverless functions)
- **Base de datos:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **LLM:** Anthropic Claude
- **PDF:** pdf-lib
- **Crypto:** Node.js crypto (SHA-256)
- **TSA:** RFC 3161 client

---

## 2. Estructura del Proyecto

```
/api
├── /auth
│   ├── login.ts
│   ├── logout.ts
│   └── me.ts
├── /documents
│   ├── index.ts
│   ├── [id].ts
│   ├── [id]/send.ts
│   ├── [id]/cancel.ts
│   └── [id]/download.ts
├── /sign
│   └── [token].ts
├── /credits
│   ├── index.ts
│   ├── history.ts
│   ├── purchase.ts
│   └── webhook.ts
├── /clara
│   ├── chat.ts
│   └── generate-pdf.ts
└── /internal
    ├── generate-signed-pdf.ts
    ├── generate-certificate.ts
    ├── tsa-client.ts
    └── hash-utils.ts

/lib
├── supabase.ts
├── auth.ts
├── pdf.ts
├── tsa.ts
├── clara.ts
├── credits.ts
└── types.ts

/prompts
├── clara-system.md
└── contract-templates/
```

---

## 3. Endpoints API - Resumen

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| POST | /auth/login | Login con token Multicentros | No |
| GET | /auth/me | Usuario actual | Sí |
| GET | /documents | Lista documentos | Sí |
| POST | /documents | Crear documento | Sí |
| GET | /documents/:id | Detalle documento | Sí |
| POST | /documents/:id/send | Enviar para firma | Sí |
| POST | /documents/:id/cancel | Cancelar | Sí |
| GET | /documents/:id/download | Descargar PDFs | Sí |
| GET | /sign/:token | Datos para firma | No |
| POST | /sign/:token | Firmar documento | No |
| GET | /credits | Créditos disponibles | Sí |
| POST | /credits/purchase | Iniciar compra | Sí |
| POST | /credits/webhook | Webhook Stripe | No |
| POST | /clara/chat | Chat con Clara | Sí |
| POST | /clara/generate-pdf | Generar PDF | Sí |

---

## 4. Flujo Crítico: Firma de Documento

```typescript
async function signDocument(token: string, data: SignatureData, request: Request) {
  // 1. Obtener documento y validar
  const document = await getDocumentByToken(token);
  if (!document) throw new NotFoundError();
  if (document.status === 'signed') throw new AlreadySignedError();
  if (new Date(document.expires_at) < new Date()) throw new ExpiredError();

  // 2. Capturar evidencias
  const evidences = {
    signer_name: data.signer_name,
    signer_email: document.signer_email,
    ip_address: request.headers.get('x-forwarded-for') || 'unknown',
    user_agent: request.headers.get('user-agent') || 'unknown',
    acceptance_text: 'He leído y acepto el contenido de este documento',
    client_timestamp: data.client_timestamp,
    server_timestamp: new Date().toISOString(),
  };

  // 3. Verificar integridad del documento original
  const originalFile = await downloadFile(document.file_url);
  const originalHash = calculateSHA256(originalFile);
  
  if (originalHash !== document.file_hash) {
    throw new IntegrityError('El documento ha sido modificado');
  }

  // 4. Generar PDF firmado
  const signedPdf = await generateSignedPDF(originalFile, {
    signerName: data.signer_name,
    signerEmail: document.signer_email,
    signedAt: evidences.server_timestamp,
    signatureImage: data.signature_image,
  });

  // 5. Calcular hash del PDF firmado
  const signedHash = calculateSHA256(signedPdf);

  // 6. Obtener sellado de tiempo de FreeTSA
  const tsaResponse = await requestTSA(signedHash);

  // 7. Generar certificado de evidencias
  const certificate = await generateCertificate({
    document,
    evidences,
    originalHash,
    signedHash,
    tsaResponse,
  });

  // 8. Subir archivos a storage
  const signedUrl = await uploadFile(signedPdf, `signed/${document.id}.pdf`);
  const certUrl = await uploadFile(certificate, `certificates/${document.id}.pdf`);

  // 9. Crear registro de firma
  await supabase.from('signatures').insert({
    document_id: document.id,
    signer_name: evidences.signer_name,
    signer_email: evidences.signer_email,
    ip_address: evidences.ip_address,
    user_agent: evidences.user_agent,
    hash_sha256: signedHash,
    tsa_response: tsaResponse,
    signed_at: evidences.server_timestamp,
  });

  // 10. Actualizar documento
  await supabase.from('documents').update({
    status: 'signed',
    signed_at: evidences.server_timestamp,
    signed_file_url: signedUrl,
    certificate_url: certUrl,
  }).eq('id', document.id);

  // 11. Registrar evento
  await logEvent('document.signed', document.id, evidences);

  // 12. Trigger notificación al emisor
  await triggerWebhook('document.signed', {
    document_id: document.id,
    sender_email: document.user.email,
    signer_name: evidences.signer_name,
  });

  return { success: true, signed_at: evidences.server_timestamp, download_url: signedUrl };
}
```

---

## 5. Implementaciones Clave

### 5.1 Cálculo SHA-256

```typescript
import crypto from 'crypto';

export function calculateSHA256(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
```

### 5.2 Integración FreeTSA (RFC 3161)

```typescript
const FREETSA_URL = 'https://freetsa.org/tsr';

export async function requestTSA(hash: string): Promise<Buffer> {
  // Crear TimeStampRequest según RFC 3161
  const hashBuffer = Buffer.from(hash, 'hex');
  
  // Construir ASN.1 request (simplificado)
  const tsRequest = buildTimestampRequest(hashBuffer);

  const response = await fetch(FREETSA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/timestamp-query' },
    body: tsRequest,
  });

  if (!response.ok) {
    throw new Error(`TSA error: ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
```

### 5.3 Generación PDF Firmado

```typescript
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateSignedPDF(
  originalPdf: Buffer,
  data: { signerName: string; signerEmail: string; signedAt: string; signatureImage?: string }
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(originalPdf);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Añadir página de firma
  const page = pdfDoc.addPage([595, 842]); // A4
  const { height } = page.getSize();

  // Título
  page.drawText('PÁGINA DE FIRMA', {
    x: 50, y: height - 80, size: 18, font: fontBold
  });

  // Datos del firmante
  let yPos = height - 140;
  page.drawText(`Firmante: ${data.signerName}`, { x: 50, y: yPos, size: 12, font });
  yPos -= 25;
  page.drawText(`Email: ${data.signerEmail}`, { x: 50, y: yPos, size: 12, font });
  yPos -= 25;
  page.drawText(`Fecha: ${formatDate(data.signedAt)}`, { x: 50, y: yPos, size: 12, font });

  // Declaración
  yPos -= 50;
  page.drawText('Declaración:', { x: 50, y: yPos, size: 12, font: fontBold });
  yPos -= 20;
  page.drawText('"He leído y acepto el contenido de este documento"', {
    x: 50, y: yPos, size: 11, font
  });

  // Firma dibujada
  if (data.signatureImage) {
    yPos -= 50;
    page.drawText('Firma:', { x: 50, y: yPos, size: 12, font: fontBold });
    
    const signatureBytes = Buffer.from(
      data.signatureImage.replace(/^data:image\/\w+;base64,/, ''), 'base64'
    );
    const signatureImg = await pdfDoc.embedPng(signatureBytes);
    page.drawImage(signatureImg, { x: 50, y: yPos - 100, width: 200, height: 80 });
  }

  // Footer
  page.drawText('Documento firmado electrónicamente a través de FirmaClara', {
    x: 50, y: 50, size: 9, font, color: rgb(0.5, 0.5, 0.5)
  });

  return Buffer.from(await pdfDoc.save());
}
```

### 5.4 Sistema de Créditos

```typescript
export async function consumeCredit(userId: string): Promise<{ success: boolean; remaining: number }> {
  // Obtener pack más antiguo con créditos (FIFO)
  const { data: pack } = await supabase
    .from('credit_packs')
    .select('*')
    .eq('user_id', userId)
    .gt('credits_total', supabase.raw('credits_used'))
    .order('purchased_at', { ascending: true })
    .limit(1)
    .single();

  if (!pack) {
    return { success: false, remaining: 0 };
  }

  // Incrementar créditos usados
  await supabase
    .from('credit_packs')
    .update({ credits_used: pack.credits_used + 1 })
    .eq('id', pack.id);

  // Calcular restantes
  const { data: allPacks } = await supabase
    .from('credit_packs')
    .select('credits_total, credits_used')
    .eq('user_id', userId);

  const remaining = allPacks.reduce((sum, p) => sum + (p.credits_total - p.credits_used), 0);

  return { success: true, remaining };
}
```

---

## 6. Asistente Clara

### 6.1 System Prompt

```markdown
Eres Clara, asistente de FirmaClara. Ayudas a autónomos y pymes españolas a redactar contratos.

## Personalidad
- Amable, profesional, lenguaje claro
- NO eres abogada ni das asesoramiento legal

## Documentos que puedes generar
- Contratos de servicios, encargos de obra
- Presupuestos, NDAs, autorizaciones
- Contratos de colaboración, mantenimiento

## Documentos que debes RECHAZAR
- Compraventa inmuebles, hipotecas
- Contratos laborales, testamentos
- Documentos para Administración

## Proceso
1. Pregunta qué necesita
2. Recopila información (precio, plazos, partes)
3. Genera documento
4. Incluye disclaimer

## Disclaimer obligatorio
"⚠️ Documento generado con IA. Revísalo antes de usarlo. No sustituye asesoramiento legal profesional."
```

### 6.2 Implementación

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function chatWithClara(
  conversationId: string,
  message: string,
  history: Message[]
): Promise<ClaraResponse> {
  const systemPrompt = await loadClaraSystemPrompt();

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  
  await saveMessage(conversationId, 'user', message);
  await saveMessage(conversationId, 'assistant', text);

  return {
    response: text,
    canGenerate: detectContractReady(text),
  };
}
```

---

## 7. Webhooks para n8n

```typescript
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

export async function triggerWebhook(event: string, data: any): Promise<void> {
  await fetch(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, timestamp: new Date().toISOString(), data }),
  }).catch(console.error); // Best-effort
}

// Eventos:
// document.sent → Email al firmante
// document.signed → Notificar emisor
// document.expired → Notificar emisor
// credits.low → Cuando quedan < 2 créditos
```

---

## 8. Variables de Entorno

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
FREETSA_URL=https://freetsa.org/tsr
ANTHROPIC_API_KEY=sk-ant-xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
N8N_WEBHOOK_URL=https://n8n.xxx.com/webhook/firmaclara
APP_URL=https://firmaclara.com
JWT_SECRET=xxx
```

---

## 9. Checklist

- [ ] Endpoints de autenticación
- [ ] CRUD de documentos
- [ ] Flujo completo de firma
- [ ] Integración FreeTSA
- [ ] Generación PDFs (firmado + certificado)
- [ ] Sistema de créditos
- [ ] Asistente Clara
- [ ] Webhooks a n8n
- [ ] Validaciones y rate limiting

---

**Fin de la guía Antigravity**
