import { createContext, useContext, useEffect, useRef, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";
import { LoadingScreen } from "@/components/ui/LoadingScreen";

export interface Profile {
    id: string;
    name: string | null;
    email: string | null;
    company_name: string | null;
    role: 'user' | 'admin' | 'support' | null;
    onboarding_completed: boolean | null;
    legal_accepted: boolean | null;
    // Issuer fields — merged from ProfileContext to avoid a second round-trip
    tax_id: string | null;
    address: string | null;
    city: string | null;
    zip_code: string | null;
    country: string | null;
    issuer_type: 'company' | 'person' | null;
    phone: string | null;
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

// Single query that satisfies both AuthContext and ProfileContext — no second round-trip.
const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
        const { data, error } = await withTimeout(
            supabase.from('users')
                .select('id, name, email, company_name, role, onboarding_completed, legal_accepted, tax_id, address, city, zip_code, country, issuer_type, phone')
                .eq('id', userId)
                .single(),
            10000, "Profile fetch"
        );
        if (error) {
            if (import.meta.env.DEV) console.error("Error fetching profile:", error);
            return null;
        }
        return {
            id: data.id,
            name: data.name,
            email: data.email,
            company_name: data.company_name,
            role: (data.role as Profile['role']) || 'user',
            onboarding_completed: data.onboarding_completed ?? false,
            legal_accepted: data.legal_accepted ?? false,
            tax_id: data.tax_id,
            address: data.address,
            city: data.city,
            zip_code: data.zip_code,
            country: data.country,
            issuer_type: data.issuer_type,
            phone: data.phone,
        };
    } catch {
        if (import.meta.env.DEV) console.error("Profile fetch timeout/error");
        return null;
    }
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    // Refs survive re-renders and avoid stale closures in the async listener.
    const profileRef = useRef<Profile | null>(null);
    const userIdRef = useRef<string | null>(null);
    // Tracks which userId is currently being fetched — prevents concurrent duplicates.
    const fetchingForUserRef = useRef<string | null>(null);

    const setProfileAndRef = (p: Profile | null) => {
        profileRef.current = p;
        setProfile(p);
    };

    // Works even when profileRef is null (e.g., after a failed fetch).
    const refreshProfile = async () => {
        const uid = userIdRef.current;
        if (!uid) return;
        const data = await fetchProfile(uid);
        if (data) setProfileAndRef(data);
    };

    useEffect(() => {
        let mounted = true;

        // Failsafe: if onAuthStateChange never fires (network outage, etc.) stop loading.
        const safetyTimer = setTimeout(() => {
            if (mounted) setLoading(false);
        }, 15000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!mounted || isLoggingOut) return;

            if (event === 'SIGNED_OUT') {
                clearTimeout(safetyTimer);
                setSession(null);
                setUser(null);
                setProfileAndRef(null);
                fetchingForUserRef.current = null;
                userIdRef.current = null;
                setLoading(false);
                return;
            }

            const currentUser = session?.user ?? null;
            userIdRef.current = currentUser?.id ?? null;
            setSession(session);
            setUser(currentUser);

            // OAuth sign-ups bypass Register.tsx — register referral here.
            if (event === 'SIGNED_IN' && currentUser) {
                const provider = currentUser.app_metadata?.provider;
                if (provider && provider !== 'email') {
                    const refCode = localStorage.getItem('fc_ref');
                    const refTs = localStorage.getItem('fc_ref_ts');
                    const SEVEN_DAYS = 30 * 24 * 60 * 60 * 1000;
                    if (refCode && refTs && (Date.now() - parseInt(refTs)) < SEVEN_DAYS) {
                        supabase.functions.invoke('register-referral', {
                            body: { ref_code: refCode, new_user_id: currentUser.id }
                        }).catch(() => { });
                    }
                    localStorage.removeItem('fc_ref');
                    localStorage.removeItem('fc_ref_ts');
                }
            }

            if (currentUser) {
                const needsFetch =
                    !profileRef.current || profileRef.current.id !== currentUser.id;
                const alreadyFetching =
                    fetchingForUserRef.current === currentUser.id;

                if (needsFetch && !alreadyFetching) {
                    fetchingForUserRef.current = currentUser.id;
                    const profileData = await fetchProfile(currentUser.id);
                    if (mounted) {
                        setProfileAndRef(profileData);
                        fetchingForUserRef.current = null;
                    }
                }
                // TOKEN_REFRESHED with same user ID → profile already cached, skip fetch.
            } else {
                setProfileAndRef(null);
                fetchingForUserRef.current = null;
            }

            clearTimeout(safetyTimer);
            if (mounted) setLoading(false);
        });

        return () => {
            mounted = false;
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, [isLoggingOut]);

    const signOut = async () => {
        setIsLoggingOut(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800));
            await supabase.auth.signOut();
            setProfileAndRef(null);
            setUser(null);
            setSession(null);
            window.location.href = '/login';
        } catch (error) {
            if (import.meta.env.DEV) console.error("Error signing out:", error);
            setIsLoggingOut(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, isLoggingOut, signOut, refreshProfile }}>
            {isLoggingOut && <LoadingScreen message="Cerrando sesión de forma segura..." />}
            {children}
        </AuthContext.Provider>
    );
};
