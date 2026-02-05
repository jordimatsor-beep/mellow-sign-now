
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import Register from '../Register';
import { supabase } from '@/lib/supabase';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            signUp: vi.fn(),
            signInWithOAuth: vi.fn(),
        },
    },
}));

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({
        session: null,
    }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
    };
});

// Mock hooks that might cause issues
vi.mock('sonner', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('Register Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders registration form', () => {
        render(<Register />);

        expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirmar contraseña/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /registrarse/i })).toBeInTheDocument();
    });

    it('validates matching passwords', async () => {
        render(<Register />);

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const submitBtn = screen.getByRole('button', { name: /registrarse/i });

        // Enter valid password but mismatching confirm
        fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
        fireEvent.change(confirmInput, { target: { value: 'Mismatch123!' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/las contraseñas no coinciden/i)).toBeInTheDocument();
        });
    });

    it('submits form with valid data', async () => {
        // Setup mock success
        (supabase.auth.signUp as any).mockResolvedValue({ error: null });

        render(<Register />);

        const emailInput = screen.getByLabelText(/email/i);
        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const confirmInput = screen.getByLabelText(/confirmar contraseña/i);
        const submitBtn = screen.getByRole('button', { name: /registrarse/i });

        fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
        fireEvent.change(passwordInput, { target: { value: 'ValidPass123!' } });
        fireEvent.change(confirmInput, { target: { value: 'ValidPass123!' } });

        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                password: 'ValidPass123!',
            }));
        });
    });
});
