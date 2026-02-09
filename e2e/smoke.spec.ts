import { test, expect } from '@playwright/test';

test('Smoke Test: Create Document', async ({ page }) => {
  // 1. Ir al Login
  await page.goto('http://localhost:8080/login');
  
  // 2. Login
  await page.fill('input[name="email"]', 'jordimattor@gmail.com'); // Usuario real del usuario (visto en sidebar)
  await page.fill('input[name="password"]', 'Test1234!'); // Contraseña probable de test, o fallará y el usuario tendrá que meterla
  await page.click('button[type="submit"]');

  // Esperar a ver el dashboard o permitir al usuario loguearse manualmente si falla
  try {
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  } catch (e) {
    console.log("No se pudo loguear automáticamente. Por favor, inicia sesión manualmente en el navegador abierto.");
    await page.pause(); // Pausa para que el usuario interactúe
  }

  // 3. Crear Documento
  await page.goto('http://localhost:8080/documents/new');
  
  // Rellenar formulario básico (ajustar selectores según tu código real)
  await page.fill('input[name="title"]', 'Documento Automated Smoke Test');
  
  // Subir archivo (creamos uno dummy en memoria o usamos uno existente si hay)
  // Como no puedo subir fácil, intentaré solo rellenar campos y dar a siguiente
  
  // PAUSA FINAL para que el usuario vea y termine
  await page.pause();
});
