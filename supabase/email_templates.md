# Plantillas de Email para FirmaClara (Supabase Auth)

Copia y pega este contenido en el Dashboard de Supabase: `Authentication` > `Email Templates`.

---

## 1. Confirm Your Signup (Confirmación de registro)

**Subject:** Confirma tu cuenta en FirmaClara

**Body:**
```html
<h2>Confirma tu cuenta</h2>

<p>Sigue este enlace para confirmar tu usuario:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=signup&redirect_to={{ .RedirectTo }}">Confirmar mi cuenta</a></p>

<p>Si no has solicitado esto, puedes ignorar este correo.</p>
<p>Saludos,<br>El equipo de FirmaClara</p>
```

---

## 2. Invite User (Invitación a usuario)

**Subject:** Te han invitado a FirmaClara

**Body:**
```html
<h2>Has sido invitado a FirmaClara</h2>

<p>Sigue este enlace para aceptar la invitación:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=invite&redirect_to={{ .RedirectTo }}">Aceptar invitación</a></p>

<p>Si no esperabas esta invitación, puedes ignorar este correo.</p>
<p>Saludos,<br>El equipo de FirmaClara</p>
```

---

## 3. Magic Link (Login sin contraseña)

**Subject:** Enlace de acceso a FirmaClara

**Body:**
```html
<h2>Accede a FirmaClara</h2>

<p>Sigue este enlace para iniciar sesión:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=magiclink&redirect_to={{ .RedirectTo }}">Iniciar Sesión</a></p>

<p>Si no has solicitado esto, puedes ignorar este correo.</p>
<p>Saludos,<br>El equipo de FirmaClara</p>
```

---

## 4. Reset Password (Restablecer contraseña)

**Subject:** Restablece tu contraseña de FirmaClara

**Body:**
```html
<h2>Restablecer Contraseña</h2>

<p>Sigue este enlace para crear una nueva contraseña:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&redirect_to={{ .RedirectTo }}">Restablecer Contraseña</a></p>

<p>Si no has solicitado esto, puedes ignorar este correo.</p>
<p>Saludos,<br>El equipo de FirmaClara</p>
```

---

## 5. Change Email Address (Cambio de correo)

**Subject:** Confirma el cambio de correo en FirmaClara

**Body:**
```html
<h2>Confirma tu nuevo correo</h2>

<p>Sigue este enlace para confirmar el cambio de dirección de correo:</p>
<p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email_change&redirect_to={{ .RedirectTo }}">Confirmar cambio de correo</a></p>

<p>Si no has solicitado esto, puedes ignorar este correo.</p>
<p>Saludos,<br>El equipo de FirmaClara</p>
```
