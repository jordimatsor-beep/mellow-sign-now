import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SignDocument from '../SignDocument';
import { Toaster } from 'sonner';

// Mock Supabase
const mockRpc = vi.fn();
const mockFunctionsInvoke = vi.fn();
const mockStorageFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
    supabase: {
        rpc: (...args: any[]) => mockRpc(...args),
        functions: {
            invoke: (...args: any[]) => mockFunctionsInvoke(...args)
        },
        storage: {
            from: (...args: any[]) => mockStorageFrom(...args)
        }
    }
}));

// Mock Canvas
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    scale: vi.fn(),
    fillRect: vi.fn(),
    lineWidth: 1,
    lineCap: 'round',
    lineJoin: 'round',
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    toDataURL: vi.fn(() => 'data:image/png;base64,fake-signature'),
})) as any;

const renderWithRouter = (component: React.ReactElement, initialEntries = ['/sign/test-token']) => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={initialEntries}>
                <Routes>
                    <Route path="/sign/:token" element={component} />
                </Routes>
            </MemoryRouter>
            <Toaster />
        </QueryClientProvider>
    );
};

describe('SignDocument Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockStorageFrom.mockReturnValue({
            createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://test.com/signed.pdf' }, error: null })
        });
    });

    it('shows loading state initially', () => {
        renderWithRouter(<SignDocument />);
        expect(screen.getByText(/Cargando documento seguro/i)).toBeInTheDocument();
    });

    it('shows error if token is invalid or rpc fails', async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: 'Document failed' } });

        renderWithRouter(<SignDocument />);

        await waitFor(() => {
            expect(screen.getByText(/No se ha podido cargar el documento/i)).toBeInTheDocument();
        });
    });
});
