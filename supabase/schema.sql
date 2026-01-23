-- ============================================
-- FIRMACLARA - ESQUEMA DE BASE DE DATOS (PRODUCTION READY)
-- ============================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: users (Linking to auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_multicentros_id ON public.users(multicentros_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: credit_packs (Must be defined early for trigger)
-- ============================================
CREATE TABLE public.credit_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
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

CREATE INDEX idx_credit_packs_user_id ON public.credit_packs(user_id);
CREATE INDEX idx_credit_packs_type ON public.credit_packs(pack_type);

-- Constraint: solo un pack trial por usuario
CREATE UNIQUE INDEX idx_credit_packs_trial_unique 
  ON public.credit_packs(user_id) 
  WHERE pack_type = 'trial';

-- ============================================
-- TRIGGER: New User Handling (Credits & Profile)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log de entrada para depuración (ver en Dashboard > Database > Postgres Logs)
  RAISE LOG 'handle_new_user called for ID: %, Email: %, Meta: %', NEW.id, NEW.email, NEW.raw_user_meta_data;

  -- 1. Insertar en public.users
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id, 
    NEW.email,
    -- Google suele mandar 'full_name' o 'name'. Fallback a 'user_name' o email.
    COALESCE(
        NEW.raw_user_meta_data->>'full_name', 
        NEW.raw_user_meta_data->>'name', 
        NEW.raw_user_meta_data->>'user_name',
        SPLIT_PART(NEW.email, '@', 1), 
        'Usuario'
    )
  );

  -- 2. Asignar pack de bienvenida
  INSERT INTO public.credit_packs (user_id, pack_type, credits_total, price_paid)
  VALUES (NEW.id, 'trial', 2, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log detallado del error
  RAISE WARNING 'CRITICAL ERROR in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  -- IMPORTANTE: No retornamos NULL, retornamos NEW para que el usuario Auth se cree 
  -- aunque la DB falle (luego podemos arreglarlo manual o reintentar).
  -- OJO: Si falla public.users, la app fallará. Pero al menos el usuario podrá logearse.
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador cuando se crea usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- TABLA: documents
-- ============================================
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
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
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_signer_email ON public.documents(signer_email);
CREATE INDEX idx_documents_sign_token ON public.documents(sign_token);
CREATE INDEX idx_documents_created_at ON public.documents(created_at DESC);

-- Trigger updated_at
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: signatures
-- ============================================
CREATE TABLE public.signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  
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

CREATE INDEX idx_signatures_document_id ON public.signatures(document_id);

-- ============================================
-- TABLA: event_logs
-- ============================================
CREATE TABLE public.event_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Referencias (opcionales)
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Evento
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB DEFAULT '{}',
  
  -- Metadata
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_event_logs_document_id ON public.event_logs(document_id);
CREATE INDEX idx_event_logs_user_id ON public.event_logs(user_id);
CREATE INDEX idx_event_logs_event_type ON public.event_logs(event_type);
CREATE INDEX idx_event_logs_created_at ON public.event_logs(created_at DESC);

-- ============================================
-- TABLA: clara_conversations
-- ============================================
CREATE TABLE public.clara_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Estado
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'abandoned')),
  
  -- Documento generado (si aplica)
  generated_document_id UUID REFERENCES public.documents(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clara_conversations_user_id ON public.clara_conversations(user_id);

CREATE TRIGGER update_clara_conversations_updated_at
  BEFORE UPDATE ON public.clara_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TABLA: clara_messages
-- ============================================
CREATE TABLE public.clara_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.clara_conversations(id) ON DELETE CASCADE,
  
  -- Mensaje
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  
  -- Metadata
  tokens_used INTEGER,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clara_messages_conversation_id ON public.clara_messages(conversation_id);
CREATE INDEX idx_clara_messages_created_at ON public.clara_messages(created_at);

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Créditos disponibles por usuario
CREATE OR REPLACE VIEW public.user_credits AS
SELECT 
  user_id,
  SUM(credits_total - credits_used) AS available_credits,
  COUNT(*) AS total_packs
FROM public.credit_packs
WHERE credits_total > credits_used
GROUP BY user_id;

-- Vista: Documentos con info de firma
CREATE OR REPLACE VIEW public.documents_with_signatures AS
SELECT 
  d.*,
  s.ip_address AS signer_ip,
  s.user_agent AS signer_user_agent,
  s.hash_sha256 AS signature_hash,
  s.tsa_timestamp
FROM public.documents d
LEFT JOIN public.signatures s ON d.id = s.document_id;

-- ============================================
-- FUNCIONES
-- ============================================

-- Función: Consumir crédito (FIFO)
CREATE OR REPLACE FUNCTION public.consume_credit(p_user_id UUID)
RETURNS TABLE(success BOOLEAN, remaining INTEGER) AS $$
DECLARE
  v_pack_id UUID;
  v_remaining INTEGER;
BEGIN
  -- Buscar pack más antiguo con créditos disponibles
  SELECT id INTO v_pack_id
  FROM public.credit_packs
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
  UPDATE public.credit_packs
  SET credits_used = credits_used + 1
  WHERE id = v_pack_id;
  
  -- Calcular restantes
  SELECT COALESCE(SUM(credits_total - credits_used), 0)::INTEGER
  INTO v_remaining
  FROM public.credit_packs
  WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT TRUE, v_remaining;
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener créditos disponibles
CREATE OR REPLACE FUNCTION public.get_available_credits(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN COALESCE(
    (SELECT SUM(credits_total - credits_used)
     FROM public.credit_packs
     WHERE user_id = p_user_id),
    0
  )::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Función: Marcar documentos expirados
CREATE OR REPLACE FUNCTION public.mark_expired_documents()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.documents
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
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clara_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clara_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para users
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para documents
CREATE POLICY "Users can view own documents" ON public.documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents" ON public.documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents" ON public.documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own drafts" ON public.documents
  FOR DELETE USING (
    auth.uid() = user_id 
    AND status = 'draft'
  );

-- Políticas para credit_packs
CREATE POLICY "Users can view own credits" ON public.credit_packs
  FOR SELECT USING (auth.uid() = user_id);

-- Políticas para clara
CREATE POLICY "Users can view own conversations" ON public.clara_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations" ON public.clara_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own messages" ON public.clara_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.clara_conversations 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- DATOS INICIALES
-- ============================================

-- Tipos de packs con precios
CREATE TABLE public.pack_types (
  type VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  price_per_credit DECIMAL(10,2) GENERATED ALWAYS AS (price / credits) STORED
);

INSERT INTO public.pack_types (type, name, credits, price) VALUES
  ('trial', 'Prueba', 2, 0),
  ('basic', 'Básico', 10, 12),
  ('professional', 'Profesional', 30, 29),
  ('business', 'Business', 100, 69)
ON CONFLICT (type) DO NOTHING;

