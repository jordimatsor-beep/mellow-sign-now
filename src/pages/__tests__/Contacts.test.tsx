import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Contacts from '../Contacts';

// Mock dependencies
vi.mock('@/context/ProfileContext', () => ({
    useProfile: () => ({
        profile: { id: 'test-user', name: 'Test User' }
    })
}));

const mockContacts = [
    { id: '1', name: 'Juan García', email: 'juan@test.com', phone: '+34600111222', nif: '12345678A', created_at: '2024-01-01' },
    { id: '2', name: 'María López', email: 'maria@test.com', phone: null, nif: null, created_at: '2024-01-02' },
];

vi.mock('@/lib/supabase', () => ({
    supabase: {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockContacts, error: null }))
            })),
            insert: vi.fn(() => Promise.resolve({ error: null })),
            update: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            })),
            delete: vi.fn(() => ({
                eq: vi.fn(() => Promise.resolve({ error: null }))
            }))
        })),
        auth: {
            getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null }))
        }
    }
}));

// Helper to wrap with Router
const renderWithRouter = (component: React.ReactElement) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

describe('Contacts Page', () => {
    it('renders the contacts page title', async () => {
        renderWithRouter(<Contacts />);

        const title = await screen.findByText('Agenda de Contactos');
        expect(title).toBeInTheDocument();
    });

    it('renders contact list when data exists', async () => {
        renderWithRouter(<Contacts />);

        // Wait for contacts to load
        const contact1 = await screen.findByText('Juan García');
        expect(contact1).toBeInTheDocument();

        const contact2 = screen.getByText('María López');
        expect(contact2).toBeInTheDocument();
    });

    it('shows new contact button', async () => {
        renderWithRouter(<Contacts />);

        const newButton = await screen.findByText('Nuevo Contacto');
        expect(newButton).toBeInTheDocument();
    });

    it('displays email for each contact', async () => {
        renderWithRouter(<Contacts />);

        const email1 = await screen.findByText('juan@test.com');
        expect(email1).toBeInTheDocument();

        const email2 = screen.getByText('maria@test.com');
        expect(email2).toBeInTheDocument();
    });

    it('has working search input', async () => {
        renderWithRouter(<Contacts />);

        const searchInput = await screen.findByPlaceholderText(/Buscar por nombre o email/i);
        expect(searchInput).toBeInTheDocument();

        fireEvent.change(searchInput, { target: { value: 'Juan' } });
        expect(searchInput).toHaveValue('Juan');
    });
});
