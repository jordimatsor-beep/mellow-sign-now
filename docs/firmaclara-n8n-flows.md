# Guía de Implementación: n8n
## FirmaClara - Automatizaciones y Notificaciones

---

## 1. Visión General

n8n maneja todas las automatizaciones y notificaciones de FirmaClara:
- Envío de emails transaccionales
- Recordatorios automáticos
- Notificaciones de eventos
- Tareas programadas (cron)

### 1.1 Flujos Principales

| Flujo | Trigger | Acción |
|-------|---------|--------|
| Email documento enviado | Webhook | Email al firmante |
| Email documento firmado | Webhook | Email al emisor |
| Recordatorio firma | Cron diario | Email recordatorio |
| Documentos expirados | Cron diario | Marcar + notificar |
| Créditos bajos | Webhook | Email al usuario |

---

## 2. Configuración Inicial

### 2.1 Credenciales

**Resend (Email):**
- API Key: `re_xxxx`

**Supabase:**
- Host: `https://xxx.supabase.co`
- Service Role Key: `eyJxxx`

### 2.2 Webhook URL

```
https://tu-n8n.com/webhook/firmaclara
```

---

## 3. Flujo: Documento Enviado

**Trigger:** Webhook `document.sent`

### Payload

```json
{
  "event": "document.sent",
  "data": {
    "document_title": "Presupuesto web",
    "sender_name": "María García",
    "signer_name": "Juan Pérez",
    "signer_email": "juan@email.com",
    "sign_url": "https://firmaclara.com/sign/abc123",
    "expires_at": "2025-01-27T10:00:00Z",
    "custom_message": "Te envío el presupuesto."
  }
}
```

### Email al Firmante

**Asunto:** `{{sender_name}} te ha enviado un documento para firmar`

**Contenido:**
- Nombre del documento
- Mensaje personalizado (si existe)
- Botón "Ver y firmar documento"
- Fecha de expiración

---

## 4. Flujo: Documento Firmado

**Trigger:** Webhook `document.signed`

### Payload

```json
{
  "event": "document.signed",
  "data": {
    "document_title": "Presupuesto web",
    "sender_email": "maria@email.com",
    "sender_name": "María García",
    "signer_name": "Juan Pérez",
    "signed_at": "2025-01-20T14:32:00Z",
    "download_url": "https://firmaclara.com/documents/uuid"
  }
}
```

### Email al Emisor

**Asunto:** `✅ {{signer_name}} ha firmado "{{document_title}}"`

**Contenido:**
- Confirmación de firma
- Fecha y hora
- Botón "Ver documento firmado"

---

## 5. Flujo: Recordatorios

**Trigger:** Cron diario (9:00 AM)

### Query Supabase

```sql
SELECT d.*, u.name AS sender_name
FROM documents d
JOIN users u ON d.user_id = u.id
WHERE d.status IN ('sent', 'viewed')
  AND d.sent_at < NOW() - INTERVAL '3 days'
  AND d.expires_at > NOW();
```

### Email Recordatorio

**Asunto:** `Recordatorio: Documento pendiente de firmar`

---

## 6. Flujo: Documentos Expirados

**Trigger:** Cron diario (00:00)

### Acciones

1. Marcar documentos expirados en Supabase
2. Notificar a los emisores

### Query

```sql
UPDATE documents
SET status = 'expired'
WHERE status IN ('sent', 'viewed')
  AND expires_at < NOW()
RETURNING *;
```

---

## 7. Flujo: Créditos Bajos

**Trigger:** Webhook `credits.low`

### Payload

```json
{
  "event": "credits.low",
  "data": {
    "user_email": "maria@email.com",
    "user_name": "María García",
    "credits_remaining": 1
  }
}
```

### Email

**Asunto:** `⚠️ Te queda 1 crédito en FirmaClara`

---

## 8. Estructura del Webhook Principal

Un único endpoint que rutea según evento:

```
POST /webhook/firmaclara

Switch por event:
├── document.sent → Email firmante
├── document.signed → Email emisor
├── document.viewed → (opcional) Email emisor
└── credits.low → Email usuario
```

---

## 9. Configuración de Email

### Dominio Verificado

En Resend, configurar:
- Dominio: `firmaclara.com`
- Records: SPF, DKIM, DMARC

### From Email

```
FirmaClara <notificaciones@firmaclara.com>
```

---

## 10. Checklist

- [ ] Configurar credenciales Resend
- [ ] Configurar credenciales Supabase
- [ ] Crear webhook endpoint
- [ ] Flujo: Document Sent
- [ ] Flujo: Document Signed
- [ ] Flujo: Reminders (cron 9:00)
- [ ] Flujo: Expired (cron 00:00)
- [ ] Flujo: Credits Low
- [ ] Verificar dominio email
- [ ] Probar todos los flujos

---

**Fin de la guía n8n**
