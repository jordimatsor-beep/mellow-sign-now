# Esquema de Base de Datos: Supabase
## FirmaClara - PostgreSQL + Storage + Auth

---

## 1. Configuración Inicial

### 1.1 Crear Proyecto Supabase

1. Ir a https://supabase.com
2. Crear nuevo proyecto "firmaclara"
3. Región: eu-central-1 (Frankfurt) - más cercano a España
4. Guardar credenciales:
   - Project URL
   - anon key
   - service_role key

---

## 2. Tablas SQL

### 2.1 Script de Creación Completo

```sql
-- ============================================
-- FIRMACLARA - ESQUEMA DE BASE DE DATOS
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: users
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_multicentros_id ON users(multicentros_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: documents
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Información básica
  title VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_hash VARCHAR(64), -- SHA-256 del original
  
  -- Estado
  status VARCHAR(50) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'expired', 'cancelled')),
  
  -- Configuración de firma
  signature_type VARCHAR(50) DEFAULT 'full'
    CHECK (signature_type IN ('checkbox_only', 'checkbox_name', 'full')),
  sign_token VARCHAR(255) UNIQUE, -- Token para URL de firma
  
  -- Datos del firmante
  signer_email VARCHAR(255),
  signer_name VARCHAR(255),
  signer_phone VARCHAR(50),
  custom_message TEXT,
  
  -- Timestamps
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Archivos generados
  signed_file_url TEXT,
  certificate_url TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_signer_email ON documents(signer_email);
CREATE INDEX idx_documents_sign_token ON documents(sign_token);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- Trigger updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: signatures
-- ============================================
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  
  -- Datos del firmante
  signer_name VARCHAR(255) NOT NULL,
  signer_email VARCHAR(255) NOT NULL,
  
  -- Evidencias técnicas
  ip_address INET,
  user_agent TEXT,
  acceptance_text TEXT DEFAULT 'He leído y acepto el contenido de este documento',
  
  -- Firma visual
  signature_image_url TEXT,
  
  -- Certificación
  hash_sha256 VARCHAR(64) NOT NULL,
  tsa_request BYTEA,
  tsa_response BYTEA,
  tsa_timestamp TIMESTAMPTZ,
  
  -- Timestamps
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_signatures_document_id ON signatures(document_id);

-- ============================================
-- TABLA: credit_packs
-- ============================================
CREATE TABLE credit_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tipo de pack
  pack_type VARCHAR(50) NOT NULL
    CHECK (pack_type IN ('trial', 'basic', 'professional', 'business')),
  
  -- Créditos
  credits_total INTEGER NOT NULL,
  credits_used INTEGER DEFAULT 0,
  
  -- Pago
  price_paid DECIMAL(10,2) DEFAULT 0,
  stripe_payment_id VARCHAR(255),
  stripe_session_id VARCHAR(255),
  
  -- Timestamps
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- NULL = no expira
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_credit_packs_user_id ON credit_packs(user_id);
CREATE INDEX idx_credit_packs_type ON credit_packs(pack_type);

-- Constraint: solo un pack trial por usuario
CREATE UNIQUE INDEX idx_credit_packs_trial_unique 
  ON credit_packs(user_id) 
  WHERE pack_type = 'trial';

-- ============================================
-- TABLA: event_logs
-- ============================================
CREATE TABLE event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Referencias (opcionales)
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Evento
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_event_logs_document_id ON event_logs(document_id);
CREATE INDEX idx_event_logs_user_id ON event_logs(user_id);
CREATE INDEX idx_event_logs_event_type ON event_logs(event_type);
CREATE INDEX idx_event_logs_created_at ON event_logs(created_at DESC);

-- ============================================
-- TABLA: clara_conversations
-- ============================================
CREATE TABLE clara_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  
  -- Documento generado (si aplica)
  generated_document_id UUID REFERENCES documents(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_clara_conversations_user_id ON clara_conversations(user_id);

-- Trigger updated_at
CREATE TRIGGER update_clara_conversations_updated_at
  BEFORE UPDATE ON clara_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: clara_messages
-- ============================================
CREATE TABLE clara_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES clara_conversations(id) ON DELETE CASCADE,
  
  -- Mensaje
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Metadata
  tokens_used INTEGER,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_clara_messages_conversation_id ON clara_messages(conversation_id);
CREATE INDEX idx_clara_messages_created_at ON clara_messages(created_at);

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Créditos disponibles por usuario
CREATE VIEW user_credits AS
SELECT 
  user_id,
  SUM(credits_total - credits_used) AS available_credits,
  COUNT(*) AS total_packs
FROM credit_packs
WHERE credits_total > credits_used
GROUP BY user_id;

-- Vista: Documentos con info de firma
CREATE VIEW documents_with_signatures AS
SELECT 
  d.*,
  s.ip_address AS signer_ip,
  s.user_agent AS signer_user_agent,
  s.hash_sha256 AS signature_hash,
  s.tsa_timestamp
FROM documents d
LEFT JOIN signatures s ON d.id = s.document_id;

-- ============================================
-- FUNCIONES
-- ============================================

-- Función: Consumir crédito (FIFO)
CREATE OR REPLACE FUNCTION consume_credit(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, remaining INTEGER) AS $$
DECLARE
  v_pack_id UUID;
  v_remaining INTEGER;
BEGIN
  -- Buscar pack más antiguo con créditos disponibles
  SELECT id INTO v_pack_id
  FROM credit_packs
  WHERE user_id = p_user_id
    AND credits_total > credits_used
  ORDER BY purchased_at ASC
  LIMIT 1
  FOR UPDATE;
  
  IF v_pack_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0;
    RETURN;
  END IF;
  
  -- Incrementar créditos usados
  UPDATE credit_packs
  SET credits_used = credits_used + 1
  WHERE id = v_pack_id;
  
  -- Calcular restantes
  SELECT COALESCE(SUM(credits_total - credits_used), 0)::INTEGER
  INTO v_remaining
  FROM credit_packs
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT TRUE, v_remaining;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener créditos disponibles
CREATE OR REPLACE FUNCTION get_available_credits(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(credits_total - credits_used)
     FROM credit_packs
     WHERE user_id = p_user_id),
    0
  )::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Función: Marcar documentos expirados
CREATE OR REPLACE FUNCTION mark_expired_documents()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE documents
  SET status = 'expired'
  WHERE status IN ('sent', 'viewed')
    AND expires_at < NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE clara_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clara_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Políticas para documents
CREATE POLICY "Users can view own documents" ON documents
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own drafts" ON documents
  FOR DELETE USING (
    auth.uid()::text = user_id::text 
    AND status = 'draft'
  );

-- Políticas para credit_packs
CREATE POLICY "Users can view own credits" ON credit_packs
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Políticas para clara
CREATE POLICY "Users can view own conversations" ON clara_conversations
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create conversations" ON clara_conversations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can view own messages" ON clara_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM clara_conversations 
      WHERE user_id::text = auth.uid()::text
    )
  );

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Tipos de packs con precios
CREATE TABLE pack_types (
  type VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  price_per_credit DECIMAL(10,2) GENERATED ALWAYS AS (price / credits) STORED
);

INSERT INTO pack_types (type, name, credits, price) VALUES
  ('trial', 'Prueba', 2, 0),
  ('basic', 'Básico', 10, 12),
  ('professional', 'Profesional', 30, 29),
  ('business', 'Business', 100, 69);
```

---

## 3. Storage Buckets

### 3.1 Configuración de Buckets

```sql
-- Crear buckets en Supabase Storage

-- Bucket para documentos originales (subidos por usuario)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false);

-- Bucket para documentos firmados
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed', 'signed', false);

-- Bucket para certificados
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false);

-- Bucket para firmas dibujadas
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', false);
```

### 3.2 Políticas de Storage

```sql
-- Política: Usuarios pueden subir a documents/
CREATE POLICY "Users can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Usuarios pueden ver sus documentos
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('documents', 'signed', 'certificates')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Política: Service role puede todo (para backend)
CREATE POLICY "Service role full access"
ON storage.objects
USING (auth.role() = 'service_role');
```

### 3.3 Estructura de Carpetas

```
documents/
  └── {user_id}/
      └── {document_id}.pdf

signed/
  └── {document_id}.pdf

certificates/
  └── {document_id}.pdf

signatures/
  └── {signature_id}.png
```

---

## 4. Tipos de Eventos (event_logs)

| event_type | Descripción | event_data |
|------------|-------------|------------|
| user.created | Usuario creado | `{}` |
| user.onboarding_completed | Onboarding completado | `{}` |
| document.created | Documento creado | `{title, file_size}` |
| document.sent | Documento enviado | `{signer_email}` |
| document.viewed | Firmante abrió enlace | `{}` |
| document.signed | Documento firmado | `{ip, user_agent}` |
| document.expired | Documento expiró | `{}` |
| document.cancelled | Cancelado por emisor | `{reason}` |
| document.downloaded | PDF descargado | `{type: 'signed'|'certificate'}` |
| credits.purchased | Pack comprado | `{pack_type, price}` |
| credits.used | Crédito consumido | `{document_id}` |
| credits.trial_granted | Pack prueba asignado | `{}` |
| clara.conversation_started | Chat iniciado | `{}` |
| clara.document_generated | Documento generado | `{document_id}` |

---

## 5. Queries Comunes

### 5.1 Dashboard del Usuario

```sql
-- Documentos recientes
SELECT id, title, status, signer_name, signer_email, 
       created_at, sent_at, signed_at
FROM documents
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 10;

-- Estadísticas
SELECT 
  COUNT(*) FILTER (WHERE status IN ('sent', 'viewed')) AS pending,
  COUNT(*) FILTER (WHERE status = 'signed') AS signed,
  COUNT(*) AS total
FROM documents
WHERE user_id = $1;

-- Créditos disponibles
SELECT get_available_credits($1);
```

### 5.2 Obtener Documento para Firma

```sql
-- Por token (público)
SELECT 
  d.id, d.title, d.file_url, d.signature_type, 
  d.signer_name, d.signer_email, d.custom_message,
  d.expires_at, d.status,
  u.name AS sender_name, u.company_name AS sender_company
FROM documents d
JOIN users u ON d.user_id = u.id
WHERE d.sign_token = $1
  AND d.status IN ('sent', 'viewed');
```

### 5.3 Historial de Créditos

```sql
-- Compras + consumos
SELECT 
  'purchased' AS type,
  credits_total AS amount,
  pack_type,
  price_paid AS price,
  purchased_at AS timestamp
FROM credit_packs
WHERE user_id = $1

UNION ALL

SELECT 
  'used' AS type,
  -1 AS amount,
  NULL AS pack_type,
  NULL AS price,
  el.created_at AS timestamp
FROM event_logs el
WHERE el.user_id = $1
  AND el.event_type = 'credits.used'

ORDER BY timestamp DESC;
```

---

## 6. Migraciones Futuras

### 6.1 Añadir Múltiples Firmantes (Fase 3)

```sql
-- Tabla para múltiples firmantes por documento
CREATE TABLE document_signers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id),
  signer_email VARCHAR(255) NOT NULL,
  signer_name VARCHAR(255),
  sign_order INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'pending',
  signed_at TIMESTAMPTZ,
  signature_id UUID REFERENCES signatures(id)
);
```

### 6.2 Añadir Plantillas (Fase 3)

```sql
-- Plantillas guardadas por usuario
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 7. Backup y Retención

### 7.1 Política de Retención

- **Documentos firmados:** 6 años (requisito legal)
- **Event logs:** 2 años
- **Conversaciones Clara:** 90 días
- **Backups automáticos:** Habilitados en Supabase Pro

### 7.2 Script de Limpieza

```sql
-- Ejecutar mensualmente
-- Limpiar event_logs antiguos (>2 años)
DELETE FROM event_logs
WHERE created_at < NOW() - INTERVAL '2 years';

-- Limpiar conversaciones Clara abandonadas (>90 días)
DELETE FROM clara_conversations
WHERE status = 'abandoned'
  AND updated_at < NOW() - INTERVAL '90 days';
```

---

## 8. Checklist de Configuración

- [ ] Crear proyecto Supabase
- [ ] Ejecutar script SQL de tablas
- [ ] Crear buckets de storage
- [ ] Configurar políticas RLS
- [ ] Configurar políticas de storage
- [ ] Insertar datos iniciales (pack_types)
- [ ] Configurar backups automáticos
- [ ] Guardar credenciales en variables de entorno
- [ ] Probar conexión desde Antigravity

---

**Fin del esquema Supabase**
