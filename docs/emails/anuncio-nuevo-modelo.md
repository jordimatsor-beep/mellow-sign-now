# Email a usuarios · Cambio al nuevo modelo de precios (PRD §8.4)

Comunicación a todos los usuarios existentes. Mensaje clave: **el cambio de
modelo no les hace perder ningún crédito**.

- **Asunto:** Cambiamos cómo funcionan los créditos en FirmaClara (y no pierdes nada)
- **Preheader:** Tus créditos actuales siguen intactos. Te contamos qué cambia en 1 minuto.
- **Remitente:** FirmaClara `<noreply@firmaclara.es>`
- **Variable de personalización:** `{{nombre}}`

Para enviarlo tienes dos vías:
1. **Script incluido** `scripts/send_pricing_announcement.mjs` (Resend + Supabase). Por defecto hace *dry-run*; ver más abajo.
2. **n8n / campaña de Resend**: pega el HTML de abajo y mapea `{{nombre}}`.

---

## Versión texto plano

```
Hola {{nombre}},

Te escribimos para contarte un cambio en FirmaClara. Hasta ahora funcionábamos
con créditos de pago único. A partir de ahora tienes planes mensuales más claros
y, si lo prefieres, packs sueltos cuando los necesites.

Lo primero, lo más importante: los créditos que ya tienes NO se pierden. Siguen
en tu cuenta como saldo y se gastan antes que nada.

Qué cambia:
- Gratis — 0 €/mes — 2 firmas al mes
- Básico — 9 €/mes — 10 firmas al mes
- Profesional — 19 €/mes — 50 firmas al mes (+ firmas extra a 0,40 €)
- Pack puntual — 15 € — 15 firmas que no caducan

No tienes que hacer nada. Si no quieres cambiar, sigues en el plan Gratis con 2
firmas cada mes, sin coste.

Ver los planes: https://www.firmaclara.es/precios

Un saludo,
El equipo de FirmaClara
```

---

## Versión HTML

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;line-height:1.5;">
  <div style="width:100%;background:#f3f4f6;padding:40px 0;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,.1);">
      <div style="padding:30px 40px;text-align:center;border-bottom:1px solid #f3f4f6;">
        <span style="font-size:24px;font-weight:800;color:#111827;letter-spacing:-.5px;">Firma<span style="color:#2563eb;">Clara</span></span>
      </div>
      <div style="padding:40px;">
        <h1 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#111827;">Cambiamos cómo funcionan los créditos</h1>
        <p style="margin:0 0 16px;color:#4b5563;font-size:16px;">Hola <strong>{{nombre}}</strong>,</p>
        <p style="margin:0 0 16px;color:#4b5563;font-size:16px;">Hasta ahora FirmaClara funcionaba con créditos de pago único. A partir de ahora tienes <strong>planes mensuales más claros</strong> y, si lo prefieres, packs sueltos cuando los necesites.</p>
        <div style="background:#ecfdf5;border-left:4px solid #10b981;padding:16px;margin:20px 0;border-radius:4px;">
          <p style="margin:0;color:#065f46;font-weight:600;">Tus créditos actuales no se pierden.</p>
          <p style="margin:8px 0 0;color:#047857;">Siguen en tu cuenta como saldo y se gastan antes que nada.</p>
        </div>
        <table role="presentation" width="100%" style="border-collapse:collapse;margin:8px 0 24px;">
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#111827;"><strong>Gratis</strong></td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#4b5563;">0 € · 2 firmas/mes</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#111827;"><strong>Básico</strong></td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#4b5563;">9 €/mes · 10 firmas/mes</td></tr>
          <tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#111827;"><strong>Profesional</strong></td><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;text-align:right;color:#4b5563;">19 €/mes · 50 firmas/mes</td></tr>
          <tr><td style="padding:8px 0;color:#111827;"><strong>Pack puntual</strong></td><td style="padding:8px 0;text-align:right;color:#4b5563;">15 € · 15 firmas (no caducan)</td></tr>
        </table>
        <p style="margin:0 0 24px;color:#4b5563;font-size:16px;">No tienes que hacer nada: si no quieres cambiar, sigues en el plan <strong>Gratis con 2 firmas al mes</strong>, sin coste.</p>
        <div style="text-align:center;margin:8px 0 8px;">
          <a href="https://www.firmaclara.es/precios" style="display:inline-block;padding:14px 32px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Ver los planes</a>
        </div>
      </div>
      <div style="padding:24px 40px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
        <p style="font-size:12px;color:#9ca3af;margin:0;">&copy; 2026 FirmaClara · Si tienes dudas, responde a este correo.</p>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## Enviar con el script

```powershell
$env:SUPABASE_URL = "https://pmzfwwtgjvlvuawxguiw.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "service_role_key..."
$env:RESEND_API_KEY = "re_..."

# 1) Prueba a tu propio correo:
node scripts/send_pricing_announcement.mjs --test tu@email.com

# 2) Simulación (cuenta destinatarios, no envía):
node scripts/send_pricing_announcement.mjs

# 3) Envío real (requiere --confirm):
node scripts/send_pricing_announcement.mjs --confirm
```
