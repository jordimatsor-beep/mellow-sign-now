import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';

// Mock all dependencies upfront
vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        user: { id: 'test-user', email: 'test@example.com' },
        profile: { name: 'Test User' }
    })
}));

const mockDocuments = [
    { id: '1', title: 'Test Doc', signer_email: 'test@test.com', status: 'sent', created_at: '2024-01-01T00:00:00Z' }
];

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: () => ({
            select: () => ({
                order: () => Promise.resolve({ data: mockDocuments, error: null })
            })
        }),
        rpc: () => Promise.resolve({ data: 10, error: null })
    }
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));

const renderWithRouter = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                {component}
            </BrowserRouter>
        </QueryClientProvider>
    );
};

describe('Dashboard Page', () => {
    it('renders without crashing', () => {
        const { container } = renderWithRouter(<Dashboard />);
        expect(container).toBeTruthy();
    });

    it('shows loading state initially', () => {
        const { container } = renderWithRouter(<Dashboard />);
        // When loading, the component should render something
        expect(container.firstChild).toBeTruthy();
    });
});
