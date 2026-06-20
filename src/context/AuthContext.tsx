import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

// Define Profile interface
export interface Profile {
    id: string;
    name: string | null;
    email: string | null;
    company_name: string | null;
    role: 'user' | 'admin' | 'support' | null;
    onboarding_completed: boolean | null;
    legal_accepted: boolean | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    isLoggingOut: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    isLoggingOut: false,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    // Ref keeps onAuthStateChange callback from closing over stale profile state
    const profileRef = useRef<Profile | null>(null);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await withTimeout(
                supabase.from('users')
                    .select('id, name, email, company_name, role, onboarding_completed, legal_accepted')
                    .eq('id', userId)
                    .single(),
                10000, "Profile fetch"
            );

            if (error) {
                if (import.meta.env.DEV) console.error("Error fetching profile:", error);
                return null;
            }

            // Map DB response to Profile, handling missing role column gracefully
            const profile: Profile = {
                id: data.id,
                name: data.name,
                email: data.email,
                company_name: data.company_name,
                role: (data.role as any) || 'user',
                onboarding_completed: data.onboarding_completed ?? false,
                legal_accepted: data.legal_accepted ?? false,
            };

            return profile;
        } catch (error) {
            if (import.meta.env.DEV) console.error("Error fetching profile (timeout/catch):", error);
            // If timeout or error, return null so we don't crash or hang
            return null;
        }
    };

    const setProfileAndRef = (p: Profile | null) => {
        profileRef.current = p;
        setProfile(p);
    };

    const refreshProfile = async () => {
        if (!user) return;
        const data = await fetchProfile(user.id);
        if (data) setProfileAndRef(data);
    };

    useEffect(() => {
        let mounted = true;

        // Failsafe: if everything hangs, force stop loading after 15s
        const safetyTimer = setTimeout(() => {
            if (mounted && loading) {
                if (import.meta.env.DEV) console.warn("Auth load safety timeout triggered");
                setLoading(false);
            }
        }, 15000);

        // Check active sessions and sets the user
        const initSession = async () => {
            try {
                const result = await withTimeout(
                    supabase.auth.getSession(),
                    10000, "Auth session"
                );
                const { data } = result as { data: { session: Session | null } };

                if (mounted && data?.session) {
                    const session = data.session;
                    setSession(session);
                    const currentUser = session.user;
                    setUser(currentUser);

                    if (currentUser) {
                        try {
                            const profileData = await fetchProfile(currentUser.id);
                            if (mounted) setProfileAndRef(profileData);
                        } catch (e) {
                            if (import.meta.env.DEV) console.error("Profile fetch error", e);
                        }
                    }
                }
            } catch (error) {
                if (import.meta.env.DEV) console.error("Auth initialization error or timeout:", error);
            } finally {
                if (mounted) {
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
            }
        };

        if (!isLoggingOut) {
            initSession();
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted) return;
            if (isLoggingOut) return; // Ignore updates during logout

            // Handle explicit SIGNED_OUT event
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setUser(null);
                setProfileAndRef(null);
                setLoading(false);
                return;
            }

            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            // C2-FIX: Google/OAuth sign-ups bypass Register.tsx — registrar referido aquí
            if (event === 'SIGNED_IN' && currentUser) {
                const provider = currentUser.app_metadata?.provider;
                if (provider && provider !== 'email') {
                    const refCode = localStorage.getItem('fc_ref');
                    const refTs = localStorage.getItem('fc_ref_ts');
                    const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
                    if (refCode && refTs && (Date.now() - parseInt(refTs)) < SEVEN_DAYS) {
                        supabase.functions.invoke('register-referral', {
                            body: { ref_code: refCode, new_user_id: currentUser.id }
                        }).catch(() => { /* silencioso — no bloquea el login */ });
                    }
                    // Limpiar siempre al autenticar (código ya no aplicable)
                    localStorage.removeItem('fc_ref');
                    localStorage.removeItem('fc_ref_ts');
                }
            }

            if (currentUser) {
                // Use ref to avoid stale closure — profileRef always reflects current value
                if (!profileRef.current || profileRef.current.id !== currentUser.id) {
                    const profileData = await fetchProfile(currentUser.id);
                    if (mounted) setProfileAndRef(profileData);
                }
            } else {
                if (mounted) setProfileAndRef(null);
            }

            if (mounted) setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [isLoggingOut]); // Re-subscribe if we cancel logout (unlikely) or finish it logic elsewhere

    const signOut = async () => {
        setIsLoggingOut(true);
        try {
            // Artificial delay to show the branding (UX)
            await new Promise(resolve => setTimeout(resolve, 800));

            await supabase.auth.signOut();

            // Clear local state immediately
            setProfileAndRef(null);
            setUser(null);
            setSession(null);

            // Hard Reload to ensure clean state if needed, or just redirect
            // Currently using window.location to be absolutely sure all memory is cleared
            window.location.href = '/login';
        } catch (error) {
            if (import.meta.env.DEV) console.error("Error signing out:", error);
            setIsLoggingOut(false); // Only reset if error, otherwise we are redirecting
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, isLoggingOut, signOut, refreshProfile }}>
            {isLoggingOut && <LoadingScreen message="Cerrando sesión de forma segura..." />}
            {children}
        </AuthContext.Provider>
    );
};
