import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Documents from '../Documents';
import { queryKeys } from '@/lib/queryKeys';

// Mock i18n
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string) => key
    })
}));

// Mock Supabase
const mockSelect = vi.fn();
const mockOrder = vi.fn();

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: (table: string) => ({
            select: (...args: any[]) => {
                mockSelect(...args);
                return {
                    order: (...orderArgs: any[]) => {
                        mockOrder(...orderArgs);
                        return Promise.resolve({
                            data: [
                                { id: '1', title: 'Contract 1', status: 'sent', created_at: '2024-01-01', signer_email: 'a@a.com' },
                                { id: '2', title: 'Contract 2', status: 'signed', created_at: '2024-01-02', signer_email: 'b@b.com' }
                            ],
                            error: null
                        });
                    }
                };
            }
        })
    }
}));

const renderWithRouter = (component: React.ReactElement) => {
    const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                {component}
            </BrowserRouter>
        </QueryClientProvider>
    );
};

describe('Documents Page', () => {
    it('renders and fetches documents using queryKeys', async () => {
        renderWithRouter(<Documents />);

        // Initial loading state
        expect(screen.getByText(/Cargando documentos/i)).toBeInTheDocument();

        // Wait for data load
        await waitFor(() => {
            expect(screen.getByText('Contract 1')).toBeInTheDocument();
            expect(screen.getByText('Contract 2')).toBeInTheDocument();
        });
    });
});
