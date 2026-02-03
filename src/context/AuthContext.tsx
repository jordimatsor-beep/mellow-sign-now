import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Define Profile interface
export interface Profile {
    id: string;
    name: string | null;
    email: string | null;
    company_name: string | null;
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
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
                return null;
            }
            return data as Profile;
        } catch (error) {
            console.error("Error fetching profile:", error);
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

        // Check active sessions and sets the user
        const initSession = async () => {
            try {
                // Safety timeout: If Supabase takes > 5 seconds, force load completion
                // This prevents infinite loading screens if the network hangs or config is bad
                const timeoutPromise = new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Auth timeout")), 5000)
                );

                const sessionPromise = supabase.auth.getSession();

                // Race the session fetch against the timeout
                const { data } = await Promise.race([sessionPromise, timeoutPromise]) as any;

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
                if (mounted) setLoading(false);
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
