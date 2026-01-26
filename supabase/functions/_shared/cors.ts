/**
 * Shared CORS configuration for all Edge Functions
 * Security: Only allows specific origins, not wildcard
 */

export const ALLOWED_ORIGINS = [
  'https://firmaclara.com',
  'https://firmaclara.es',
  'https://www.firmaclara.com',
  'https://www.firmaclara.es',
  'https://mellow-sign-now.lovable.app',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
];

/**
 * Get CORS headers with proper origin validation
 * Returns 'null' origin for disallowed requests (security best practice)
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Vary': 'Origin',
  };
}

/**
 * Handle CORS preflight requests
 */
export function handleCorsPreflightRequest(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(request) });
  }
  return null;
}

/**
 * HTML escape function to prevent XSS in email templates
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

/**
 * Sanitize error messages to avoid exposing internal details
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Only return safe error messages
    const safeMessages = [
      'Documento no encontrado',
      'Token is required',
      'Missing required fields',
      'Unauthorized',
      'Rate limit exceeded',
      'Invalid request format',
      'Código OTP incorrecto',
      'Código OTP expirado',
      'Este documento ya ha sido firmado',
      'Este enlace de firma ha expirado',
      'Faltan datos requeridos',
    ];

    if (safeMessages.some(msg => error.message.includes(msg))) {
      return error.message;
    }

    // Generic error for anything else
    return 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
  }
  return 'Error desconocido';
}
