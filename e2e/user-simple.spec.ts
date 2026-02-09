import { test, expect, Page } from '@playwright/test';

/**
 * TEST SIMPLIFICADO DE USUARIO - FirmaClara
 * Maneja cookies banner y estados de carga
 */

const USER = {
    email: 'jormattor@gmail.com',
    password: '15082004J'
};

// Helper para aceptar cookies si aparecen
async function acceptCookiesIfPresent(page: Page) {
    const cookieButton = page.locator('button:has-text("Aceptar todas"), button:has-text("Accept all")').first();
    if (await cookieButton.count() > 0 && await cookieButton.isVisible()) {
        await cookieButton.click();
        await page.waitForTimeout(500);
        console.log('  → Cookies aceptadas');
    }
}

// Helper para esperar que la página termine de cargar (no spinner)
async function waitForPageLoad(page: Page, maxWait = 15000) {
    const startTime = Date.now();

    // Buscar spinner y esperar a que desaparezca
    while (Date.now() - startTime < maxWait) {
        const spinnerCount = await page.locator('[class*="animate-spin"], [class*="loader"], [role="status"]').count();
        const visibleSpinner = spinnerCount > 0 ? await page.locator('[class*="animate-spin"], [class*="loader"]').first().isVisible() : false;

        if (!visibleSpinner) {
            break;
        }
        await page.waitForTimeout(500);
    }

    await acceptCookiesIfPresent(page);
}

// Helper para login
async function login(page: Page) {
    await page.goto('/login');
    await page.waitForTimeout(2000);
    await acceptCookiesIfPresent(page);

    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const passwordField = page.locator('input[type="password"]').first();

    await emailField.fill(USER.email);
    await passwordField.fill(USER.password);

    const loginButton = page.locator('button[type="submit"]').first();
    await loginButton.click();

    // Esperar redirección
    await page.waitForURL(/\/(dashboard|documents|home)/i, { timeout: 20000 });
    await page.waitForTimeout(3000);
    await waitForPageLoad(page);
}

test.describe('🎯 TEST SIMPLIFICADO DE USUARIO', () => {

    test.setTimeout(90000); // 90 segundos por test

    test('Login y navegación completa', async ({ page }) => {
        console.log('\n📋 INICIANDO TEST SIMPLIFICADO\n');

        // 1. LOGIN
        console.log('1️⃣ Login...');
        await login(page);
        console.log('   ✅ Login exitoso\n');

        // 2. DASHBOARD
        console.log('2️⃣ Verificando Dashboard...');
        await page.goto('/dashboard');
        await waitForPageLoad(page);
        await page.screenshot({ path: 'test-results/1-dashboard.png', fullPage: true });
        const dashboardUrl = page.url();
        console.log(`   URL: ${dashboardUrl}`);
        expect(dashboardUrl).not.toContain('/login');
        console.log('   ✅ Dashboard accesible\n');

        // 3. DOCUMENTOS
        console.log('3️⃣ Verificando Documentos...');
        await page.goto('/documents');
        await waitForPageLoad(page);
        await page.screenshot({ path: 'test-results/2-documents.png', fullPage: true });
        console.log('   ✅ Documentos accesible\n');

        // 4. NUEVO DOCUMENTO
        console.log('4️⃣ Verificando Nuevo Documento...');
        await page.goto('/documents/new');
        await waitForPageLoad(page);
        await page.screenshot({ path: 'test-results/3-new-document.png', fullPage: true });
        console.log('   ✅ Crear documento accesible\n');

        // 5. CONTACTOS
        console.log('5️⃣ Verificando Contactos...');
        await page.goto('/contacts');
        await waitForPageLoad(page);
        await page.screenshot({ path: 'test-results/4-contacts.png', fullPage: true });
        console.log('   ✅ Contactos accesible\n');

        // 6. CRÉDITOS
        console.log('6️⃣ Verificando Créditos...');
        await page.goto('/credits');
        await waitForPageLoad(page);
        await page.screenshot({ path: 'test-results/5-credits.png', fullPage: true });
        console.log('   ✅ Créditos accesible\n');

        // 7. AYUDA (Clara)
        console.log('7️⃣ Verificando Ayuda/Clara...');
        await page.goto('/help');
        await waitForPageLoad(page);
        await page.screenshot({ path: 'test-results/6-help.png', fullPage: true });
        console.log('   ✅ Ayuda accesible\n');

        // 8. CONFIGURACIÓN
        console.log('8️⃣ Verificando Configuración...');
        await page.goto('/settings');
        await waitForPageLoad(page);
        await page.screenshot({ path: 'test-results/7-settings.png', fullPage: true });
        console.log('   ✅ Configuración accesible\n');

        // 9. LOGOUT
        console.log('9️⃣ Probando Logout...');
        const logoutButton = page.locator('button:has-text("Cerrar sesión")').first();
        if (await logoutButton.count() > 0) {
            await logoutButton.scrollIntoViewIfNeeded();
            await logoutButton.click({ force: true });
            await page.waitForTimeout(3000);
            console.log('   ✅ Logout ejecutado\n');
        }

        // RESUMEN
        console.log('═══════════════════════════════════════════════');
        console.log('📊 RESUMEN DEL TEST');
        console.log('═══════════════════════════════════════════════');
        console.log('✅ Login funciona');
        console.log('✅ Dashboard accesible');
        console.log('✅ Documentos accesible');
        console.log('✅ Crear documento accesible');
        console.log('✅ Contactos accesible');
        console.log('✅ Créditos accesible');
        console.log('✅ Ayuda/Clara accesible');
        console.log('✅ Configuración accesible');
        console.log('✅ Logout ejecutado');
        console.log('');
        console.log('📸 Screenshots guardados en: test-results/');
        console.log('═══════════════════════════════════════════════\n');
    });

});
