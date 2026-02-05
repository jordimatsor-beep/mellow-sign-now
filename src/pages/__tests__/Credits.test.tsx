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
        rpc: () => Promise.resolve({ data: 15, error: null }),
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

const renderWithRouter = (component: React.ReactElement) => {
    return render(
        <MemoryRouter initialEntries={['/credits']}>
            {component}
        </MemoryRouter>
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
