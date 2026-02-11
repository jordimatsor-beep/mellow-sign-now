import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Credits from '../Credits';

// Mock all dependencies
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user', email: 'test@example.com' },
        profile: { name: 'Test User' }
    })
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: (table: string) => ({
            select: () => Promise.resolve({ data: [{ credits_total: 10, credits_used: 5 }], error: null }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => Promise.resolve({ data: null, error: null }),
            eq: () => ({ select: () => Promise.resolve({ data: { credits_total: 10, credits_used: 5 }, error: null }) }),
        }),
        rpc: (fn: string) => {
            if (fn === 'get_credit_transactions') return Promise.resolve({ data: [], error: null });
            return Promise.resolve({ data: 15, error: null });
        },
        functions: {
            invoke: () => Promise.resolve({ data: { url: 'https://test.com' }, error: null })
        }
    }
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

const renderWithRouter = (component: React.ReactElement) => {
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/credits']}>
                {component}
            </MemoryRouter>
        </QueryClientProvider>
    );
};

describe('Credits Page', () => {
    it('renders without crashing', () => {
        const { container } = renderWithRouter(<Credits />);
        expect(container).toBeTruthy();
    });

    it('has a container element', () => {
        const { container } = renderWithRouter(<Credits />);
        expect(container.firstChild).toBeTruthy();
    });
});
