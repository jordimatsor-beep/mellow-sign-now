/**
 * Helper types for FirmaClara
 * These types provide convenient aliases and additional type definitions
 * to eliminate 'any' usage throughout the codebase.
 */

import { Database } from './types';

// ============================================================================
// RPC Response Types
// ============================================================================

/**
 * Response from get_document_for_signing RPC
 */
export type DocumentForSigning = Database['public']['Functions']['get_document_for_signing']['Returns'][number];

/**
 * Response from get_document_by_token RPC
 */
export type DocumentByToken = Database['public']['Functions']['get_document_by_token']['Returns'][number];

/**
 * Response from get_credit_transactions RPC
 */
export type CreditTransaction = Database['public']['Functions']['get_credit_transactions']['Returns'][number];

/**
 * Response from consume_credit RPC (the version that returns success/remaining)
 */
export type ConsumeCreditsResult = {
    remaining: number;
    success: boolean;
};

// ============================================================================
// Table Row Types
// ============================================================================

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
export type DocumentUpdate = Database['public']['Tables']['documents']['Update'];

export type Contact = Database['public']['Tables']['contacts']['Row'];
export type ContactInsert = Database['public']['Tables']['contacts']['Insert'];

export type User = Database['public']['Tables']['users']['Row'];
export type UserUpdate = Database['public']['Tables']['users']['Update'];

export type Signature = Database['public']['Tables']['signatures']['Row'];

export type CreditPack = Database['public']['Tables']['credit_packs']['Row'];

export type EventLog = Database['public']['Tables']['event_logs']['Row'];

// ============================================================================
// View Types
// ============================================================================

export type DocumentWithSignature = Database['public']['Views']['documents_with_signatures']['Row'];
export type UserCredits = Database['public']['Views']['user_credits']['Row'];

// ============================================================================
// Enum Types
// ============================================================================

export type SecurityLevel = Database['public']['Enums']['security_level_enum'];

// ============================================================================
// Custom Application Types
// ============================================================================

/**
 * Error with context for better error handling
 */
export interface AppError extends Error {
    context?: {
        status?: number;
        code?: string;
        [key: string]: unknown;
    };
}

/**
 * Promise race result type helper
 */
export type RaceResult<T> = T | never;

/**
 * Contact for selection (from ContactSelector component)
 */
export interface SelectableContact {
    id: string;
    name: string | null;
    email: string;
    phone?: string | null;
    nif?: string | null;
    address?: string | null;
}
