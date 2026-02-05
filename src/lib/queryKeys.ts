/**
 * Centralized query keys for React Query
 * Ensures consistency and enables easy cache invalidation
 */
export const queryKeys = {
    documents: {
        all: ['documents'] as const,
        detail: (id: string) => ['document', id] as const,
        dashboard: ['dashboard-documents'] as const,
    },
    credits: {
        available: ['user-credits'] as const,
        packs: ['credit-packs'] as const,
        transactions: ['credit-transactions'] as const,
    },
    contacts: {
        all: ['contacts'] as const,
    },
} as const;
