# Diseño Atómico de Consumo de Créditos - FirmaClara

**Autor:** Arquitecto Backend Senior  
**Fecha:** 21 Enero 2026  
**Contexto:** PostgreSQL / Supabase  

## 1. Definición del Momento de Consumo

Para garantizar la integridad financiera y la consistencia de datos, el consumo del crédito se debe realizar **estrictamente** en el momento de la transición de estado del documento a `sent`.

*   **No al Click:** El click en el frontend es un evento inseguro y volátil.
*   **No al Envío Efectivo (Email):** El envío del correo es un efecto secundario (side-effect) asíncrono que puede fallar o reintentarse independientemente del derecho de uso.
*   **Sí a la Confirmación Transaccional (DB):** El crédito se consume **atómicamente** dentro de la misma transacción de base de datos que marca el documento como "Enviado".

**Regla de Oro:**  
> "Si el documento consta como `sent` en la base de datos, el crédito ya ha sido cobrado. Si el documento sigue en `draft`, el crédito sigue intacto."

---

## 2. Garantía de Atomicidad

Utilizaremos las capacidades ACID de PostgreSQL. La lógica se encapsulará en una Función PL/PGSQL o un bloque transaccional manejado por la API (RPC) para asegurar que todo ocurra o nada ocurra.

### Lógica Transaccional (Pseudocódigo)

```sql
BEGIN TRANSACTION;

    -- 1. Locking Pesimista del Documento (Idempotencia)
    -- Previene que dos requests paralelos procesen el mismo documento.
    SELECT status FROM documents WHERE id = 'doc_uuid' FOR UPDATE;

    -- CHECK 1: Idempotencia
    IF status IN ('sent', 'viewed', 'signed') THEN
        RETURN SUCCESS "Ya procesado";
    END IF;

    -- 2. Selección de Pack (NO FIFO estricto)
    -- Buscamos *cualquier* pack con saldo disponible para evitar lock contention
    -- en un pack específico "más viejo", aunque priorizar por fecha es razonable,
    -- el bloqueo debe ser inteligente.
    SELECT id 
    INTO v_pack_id
    FROM credit_packs 
    WHERE user_id = 'user_uuid' 
      AND credits_total > credits_used
    LIMIT 1
    FOR UPDATE SKIP LOCKED; -- Opcional: SKIP LOCKED ayuda en concurrencia masiva

    -- CHECK 2: Validación de Saldo
    IF v_pack_id IS NULL THEN
        ROLLBACK;
        RETURN ERROR "Saldo insuficiente";
    END IF;

    -- 3. Incremento Seguro (Consumo)
    UPDATE credit_packs 
    SET credits_used = credits_used + 1
    WHERE id = v_pack_id;

    -- 4. Cambio de Estado del Documento
    UPDATE documents 
    SET status = 'sent', sent_at = NOW()
    WHERE id = 'doc_uuid';

    -- 5. Audit Log (Trazabilidad)
    INSERT INTO event_logs (event_type, document_id, meta)
    VALUES ('credit_consumed', 'doc_uuid', {'pack_id': v_pack_id});

COMMIT;
```

### Prevención de Doble Consumo
1.  **Bloqueo de Fila (Row Locking):** `FOR UPDATE` en la tabla `documents` impide que dos procesos concurrentes intenten enviar el mismo documento.
2.  **Check de Estado:** La primera verificación (`IF status != 'draft'`) actúa como guardia de idempotencia natural.

---

## 3. Manejo de Edge Cases

### A. Llamadas Duplicadas (Idempotencia)
*   **Escenario:** El usuario hace doble click frenético en "Enviar".
*   **Solución:** Gracias al `FOR UPDATE` sobre el documento, la segunda transacción esperará a la primera. Al entrar, leerá el estado ya actualizado a `sent` y retornará "Éxito (Ya procesado)" sin consumir otro crédito.

### B. Fallos de Red (Cliente -> Servidor)
*   **Escenario:** El servidor procesa el consumo (COMMIT exitoso) pero la respuesta HTTP se pierde y el cliente ve un error de red.
*   **Solución:** El cliente debe reintentar. Al reintentar, entra en la lógica de "Llamada Duplicada", recibe un OK y actualiza la UI a "Enviado". **No se pierde saldo ni se cobra doble.**

### C. Fallos de Envío de Email (Servidor -> Proveedor Email)
*   **Escenario:** El crédito se consumió, el documento es `sent`, pero la API de emails falla.
*   **Solución:**
    *   **Post-Proceso:** El envío de email debe ocurrir *después* del COMMIT (o triggered vía Postgres Events / Edge Functions).
    *   **Recuperación:** Si falla el email, el usuario verá el documento como "Enviado". Se debe habilitar un botón "Reenviar Notificación" en la UI.
    *   **Política:** "Reenviar Notificación" para un documento con estado `sent` **NO consume crédito**. Solo verifica el estado y dispara el email.

### D. Concurrencia Extrema en Packs
*   **Escenario:** Múltiples procesos intentando descontar del mismo pack.
*   **Solución:** El uso de `FOR UPDATE` en `credit_packs` serializa el acceso al contador. Es aceptable dado que un usuario humano raramente envía >5 contratos por segundo.

---

## 4. Qué NO se implementa todavía

Para mantener el foco en la robustez del consumo, excluimos explícitamente:

1.  **Historial Financiero Detallado:** No estamos creando una tabla de `transactions` tipo libro mayor contable (ledger) por ahora. Confiamos en `credits_used` y `event_logs`.
2.  **Reembolsos Automáticos:** Si el usuario se arrepiente 1 segundo después, no hay botón de "Deshacer envío y devolver crédito". El consumo es final.
3.  **Notificaciones de "Saldo Bajo":** Fuera del alcance atómico.
4.  **Lógica compleja de selección de packs:** No implementaremos algoritmos de "gastar primero los que caducan pronto" (puesto que los créditos no caducan) ni "gastar packs promocionales antes". Se toma el primero disponible.

## Resumen de Arquitectura

| Concepto | Implementación |
| :--- | :--- |
| **Trigger** | RPC `send_contract(doc_id)` |
| **Lock** | `document` (primary), `credit_packs` (secondary) |
| **Validation** | Estado Documento + Saldo Pack |
| **Write** | `UPDATE credit_packs` + `UPDATE documents` |
| **Side Effect** | Email Sending (separado de la transacción de cobro) |
