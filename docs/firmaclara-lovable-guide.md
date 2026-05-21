# Guía de Implementación: Lovable (Frontend)
## FirmaClara - Interfaz de Usuario

---

## 1. Visión General

Esta guía detalla la implementación del frontend de FirmaClara usando Lovable. El objetivo es crear una interfaz mobile-first, intuitiva y profesional para autónomos y pequeñas pymes con nivel digital bajo-medio.

### 1.1 Principios de Diseño

| Principio | Aplicación |
|-----------|------------|
| Mobile-first | Diseñar primero para móvil, luego adaptar a desktop |
| Simplicidad | Máximo 3 clicks para cualquier acción principal |
| Claridad | Textos cortos, iconos descriptivos, estados visuales claros |
| Confianza | Transmitir seguridad y profesionalidad |
| Accesibilidad | Contraste adecuado, textos legibles, áreas táctiles grandes |

### 1.2 Stack Frontend

- **Framework:** React (generado por Lovable)
- **Styling:** Tailwind CSS
- **Estado:** React Query + Context
- **Routing:** React Router
- **Iconos:** Lucide React
- **Componentes:** shadcn/ui

---

## 2. Estructura de Páginas

### 2.1 Mapa del Sitio

```
/
├── /onboarding                    # Primera vez
├── /dashboard                     # Panel principal
├── /documents                     # Lista de documentos
│   ├── /documents/new             # Nuevo documento
│   ├── /documents/:id             # Detalle documento
│   └── /documents/:id/preview     # Previsualización
├── /clara                         # Asistente IA
├── /credits                       # Gestión créditos
│   └── /credits/purchase          # Comprar packs
├── /settings                      # Configuración
├── /help                          # Ayuda y FAQs
└── /sign/:token                   # Página firma (pública)
```

### 2.2 Layouts

**AuthenticatedLayout** (páginas protegidas):
```
┌─────────────────────────────────────────┐
│  Logo    [Créditos: 8]    [≡ Menú]     │  ← Header
├─────────────────────────────────────────┤
│                                         │
│           Contenido página              │  ← Main
│                                         │
├─────────────────────────────────────────┤
│  🏠   📄   ✨   💳   ⚙️               │  ← Bottom nav (móvil)
└─────────────────────────────────────────┘
```

**PublicLayout** (página de firma):
```
┌─────────────────────────────────────────┐
│     Logo FirmaClara                     │
│     "Documento de [Nombre Emisor]"      │
├─────────────────────────────────────────┤
│                                         │
│           Contenido firma               │
│                                         │
├─────────────────────────────────────────┤
│     Powered by FirmaClara               │
└─────────────────────────────────────────┘
```

---

## 3. Componentes por Página

### 3.1 Onboarding (`/onboarding`)

**Objetivo:** Explicar el producto y obtener aceptación legal.

**Pantallas (wizard de 3 pasos):**

#### Paso 1: Bienvenida
```
┌─────────────────────────────────────────┐
│                                         │
│         [Ilustración FirmaClara]        │
│                                         │
│     Bienvenido a FirmaClara             │
│                                         │
│  Envía documentos y que tus clientes    │
│  los firmen en menos de un minuto.      │
│  Con prueba técnica verificable.        │
│                                         │
│         [Continuar →]                   │
│                                         │
└─────────────────────────────────────────┘
```

#### Paso 2: Explicación de validez
```
┌─────────────────────────────────────────┐
│     ← Atrás                             │
│                                         │
│     ¿Qué validez tiene?                 │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ FirmaClara genera firma           │  │
│  │ electrónica simple con            │  │
│  │ certificado de evidencias.        │  │
│  │                                   │  │
│  │ ✅ Válida legalmente (eIDAS)      │  │
│  │ ✅ Prueba técnica verificable     │  │
│  │ ✅ Suficiente para contratos      │  │
│  │    comerciales del día a día      │  │
│  │                                   │  │
│  │ ⚠️ No equivale a firma notarial  │  │
│  │    ni firma cualificada           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  [▼ Ver más detalles]                   │
│                                         │
│         [Continuar →]                   │
│                                         │
└─────────────────────────────────────────┘
```

#### Paso 3: Aceptación
```
┌─────────────────────────────────────────┐
│     ← Atrás                             │
│                                         │
│     Casi listo                          │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │ ☐ Declaro que he leído y          │  │
│  │   entiendo que FirmaClara         │  │
│  │   proporciona firma electrónica   │  │
│  │   simple con certificación        │  │
│  │   técnica de evidencias...        │  │
│  │   [leer completo]                 │  │
│  └───────────────────────────────────┘  │
│                                         │
│  🎁 Tienes 2 envíos de prueba gratis   │
│                                         │
│      [Empezar a usar FirmaClara]        │
│         (deshabilitado sin check)       │
│                                         │
└─────────────────────────────────────────┘
```

**Componentes necesarios:**
- `OnboardingWizard`
- `OnboardingStep`
- `LegalCheckbox`
- `ExpandableInfo`

---

### 3.2 Dashboard (`/dashboard`)

**Objetivo:** Vista rápida del estado y acceso a acciones principales.

```
┌─────────────────────────────────────────┐
│  FirmaClara    [8 créditos]    [≡]     │
├─────────────────────────────────────────┤
│                                         │
│  Buenos días, [Nombre]                  │
│                                         │
│  ┌─────────────┐  ┌─────────────┐      │
│  │  + Nuevo    │  │  ✨ Clara   │      │
│  │  documento  │  │  Asistente  │      │
│  └─────────────┘  └─────────────┘      │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📊 Resumen                             │
│  ┌─────────────────────────────────┐   │
│  │ Pendientes    Firmados   Total  │   │
│  │     3            12        15   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  📄 Documentos recientes                │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📄 Presupuesto web           ✉️ │   │
│  │    cliente@email.com             │   │
│  │    Enviado hace 2h               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 📄 Contrato diseño logo      ✅ │   │
│  │    otro@email.com                │   │
│  │    Firmado hace 1 día            │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Ver todos los documentos →]           │
│                                         │
├─────────────────────────────────────────┤
│  🏠   📄   ✨   💳   ⚙️               │
└─────────────────────────────────────────┘
```

**Componentes necesarios:**
- `DashboardHeader`
- `CreditsBadge`
- `QuickActions` (botones nuevo documento + Clara)
- `StatsCard`
- `DocumentList`
- `DocumentListItem`
- `BottomNavigation`

---

### 3.3 Nuevo Documento (`/documents/new`)

**Objetivo:** Crear y enviar un documento para firma.

#### Paso 1: Origen del documento
```
┌─────────────────────────────────────────┐
│  ← Cancelar         Nuevo documento     │
├─────────────────────────────────────────┤
│                                         │
│  ¿Cómo quieres crear el documento?      │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📤 Subir PDF                   │   │
│  │  Sube un documento que ya       │   │
│  │  tengas preparado               │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  ✨ Crear con Clara             │   │
│  │  El asistente te ayuda a        │   │
│  │  redactar el documento          │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

#### Paso 2a: Subir PDF
```
┌─────────────────────────────────────────┐
│  ← Atrás              Subir documento   │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │     [Icono documento]           │   │
│  │                                 │   │
│  │  Arrastra un PDF aquí o         │   │
│  │  [Seleccionar archivo]          │   │
│  │                                 │   │
│  │  Máximo 10MB                    │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│  Título del documento                   │
│  ┌─────────────────────────────────┐   │
│  │ Presupuesto diseño web          │   │
│  └─────────────────────────────────┘   │
│                                         │
│         [Continuar →]                   │
│                                         │
└─────────────────────────────────────────┘
```

#### Paso 3: Datos del firmante
```
┌─────────────────────────────────────────┐
│  ← Atrás           Datos del firmante   │
├─────────────────────────────────────────┤
│                                         │
│  ¿Quién debe firmar?                    │
│                                         │
│  Nombre *                               │
│  ┌─────────────────────────────────┐   │
│  │ Juan Pérez                      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Email *                                │
│  ┌─────────────────────────────────┐   │
│  │ juan@email.com                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Tipo de firma                          │
│  ┌─────────────────────────────────┐   │
│  │ ○ Solo checkbox "Acepto"        │   │
│  │   Nivel básico de confirmación  │   │
│  ├─────────────────────────────────┤   │
│  │ ○ Checkbox + nombre             │   │
│  │   Confirmación con nombre       │   │
│  ├─────────────────────────────────┤   │
│  │ ● Checkbox + nombre + firma  ⭐ │   │
│  │   Máxima prueba (recomendado)   │   │
│  └─────────────────────────────────┘   │
│                                         │
│         [Continuar →]                   │
│                                         │
└─────────────────────────────────────────┘
```

#### Paso 4: Opciones adicionales
```
┌─────────────────────────────────────────┐
│  ← Atrás                    Opciones    │
├─────────────────────────────────────────┤
│                                         │
│  Mensaje para el firmante (opcional)    │
│  ┌─────────────────────────────────┐   │
│  │ Hola Juan, te envío el          │   │
│  │ presupuesto que comentamos.     │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Plazo para firmar                      │
│  ┌─────────────────────────────────┐   │
│  │ 7 días                      [▼] │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ⚠️ Recuerda: FirmaClara genera        │
│  prueba técnica de firma. Para          │
│  contratos de alto riesgo, considera    │
│  firma cualificada.                     │
│                                         │
│         [Revisar y enviar →]            │
│                                         │
└─────────────────────────────────────────┘
```

#### Paso 5: Confirmación
```
┌─────────────────────────────────────────┐
│  ← Atrás                      Revisar   │
├─────────────────────────────────────────┤
│                                         │
│  📄 Presupuesto diseño web              │
│  ┌─────────────────────────────────┐   │
│  │  [Miniatura PDF]                │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│  [Ver documento completo]               │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Firmante                               │
│  Juan Pérez (juan@email.com)            │
│                                         │
│  Tipo de firma                          │
│  Checkbox + nombre + firma dibujada     │
│                                         │
│  Plazo                                  │
│  7 días (expira 27/01/2025)             │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  💳 Se usará 1 crédito                  │
│     (Te quedarán 7)                     │
│                                         │
│       [Enviar documento]                │
│                                         │
└─────────────────────────────────────────┘
```

**Componentes necesarios:**
- `DocumentWizard`
- `SourceSelector`
- `FileUploader`
- `SignerForm`
- `SignatureTypeSelector`
- `DocumentPreview`
- `SendConfirmation`

---

### 3.4 Detalle Documento (`/documents/:id`)

```
┌─────────────────────────────────────────┐
│  ← Documentos                           │
├─────────────────────────────────────────┤
│                                         │
│  📄 Presupuesto diseño web              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │         ✅ FIRMADO              │   │
│  │     20/01/2025 a las 14:32      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Firmante                               │
│  👤 Juan Pérez                          │
│  ✉️ juan@email.com                      │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Cronología                             │
│  ● 20/01 14:32 - Firmado               │
│  ○ 20/01 14:30 - Visto por firmante    │
│  ○ 20/01 10:00 - Enviado               │
│  ○ 20/01 09:55 - Creado                │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📥 Descargar PDF firmado       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📜 Descargar certificado       │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Componentes necesarios:**
- `DocumentDetail`
- `StatusBadge`
- `SignerInfo`
- `Timeline`
- `DownloadButtons`

---

### 3.5 Asistente Clara (`/clara`)

```
┌─────────────────────────────────────────┐
│  ← Dashboard              Clara ✨      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ✨ Hola, soy Clara              │   │
│  │                                 │   │
│  │ Te ayudo a crear contratos y    │   │
│  │ documentos. Cuéntame qué        │   │
│  │ necesitas.                      │   │
│  │                                 │   │
│  │ ⚠️ Recuerda: soy una           │   │
│  │ herramienta de ayuda, no        │   │
│  │ sustituyo a un abogado.         │   │
│  └─────────────────────────────────┘   │
│                                         │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Necesito un contrato para un    │ 👤│
│  │ cliente que me encarga diseñar  │   │
│  │ su web                          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ ✨ Perfecto, te ayudo con un   │   │
│  │ contrato de desarrollo web.     │   │
│  │                                 │   │
│  │ Necesito saber:                 │   │
│  │ 1. ¿Precio acordado?            │   │
│  │ 2. ¿Plazo de entrega?           │   │
│  │ 3. ¿Cuántas revisiones?         │   │
│  └─────────────────────────────────┘   │
│                                         │
│                                         │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │ Escribe tu mensaje...        [→]│   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Cuando Clara genera un contrato:**
```
┌─────────────────────────────────────────┐
│  ┌─────────────────────────────────┐   │
│  │ ✨ He generado el contrato.     │   │
│  │                                 │   │
│  │ ┌─────────────────────────┐    │   │
│  │ │ 📄 Contrato desarrollo  │    │   │
│  │ │    web                  │    │   │
│  │ │                         │    │   │
│  │ │ [Ver] [Editar] [Enviar] │    │   │
│  │ └─────────────────────────┘    │   │
│  │                                 │   │
│  │ ⚠️ Documento generado con IA.  │   │
│  │ Revísalo antes de enviarlo.    │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Componentes necesarios:**
- `ClaraChat`
- `ClaraMessage`
- `UserMessage`
- `ClaraDisclaimer`
- `GeneratedDocument`
- `ChatInput`

---

### 3.6 Página de Firma (`/sign/:token`) - PÚBLICA

**Objetivo:** Permitir al firmante ver y firmar el documento sin registro.

```
┌─────────────────────────────────────────┐
│         FirmaClara                      │
│  Documento de [Nombre Emisor]           │
├─────────────────────────────────────────┤
│                                         │
│  📄 Presupuesto diseño web              │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │                                 │   │
│  │        [Visor PDF]              │   │
│  │                                 │   │
│  │                                 │   │
│  │  Página 1 de 3   [◀] [▶]       │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Para firmar este documento:            │
│                                         │
│  ☐ He leído y acepto el contenido      │
│    de este documento                    │
│                                         │
│  Tu nombre *                            │
│  ┌─────────────────────────────────┐   │
│  │ Juan Pérez                      │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Tu firma                               │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │     [Canvas para dibujar]       │   │
│  │                                 │   │
│  │              [Borrar]           │   │
│  └─────────────────────────────────┘   │
│                                         │
│       [Firmar documento]                │
│                                         │
├─────────────────────────────────────────┤
│     Powered by FirmaClara               │
└─────────────────────────────────────────┘
```

**Pantalla de confirmación:**
```
┌─────────────────────────────────────────┐
│         FirmaClara                      │
├─────────────────────────────────────────┤
│                                         │
│            ✅                           │
│                                         │
│     Documento firmado                   │
│     correctamente                       │
│                                         │
│     20 de enero de 2025, 14:32          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  📥 Descargar mi copia          │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Nombre Emisor] ha sido notificado.    │
│                                         │
│  Ya puedes cerrar esta ventana.         │
│                                         │
├─────────────────────────────────────────┤
│     Powered by FirmaClara               │
└─────────────────────────────────────────┘
```

**Componentes necesarios:**
- `SigningPage`
- `PDFViewer`
- `AcceptanceCheckbox`
- `NameInput`
- `SignatureCanvas`
- `SigningConfirmation`

---

### 3.7 Gestión de Créditos (`/credits`)

```
┌─────────────────────────────────────────┐
│  ← Dashboard                  Créditos  │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │                                 │   │
│  │         8 créditos              │   │
│  │         disponibles             │   │
│  │                                 │   │
│  │      [Comprar más]              │   │
│  │                                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Historial                              │
│                                         │
│  📤 Presupuesto web              -1    │
│     20/01/2025                         │
│                                         │
│  📤 Contrato diseño              -1    │
│     18/01/2025                         │
│                                         │
│  💳 Pack Básico (10)            +10    │
│     15/01/2025                         │
│                                         │
│  🎁 Pack prueba                  +2    │
│     10/01/2025                         │
│                                         │
└─────────────────────────────────────────┘
```

**Pantalla de compra:**
```
┌─────────────────────────────────────────┐
│  ← Créditos              Comprar pack   │
├─────────────────────────────────────────┤
│                                         │
│  Elige tu pack                          │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Básico                         │   │
│  │  10 contratos                   │   │
│  │                        12€      │   │
│  │  1,20€ por contrato             │   │
│  │                     [Elegir]    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Profesional          ⭐        │   │
│  │  30 contratos                   │   │
│  │                        29€      │   │
│  │  0,97€ por contrato             │   │
│  │                     [Elegir]    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Business                       │   │
│  │  100 contratos                  │   │
│  │                        69€      │   │
│  │  0,69€ por contrato             │   │
│  │                     [Elegir]    │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Los créditos no caducan                │
│                                         │
└─────────────────────────────────────────┘
```

**Componentes necesarios:**
- `CreditsOverview`
- `CreditHistory`
- `CreditHistoryItem`
- `PackSelector`
- `PackCard`

---

## 4. Componentes Compartidos

### 4.1 Navegación

**Header:**
```jsx
<Header>
  <Logo />
  <CreditsBadge count={8} />
  <MenuButton />
</Header>
```

**BottomNavigation (móvil):**
```jsx
<BottomNavigation>
  <NavItem icon="home" label="Inicio" to="/dashboard" />
  <NavItem icon="file" label="Documentos" to="/documents" />
  <NavItem icon="sparkles" label="Clara" to="/clara" />
  <NavItem icon="credit-card" label="Créditos" to="/credits" />
  <NavItem icon="settings" label="Ajustes" to="/settings" />
</BottomNavigation>
```

### 4.2 Feedback

**StatusBadge:**
```jsx
<StatusBadge status="signed" />   // Verde: "Firmado"
<StatusBadge status="sent" />     // Azul: "Enviado"
<StatusBadge status="viewed" />   // Amarillo: "Visto"
<StatusBadge status="expired" />  // Rojo: "Expirado"
<StatusBadge status="draft" />    // Gris: "Borrador"
```

**Toast notifications:**
```jsx
<Toast type="success" message="Documento enviado correctamente" />
<Toast type="error" message="Error al subir el archivo" />
<Toast type="info" message="Tu cliente ha abierto el documento" />
```

### 4.3 Formularios

**Input estándar:**
```jsx
<Input
  label="Email"
  type="email"
  placeholder="cliente@email.com"
  error="Introduce un email válido"
  required
/>
```

**SignatureCanvas:**
```jsx
<SignatureCanvas
  width={300}
  height={150}
  onSignature={(dataUrl) => setSignature(dataUrl)}
  onClear={() => setSignature(null)}
/>
```

---

## 5. Estados y Gestión de Datos

### 5.1 Contextos

**AuthContext:**
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}
```

**CreditsContext:**
```typescript
interface CreditsContextType {
  available: number;
  isLoading: boolean;
  refresh: () => void;
  hasCredits: () => boolean;
}
```

### 5.2 React Query - Queries principales

```typescript
// Documentos del usuario
const { data: documents } = useQuery(['documents'], fetchDocuments);

// Detalle de documento
const { data: document } = useQuery(['document', id], () => fetchDocument(id));

// Créditos
const { data: credits } = useQuery(['credits'], fetchCredits);

// Documento para firmar (público)
const { data: signingData } = useQuery(['signing', token], () => fetchSigningData(token));
```

### 5.3 React Query - Mutations

```typescript
// Crear documento
const createDocument = useMutation(createDocumentAPI, {
  onSuccess: () => queryClient.invalidateQueries(['documents'])
});

// Enviar documento
const sendDocument = useMutation(sendDocumentAPI, {
  onSuccess: () => {
    queryClient.invalidateQueries(['documents']);
    queryClient.invalidateQueries(['credits']);
  }
});

// Firmar documento
const signDocument = useMutation(signDocumentAPI);

// Comprar pack
const purchasePack = useMutation(purchasePackAPI);
```

---

## 6. Responsive Design

### 6.1 Breakpoints

```css
/* Mobile first */
sm: 640px   /* Móvil grande */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Desktop grande */
```

### 6.2 Adaptaciones principales

| Componente | Móvil | Desktop |
|------------|-------|---------|
| Navegación | Bottom nav | Sidebar |
| Lista documentos | Cards apiladas | Tabla |
| Formularios | Full width | Max 600px centrado |
| Chat Clara | Full screen | Panel lateral |
| PDF Viewer | Full width | Centrado con zoom |

---

## 7. Instrucciones para Lovable

### 7.1 Prompt inicial sugerido

```
Crea una aplicación web llamada FirmaClara para firmar documentos online.

Stack: React + Tailwind + shadcn/ui + React Router + React Query

Diseño: Mobile-first, limpio, profesional. Colores principales: azul (#2563eb) 
y verde para éxito (#10b981).

Páginas necesarias:
1. /onboarding - Wizard de 3 pasos para nuevos usuarios
2. /dashboard - Panel principal con accesos rápidos y documentos recientes
3. /documents - Lista de documentos con filtros
4. /documents/new - Wizard para crear y enviar documento
5. /documents/:id - Detalle de documento
6. /clara - Chat con asistente IA
7. /credits - Gestión de créditos
8. /sign/:token - Página pública para firmar (sin login)

Componentes clave:
- SignatureCanvas: Canvas para dibujar firma con el dedo/ratón
- PDFViewer: Visor de PDF con paginación
- StatusBadge: Badge con colores según estado (enviado, firmado, etc.)

La app debe funcionar principalmente en móvil (autónomos pequeños).
```

### 7.2 Iteraciones sugeridas

1. **Primera iteración:** Estructura básica + navegación + dashboard
2. **Segunda iteración:** Flujo completo de envío de documento
3. **Tercera iteración:** Página de firma (pública)
4. **Cuarta iteración:** Chat con Clara
5. **Quinta iteración:** Gestión de créditos + compra
6. **Sexta iteración:** Pulido UX + estados vacíos + loading states

---

## 8. Checklist de Implementación

### 8.1 Páginas

- [ ] Onboarding (wizard 3 pasos)
- [ ] Dashboard
- [ ] Lista documentos
- [ ] Nuevo documento (wizard)
- [ ] Detalle documento
- [ ] Chat Clara
- [ ] Créditos
- [ ] Compra packs
- [ ] Página de firma (pública)
- [ ] Configuración/perfil
- [ ] FAQs/Ayuda

### 8.2 Componentes

- [ ] Header + navegación
- [ ] BottomNavigation
- [ ] StatusBadge
- [ ] DocumentListItem
- [ ] FileUploader
- [ ] SignatureCanvas
- [ ] PDFViewer
- [ ] ClaraChat
- [ ] PackCard
- [ ] Timeline

### 8.3 Integraciones

- [ ] Auth con Multicentros
- [ ] API de documentos
- [ ] API de Clara
- [ ] Stripe checkout
- [ ] Notificaciones toast

### 8.4 UX

- [ ] Loading states en todas las acciones
- [ ] Estados vacíos (sin documentos, etc.)
- [ ] Mensajes de error claros
- [ ] Confirmaciones antes de acciones destructivas
- [ ] Responsive en todos los tamaños

---

**Fin de la guía de implementación Lovable**
