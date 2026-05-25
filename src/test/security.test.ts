import { describe, it, expect } from 'vitest';

// Import shared utilities from Edge Functions (plain TS, no Deno-specific deps)
import {
  sanitizeErrorMessage,
  escapeHtml,
  getCorsHeaders,
  ALLOWED_ORIGINS,
} from '../../supabase/functions/_shared/cors.ts';

// ─────────────────────────────────────────────────────────────────────────────
// sanitizeErrorMessage — covers the error-sanitization fix applied to
// clara-chat, get-credits, send-document-invitation, send-signed-notification
// ─────────────────────────────────────────────────────────────────────────────
describe('sanitizeErrorMessage', () => {
  it('returns generic message for unknown internal errors', () => {
    const err = new Error('Connection to postgres failed on socket /run/pg.sock');
    expect(sanitizeErrorMessage(err)).toBe('Ha ocurrido un error. Por favor, inténtalo de nuevo.');
  });

  it('returns generic message for errors with stack traces', () => {
    const err = new Error('TypeError: Cannot read properties of null');
    expect(sanitizeErrorMessage(err)).toBe('Ha ocurrido un error. Por favor, inténtalo de nuevo.');
  });

  it('passes through whitelisted safe messages', () => {
    expect(sanitizeErrorMessage(new Error('Unauthorized'))).toBe('Unauthorized');
    expect(sanitizeErrorMessage(new Error('Documento no encontrado'))).toBe('Documento no encontrado');
    expect(sanitizeErrorMessage(new Error('Missing required fields'))).toBe('Missing required fields');
    expect(sanitizeErrorMessage(new Error('Código OTP incorrecto'))).toBe('Código OTP incorrecto');
    expect(sanitizeErrorMessage(new Error('Este documento ya ha sido firmado'))).toBe('Este documento ya ha sido firmado');
  });

  it('returns "Error desconocido" for non-Error values', () => {
    expect(sanitizeErrorMessage(null)).toBe('Error desconocido');
    expect(sanitizeErrorMessage(undefined)).toBe('Error desconocido');
    expect(sanitizeErrorMessage('raw string error')).toBe('Error desconocido');
    expect(sanitizeErrorMessage(42)).toBe('Error desconocido');
    expect(sanitizeErrorMessage({ message: 'object' })).toBe('Error desconocido');
  });

  it('does not leak sensitive keywords like supabase url or token', () => {
    const err = new Error('Request to https://pmzfwwtgjvlvuawxguiw.supabase.co failed');
    const result = sanitizeErrorMessage(err);
    expect(result).not.toContain('supabase.co');
    expect(result).not.toContain('pmzfwwtgjvlvuawxguiw');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// escapeHtml — covers the XSS prevention fix in email templates
// (send-document-invitation, send-signed-notification)
// ─────────────────────────────────────────────────────────────────────────────
describe('escapeHtml', () => {
  it('escapes script injection', () => {
    const input = '<script>alert("xss")</script>';
    const result = escapeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('escapes all dangerous HTML characters', () => {
    expect(escapeHtml('&')).toBe('&amp;');
    expect(escapeHtml('<')).toBe('&lt;');
    expect(escapeHtml('>')).toBe('&gt;');
    expect(escapeHtml('"')).toBe('&quot;');
    expect(escapeHtml("'")).toBe('&#039;');
  });

  it('preserves normal text unchanged', () => {
    expect(escapeHtml('Contrato de Servicios 2026')).toBe('Contrato de Servicios 2026');
    expect(escapeHtml('María García')).toBe('María García');
  });

  it('returns empty string for null/undefined inputs', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml('')).toBe('');
  });

  it('handles combined injection attempts', () => {
    const input = '"><img src=x onerror=alert(1)>';
    const result = escapeHtml(input);
    expect(result).not.toContain('<img');
    expect(result).not.toContain('>');
    expect(result).toContain('&gt;');
    expect(result).toContain('&lt;');
    expect(result).toContain('&quot;');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCorsHeaders — covers the CORS hardening applied to all 8 Edge Functions
// ─────────────────────────────────────────────────────────────────────────────
describe('getCorsHeaders CORS whitelist', () => {
  const makeRequest = (origin: string | null) =>
    new Request('https://api.example.com/fn', {
      headers: origin ? { Origin: origin } : {},
    });

  it('allows all whitelisted origins', () => {
    for (const origin of ALLOWED_ORIGINS) {
      const headers = getCorsHeaders(makeRequest(origin));
      expect(headers['Access-Control-Allow-Origin']).toBe(origin);
    }
  });

  it('returns null for non-whitelisted origins', () => {
    const evil = ['https://evil.com', 'https://attacker.firmaclara.es.evil.com', 'https://firmaclara.es.malicious.io'];
    for (const origin of evil) {
      const headers = getCorsHeaders(makeRequest(origin));
      expect(headers['Access-Control-Allow-Origin']).toBe('null');
    }
  });

  it('returns null when Origin header is absent', () => {
    const headers = getCorsHeaders(makeRequest(null));
    expect(headers['Access-Control-Allow-Origin']).toBe('null');
  });

  it('includes Vary: Origin to prevent caching issues', () => {
    const headers = getCorsHeaders(makeRequest('https://firmaclara.es'));
    expect(headers['Vary']).toBe('Origin');
  });

  it('does not allow wildcard * origin', () => {
    const headers = getCorsHeaders(makeRequest('*'));
    expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    expect(headers['Access-Control-Allow-Origin']).toBe('null');
  });
});
