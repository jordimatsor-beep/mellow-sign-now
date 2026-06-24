type SupabaseError = { code?: string; message?: string };

const CODE_MAP: Record<string, string> = {
  "23505": "Ya existe un registro con esos datos.",
  "23503": "No se puede completar la operación por dependencias existentes.",
  "42501": "No tienes permisos para realizar esta acción.",
  PGRST116: "No se encontró el registro solicitado.",
  PGRST301: "Sesión expirada. Vuelve a iniciar sesión.",
  "400": "Solicitud incorrecta. Comprueba los datos e inténtalo de nuevo.",
  "401": "Sesión expirada. Vuelve a iniciar sesión.",
  "403": "No tienes permisos para realizar esta acción.",
  "404": "No se encontró el recurso solicitado.",
  "409": "Ya existe un registro con esos datos.",
  "429": "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.",
  "500": "Error interno del servidor. Inténtalo de nuevo más tarde.",
  "503": "Servicio temporalmente no disponible. Inténtalo de nuevo más tarde.",
};

export function sanitizeSupabaseError(error: SupabaseError | null | undefined): string {
  if (!error) return "Ha ocurrido un error inesperado.";

  const code = error.code ?? "";
  if (CODE_MAP[code]) return CODE_MAP[code];

  // HTTP status in message like "fetch failed" or network errors
  if (error.message?.includes("Failed to fetch") || error.message?.includes("NetworkError")) {
    return "Error de conexión. Comprueba tu internet e inténtalo de nuevo.";
  }

  return "Ha ocurrido un error inesperado. Inténtalo de nuevo.";
}
