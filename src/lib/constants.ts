// Constantes de negocio compartidas por el frontend.

// Créditos de bienvenida que recibe toda cuenta nueva (pack `free_trial`).
// DEBE coincidir con handle_new_user() en Supabase
// (migración 20260210_update_welcome_credits.sql). Si se cambia este valor,
// actualizar también esa función SQL y la copy de la landing (Index.tsx).
export const WELCOME_CREDITS = 2;

// Umbral a partir del cual avisamos de saldo bajo en el dashboard (QW-04).
export const LOW_CREDITS_THRESHOLD = 5;
