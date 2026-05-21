# Comportamiento de Negocio: Reenvíos de Contratos

Este documento define las reglas de negocio, lógica funcional y experiencia de usuario asociadas al "reenvío" de contratos en FirmaClara. 

El objetivo es garantizar la consistencia con la política de **"1 contrato enviado = 1 crédito"** y evitar fugas de ingresos, manteniendo una experiencia justa para el usuario.

---

## 1. Definiciones Fundamentales

Para determinar si una acción consume crédito, distinguimos entre tres conceptos:

### A. Reenvío (Recordatorio)
Acción de volver a notificar al **mismo destinatario** sobre un contrato **ya enviado** y pendiente de firma. No hay cambios en el documento ni en los datos del firmante.
* **Propósito:** Recordar al usuario que tiene una tarea pendiente.
* **Consumo:** 🚫 0 Créditos.

### B. Corrección de Entrega
Acción de modificar **exclusivamente la dirección de email** de un destinatario que no ha accedido al documento (ej. por error tipográfico o buzón lleno) y volver a enviar la notificación.
* **Propósito:** Asegurar que el contrato llegue al destino previsto originalmente.
* **Consumo:** 🚫 0 Créditos (Se considera parte del esfuerzo del "envío original").

### C. Nuevo Envío (Nueva Transacción)
Cualquier acción que implique **alterar el contenido del contrato**, añadir nuevos firmantes no previstos, o iniciar un proceso nuevo tras una finalización (rechazo/firma).
* **Propósito:** Iniciar un nuevo proceso de acuerdo legal.
* **Consumo:** 🪙 1 Crédito.

---

## 2. Matriz de Casos y Consumo

| Escenario | Acción del Usuario | Resultado del Sistema | Coste |
| :--- | :--- | :--- | :--- |
| **Recordatorio Manual** | Clic en "Reenviar notificación" a un firmante pendiente. | Se envía email de recordatorio. | **0** |
| **Corrección de Email** | El usuario detecta error en email (`juan@gmal.com`). Edita el email y reenvía. | Se actualiza el registro del firmante. Se invalida el link anterior. Se envía nuevo link. | **0** |
| **Error en Documento** | El usuario nota una errata en el PDF enviado. Cancela y sube uno corregido. | El contrato A se cancela. Se crea contrato B. | **1** (por el contrato B) |
| **Rechazo por Firmante** | El firmante rechaza. El usuario envía el Mismo contrato de nuevo. | Nuevo ciclo de vida/ID de contrato (aunque el PDF sea idéntico). | **1** |
| **Añadir Firmante** | El usuario olvidó un firmante. Cancela y crea uno nuevo con los dos firmantes. | Nuevo ciclo de vida. | **1** |
| **Caducidad** | El contrato cadancó por plazo. Usuario lo reactiva/reenvía. | Se genera una nueva instancia de firma. | **1** |

> **Nota:** La política "N firma = 1 crédito" se aplica por "Envelope" (Sobre). Si modifico el "Sobre" (documento base), es un nuevo Sobre. Si modifico la "Dirección" (email) de un sobre existente, es el mismo Sobre.

---

## 3. Gestión de Excepciones

### 3.1 Rechazo del Firmante
Si un firmante marca "Rechazar":
1.  El contrato pasa a estado `REJECTED` (Final).
2.  No se puede "reactivar".
3.  **Acción:** El usuario debe duplicar el borrador y realizar un **Nuevo Envío**.
4.  **Coste:** 1 Crédito (Nueva negociación).

### 3.2 Cancelación Manual
Si el emisor cancela el contrato (`VOID`):
1.  El contrato queda invalidado inmediatamente.
2.  **Política de Créditos:** NO se devuelve el crédito consumido.
    *   *Razón:* El servicio de "preparación, custodia y notificación" ya se prestó.
    *   *Excepción:* Si la cancelación ocurre < 5 minutos tras el envío SIN visualización del firmante ("Undo send"), se podría evaluar técnicamente en el futuro, pero por defecto en v1: **No Refund**.

### 3.3 Error Técnico (Delivery Failure)
Si el envío falla por error del sistema (SMTP error, caída de servidor):
1.  El sistema debe permitir "Reintentar" (`Retry`).
2.  **Coste:** 0 Créditos. El servicio no se prestó con éxito.

---

## 4. Impacto en UX y Comunicación

### 4.1 Mensajes y Avisos

**Al corregir un email (Gratis):**
> "Hemos actualizado la dirección y reenviado la notificación a [nuevo@email.com]. Este cambio no consume créditos adicionales."

**Al reenviar recordatorio (Gratis):**
> "Recordatorio enviado correctamente. Puedes enviar hasta 3 recordatorios por día." (Límite anti-spam recomendado).

**Al reenviar tras rechazo/cancelación (Pago):**
> "Vas a crear un nuevo envío basado en este documento. Se consumirá **1 crédito** de tu saldo. ¿Continuar?"

### 4.2 Feedback Visual de Consumo
En el historial de créditos, los reenvíos gratuitos NO deben generar ruido.
*   **Envío Original:** `-1 Crédito`
*   **Recordatorio:** (No aparece o aparece como "Log" informativo, no transaccional).
*   **Nuevo Envío:** `-1 Crédito`

### 4.3 Prevención de Errores (Safety Checks)
Para evitar frustración por consumo accidental:
1.  **Vista Previa Obligatoria:** Antes de descontar el crédito, mostrar siempre el resumen final.
2.  **Advertencia de Edición:** Si el usuario intenta editar un documento enviado, mostrar modal: *"Editar este documento requiere cancelarlo y crear uno nuevo (1 crédito). ¿Prefieres solo corregir el email del destinatario (Gratis)?"*

---

## 5. Resumen de Reglas para Desarrollo

1.  **Inmutabilidad del Documento:** Un contrato enviado (`SENT`) no puede cambiar su archivo PDF. Requiere nuevo envío.
2.  **Mutabilidad del Destinatario:** Se permite editar `signer_email` mientras el estado sea `SENT` (no `VIEWED` ni `SIGNED`).
3.  **Idempotencia del Crédito:** Mismo `contract_id` = Mismo crédito. Nuevo `contract_id` = Nuevo crédito.
