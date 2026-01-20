# PRD: FirmaClara
## Plataforma de Envío y Firma de Documentos con Certificación Técnica

**Versión:** 1.0  
**Fecha:** Enero 2025  
**Propietario:** OPERIA  
**Distribución:** Ecosistema Multicentros

---

## 1. Resumen Ejecutivo

### 1.1 Visión del Producto

FirmaClara es una herramienta de envío y firma de documentos con certificación técnica de evidencias, diseñada para autónomos y pequeñas pymes del ecosistema Multicentros. Permite enviar documentos PDF para que los clientes los firmen online en menos de un minuto, generando un certificado de evidencias con sellado de tiempo que prueba quién firmó, cuándo y que el documento no ha sido modificado.

### 1.2 Propuesta de Valor

**Para el emisor (autónomo/pyme):**
- Envío de documentos para firma en segundos
- Sin perseguir al cliente para que devuelva el documento firmado
- Prueba técnica verificable de cada firma
- Archivo ordenado de todos los documentos
- Asistente IA (Clara) para redactar contratos

**Para el firmante (cliente del autónomo):**
- Firma desde el móvil en menos de 1 minuto
- Sin registro ni descargar apps
- Proceso intuitivo y rápido

### 1.3 Diferenciación

| Aspecto | Competencia (Signaturit, Firmafy) | FirmaClara |
|---------|-----------------------------------|------------|
| Tipo de firma | Avanzada (OTP, biometría) | Simple + evidencias técnicas |
| Precio | 24-30€/mes + compromiso anual | Packs desde 12€, sin suscripción |
| Complejidad | Media-alta | Mínima |
| Asistente IA | No | Sí (Clara) |
| Target | Empresas medianas | Autónomos y micropymes |

### 1.4 Modelo de Negocio

**Pricing (packs de contratos):**

| Pack | Contratos | Precio | Precio/contrato |
|------|-----------|--------|-----------------|
| Prueba | 2 | Gratis | 0€ |
| Básico | 10 | 12€ | 1,20€ |
| Profesional | 30 | 29€ | 0,97€ |
| Business | 100 | 69€ | 0,69€ |

**Revenue share:** Por definir con Multicentros (propuesta: 60% OPERIA / 40% Multicentros)

---

## 2. Contexto Legal

### 2.1 Marco Regulatorio

FirmaClara opera bajo el Reglamento (UE) 910/2014 (eIDAS), que establece tres niveles de firma electrónica:

| Nivel | Tipo | Validez | Carga de prueba | FirmaClara |
|-------|------|---------|-----------------|------------|
| 1 | Simple | ✅ Sí | Quien afirma debe probar | ✅ Aquí |
| 2 | Avanzada | ✅ Sí | Depende del caso | ❌ |
| 3 | Cualificada | ✅ Plena | Quien niega debe probar | ❌ |

**Artículo 25.1 eIDAS:** "No se denegarán efectos jurídicos ni admisibilidad como prueba en procedimientos judiciales a una firma electrónica por el mero hecho de ser una firma electrónica."

### 2.2 Qué Aporta FirmaClara como Prueba

| Evidencia | Qué demuestra | Peso probatorio |
|-----------|---------------|-----------------|
| Hash SHA-256 | Documento no modificado tras firma | Alto |
| Sellado de tiempo (FreeTSA) | Existía en momento exacto (tercero) | Alto |
| IP del firmante | Conexión desde donde se firmó | Medio |
| Timestamp servidor | Momento de cada evento | Medio |
| User-agent | Dispositivo/navegador usado | Medio |
| Declaración de aceptación | Firmante marcó "Acepto" | Alto |
| Nombre introducido | Identificación declarada | Medio |
| Firma manuscrita digital | Intención de firmar | Medio |

### 2.3 Tipos de Documentos Soportados

**FirmaClara ES adecuado para:**
- Presupuestos y aceptación de presupuestos
- Contratos de prestación de servicios
- Encargos de trabajo/obra
- Acuerdos de confidencialidad (NDA básicos)
- Autorizaciones (uso de imagen, datos, etc.)
- Contratos de colaboración comercial
- Contratos de mantenimiento
- Acuerdos de pago/plazos

**FirmaClara NO es adecuado para:**
- Contratos de compraventa de inmuebles
- Contratos hipotecarios
- Contratos laborales complejos
- Contratos con Administración Pública
- Testamentos o documentos notariales

### 2.4 Política de Retención

- **Duración:** 6 años (conforme al art. 30 del Código de Comercio)
- **Usuarios inactivos:** Acceso solo lectura/descarga, no pueden enviar nuevos documentos
- **Backups:** Redundantes, mínimo dos ubicaciones geográficas

---

## 3. Arquitectura Técnica

### 3.1 Stack Tecnológico

| Componente | Herramienta | Función |
|------------|-------------|---------|
| Frontend | Lovable | UI/UX, generación de componentes |
| Backend/API | Antigravity | Lógica de negocio, APIs |
| Base de datos | Supabase | PostgreSQL, autenticación, storage |
| Automatización | n8n | Emails, webhooks, flujos |
| Hosting | Vercel | Deploy frontend |
| Sellado tiempo | FreeTSA | Timestamp RFC 3161 |

### 3.2 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         FIRMACLARA                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐     ┌──────────────────────────────────────┐  │
│  │   USUARIO    │     │           LOVABLE FRONTEND           │  │
│  │   EMISOR     │────▶│  - Dashboard                         │  │
│  │              │     │  - Envío documentos                  │  │
│  └──────────────┘     │  - Asistente Clara                   │  │
│                       │  - Gestión packs                     │  │
│                       └──────────────┬───────────────────────┘  │
│                                      │                          │
│                                      ▼                          │
│                       ┌──────────────────────────────────────┐  │
│                       │         ANTIGRAVITY API              │  │
│                       │  - Auth (delegado a Supabase)        │  │
│                       │  - Gestión documentos                │  │
│                       │  - Generación PDFs                   │  │
│                       │  - Hash SHA-256                      │  │
│                       │  - Llamadas FreeTSA                  │  │
│                       │  - Asistente Clara (LLM)             │  │
│                       └────────┬─────────────┬───────────────┘  │
│                                │             │                  │
│              ┌─────────────────┘             └────────────┐     │
│              ▼                                            ▼     │
│  ┌───────────────────────┐                 ┌──────────────────┐ │
│  │       SUPABASE        │                 │      N8N         │ │
│  │  - PostgreSQL         │                 │  - Email envío   │ │
│  │  - Auth               │                 │  - Recordatorios │ │
│  │  - Storage (PDFs)     │                 │  - Webhooks      │ │
│  │  - Logs eventos       │                 │  - Notificaciones│ │
│  └───────────────────────┘                 └──────────────────┘ │
│                                                                  │
│              ┌──────────────────────────────────────────┐       │
│              │            SERVICIOS EXTERNOS            │       │
│              │  - FreeTSA (sellado tiempo)              │       │
│              │  - Resend/SendGrid (emails)              │       │
│              │  - Anthropic/OpenAI (Clara)              │       │
│              └──────────────────────────────────────────┘       │
│                                                                  │
│  ┌──────────────┐     ┌──────────────────────────────────────┐  │
│  │   FIRMANTE   │     │        PÁGINA DE FIRMA               │  │
│  │   (Cliente)  │────▶│  - Ver PDF                           │  │
│  │              │     │  - Checkbox aceptación               │  │
│  └──────────────┘     │  - Nombre + firma canvas             │  │
│                       │  - Sin registro requerido            │  │
│                       └──────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Integraciones

**Multicentros:**
- FirmaClara se integra como sección dentro del panel de usuario existente
- Autenticación delegada al sistema de Multicentros
- Arquitectura preparada para funcionar de forma independiente en el futuro

**FreeTSA (Sellado de Tiempo):**
- Protocolo: RFC 3161
- Endpoint: `https://freetsa.org/tsr`
- Coste: Gratuito
- Validez: Prueba técnica (no cualificada)

---

## 4. Modelo de Datos

### 4.1 Diagrama Entidad-Relación

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │    documents    │       │   signatures    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │──┐    │ id (PK)         │
│ multicentros_id │  │    │ user_id (FK)    │◀─┘    │ document_id(FK) │◀─┐
│ email           │  └───▶│ title           │       │ signer_name     │  │
│ name            │       │ file_url        │       │ signer_email    │  │
│ created_at      │       │ status          │       │ ip_address      │  │
│ updated_at      │       │ signature_type  │       │ user_agent      │  │
└─────────────────┘       │ signer_email    │       │ signed_at       │  │
                          │ signer_name     │       │ signature_image │  │
┌─────────────────┐       │ message         │       │ hash_sha256     │  │
│  credit_packs   │       │ expires_at      │       │ tsa_response    │  │
├─────────────────┤       │ created_at      │       │ certificate_url │  │
│ id (PK)         │       │ signed_at       │       │ created_at      │  │
│ user_id (FK)    │       └─────────────────┘       └─────────────────┘  │
│ pack_type       │                │                                     │
│ credits_total   │                │                                     │
│ credits_used    │                └─────────────────────────────────────┘
│ purchased_at    │
│ expires_at      │       ┌─────────────────┐
└─────────────────┘       │  event_logs     │
                          ├─────────────────┤
                          │ id (PK)         │
                          │ document_id(FK) │
                          │ event_type      │
                          │ event_data      │
                          │ ip_address      │
                          │ user_agent      │
                          │ created_at      │
                          └─────────────────┘
```

### 4.2 Tablas Detalladas

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  multicentros_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255),
  company_name VARCHAR(255),
  phone VARCHAR(50),
  onboarding_completed BOOLEAN DEFAULT FALSE,
  legal_accepted BOOLEAN DEFAULT FALSE,
  legal_accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### documents
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_hash VARCHAR(64), -- SHA-256 del original
  status VARCHAR(50) DEFAULT 'draft', -- draft, sent, viewed, signed, expired, cancelled
  signature_type VARCHAR(50) DEFAULT 'full', -- checkbox_only, checkbox_name, full (checkbox+name+canvas)
  signer_email VARCHAR(255),
  signer_name VARCHAR(255),
  signer_phone VARCHAR(50),
  custom_message TEXT,
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signed_file_url TEXT,
  certificate_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_signer_email ON documents(signer_email);
```

#### signatures
```sql
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id),
  signer_name VARCHAR(255) NOT NULL,
  signer_email VARCHAR(255) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  acceptance_text TEXT DEFAULT 'He leído y acepto el contenido de este documento',
  signature_image_url TEXT, -- Canvas firma dibujada
  hash_sha256 VARCHAR(64) NOT NULL,
  tsa_request BYTEA,
  tsa_response BYTEA,
  tsa_timestamp TIMESTAMPTZ,
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### credit_packs
```sql
CREATE TABLE credit_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  pack_type VARCHAR(50) NOT NULL, -- trial, basic, professional, business
  credits_total INTEGER NOT NULL,
  credits_used INTEGER DEFAULT 0,
  price_paid DECIMAL(10,2),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = no expira
  stripe_payment_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_packs_user_id ON credit_packs(user_id);
```

#### event_logs
```sql
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  user_id UUID REFERENCES users(id),
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_logs_document_id ON event_logs(document_id);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
```

### 4.3 Tipos de Eventos (event_logs)

| event_type | Descripción | event_data |
|------------|-------------|------------|
| document.created | Documento creado | `{title, file_size}` |
| document.sent | Documento enviado | `{signer_email}` |
| document.viewed | Firmante abrió enlace | `{page_views}` |
| document.signed | Documento firmado | `{signature_type}` |
| document.expired | Documento expiró | `{}` |
| document.cancelled | Emisor canceló | `{reason}` |
| document.downloaded | PDF descargado | `{file_type}` |
| credits.purchased | Pack comprado | `{pack_type, amount}` |
| credits.used | Crédito consumido | `{document_id}` |
| user.onboarding | Onboarding completado | `{}` |

---

## 5. Funcionalidades

### 5.1 Onboarding (Primera Vez)

**Flujo:**
1. Usuario accede a FirmaClara desde panel Multicentros
2. Pantalla de bienvenida con explicación del producto
3. Sección expandible "¿Qué validez tiene?" con información legal clara
4. Checkbox obligatorio de aceptación de términos
5. Asignación automática de pack de prueba (2 contratos)
6. Redirección al dashboard

**Checkbox obligatorio (texto exacto):**
> "Declaro que he leído y entiendo que FirmaClara proporciona firma electrónica simple con certificación técnica de evidencias. Entiendo que esta firma es válida legalmente pero no equivale a firma electrónica cualificada ni a firma manuscrita ante notario. Para contratos de especial relevancia económica o jurídica, consultaré con un profesional."

### 5.2 Dashboard

**Elementos:**
- Contador de créditos disponibles
- Botón "Nuevo documento"
- Botón "Hablar con Clara" (asistente IA)
- Lista de documentos recientes con estados
- Filtros por estado (todos, pendientes, firmados, expirados)
- Buscador por título o email del firmante

**Estados de documento:**
| Estado | Color | Icono | Descripción |
|--------|-------|-------|-------------|
| Borrador | Gris | 📝 | Creado pero no enviado |
| Enviado | Azul | ✉️ | Enviado, pendiente de firma |
| Visto | Amarillo | 👁️ | El firmante abrió el enlace |
| Firmado | Verde | ✅ | Firmado correctamente |
| Expirado | Rojo | ⏰ | Plazo de firma superado |
| Cancelado | Gris | ❌ | Cancelado por el emisor |

### 5.3 Envío de Documento

**Flujo:**
1. Click en "Nuevo documento"
2. Elegir origen:
   - Subir PDF existente
   - Crear con Clara (asistente IA)
3. Previsualización del documento
4. Datos del firmante:
   - Nombre (obligatorio)
   - Email (obligatorio)
5. Tipo de firma requerida:
   - Solo checkbox "Acepto"
   - Checkbox + nombre
   - Checkbox + nombre + firma dibujada (por defecto)
6. Mensaje personalizado (opcional)
7. Plazo de firma (por defecto 7 días, máximo 30)
8. Confirmación de envío
9. Se descuenta 1 crédito

**Validaciones:**
- PDF máximo 10MB
- PDF no debe tener contraseña
- Email válido
- Créditos disponibles > 0

**Aviso pre-envío (visible pero no bloquea):**
> "Recuerda: FirmaClara genera prueba técnica de firma. Para contratos de alto riesgo (inmuebles, financieros, laborales complejos), considera firma cualificada o asesoría profesional."

### 5.4 Experiencia del Firmante

**Flujo:**
1. Recibe email con asunto: "[Nombre emisor] te ha enviado un documento para firmar"
2. Click en botón "Ver y firmar documento"
3. Página de firma (sin registro):
   - Logo FirmaClara + nombre emisor
   - Visor de PDF completo
   - Al final del documento:
     - Checkbox: "He leído y acepto el contenido de este documento"
     - Campo nombre (si aplica)
     - Canvas para firma dibujada (si aplica)
   - Botón "Firmar documento"
4. Pantalla de confirmación:
   - "Documento firmado correctamente"
   - Botón descargar copia
   - Información de que el emisor ha sido notificado

**Captura de evidencias (en el momento de firmar):**
- IP del firmante
- User-agent (navegador/dispositivo)
- Timestamp del servidor
- Geolocalización aproximada (si el navegador lo permite, opcional)

### 5.5 Post-Firma

**Para el emisor:**
- Notificación por email: "Tu documento ha sido firmado"
- Dashboard actualizado con estado "Firmado"
- Disponible para descarga:
  - PDF firmado (original + página de firma)
  - Certificado de evidencias (PDF separado)

**PDF firmado (página adicional):**
```
─────────────────────────────────────────
PÁGINA DE FIRMA

Documento: [Título del documento]
Firmante: [Nombre introducido]
Email: [Email del firmante]
Fecha y hora: [DD/MM/YYYY HH:MM:SS UTC]

Declaración:
"He leído y acepto el contenido de este documento"

[Firma dibujada si aplica]

─────────────────────────────────────────
```

**Certificado de evidencias (PDF separado):**
```
─────────────────────────────────────────
CERTIFICADO DE EVIDENCIAS TÉCNICAS
FirmaClara

Documento: [Título]
ID: [UUID]

DATOS DEL EMISOR
Nombre: [Nombre]
Email: [Email]

DATOS DEL FIRMANTE
Nombre declarado: [Nombre]
Email: [Email]
IP: [XXX.XXX.XXX.XXX]
Dispositivo: [User-agent]

EVIDENCIAS TÉCNICAS
Hash SHA-256 del documento original:
[64 caracteres hexadecimales]

Hash SHA-256 del documento firmado:
[64 caracteres hexadecimales]

Sellado de tiempo (TSA):
Autoridad: FreeTSA.org
Timestamp: [ISO 8601]
Respuesta TSA: [Base64 truncado + enlace a descarga completa]

CRONOLOGÍA DE EVENTOS
[Timestamp] - Documento creado
[Timestamp] - Documento enviado
[Timestamp] - Documento visualizado por firmante
[Timestamp] - Documento firmado

─────────────────────────────────────────
AVISO LEGAL

Este certificado documenta las evidencias técnicas de 
la firma electrónica simple realizada a través de 
FirmaClara. 

La firma electrónica simple tiene efectos jurídicos 
conforme al artículo 25 del Reglamento (UE) 910/2014 
(eIDAS). Este certificado no constituye firma 
electrónica cualificada. 

En caso de disputa, las evidencias aquí recogidas 
pueden ser presentadas como prueba técnica.

FirmaClara no ofrece asesoramiento legal. Para 
cuestiones jurídicas, consulte con un profesional.
─────────────────────────────────────────
```

### 5.6 Asistente Clara (IA)

**Capacidades:**

1. **Generación de contratos:**
   - Usuario describe qué necesita en lenguaje natural
   - Clara hace preguntas para completar información
   - Genera borrador de contrato

2. **Revisión de documentos:**
   - Usuario sube contrato existente
   - Clara identifica lagunas o ambigüedades
   - Sugiere mejoras

3. **Explicación de cláusulas:**
   - Usuario selecciona texto
   - Clara explica en lenguaje sencillo

**Base de conocimiento:**
- Código Civil español (contratos, obligaciones)
- Código de Comercio
- LSSI (Ley 34/2002)
- RGPD y LOPDGDD
- Ley 7/1998 de condiciones generales

**Tipos de contrato que Clara puede generar:**
- Prestación de servicios
- Encargo de obra
- Presupuesto con condiciones
- Acuerdo de confidencialidad (NDA)
- Autorización de uso de imagen
- Contrato de colaboración
- Acuerdo de pago aplazado
- Contrato de mantenimiento

**Tipos que Clara debe rechazar:**
- Contratos de compraventa de inmuebles
- Contratos hipotecarios
- Contratos laborales
- Documentos para Administración Pública
- Testamentos

**Mensaje de rechazo:**
> "Este tipo de documento requiere firma electrónica cualificada o intervención notarial para tener plena validez legal. FirmaClara no es la herramienta adecuada para este caso. Te recomiendo consultar con un abogado o utilizar un servicio de firma cualificada."

**Disclaimers obligatorios:**

*Antes de usar Clara:*
> "Este asistente te ayuda a redactar documentos basándose en modelos generales y normativa española. No es un abogado ni sustituye asesoramiento legal profesional. Para contratos complejos o de alto valor, consulta con un profesional."

*Después de generar cualquier documento:*
> "⚠️ Documento generado con asistencia de IA. Revisa el contenido antes de usarlo. Este documento no ha sido revisado por un profesional del derecho."

*En el footer de cada contrato generado:*
> "Documento generado mediante asistente de IA. No constituye asesoramiento legal. El usuario es responsable de verificar la adecuación del contenido a su situación específica."

### 5.7 Gestión de Packs/Créditos

**Pantalla de créditos:**
- Créditos disponibles actuales
- Historial de consumo
- Botón "Comprar más créditos"

**Proceso de compra:**
1. Seleccionar pack
2. Pasarela de pago (Stripe)
3. Confirmación
4. Créditos añadidos inmediatamente

**Reglas:**
- Los créditos no caducan
- Se consumen del pack más antiguo primero (FIFO)
- Pack de prueba: solo 1 por usuario, no acumulable

### 5.8 FAQs Integradas

**Sección de ayuda accesible desde dashboard con preguntas frecuentes:**

**Sobre la validez legal:**
- ¿Los documentos firmados con FirmaClara son legales?
- ¿Es lo mismo que firmar ante notario?
- ¿Para qué tipo de documentos es suficiente?
- ¿Qué pasa si mi cliente dice que no firmó?

**Sobre el uso:**
- ¿Mi cliente necesita registrarse?
- ¿Cuánto tiempo se guardan mis documentos?
- ¿Qué pasa si no uso todos los contratos de mi pack?

**Sobre Clara:**
- ¿El asistente de IA me hace el contrato?
- ¿Los contratos generados por IA son válidos?

*(Contenido completo de FAQs en documento de conversación anterior)*

---

## 6. Flujos Técnicos

### 6.1 Flujo de Envío de Documento

```
[Usuario]                    [Frontend]                    [API]                    [Supabase]                    [n8n]
    │                            │                           │                           │                           │
    │──Sube PDF─────────────────▶│                           │                           │                           │
    │                            │──Upload file──────────────▶│                           │                           │
    │                            │                           │──Store in bucket─────────▶│                           │
    │                            │                           │◀──file_url────────────────│                           │
    │                            │                           │──Calculate SHA-256────────│                           │
    │                            │                           │──Create document record──▶│                           │
    │                            │◀──document_id─────────────│                           │                           │
    │◀──Previsualización─────────│                           │                           │                           │
    │                            │                           │                           │                           │
    │──Confirma envío───────────▶│                           │                           │                           │
    │                            │──Send document────────────▶│                           │                           │
    │                            │                           │──Check credits─────────────▶│                           │
    │                            │                           │◀──credits OK───────────────│                           │
    │                            │                           │──Update status='sent'────▶│                           │
    │                            │                           │──Decrement credit─────────▶│                           │
    │                            │                           │──Log event───────────────▶│                           │
    │                            │                           │──Trigger webhook─────────────────────────────────────▶│
    │                            │                           │                           │                           │
    │                            │                           │                           │      [Email enviado]      │
    │◀──Confirmación─────────────│                           │                           │                           │
```

### 6.2 Flujo de Firma

```
[Firmante]                   [Página Firma]                [API]                    [Supabase]                  [FreeTSA]
    │                            │                           │                           │                           │
    │──Click enlace email───────▶│                           │                           │                           │
    │                            │──Get document────────────▶│                           │                           │
    │                            │                           │──Fetch document──────────▶│                           │
    │                            │◀──document data───────────│                           │                           │
    │                            │                           │──Update status='viewed'──▶│                           │
    │                            │                           │──Log event (viewed)──────▶│                           │
    │◀──Ver PDF──────────────────│                           │                           │                           │
    │                            │                           │                           │                           │
    │──Acepta + Firma───────────▶│                           │                           │                           │
    │                            │──Capture evidences────────│ (IP, user-agent, etc)     │                           │
    │                            │──Submit signature────────▶│                           │                           │
    │                            │                           │──Generate signed PDF──────│                           │
    │                            │                           │──Calculate hash───────────│                           │
    │                            │                           │──Request TSA timestamp────────────────────────────────▶│
    │                            │                           │◀──TSA response────────────────────────────────────────│
    │                            │                           │──Generate certificate─────│                           │
    │                            │                           │──Store signed PDF────────▶│                           │
    │                            │                           │──Store certificate───────▶│                           │
    │                            │                           │──Create signature record─▶│                           │
    │                            │                           │──Update document status──▶│                           │
    │                            │                           │──Log event (signed)──────▶│                           │
    │                            │                           │──Trigger notification────────────────────────────────▶│
    │◀──Confirmación + Descarga──│                           │                           │                           │
```

### 6.3 Flujo de Clara (Asistente IA)

```
[Usuario]                    [Frontend]                    [API]                      [LLM]
    │                            │                           │                           │
    │──"Necesito contrato de     │                           │                           │
    │   diseño web"─────────────▶│                           │                           │
    │                            │──POST /clara/chat────────▶│                           │
    │                            │                           │──Build prompt with        │
    │                            │                           │  legal context───────────▶│
    │                            │                           │◀──Response with questions─│
    │◀──"¿Precio? ¿Plazo?        │                           │                           │
    │    ¿Revisiones?"───────────│                           │                           │
    │                            │                           │                           │
    │──"2500€, 2 meses,          │                           │                           │
    │   3 revisiones"───────────▶│                           │                           │
    │                            │──POST /clara/chat────────▶│                           │
    │                            │                           │──Complete prompt─────────▶│
    │                            │                           │◀──Generated contract──────│
    │                            │                           │──Add disclaimers──────────│
    │◀──Contrato generado + 
    │   disclaimer──────────────│                           │                           │
    │                            │                           │                           │
    │──"Crear PDF"──────────────▶│                           │                           │
    │                            │──POST /documents/create──▶│                           │
    │                            │                           │──Generate PDF─────────────│
    │                            │                           │──Store in Supabase────────│
    │◀──Documento creado─────────│                           │                           │
```

---

## 7. APIs

### 7.1 Endpoints Principales

#### Autenticación
```
POST   /auth/login          # Login (delegado a Multicentros)
POST   /auth/logout         # Logout
GET    /auth/me             # Usuario actual
```

#### Documentos
```
GET    /documents           # Lista documentos del usuario
POST   /documents           # Crear documento (subir PDF)
GET    /documents/:id       # Detalle documento
PUT    /documents/:id       # Actualizar documento (borrador)
DELETE /documents/:id       # Eliminar documento (solo borradores)
POST   /documents/:id/send  # Enviar documento para firma
POST   /documents/:id/cancel # Cancelar documento enviado
GET    /documents/:id/download/signed      # Descargar PDF firmado
GET    /documents/:id/download/certificate # Descargar certificado
```

#### Firma (público, sin auth)
```
GET    /sign/:token         # Obtener documento para firma
POST   /sign/:token         # Firmar documento
```

#### Créditos
```
GET    /credits             # Créditos disponibles
GET    /credits/history     # Historial de packs
POST   /credits/purchase    # Iniciar compra
POST   /credits/webhook     # Webhook de Stripe
```

#### Clara (Asistente IA)
```
POST   /clara/chat          # Enviar mensaje a Clara
POST   /clara/generate-pdf  # Generar PDF desde conversación
```

### 7.2 Ejemplos de Request/Response

#### POST /documents
```json
// Request
{
  "title": "Presupuesto diseño web",
  "file": "<base64 PDF>",
  "signer_email": "cliente@email.com",
  "signer_name": "Juan Pérez",
  "signature_type": "full",
  "custom_message": "Hola Juan, te adjunto el presupuesto acordado.",
  "expires_in_days": 7
}

// Response
{
  "id": "uuid",
  "title": "Presupuesto diseño web",
  "status": "draft",
  "file_url": "https://...",
  "created_at": "2025-01-20T10:00:00Z"
}
```

#### POST /documents/:id/send
```json
// Request
{
  "confirm": true
}

// Response
{
  "id": "uuid",
  "status": "sent",
  "sent_at": "2025-01-20T10:05:00Z",
  "sign_url": "https://firmaclara.com/sign/abc123",
  "credits_remaining": 9
}
```

#### POST /sign/:token
```json
// Request
{
  "signer_name": "Juan Pérez",
  "acceptance_checked": true,
  "signature_image": "<base64 PNG>",
  "client_timestamp": "2025-01-20T12:30:00Z"
}

// Response
{
  "success": true,
  "signed_at": "2025-01-20T12:30:05Z",
  "download_url": "https://..."
}
```

#### POST /clara/chat
```json
// Request
{
  "conversation_id": "uuid",
  "message": "Necesito un contrato para un cliente que me encarga diseñar su logo"
}

// Response
{
  "conversation_id": "uuid",
  "response": "Voy a ayudarte a crear un contrato de diseño gráfico. Necesito saber:\n\n1. ¿Precio acordado?\n2. ¿Plazo de entrega?...",
  "suggested_questions": [
    "¿Cuál es el precio?",
    "¿Plazo de entrega?",
    "¿Cuántas revisiones incluyes?"
  ],
  "can_generate": false
}
```

---

## 8. Seguridad

### 8.1 Autenticación y Autorización

- Auth delegada a Multicentros (OAuth/SSO)
- Tokens JWT con expiración de 24h
- Refresh tokens con expiración de 7 días
- Rate limiting: 100 requests/minuto por usuario

### 8.2 Protección de Documentos

- URLs de firma con tokens únicos (UUID v4)
- Tokens de firma expiran según configuración del documento
- PDFs almacenados en Supabase Storage con políticas RLS
- Solo el propietario puede acceder a sus documentos

### 8.3 Datos Sensibles

- Passwords: No aplica (auth delegada)
- Emails: Encriptados en reposo
- IPs: Almacenadas para evidencias, no compartidas
- Documentos: Encriptados en reposo (Supabase)

### 8.4 Validación de Integridad

- Hash SHA-256 calculado al subir documento
- Hash verificado antes de generar certificado
- Sellado TSA para prueba temporal
- Logs inmutables de eventos

---

## 9. Rendimiento y Escalabilidad

### 9.1 Objetivos

| Métrica | Objetivo |
|---------|----------|
| Tiempo carga dashboard | < 2s |
| Tiempo subida PDF (5MB) | < 5s |
| Tiempo generación certificado | < 3s |
| Disponibilidad | 99.5% |

### 9.2 Límites

| Recurso | Límite |
|---------|--------|
| Tamaño PDF | 10MB |
| Documentos por usuario | Sin límite |
| Requests API/minuto | 100 |
| Conversaciones Clara/día | 50 |

### 9.3 Estrategia de Caché

- Dashboard: Caché de lista de documentos (1 min)
- PDFs: CDN de Vercel/Supabase
- Sesiones: Redis (si escala)

---

## 10. Monitorización

### 10.1 Métricas Clave

**Negocio:**
- Usuarios activos (DAU/MAU)
- Documentos enviados/día
- Tasa de firma (enviados vs firmados)
- Conversión trial → pago
- Revenue por usuario

**Técnicas:**
- Latencia de APIs
- Errores por endpoint
- Uso de storage
- Llamadas a FreeTSA
- Uso de LLM (tokens Clara)

### 10.2 Alertas

| Evento | Severidad | Acción |
|--------|-----------|--------|
| Error rate > 5% | Alta | Notificar inmediatamente |
| Latencia > 5s | Media | Investigar |
| FreeTSA no responde | Alta | Fallback o notificar |
| Storage > 80% | Media | Planificar ampliación |

---

## 11. Roadmap

### 11.1 MVP (Semanas 1-6)

- [ ] Infraestructura base (Supabase, Vercel)
- [ ] Auth integrada con Multicentros
- [ ] Subida y almacenamiento de PDFs
- [ ] Envío de documentos por email
- [ ] Página de firma (checkbox + nombre + canvas)
- [ ] Generación de PDF firmado
- [ ] Generación de certificado de evidencias
- [ ] Integración FreeTSA
- [ ] Sistema de créditos básico
- [ ] Dashboard emisor
- [ ] Asistente Clara (generación contratos)

### 11.2 Fase 2 (Semanas 7-10)

- [ ] Pasarela de pago (Stripe)
- [ ] Recordatorios automáticos
- [ ] Clara: revisión de documentos
- [ ] Clara: explicación de cláusulas
- [ ] Mejoras UX según feedback
- [ ] FAQs integradas

### 11.3 Fase 3 (Futuro)

- [ ] Envío por WhatsApp
- [ ] App móvil nativa
- [ ] Múltiples firmantes por documento
- [ ] Plantillas guardadas
- [ ] API pública para integraciones
- [ ] Versión standalone (fuera de Multicentros)

---

## 12. Anexos

### 12.1 Textos Legales

**Términos de servicio:** *(Documento separado)*

**Política de privacidad:** *(Documento separado)*

**Disclaimer en certificado:**
> "Este certificado documenta las evidencias técnicas de la firma electrónica simple realizada a través de FirmaClara. La firma electrónica simple tiene efectos jurídicos conforme al artículo 25 del Reglamento (UE) 910/2014 (eIDAS). Este certificado no constituye firma electrónica cualificada. En caso de disputa, las evidencias aquí recogidas pueden ser presentadas como prueba técnica. FirmaClara no ofrece asesoramiento legal. Para cuestiones jurídicas, consulte con un profesional."

### 12.2 Glosario

| Término | Definición |
|---------|------------|
| Emisor | Usuario de FirmaClara que envía documentos |
| Firmante | Persona que recibe y firma el documento |
| Crédito | Unidad que permite enviar un documento |
| TSA | Time Stamping Authority (Autoridad de Sellado de Tiempo) |
| Hash | Huella digital única del documento (SHA-256) |
| eIDAS | Reglamento europeo de firma electrónica |

### 12.3 Referencias

- Reglamento (UE) 910/2014 (eIDAS)
- Código Civil español
- Código de Comercio español
- RFC 3161 (Time-Stamp Protocol)
- Documentación FreeTSA: https://freetsa.org

---

**Fin del documento PRD v1.0**
