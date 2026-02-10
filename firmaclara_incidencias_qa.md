# FirmaClara - Informe de Testing QA
## Incidencias detectadas y puntos de acción para desarrollo

**Fecha:** Febrero 2026  
**Versión testeada:** MVP Beta  
**Prioridad de resolución:** Crítica antes de lanzamiento

---

## RESUMEN EJECUTIVO

Se han detectado **19 incidencias** agrupadas en:
- 🔴 **Críticas (bloquean uso):** 7
- 🟠 **Importantes (afectan UX severamente):** 8  
- 🟡 **Mejoras UX (deseables):** 4

---

## 🔴 INCIDENCIAS CRÍTICAS (Prioridad 1)

### INC-001: Funciones Edge con errores al enviar contrato
**Descripción:** Error al enviar el contrato. Las funciones edge no están funcionando correctamente.  
**Impacto:** Bloquea la funcionalidad core del producto.  
**Acción requerida:**
```
1. Revisar logs de todas las edge functions en Vercel
2. Verificar conexión Antigravity → Supabase → n8n
3. Testear endpoint de envío de contrato aislado
4. Verificar que el token de firma se genera correctamente
5. Comprobar que el email se dispara desde n8n
```
**Criterio de aceptación:** Usuario puede enviar contrato y firmante recibe email con enlace funcional.

---

### INC-002: Envío infinito sin créditos
**Descripción:** Si el usuario intenta enviar un contrato sin créditos, la UI se queda en estado de "enviando" infinitamente sin feedback.  
**Impacto:** Usuario no sabe qué ocurre, experiencia muy negativa.  
**Acción requerida:**
```javascript
// Antes de iniciar envío, verificar créditos
async function handleSendContract() {
  const credits = await checkUserCredits(userId);
  
  if (credits <= 0) {
    // Mostrar modal de sin créditos
    showNoCreditModal({
      title: "Sin créditos disponibles",
      message: "Necesitas créditos para enviar documentos a firmar.",
      cta: "Comprar créditos",
      onConfirm: () => navigateTo('/comprar-creditos')
    });
    return; // No continuar con envío
  }
  
  // Continuar con envío normal
  await sendContract();
}
```
**Criterio de aceptación:** Si créditos = 0, mostrar modal inmediatamente, no iniciar proceso de envío.

---

### INC-003: No se pueden seleccionar packs de créditos
**Descripción:** Los packs de créditos no son seleccionables en la página de compra.  
**Impacto:** Bloquea monetización, usuarios no pueden comprar.  
**Acción requerida:**
```
1. Verificar que los botones/cards de packs tienen onClick handler
2. Comprobar estado de selección (selectedPack state)
3. Verificar integración con pasarela de pago
4. Testear flujo completo: selección → pago → confirmación → créditos añadidos
```
**Criterio de aceptación:** Usuario puede seleccionar pack, pagar y ver créditos reflejados en su cuenta.

---

### INC-004: Asistente Clara IA no funciona
**Descripción:** La opción de asistente de IA no funciona.  
**Impacto:** Diferenciador principal del producto no disponible.  
**Acción requerida:**
```
1. Verificar llamada a Claude API desde backend
2. Comprobar API key configurada en variables de entorno
3. Verificar endpoint /api/clara o equivalente
4. Testear prompt base y respuesta
5. Comprobar que UI muestra respuesta correctamente
```
**Criterio de aceptación:** Usuario puede interactuar con Clara y recibir respuestas.

---

### INC-005: Soporte no funciona (email ni chat)
**Descripción:** Ni el botón de enviar email ni el chat de soporte funcionan.  
**Impacto:** Usuario sin vía de comunicación, crítico para confianza.  
**Acción requerida:**
```
1. Verificar mailto: link o formulario de contacto
2. Si hay chat: verificar integración (Crisp, Intercom, etc.)
3. Implementar fallback mínimo: formulario que envíe a n8n → email
4. Alternativa rápida: WhatsApp business link
```
**Criterio de aceptación:** Al menos una vía de contacto funcional.

---

### INC-006: Exportar datos no funciona
**Descripción:** La función de exportar datos no funciona.  
**Impacto:** Obligación legal RGPD (derecho de portabilidad).  
**Acción requerida:**
```
1. Implementar endpoint /api/export-user-data
2. Generar ZIP con: datos personales, documentos, historial
3. Enviar por email o descarga directa
4. Loggear solicitud para compliance
```
**Criterio de aceptación:** Usuario puede descargar sus datos en formato estándar.

---

### INC-007: Página post-confirmación de cuenta
**Descripción:** Cuando el usuario confirma su cuenta, no hay feedback visual ni redirección.  
**Impacto:** Usuario perdido tras confirmar email.  
**Acción requerida:**
```
1. Crear página /cuenta-confirmada
2. Mostrar mensaje: "¡Cuenta confirmada!"
3. Botón CTA: "Ir al Dashboard"
4. Redirección automática tras 3 segundos (opcional)
```
**Criterio de aceptación:** Tras confirmar email, usuario ve página de éxito y puede acceder al dashboard.

---

## 🟠 INCIDENCIAS IMPORTANTES (Prioridad 2)

### INC-008: Continuar documento en borrador
**Descripción:** Si se guarda un documento en borrador, no hay opción visible de continuar con él.  
**Impacto:** Usuario pierde trabajo, mala UX.  
**Acción requerida:**
```
1. En Dashboard, mostrar sección "Borradores" o badge en documentos
2. Estado "draft" visible con icono diferenciado
3. Botón "Continuar editando" en cada borrador
4. Al hacer click, cargar estado guardado en editor
```
**Criterio de aceptación:** Borradores visibles en dashboard con opción de continuar.

---

### INC-009: Mensaje para firmante no aparece
**Descripción:** El mensaje personalizado para el firmante no aparece ni al enviar ni al firmar.  
**Impacto:** Funcionalidad prometida no funciona.  
**Acción requerida:**
```
1. Guardar campo "mensaje_firmante" en DB al crear envío
2. Incluir mensaje en email de notificación
3. Mostrar mensaje en página de firma antes del documento
4. Incluir mensaje en confirmación post-firma
```
**Criterio de aceptación:** Mensaje visible en email y página de firma.

---

### INC-010: Responsive roto - Logo gigante
**Descripción:** En móvil, el logo se ve desproporcionadamente grande.  
**Impacto:** Mala primera impresión, parece no profesional.  
**Acción requerida:**
```css
/* Header responsive */
.logo {
  max-width: 120px; /* Desktop */
  height: auto;
}

@media (max-width: 768px) {
  .logo {
    max-width: 80px;
  }
}

@media (max-width: 480px) {
  .logo {
    max-width: 60px;
  }
}
```
**Criterio de aceptación:** Logo proporcional en todos los breakpoints (mobile, tablet, desktop).

---

### INC-011: Botones de acción para Clara IA
**Descripción:** Clara necesita botones predefinidos para que el usuario no tenga que pensar qué escribir.  
**Impacto:** Fricción de uso, usuarios no saben cómo empezar.  
**Acción requerida:**
```jsx
// Botones sugeridos para Clara
const claraQuickActions = [
  { label: "📄 Crear contrato de servicios", prompt: "Quiero crear un contrato de prestación de servicios" },
  { label: "💰 Crear presupuesto", prompt: "Quiero crear un presupuesto para un cliente" },
  { label: "🤝 Contrato de colaboración", prompt: "Necesito un contrato de colaboración entre empresas" },
  { label: "🔒 Acuerdo de confidencialidad", prompt: "Quiero crear un NDA" },
  { label: "✅ Autorización de uso de imagen", prompt: "Necesito una autorización para usar fotos de un cliente" },
  { label: "📋 Aceptación de condiciones", prompt: "Quiero crear un documento de aceptación de condiciones" }
];

// Renderizar como chips/botones clicables
<div className="clara-quick-actions">
  {claraQuickActions.map(action => (
    <button 
      key={action.label}
      onClick={() => sendToClara(action.prompt)}
      className="quick-action-chip"
    >
      {action.label}
    </button>
  ))}
</div>
```
**Criterio de aceptación:** Clara muestra 4-6 botones de acciones rápidas antes de que el usuario escriba.

---

### INC-012: Aviso de 0 créditos (popup proactivo)
**Descripción:** Cuando el usuario tiene 0 créditos, debería recibir aviso proactivo.  
**Impacto:** Usuario descubre que no tiene créditos cuando intenta enviar (tarde).  
**Acción requerida:**
```javascript
// En Dashboard, al cargar
useEffect(() => {
  if (userCredits === 0) {
    showToast({
      type: "warning",
      title: "Sin créditos",
      message: "No tienes créditos disponibles. Compra un pack para enviar documentos.",
      action: {
        label: "Comprar",
        onClick: () => navigateTo('/comprar-creditos')
      },
      duration: 10000 // 10 segundos visible
    });
  }
}, [userCredits]);
```
**Criterio de aceptación:** Al entrar al dashboard con 0 créditos, aparece aviso no intrusivo.

---

### INC-013: Verificar créditos ANTES de generar con Clara
**Descripción:** Si el usuario no tiene créditos, no debería poder generar un contrato con Clara (va a perder tiempo).  
**Impacto:** Frustración: genera documento que luego no puede enviar.  
**Acción requerida:**
```javascript
// Antes de abrir Clara o al intentar generar
function handleGenerateWithClara() {
  if (userCredits <= 0) {
    showModal({
      title: "Necesitas créditos",
      message: "Para generar y enviar documentos necesitas al menos 1 crédito.",
      primaryCTA: "Comprar créditos",
      secondaryCTA: "Cancelar"
    });
    return;
  }
  openClaraAssistant();
}
```
**Criterio de aceptación:** Si créditos = 0, aviso antes de iniciar generación.

---

### INC-014: Sección de contactos útil
**Descripción:** La sección de contactos existe pero no tiene función práctica.  
**Impacto:** Feature muerta, confusión del usuario.  
**Acción requerida:**
```
Opción A: Integrar en flujo de envío
1. Al enviar documento, mostrar selector de contactos guardados
2. Click en contacto → autocompleta nombre y email
3. Opción "Guardar este contacto" al enviar a nuevo destinatario

Opción B: Si no hay tiempo, ocultar sección temporalmente
- Comentar/ocultar enlace a Contactos en menú
- Reactivar en Fase 2
```
**Criterio de aceptación:** Contactos se pueden seleccionar al enviar documento O sección oculta temporalmente.

---

### INC-015: Mejorar UX de compra de créditos
**Descripción:** La experiencia de compra de créditos necesita mejora.  
**Impacto:** Fricción en monetización.  
**Acción requerida:**
```
1. Cards de packs claramente diferenciadas (destacar "Popular")
2. Precio por contrato visible en cada pack
3. Comparativa visual: "Ahorras X€"
4. Botón de compra prominente con precio
5. Mostrar créditos actuales del usuario
6. Confirmación clara post-compra
7. Loader durante procesamiento de pago
```
**Diseño sugerido:**
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    BÁSICO       │  │   PROFESIONAL   │  │    BUSINESS     │
│                 │  │   ⭐ POPULAR    │  │                 │
│  10 contratos   │  │  30 contratos   │  │  100 contratos  │
│                 │  │                 │  │                 │
│     12€         │  │      29€        │  │      69€        │
│  (1,20€/ud)     │  │   (0,97€/ud)    │  │   (0,69€/ud)    │
│                 │  │                 │  │   Ahorras 51€   │
│  [ Comprar ]    │  │  [ Comprar ]    │  │  [ Comprar ]    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```
**Criterio de aceptación:** Packs seleccionables, precio claro, flujo de compra completo.

---

## 🟡 MEJORAS UX (Prioridad 3)

### INC-016: Ocultar "Eliminar cuenta"
**Descripción:** El botón de eliminar cuenta está demasiado visible y "da ganas de pulsarlo".  
**Impacto:** Riesgo de bajas accidentales, sensación negativa.  
**Acción requerida:**
```
1. Mover a: Configuración → Avanzado → Eliminar cuenta
2. O: Configuración → scroll hasta el final, letra pequeña
3. Color gris/neutro, no rojo prominente
4. Requiere confirmación con escribir "ELIMINAR"
5. Mantener funcional por RGPD
```
**Criterio de aceptación:** Opción existe pero no es prominente. Requiere confirmación.

---

### INC-017: Editar perfil
**Descripción:** No hay opción visible de editar el perfil del usuario.  
**Impacto:** Usuario no puede actualizar sus datos.  
**Acción requerida:**
```
1. Añadir sección "Mi perfil" en menú lateral o dropdown
2. Campos editables: Nombre, Email (con verificación), Teléfono
3. Datos de empresa: Nombre comercial, NIF, Dirección
4. Logo/Avatar (opcional)
5. Botón "Guardar cambios"
```
**Criterio de aceptación:** Usuario puede ver y editar sus datos de perfil.

---

### INC-018: Informe de firmas estilo ZapSign
**Descripción:** El informe de firmas debe ser más completo, similar a ZapSign.  
**Impacto:** Mejora percepción de profesionalidad.  
**Acción requerida:**
```
Investigar informe ZapSign e incluir:
- Timeline visual de eventos
- Datos del firmante destacados
- Visualización del hash
- QR de verificación
- Diseño más profesional/limpio
```
**Referencia:** Solicitar ejemplo de informe ZapSign para replicar estructura.  
**Criterio de aceptación:** Informe de evidencias con formato profesional y completo.

---

### INC-019: Mejorar lógica de compra de créditos
**Descripción:** La lógica backend de compra de créditos necesita revisión.  
**Impacto:** Posibles errores en asignación de créditos.  
**Acción requerida:**
```
1. Verificar transacción de pago confirmada antes de añadir créditos
2. Usar transacciones DB para evitar race conditions
3. Loggear cada compra con: user_id, pack, amount, payment_ref, timestamp
4. Implementar idempotencia (evitar doble cobro/doble crédito)
5. Email de confirmación con recibo
```
**Criterio de aceptación:** Compra → pago confirmado → créditos añadidos → email recibo. Sin duplicados.

---

## CHECKLIST DE VERIFICACIÓN PRE-LANZAMIENTO

### Funcionalidad Core
- [ ] Envío de contrato funciona end-to-end
- [ ] Firmante recibe email y puede firmar
- [ ] Certificado de evidencias se genera correctamente
- [ ] Créditos se descuentan tras envío exitoso

### Pagos
- [ ] Packs seleccionables
- [ ] Pago procesa correctamente
- [ ] Créditos se añaden tras pago
- [ ] No hay doble cobro posible

### Clara IA
- [ ] Responde a consultas
- [ ] Genera documentos
- [ ] Botones de acción rápida funcionan

### UX Crítica
- [ ] Responsive funciona (especialmente logo)
- [ ] Borradores recuperables
- [ ] Avisos de créditos claros
- [ ] Soporte contactable

### Legal/Compliance
- [ ] Exportar datos funciona
- [ ] Eliminar cuenta funciona (aunque oculto)
- [ ] Disclaimers visibles

---

## ORDEN DE PRIORIDAD SUGERIDO

1. **INC-001** - Edge functions (bloquea todo)
2. **INC-003** - Selección de packs (bloquea monetización)
3. **INC-004** - Clara IA (diferenciador principal)
4. **INC-002** - Envío infinito sin créditos
5. **INC-005** - Soporte (confianza)
6. **INC-010** - Responsive/logo
7. **INC-011** - Botones Clara
8. **INC-008** - Borradores
9. **INC-007** - Página confirmación cuenta
10. Resto en orden de documento

---

## NOTAS PARA ANTIGRAVITY

**Entorno de testing:** [URL del staging]  
**Credenciales de test:** [Proporcionar]  
**Contacto para dudas:** [Email/Slack]  

**Importante:** Cada fix debe ser testeado en staging antes de merge a producción. Documentar cualquier cambio en estructura de DB o endpoints de API.
