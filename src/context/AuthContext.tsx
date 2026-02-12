import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { withTimeout } from "@/lib/withTimeout";

// Define Profile interface
export interface Profile {
    id: string;
    name: string | null;
    email: string | null;
    company_name: string | null;
    role: 'user' | 'admin' | null;
    // Add other fields from public.users as needed
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
    signOut: () => Promise<void>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    signOut: async () => { },
    refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await withTimeout(
                supabase.from('users').select('*').eq('id', userId).single(),
                10000, "Profile fetch"
            );

            if (error) {
                console.error("Error fetching profile:", error);
                return null;
            }

            // Map DB response to Profile, handling missing role column gracefully
            const profile: Profile = {
                id: data.id,
                name: data.name,
                email: data.email,
                company_name: data.company_name,
                role: (data.role as any) || 'user' // Default to 'user' if role is missing/null
            };

            return profile;
        } catch (error) {
            console.error("Error fetching profile (timeout/catch):", error);
            // If timeout or error, return null so we don't crash or hang
            return null;
        }
    };

    const refreshProfile = async () => {
        if (!user) return;
        const data = await fetchProfile(user.id);
        if (data) setProfile(data);
    };

    useEffect(() => {
        let mounted = true;

        // Failsafe: if everything hangs, force stop loading after 15s
        const safetyTimer = setTimeout(() => {
            if (mounted && loading) {
                console.warn("Auth load safety timeout triggered");
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
                            if (mounted) setProfile(profileData);
                        } catch (e) {
                            console.error("Profile fetch error", e);
                        }
                    }
                }
            } catch (error) {
                console.error("Auth initialization error or timeout:", error);
            } finally {
                if (mounted) {
                    setLoading(false);
                    clearTimeout(safetyTimer);
                }
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (!mounted) return;

            setSession(session);
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser) {
                const profileData = await fetchProfile(currentUser.id);
                if (mounted) setProfile(profileData);
            } else {
                if (mounted) setProfile(null);
            }

            if (mounted) setLoading(false);
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signOut, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
