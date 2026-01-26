# CLAUDE.md - AI Assistant Guide for FirmaClara

## Project Overview

**FirmaClara** is a legal-tech platform for electronic document signing with AI assistance, built for freelancers and small businesses in Spain. The platform enables users to send documents for legally-binding electronic signatures with full audit trails.

**Author:** OPERIA
**Primary Language:** Spanish (with i18n support for 5 languages)

### Key Business Rules
- Users receive 2 trial credits upon registration
- 1 credit is consumed when a document is **sent** (not when signed)
- Clara AI assistant is free and unlimited
- Credits do not expire
- Documents expire 30 days after sending if not signed

---

## Tech Stack

### Frontend
- **Vite 7.3.1** - Build tool with HMR
- **React 18.3.1** - UI framework
- **TypeScript 5.3.3** - Type safety (relaxed strict mode)
- **React Router DOM 7.12.0** - Client-side routing
- **TanStack React Query 5.90.19** - Server state management
- **React Hook Form 7.71.1** + **Zod 4.3.5** - Form handling & validation

### UI
- **Tailwind CSS 3.4.19** - Utility-first styling
- **shadcn/ui** - Component library (Radix UI primitives)
- **Lucide React 0.300.0** - Icons
- **Sonner 2.0.7** - Toast notifications

### Backend
- **Supabase** - PostgreSQL database, Auth, Storage, Edge Functions
- **Stripe 14.10.0** - Payment processing
- **n8n** - Workflow automation (emails via Resend)

### AI
- **Google Gemini 1.5 Flash** - Clara AI assistant (via edge function)
- **@anthropic-ai/sdk** - Available but Gemini is primary

### Document Processing
- **pdf-lib 1.17.1** - PDF manipulation and signature pages
- **FreeTSA** - Time Stamp Authority (RFC 3161)

---

## Project Structure

```
/
├── src/
│   ├── pages/                    # Route page components
│   │   ├── auth/                 # Authentication pages
│   │   ├── Index.tsx             # Landing page
│   │   ├── Dashboard.tsx         # Main dashboard
│   │   ├── NewDocument.tsx       # Document creation
│   │   ├── Sign.tsx              # Public signing page
│   │   └── Clara.tsx             # AI assistant
│   ├── components/
│   │   ├── ui/                   # shadcn/ui components
│   │   ├── layout/               # Sidebar, Header, BottomNav
│   │   ├── auth/                 # Login/Register forms
│   │   ├── contacts/             # Contact management
│   │   ├── onboarding/           # User onboarding flow
│   │   ├── shared/               # StatusBadge, CreditsBadge
│   │   └── brand/                # Logo, branding
│   ├── context/
│   │   ├── AuthContext.tsx       # Authentication state
│   │   └── ProfileContext.tsx    # User profile/issuer data
│   ├── hooks/
│   │   ├── use-mobile.tsx        # Responsive detection
│   │   └── use-toast.ts          # Toast notifications
│   ├── lib/
│   │   ├── utils.ts              # cn() and utilities
│   │   └── validators.ts         # Form validation schemas
│   ├── locales/                  # i18n translations
│   │   ├── es.json               # Spanish (primary)
│   │   ├── en.json               # English
│   │   ├── ca.json               # Catalan
│   │   ├── fr.json               # French
│   │   └── pt.json               # Portuguese
│   └── integrations/supabase/
│       ├── client.ts             # Supabase client instance
│       └── types.ts              # Auto-generated DB types
├── lib/                          # Root-level utilities
│   ├── pdf.ts                    # PDF signing logic
│   ├── certificate.ts            # Certificate generation
│   ├── credits.ts                # Credit system helpers
│   ├── tsa.ts                    # Time Stamp Authority
│   ├── crypto.ts                 # Hash functions
│   └── supabase.ts               # Supabase config
├── supabase/
│   ├── schema.sql                # Database schema
│   ├── config.toml               # Supabase local config
│   ├── migrations/               # Database migrations
│   └── functions/                # Edge Functions
│       ├── clara-chat/           # AI assistant
│       ├── create-checkout-session/  # Stripe payments
│       ├── stripe-webhook/       # Payment webhooks
│       ├── send-otp/             # OTP delivery
│       ├── send-document-invitation/ # Email invitations
│       ├── send-signed-notification/ # Signature notifications
│       ├── send-reminders/       # Document reminders
│       ├── sign-complete/        # Signature completion
│       ├── request-tsa/          # Timestamp requests
│       ├── generate-audit-trail/ # Audit PDF generation
│       ├── get-credits/          # Credit balance
│       └── _shared/              # Shared utilities
├── scripts/                      # Deployment scripts
└── public/                       # Static assets
```

---

## Key Patterns & Conventions

### Component Architecture
```typescript
// Functional components with hooks
const MyComponent = () => {
  const { user } = useAuth();           // Auth context
  const { profile } = useProfile();     // Profile context
  const { toast } = useToast();         // Notifications
  const [loading, setLoading] = useState(false);

  // Direct Supabase queries
  const fetchData = async () => {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id);
    if (error) toast({ title: "Error", variant: "destructive" });
  };

  return <div>...</div>;
};
```

### Data Fetching
- **Direct Supabase queries** in components via `supabase.from().select/insert/update/delete()`
- **RPC functions** for complex operations: `supabase.rpc('function_name', { params })`
- **Edge Functions** via: `supabase.functions.invoke('function-name', { body })`
- Error handling with try-catch and toast notifications

### Form Handling
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
});

const { register, handleSubmit, formState } = useForm({
  resolver: zodResolver(schema),
});
```

### Routing Structure
```
Public Routes:
  /                    - Landing page
  /login               - Login
  /register            - Registration
  /sign/:token         - Public document signing
  /legal, /terms, /privacy, /how-it-works

Protected Routes (RequireAuth):
  /dashboard           - Main dashboard
  /new-document        - Create document
  /contacts            - Contact management
  /clara               - AI assistant
  /settings            - User settings
  /credits             - Credit management
  /profile             - Profile settings
```

### Import Aliases
- `@/*` maps to `./src/*`
- Example: `import { Button } from "@/components/ui/button"`

### Styling Conventions
- Use Tailwind utility classes
- Use `cn()` utility for conditional classes: `cn("base-class", condition && "conditional-class")`
- Dark mode supported via `next-themes`
- Custom animations defined in `tailwind.config.ts`

---

## Database Schema

### Core Tables

**users** - Application users
- `id`, `email`, `name`, `company_name`
- `issuer_type` (company/person), `tax_id`
- `onboarding_completed`, `legal_accepted`

**documents** - Sent documents
- `id`, `user_id`, `title`, `file_url`, `file_hash`
- `status`: draft | sent | viewed | signed | expired | cancelled
- `signature_type`: checkbox_only | checkbox_name | full
- `sign_token` - Unique token for public signing URL
- `signer_email`, `signer_name`, `signer_phone`

**signatures** - Signature records
- `document_id`, `signer_name`, `signer_email`
- `ip_address`, `user_agent`, `hash_sha256`
- `tsa_request`, `tsa_response`, `tsa_timestamp`

**credit_packs** - Credit system
- `user_id`, `pack_type` (trial/basic/professional/business)
- `credits_total`, `credits_used`
- `stripe_payment_id`, `stripe_session_id`

**event_logs** - Audit trail
- `document_id`, `event_type`, `event_data` (JSONB)
- `ip_address`, `user_agent`

**clara_conversations** / **clara_messages** - AI chat history

### Key RPC Functions
- `consume_credit(amount)` - FIFO credit consumption
- `get_available_credits()` - Sum available credits for user

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `clara-chat` | AI assistant (Gemini 1.5 Flash) |
| `create-checkout-session` | Stripe payment session |
| `stripe-webhook` | Payment webhook handler |
| `send-otp` | OTP via WhatsApp/SMS |
| `send-document-invitation` | Email document to signer |
| `send-signed-notification` | Notify sender of signature |
| `send-reminders` | Document expiry reminders |
| `sign-complete` | Finalize signature process |
| `request-tsa` | RFC 3161 timestamp |
| `generate-audit-trail` | Create audit PDF |
| `get-credits` | Check credit balance |

---

## Development Workflow

### Commands
```bash
npm run dev          # Start dev server (localhost:8080)
npm run build        # Production build
npm run build:dev    # Development build
npm run preview      # Preview production build
```

### Environment Variables
```env
VITE_SUPABASE_PROJECT_ID=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_STRIPE_PUBLIC_KEY=pk_...
```

### Deployment
- **Vercel** for frontend hosting
- **Supabase** for backend services
- Security headers configured in `vercel.json`

---

## Common Tasks

### Adding a New Page
1. Create component in `src/pages/`
2. Add route in `src/App.tsx`
3. If protected, wrap with `RequireAuth`

### Adding a New Component
1. Create in appropriate `src/components/` subfolder
2. For UI primitives, use shadcn/ui patterns
3. Export from component file

### Adding Database Functionality
1. Update `supabase/schema.sql` if needed
2. Types auto-generated in `src/integrations/supabase/types.ts`
3. Query via `supabase.from('table')` or RPC

### Adding an Edge Function
1. Create folder in `supabase/functions/`
2. Add `index.ts` with Deno handler
3. Deploy with `supabase functions deploy function-name`

### Internationalization
1. Add keys to all locale files in `src/locales/`
2. Use `useTranslation()` hook: `const { t } = useTranslation()`
3. Reference: `{t('key.path')}`

---

## Important Files

| File | Description |
|------|-------------|
| `src/App.tsx` | Root component, routing setup |
| `src/context/AuthContext.tsx` | Authentication state management |
| `src/context/ProfileContext.tsx` | User profile state |
| `src/integrations/supabase/client.ts` | Supabase client instance |
| `src/integrations/supabase/types.ts` | Auto-generated DB types |
| `lib/pdf.ts` | PDF signing and manipulation |
| `lib/certificate.ts` | Signature certificate generation |
| `supabase/schema.sql` | Complete database schema |
| `tailwind.config.ts` | Tailwind customization |
| `vite.config.ts` | Build configuration |

---

## Code Quality Notes

### TypeScript Configuration
- Strict mode is **disabled** for flexibility
- `noImplicitAny: false`, `strictNullChecks: false`
- Path aliases configured (`@/*`)

### Security Considerations
- Row Level Security (RLS) enabled on all tables
- Auth tokens stored in localStorage via Supabase
- File uploads go to Supabase Storage
- Document signing uses SHA-256 hashing
- TSA timestamps for legal validity

### Testing
- Vitest available (`vitest` in devDependencies)
- Test files in `src/test/`

---

## Lovable Platform Integration

This project was scaffolded with [Lovable](https://lovable.dev). The `lovable-tagger` dev dependency adds component tagging in development mode for visual editing features.
