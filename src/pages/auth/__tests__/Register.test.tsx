import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/utils';
import Register from '../Register';
import { supabase } from '@/lib/supabase';

vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            signUp: vi.fn(),
            signInWithOAuth: vi.fn(),
        },
    },
}));

vi.mock('@/context/AuthContext', () => ({
    useAuth: () => ({ session: null }),
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('sonner', () => ({
    toast: { success: vi.fn(), error: vi.fn() },
}));

describe('Register Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders registration form with all required fields', () => {
        render(<Register />);

        expect(screen.getByRole('heading', { name: /crear cuenta/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^contraseña$/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /crear cuenta gratis/i })).toBeInTheDocument();
    });

    it('rejects passwords shorter than 12 characters', async () => {
        render(<Register />);

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const submitBtn = screen.getByRole('button', { name: /crear cuenta gratis/i });

        fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Test User' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        // "PassW0rd" = 8 chars — was valid under old 8-char rule, invalid now
        fireEvent.change(passwordInput, { target: { value: 'PassW0rd' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/mínimo 12 caracteres/i)).toBeInTheDocument();
        });

        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('rejects passwords missing uppercase, lowercase, or digit', async () => {
        render(<Register />);

        const passwordInput = screen.getByLabelText(/^contraseña$/i);
        const submitBtn = screen.getByRole('button', { name: /crear cuenta gratis/i });

        fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'Test User' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        // 13 chars but all lowercase + digits, no uppercase
        fireEvent.change(passwordInput, { target: { value: 'securepass123' } });
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(screen.getByText(/mayúscula, minúscula y número/i)).toBeInTheDocument();
        });

        expect(supabase.auth.signUp).not.toHaveBeenCalled();
    });

    it('submits form with valid data (12+ chars, mixed case, digit)', async () => {
        (supabase.auth.signUp as any).mockResolvedValue({ error: null });

        render(<Register />);

        fireEvent.change(screen.getByLabelText(/nombre completo/i), { target: { value: 'María García' } });
        fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'test@example.com' } });
        // "ValidPass12A" = 12 chars, upper + lower + digit ✓
        fireEvent.change(screen.getByLabelText(/^contraseña$/i), { target: { value: 'ValidPass12A' } });

        fireEvent.click(screen.getByRole('button', { name: /crear cuenta gratis/i }));

        await waitFor(() => {
            expect(supabase.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
                email: 'test@example.com',
                password: 'ValidPass12A',
            }));
        });
    });
});
